# REST API плейлистов

Учебное серверное приложение на Node.js и Express для управления музыкальными плейлистами.

## Назначение

API предоставляет CRUD-операции для ресурса `/playlists`:

- получение списка плейлистов;
- получение плейлиста по идентификатору;
- создание плейлиста;
- полное обновление плейлиста;
- удаление плейлиста.

Данные хранятся в массиве в оперативной памяти. После перезапуска процесса возвращаются три стартовые записи. Постоянная база данных не используется.

## Стек

- Node.js;
- Express 4;
- JavaScript CommonJS;
- JSON API;
- nodemon для разработки.

## Структура

```text
server.js                         запуск Express и общие обработчики
routes/playlistRoutes.js          маршруты API
controllers/playlistController.js валидация и обработка запросов
models/playlistModel.js           in-memory модель данных
package.json                      зависимости и команды запуска
```

## Запуск

```powershell
npm.cmd install
npm.cmd start
```

Режим разработки с автоматическим перезапуском:

```powershell
npm.cmd run dev
```

Локальный адрес: `http://localhost:3000`.

Порт берется из `process.env.PORT`; при отсутствии переменной используется `3000`.

## Маршруты

| Метод | Маршрут | Успешный статус | Назначение |
|---|---|---:|---|
| GET | `/` | 200 | информация о проекте и API |
| GET | `/playlists` | 200 | список плейлистов |
| GET | `/playlists/:id` | 200 | плейлист по ID |
| POST | `/playlists` | 201 | создание плейлиста |
| PUT | `/playlists/:id` | 200 | полное обновление плейлиста |
| DELETE | `/playlists/:id` | 204 | удаление без тела ответа |

Ошибки:

- `400` — некорректный ID или тело запроса;
- `404` — плейлист или маршрут не найден;
- `500` — непредвиденная ошибка сервера.

## Объект плейлиста

```json
{
  "id": 1,
  "title": "Evening Chill",
  "description": "Спокойные треки для совместного вечернего прослушивания",
  "owner": "alice",
  "isPublic": true,
  "tracks": [
    {
      "title": "Sunset Drive",
      "artist": "Night Owl",
      "durationSec": 214
    }
  ],
  "listenersOnline": 3,
  "createdAt": "2026-03-10T18:00:00.000Z",
  "updatedAt": "2026-03-10T18:00:00.000Z"
}
```

Обязательные поля при создании и обновлении: `title` и `owner`.

Дополнительные поля: `description`, `isPublic`, `tracks`, `listenersOnline`.

Для каждого трека проверяются `title`, `artist` и необязательное неотрицательное целое `durationSec`.

## Пример создания

```http
POST http://localhost:3000/playlists
Content-Type: application/json
```

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

Ответ: `201 Created` и созданный объект в поле `data`.

## Пример удаления

```http
DELETE http://localhost:3000/playlists/4
```

Ответ: `204 No Content` без тела.

## Ограничения

Текущая версия не содержит постоянного хранилища, авторизации, проверки прав пользователей и WebSocket-синхронизации. Проект реализует REST API предметной области; данные и счетчик ID существуют только во время работы процесса.

## Репозиторий

https://github.com/steapc/stpp
