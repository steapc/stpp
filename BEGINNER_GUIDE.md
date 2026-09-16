# Подробный разбор проекта и кода

Этот файл предназначен для изучения проекта перед защитой. Здесь разобраны архитектура, запуск, движение HTTP-запроса, код каждого слоя, проверка данных, статусы ответов и ограничения текущей реализации.

## 1. Общая идея

Проект представляет собой REST API для музыкальных плейлистов. Клиент отправляет HTTP-запрос на определенный URL, сервер выбирает маршрут, выполняет операцию с данными и возвращает JSON или статус без тела.

Основной ресурс:

```text
/playlists
```

Поддерживаемые операции:

| Операция | Метод | Маршрут |
|---|---|---|
| Получить все записи | GET | `/playlists` |
| Получить одну запись | GET | `/playlists/:id` |
| Создать запись | POST | `/playlists` |
| Обновить запись | PUT | `/playlists/:id` |
| Удалить запись | DELETE | `/playlists/:id` |

Это соответствует CRUD:

- Create — POST;
- Read — GET;
- Update — PUT;
- Delete — DELETE.

## 2. Архитектура проекта

Проект разделен на три основных слоя:

```text
HTTP-клиент
    |
    v
server.js
    |
    v
routes/playlistRoutes.js
    |
    v
controllers/playlistController.js
    |
    v
models/playlistModel.js
    |
    v
массив playlists в памяти
```

### `server.js`

Запускает приложение Express, подключает JSON-parser, корневой маршрут, router плейлистов и обработчики ошибок.

### `routes/playlistRoutes.js`

Определяет, какой HTTP-метод и URL вызывают какую функцию контроллера.

### `controllers/playlistController.js`

Работает с HTTP-уровнем: читает `req.params` и `req.body`, проверяет данные, вызывает модель и формирует `res`.

### `models/playlistModel.js`

Не знает о HTTP. Модель работает только с массивом: ищет, создает, изменяет и удаляет объекты.

Такое разделение позволяет заменить массив базой данных, не переписывая все маршруты.

## 3. Запуск и зависимости

В `package.json` находятся команды и зависимости:

```json
{
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.21.2"
  },
  "devDependencies": {
    "nodemon": "^3.1.9"
  }
}
```

Установка:

```powershell
npm.cmd install
```

Эта команда устанавливает пакеты из `package.json` и использует `package-lock.json` для фиксированных версий.

Обычный запуск:

```powershell
npm.cmd start
```

Выполняется команда `node server.js`.

Запуск для разработки:

```powershell
npm.cmd run dev
```

Выполняется `nodemon server.js`. Nodemon следит за файлами и перезапускает Node.js после изменения.

## 4. Файл `server.js`

Актуальный код:

```js
const express = require('express');
const playlistRoutes = require('./routes/playlistRoutes');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({
    project: 'Платформа для совместного прослушивания музыки и создания плейлистов',
    api: {
      playlists: '/playlists'
    }
  });
});

app.use('/playlists', playlistRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: `Маршрут ${req.method} ${req.originalUrl} не найден`
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Внутренняя ошибка сервера'
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
```

### 4.1 Импорт модулей

```js
const express = require('express');
const playlistRoutes = require('./routes/playlistRoutes');
```

`require('express')` загружает установленный пакет Express.

`require('./routes/playlistRoutes')` загружает локальный файл. `./` означает текущую папку относительно `server.js`.

Первая строка дает доступ к функциям Express, вторая получает router плейлистов.

### 4.2 Создание приложения и выбор порта

```js
const app = express();
const port = process.env.PORT || 3000;
```

`express()` возвращает объект приложения. Через него регистрируются middleware, маршруты и запуск сервера.

`process.env.PORT` — переменная окружения. На удаленном сервере платформа может сама назначить порт. Локально, если переменная отсутствует, используется `3000`.

Оператор `||` выбирает `3000`, если значение слева отсутствует или является falsy.

### 4.3 JSON middleware

```js
app.use(express.json());
```

