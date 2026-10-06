# REST API плейлистов

Учебное серверное приложение на Node.js и Express для управления музыкальными плейлистами.

## Назначение

API предоставляет CRUD-операции для ресурса `/playlists`:

- получение списка плейлистов;
- получение плейлиста по идентификатору;
- создание плейлиста;
- полное обновление плейлиста;
- удаление плейлиста.

Данные хранятся в PostgreSQL через Sequelize. Схема создаётся миграциями, стартовые данные добавляются seed-файлом.

Подробная инструкция: [LAB_POSTGRES_GUIDE.md](LAB_POSTGRES_GUIDE.md).

## Стек

- Node.js;
- Express 4;
- PostgreSQL;
- Sequelize;
- JavaScript CommonJS;
- JSON API;
- nodemon для разработки.

## Структура

```text
server.js                         запуск Express и общие обработчики
routes/playlistRoutes.js          маршруты API
routes/authRoutes.js              маршруты регистрации и входа
controllers/playlistController.js валидация и обработка запросов
models/Playlist.js                Sequelize-модель таблицы playlists
models/User.js                    Sequelize-модель пользователей
middleware/                       проверка JWT и роли администратора
models/playlistModel.js           CRUD через Sequelize
db/database.js                    подключение к PostgreSQL
migrations/                       миграции схемы
seeders/                          начальные данные
package.json                      зависимости и команды запуска
```

## Запуск

```powershell
npm.cmd install
npm.cmd run db:migrate
npm.cmd run db:seed
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
| POST | `/auth/register` | 201 | регистрация пользователя |
| POST | `/auth/login` | 200 | вход и получение JWT |
| GET | `/profile` | 200 | профиль текущего пользователя (Bearer JWT) |
| GET | `/playlists` | 200 | список плейлистов |
| GET | `/playlists/:id` | 200 | плейлист по ID |
| POST | `/playlists` | 201 | создание плейлиста (роль `admin`) |
| PUT | `/playlists/:id` | 200 | полное обновление плейлиста (роль `admin`) |
| DELETE | `/playlists/:id` | 204 | удаление без тела ответа (роль `admin`) |

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

## Авторизация

Перед запуском необходимо задать `JWT_SECRET` в `.env` (случайная строка длиной не менее 32 байт). Пользователи и плейлисты хранятся в PostgreSQL. При регистрации назначается роль `user`; изменять данные плейлистов может только роль `admin`. Инструкция по настройке и примерам запросов приведена в [AUTH_LAB_GUIDE.md](AUTH_LAB_GUIDE.md).

WebSocket-синхронизация в проекте не реализована.

## Репозиторий

https://github.com/steapc/stpp