`app.use` подключает middleware для всех маршрутов.

`express.json()` читает тело запроса с JSON и записывает разобранный объект в `req.body`.

Например, клиент отправляет:

```json
{
  "title": "Late Night Jazz",
  "owner": "dave"
}
```

После `express.json()` контроллер может обратиться к:

```js
req.body.title
req.body.owner
```

Без JSON middleware `req.body` не работал бы так, как ожидает контроллер.

### 4.4 Корневой маршрут

```js
app.get('/', (req, res) => {
  res.status(200).json({
    project: 'Платформа для совместного прослушивания музыки и создания плейлистов',
    api: {
      playlists: '/playlists'
    }
  });
});
```

Этот код регистрирует маршрут `GET /`.

`req` — входящий запрос. В этом callback он не используется, но оставлен как стандартный аргумент Express.

`res.status(200)` устанавливает статус успешного ответа.

`res.json(object)` сериализует JavaScript-объект в JSON и отправляет его клиенту.

### 4.5 Подключение router

```js
app.use('/playlists', playlistRoutes);
```

Это общий префикс для всех маршрутов из `playlistRoutes`.

Если router содержит:

```js
router.get('/', playlistController.getPlaylists);
```

полный адрес будет:

```text
GET /playlists
```

Если router содержит:

```js
router.get('/:id', playlistController.getPlaylistById);
```

полный адрес будет:

```text
GET /playlists/:id
```

### 4.6 Обработчик неизвестного маршрута

```js
app.use((req, res) => {
  res.status(404).json({
    error: `Маршрут ${req.method} ${req.originalUrl} не найден`
  });
});
```

Этот middleware находится после всех известных маршрутов. Если запрос не совпал ни с одним из них, возвращается `404`.

`req.method` содержит HTTP-метод.

`req.originalUrl` содержит исходный URL.

Например, для `GET /abc` ответ будет примерно таким:

```json
{
  "error": "Маршрут GET /abc не найден"
}
```

### 4.7 Общий обработчик ошибок

```js
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Внутренняя ошибка сервера'
  });
});
```

У обработчика ошибок четыре аргумента: `err`, `req`, `res`, `next`. По этой сигнатуре Express распознает error middleware.

Контроллер передает ошибку сюда вызовом `next(error)`.

`console.error(err)` выводит подробности ошибки в терминал.

Если у ошибки есть статус, используется он. Иначе возвращается `500`.

### 4.8 Запуск

```js
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
```

`app.listen` открывает порт и начинает принимать запросы. Callback выполняется после успешного запуска.

## 5. Файл `routes/playlistRoutes.js`

Код:

```js
const express = require('express');
const playlistController = require('../controllers/playlistController');

const router = express.Router();

router.get('/', playlistController.getPlaylists);
router.get('/:id', playlistController.getPlaylistById);
router.post('/', playlistController.createPlaylist);
router.put('/:id', playlistController.updatePlaylist);
router.delete('/:id', playlistController.deletePlaylist);

module.exports = router;
```

### 5.1 Почему используется `express.Router`

Router позволяет собрать маршруты одной области в отдельный модуль. В данном случае все маршруты относятся к плейлистам.

```js
const router = express.Router();
```

Создается объект, похожий на маленькое Express-приложение.

### 5.2 Регистрация маршрутов

```js
router.get('/', playlistController.getPlaylists);
```

Связывает GET с функцией `getPlaylists`.

```js
router.get('/:id', playlistController.getPlaylistById);
```

`/:id` — параметр маршрута. Для URL `/playlists/7` Express передаст контроллеру:

```js
req.params.id === '7'
```

Это строка, поэтому контроллер отдельно преобразует ее в число.

```js
router.post('/', playlistController.createPlaylist);
```

Вызывает создание для `POST /playlists`.

```js
router.put('/:id', playlistController.updatePlaylist);
```

Вызывает обновление для `PUT /playlists/:id`.

```js
router.delete('/:id', playlistController.deletePlaylist);
```

Вызывает удаление для `DELETE /playlists/:id`.

### 5.3 Экспорт

```js
module.exports = router;
```

Без экспорта `server.js` не смог бы подключить router.

## 6. Файл `models/playlistModel.js`

Модель реализует слой хранения данных. В проекте это массив в памяти, а не база данных.

### 6.1 Счетчик ID и массив

```js
let nextId = 4;

const playlists = [
  // три стартовых объекта
];
```

Стартовые записи имеют ID `1`, `2` и `3`, поэтому следующий ID равен `4`.

`let` используется потому, что значение `nextId` изменяется.

Сам массив объявлен через `const`, потому что переменная всегда ссылается на один и тот же массив. Его содержимое при этом можно менять с помощью `push`, `splice` и присваивания по индексу.

### 6.2 Структура объекта

Каждый плейлист имеет вид:

```js
{
  id: 1,
  title: 'Evening Chill',
  description: 'Спокойные треки для совместного вечернего прослушивания',
  owner: 'alice',
  isPublic: true,
  tracks: [
    { title: 'Sunset Drive', artist: 'Night Owl', durationSec: 214 },
    { title: 'Soft Rain', artist: 'LoFi Lab', durationSec: 198 }
  ],
  listenersOnline: 3,
  createdAt: '2026-03-10T18:00:00.000Z',
  updatedAt: '2026-03-10T18:00:00.000Z'
}
```

`tracks` — вложенный массив объектов. У трека есть название, исполнитель и длительность в секундах.

### 6.3 Получение всех записей

```js
function getAll() {
  return playlists;
}
```

Функция возвращает массив. Она не формирует HTTP-ответ и не знает о `req` или `res`. Это важное разделение: модель работает с данными, а контроллер — с HTTP.

### 6.4 Поиск по ID

```js
function getById(id) {
  return playlists.find((playlist) => playlist.id === id);
}
```

`.find()` перебирает элементы и возвращает первый подходящий.

Колбэк получает один объект `playlist`. Условие сравнивает его ID с искомым.

Если запись не найдена, `.find()` возвращает `undefined`.

### 6.5 Создание

Код:

```js
function create(data) {
  const now = new Date().toISOString();
  const playlist = {
    id: nextId++,
    title: data.title,
    description: data.description || '',
    owner: data.owner,
    isPublic: data.isPublic !== undefined ? Boolean(data.isPublic) : true,
    tracks: Array.isArray(data.tracks) ? data.tracks : [],
    listenersOnline: Number.isInteger(data.listenersOnline) ? data.listenersOnline : 0,
    createdAt: now,
    updatedAt: now
  };
  playlists.push(playlist);
  return playlist;
}
```

Разбор:

```js
const now = new Date().toISOString();
```

Создается ISO-дата. Такой формат удобен для JSON и сортировки.

```js
id: nextId++
```

Используется текущее значение, затем счетчик увеличивается. При первом создании будет ID `4`, при следующем — `5`.

```js
description: data.description || ''
```

Если описание отсутствует или пустое, используется пустая строка.

```js
isPublic: data.isPublic !== undefined ? Boolean(data.isPublic) : true
```

Если поле передали, оно преобразуется в boolean. Если поле отсутствует, по умолчанию плейлист публичный.

```js
tracks: Array.isArray(data.tracks) ? data.tracks : []
```

Если передан массив треков, он сохраняется. Иначе создается пустой массив.

```js
listenersOnline: Number.isInteger(data.listenersOnline)
  ? data.listenersOnline
  : 0
```

Количество слушателей сохраняется только при целочисленном значении. Иначе используется `0`.

```js
playlists.push(playlist);
return playlist;
```

Новый объект добавляется в массив и возвращается контроллеру.

Важно: проверка в контроллере выполняется до модели. Значения по умолчанию в модели дополнительно защищают ее от отсутствующих необязательных полей.

### 6.6 Обновление

Код:

```js
function update(id, data) {
  const index = playlists.findIndex((playlist) => playlist.id === id);
  if (index === -1) {
    return null;
  }

  const current = playlists[index];
  const updated = {
    ...current,
    title: data.title,
    description: data.description || '',
    owner: data.owner,
    isPublic: data.isPublic !== undefined ? Boolean(data.isPublic) : current.isPublic,
    tracks: Array.isArray(data.tracks) ? data.tracks : [],
    listenersOnline: Number.isInteger(data.listenersOnline)
      ? data.listenersOnline
      : current.listenersOnline,
    updatedAt: new Date().toISOString()
  };

  playlists[index] = updated;
  return updated;
}
```

`.findIndex()` возвращает индекс подходящего объекта. Если результат `-1`, запись отсутствует.

```js
const current = playlists[index];
```

Сохраняется ссылка на старую запись.

```js
const updated = {
  ...current,
  ...
};
```

Spread-оператор копирует все старые поля. Поэтому сохраняются `id` и `createdAt`.

После этого некоторые поля переопределяются новыми значениями. `updatedAt` всегда получает новую дату.

```js
playlists[index] = updated;
```

Обновленный объект заменяет старый на той же позиции.

### 6.7 Удаление

Код:

```js
function remove(id) {
  const index = playlists.findIndex((playlist) => playlist.id === id);
  if (index === -1) {
    return null;
  }
  const [deleted] = playlists.splice(index, 1);
  return deleted;
}
```

`splice(index, 1)` удаляет один объект начиная с найденного индекса.

Деструктуризация `[deleted]` берет удаленный элемент из массива, который возвращает `splice`.

Модель возвращает удаленный объект, но текущий контроллер не отправляет его клиенту, потому что успешный DELETE должен вернуть `204 No Content` без тела.

### 6.8 Экспорт

```js
module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
```

Эти функции становятся доступными в контроллере после:

```js
const playlistModel = require('../models/playlistModel');
```

## 7. Файл `controllers/playlistController.js`

Контроллер — главный слой обработки запросов. Он знает о `req`, `res`, статусах и JSON, но не должен самостоятельно хранить массив.

Общий шаблон функций:

```js
function handler(req, res, next) {
  try {
    // чтение и проверка запроса
    // вызов модели
    // ответ
  } catch (error) {
    next(error);
  }
}
```

### 7.1 Почему нужен `try/catch`

Если модель или другой код выбросит исключение, оно попадет в `catch`. Вызов `next(error)` передаст его глобальному обработчику в `server.js`.

### 7.2 Преобразование ID

```js
function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
```

URL-параметр всегда приходит строкой. Функция превращает ее в число и принимает только положительные целые значения.

Примеры:

| В URL | Результат |
|---|---|
| `1` | `1` |
| `"2"` | `2` |
| `0` | `null` |
| `-1` | `null` |
| `abc` | `null` |
| `1.5` | `null` |

Тернарный оператор имеет вид:

```js
условие ? значениеЕслиДа : значениеЕслиНет
```

### 7.3 Валидация тела

```js
function validatePlaylistPayload(body, { partial = false } = {}) {
```

Функция принимает тело запроса и необязательный объект настроек.

`partial` по умолчанию равен `false`. Параметр предусмотрен для режима частичного обновления, но текущие POST и PUT вызывают валидатор без `partial: true`, поэтому оба требуют `title` и `owner`.

#### Проверка JSON-объекта

```js
if (!body || typeof body !== 'object' || Array.isArray(body)) {
  return 'Тело запроса должно быть JSON-объектом';
}
```

Проверяется, что тело существует, является объектом и не является массивом.

#### Проверка `title` и `owner`

```js
if (!partial || body.title !== undefined) {
  if (typeof body.title !== 'string' || body.title.trim() === '') {
    return 'Поле title обязательно и должно быть непустой строкой';
  }
}
```

`typeof` проверяет тип.

`trim()` убирает пробелы по краям. Поэтому строка из пробелов считается пустой.

Аналогичная проверка выполняется для `owner`.

#### Проверка описания и публичности

```js
if (body.description !== undefined && typeof body.description !== 'string') {
  return 'Поле description должно быть строкой';
}

if (body.isPublic !== undefined && typeof body.isPublic !== 'boolean') {
  return 'Поле isPublic должно быть boolean';
}
```

Необязательное поле может отсутствовать. Но если оно существует, у него должен быть правильный тип.

#### Проверка треков

```js
if (body.tracks !== undefined) {
  if (!Array.isArray(body.tracks)) {
    return 'Поле tracks должно быть массивом';
  }

  for (const track of body.tracks) {
    if (!track || typeof track !== 'object') {
      return 'Каждый трек должен быть объектом';
    }
    if (typeof track.title !== 'string' || track.title.trim() === '') {
      return 'У каждого трека должно быть непустое поле title';
    }
    if (typeof track.artist !== 'string' || track.artist.trim() === '') {
      return 'У каждого трека должно быть непустое поле artist';
    }
    if (
      track.durationSec !== undefined &&
      (!Number.isInteger(track.durationSec) || track.durationSec < 0)
    ) {
      return 'Поле durationSec должно быть неотрицательным целым числом';
    }
  }
}
```

`Array.isArray` проверяет именно массив.

Цикл `for...of` проходит по каждому треку.

Для каждого трека обязательны непустые `title` и `artist`.

`durationSec` необязателен, но если указан, это целое число не меньше нуля.

#### Проверка слушателей

```js
if (
  body.listenersOnline !== undefined &&
  (!Number.isInteger(body.listenersOnline) || body.listenersOnline < 0)
) {
  return 'Поле listenersOnline должно быть неотрицательным целым числом';
}
```

Количество слушателей не может быть дробным, строковым или отрицательным.

Если все проверки пройдены:

```js
return null;
```

`null` означает отсутствие ошибки.

## 8. Обработчики CRUD

### 8.1 GET списка

```js
function getPlaylists(req, res, next) {
  try {
    const playlists = playlistModel.getAll();
    res.status(200).json({
      count: playlists.length,
      data: playlists
    });
  } catch (error) {
    next(error);
  }
}
```

Последовательность:

1. модель возвращает массив;
2. вычисляется количество элементов;
3. формируется объект с `count` и `data`;
4. отправляется `200 OK`.

Ответ:

```json
{
  "count": 3,
  "data": [
    {
      "id": 1,
      "title": "Evening Chill"
    }
  ]
}
```

### 8.2 GET по ID

```js
function getPlaylistById(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Некорректный ID плейлиста' });
    }

    const playlist = playlistModel.getById(id);
    if (!playlist) {
      return res.status(404).json({ error: `Плейлист с id=${id} не найден` });
    }

    res.status(200).json({ data: playlist });
  } catch (error) {
    next(error);
  }
}
```

`req.params.id` берет параметр из URL.

Если ID не прошел проверку, возвращается `400`.

Если модель вернула `undefined`, возвращается `404`.

Если запись найдена, возвращается `200`.

`return` перед ошибочным ответом прекращает функцию. Без него код мог бы попытаться отправить второй ответ.

### 8.3 POST

```js
function createPlaylist(req, res, next) {
  try {
    const validationError = validatePlaylistPayload(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const playlist = playlistModel.create({
      title: req.body.title.trim(),
      description: req.body.description ? req.body.description.trim() : '',
      owner: req.body.owner.trim(),
      isPublic: req.body.isPublic,
      tracks: req.body.tracks,
      listenersOnline: req.body.listenersOnline
    });

    res.status(201).json({
      message: 'Плейлист успешно создан',
      data: playlist
    });
  } catch (error) {
    next(error);
  }
}
```

POST получает данные из `req.body`.

Сначала выполняется валидация. Это важно: модель не должна получать заведомо некорректные данные.

После валидации текстовые поля очищаются через `trim()`.

Затем вызывается `playlistModel.create`.

Статус `201 Created` означает, что создан новый ресурс.

### 8.4 PUT

```js
function updatePlaylist(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Некорректный ID плейлиста' });
    }

    const validationError = validatePlaylistPayload(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const playlist = playlistModel.update(id, {
      title: req.body.title.trim(),
      description: req.body.description ? req.body.description.trim() : '',
      owner: req.body.owner.trim(),
      isPublic: req.body.isPublic,
      tracks: req.body.tracks,
      listenersOnline: req.body.listenersOnline
    });

    if (!playlist) {
      return res.status(404).json({ error: `Плейлист с id=${id} не найден` });
    }

    res.status(200).json({
      message: 'Плейлист успешно обновлён',
      data: playlist
    });
  } catch (error) {
    next(error);
  }
}
```

PUT проверяет и ID, и тело.

Текущая реализация требует `title` и `owner`, поэтому в учебном описании PUT считается полным обновлением обязательных полей.

Модель сохраняет старые `id` и `createdAt`, заменяет изменяемые поля и обновляет `updatedAt`.

При успехе возвращается `200 OK`.

### 8.5 DELETE

```js
function deletePlaylist(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Некорректный ID плейлиста' });
    }

    const playlist = playlistModel.remove(id);
    if (!playlist) {
      return res.status(404).json({ error: `Плейлист с id=${id} не найден` });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
```

Удаление имеет три результата:

- неправильный ID — `400`;
- запись не найдена — `404`;
- запись удалена — `204 No Content`.

`res.status(204).send()` отправляет ответ без тела. В Postman после DELETE поле Body будет пустым.

## 9. Полный путь POST-запроса

Рассмотрим запрос:

```text
POST http://localhost:3000/playlists
```

с JSON-телом.

### Шаг 1. Клиент отправляет запрос

Postman отправляет метод, URL, заголовок `Content-Type: application/json` и JSON-тело.

### Шаг 2. Запрос принимает Express

`server.js` получает запрос через `app`.

### Шаг 3. `express.json()` разбирает тело

JSON превращается в JavaScript-объект `req.body`.

### Шаг 4. Router выбирает обработчик

`app.use('/playlists', playlistRoutes)` передает запрос router.

`router.post('/', playlistController.createPlaylist)` выбирает `createPlaylist`.

### Шаг 5. Контроллер валидирует данные

Вызывается `validatePlaylistPayload(req.body)`.

При ошибке выполнение заканчивается ответом `400`.

### Шаг 6. Контроллер вызывает модель

Вызывается `playlistModel.create(...)`.

### Шаг 7. Модель создает объект

Модель назначает ID, даты и значения по умолчанию, добавляет объект в массив.

### Шаг 8. Контроллер отвечает

Контроллер отправляет `201 Created` и объект в `data`.

Схема:

```text
Postman
  -> Express app
  -> express.json()
  -> playlist router
  -> createPlaylist
  -> validatePlaylistPayload
  -> playlistModel.create
  -> response 201 + JSON
```

## 10. HTTP-статусы

| Статус | Значение в проекте |
|---|---|
| `200 OK` | успешный GET или PUT |
| `201 Created` | успешное создание через POST |
| `204 No Content` | успешное удаление без тела |
| `400 Bad Request` | некорректный ID или входные данные |
| `404 Not Found` | отсутствующий плейлист или маршрут |
| `500 Internal Server Error` | непредвиденная ошибка, переданная в error middleware |

## 11. Проверка в Postman

### Получить список

```text
GET http://localhost:3000/playlists
```

Ожидается `200` и JSON с `count` и `data`.

### Создать плейлист

```text
POST http://localhost:3000/playlists
```

Headers:

```text
Content-Type: application/json
```

Body:

```json
{
  "title": "Late Night Jazz",
  "description": "Спокойные треки для совместного вечернего прослушивания",
  "owner": "dave",
  "isPublic": true,
  "tracks": [
    {
      "title": "Blue Hour",
      "artist": "Jazz Collective",
      "durationSec": 276
    }
  ],
  "listenersOnline": 1
}
```

Ожидается `201 Created`.

### Получить запись

```text
GET http://localhost:3000/playlists/4
```

Ожидается `200`, если запись с ID `4` существует.

### Обновить запись

```text
PUT http://localhost:3000/playlists/4
```

Тело должно содержать `title` и `owner`, например:

```json
{
  "title": "Late Night Jazz Updated",
  "description": "Обновлённый плейлист комнаты",
  "owner": "dave",
  "isPublic": false,
  "tracks": [],
  "listenersOnline": 4
}
```

Ожидается `200 OK`.

### Удалить запись

```text
DELETE http://localhost:3000/playlists/4
```

Ожидается `204 No Content` без тела.

После этого:

```text
GET http://localhost:3000/playlists/4
```

должен вернуть `404`.

## 12. Почему изменения пропадают

Хранилище находится в переменной:

```js
const playlists = [
  // стартовые записи
];
```

Это оперативная память процесса Node.js. При остановке процесса массив исчезает. При следующем запуске модуль создается заново со стартовыми объектами.

`nextId` тоже сбрасывается на `4`.

Для постоянного хранения нужно заменить операции модели на запросы к PostgreSQL, MongoDB или другой базе данных.

## 13. Что в проекте еще не реализовано

Текущий код не содержит:

- авторизации;
- ролей и проверки владельца;
- постоянной базы данных;
- WebSocket или Socket.IO;
- реальной синхронизации прослушивания между клиентами;
- автоматических тестов;
- пагинации;
- фильтрации и сортировки.

Поэтому корректное описание проекта: это REST API-основа платформы плейлистов, а не полностью готовый realtime-сервис.

## 14. Вопросы по коду на защите

### Почему маршруты вынесены отдельно?

Чтобы `server.js` отвечал за запуск приложения, а маршруты плейлистов находились в своем модуле. Это уменьшает связанность кода.

### Почему контроллер не хранит данные?

Контроллер отвечает за HTTP, а модель — за данные. Такое разделение позволяет заменить in-memory массив базой данных без переписывания маршрутов.

### Зачем нужен `next`?

`next(error)` передает ошибку следующему обработчику Express, то есть глобальному error middleware.

### Почему в `getById` используется `find`, а в `update` — `findIndex`?

Для получения нужен сам объект, поэтому используется `find`. Для обновления и удаления нужна позиция в массиве, поэтому используется `findIndex`.

### Зачем `return` перед ответом с ошибкой?

Чтобы остановить выполнение функции. Иначе после отправки ошибки код мог бы попытаться отправить еще один ответ.

### Зачем `trim()`?

Чтобы убрать лишние пробелы в начале и конце текстовых значений и не сохранить название вроде `"  Jazz  "`.

### Почему `id` не передается в POST?

Идентификатор назначает сервер. Это предотвращает конфликт ID и соответствует обычной логике создания ресурса.

### Почему POST возвращает `201`, а GET — `200`?

`201 Created` означает создание нового ресурса. `200 OK` означает успешное выполнение запроса без создания нового ресурса.

### Почему DELETE возвращает `204`?

Операция выполнена успешно, но сервер не возвращает содержимое. Поэтому используется `204 No Content`.

### Что будет при `GET /playlists/abc`?

`parseId` вернет `null`, и контроллер ответит `400 Bad Request`.

### Что будет при `GET /playlists/999`?

ID формально корректен, но объекта нет. Контроллер вернет `404 Not Found`.

### Что будет при POST без `title`?

Валидатор вернет текст ошибки, а контроллер отправит `400 Bad Request`.

## 15. Краткое объяснение проекта

> Проект — REST API на Node.js и Express для управления музыкальными плейлистами. `server.js` создает приложение и подключает router. Router связывает HTTP-методы с функциями контроллера. Контроллеры читают параметры запроса, валидируют тело, вызывают модель и выбирают HTTP-статус. Модель работает с массивом плейлистов в памяти.
>
> Реализованы GET списка, GET по ID, POST, PUT и DELETE. POST возвращает `201 Created`, GET и PUT — `200 OK`, DELETE — `204 No Content`. Ошибки входных данных дают `400`, отсутствие объекта — `404`. После перезапуска данные сбрасываются, потому что база данных не подключена.
