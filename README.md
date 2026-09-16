# stpp — Lab 2.1 (Express REST API)

REST API для курсового проекта: **платформа для совместного прослушивания музыки и создания плейлистов в реальном времени**.

Ресурс предметной области: `playlists`.

## Стек

- Node.js
- Express.js
- Хранение данных: массив в памяти (без БД)

## Структура проекта

```
├── server.js
├── routes/
│   └── playlistRoutes.js
├── controllers/
│   └── playlistController.js
├── models/
│   └── playlistModel.js
├── package.json
└── README.md
```

## Установка и запуск

```bash
npm install
npm run dev
```

Сервер: `http://localhost:3000`

## Маршруты

| Метод  | URL               | Описание                      | Успешный статус |
|--------|-------------------|-------------------------------|-----------------|
| GET    | `/playlists`      | Список всех плейлистов        | 200             |
| GET    | `/playlists/:id`  | Плейлист по ID                | 200             |
| POST   | `/playlists`      | Создать плейлист              | 201             |
| PUT    | `/playlists/:id`  | Полное обновление плейлиста   | 200             |
| DELETE | `/playlists/:id`  | Удалить плейлист              | 200             |

Ошибки:

- `400` — некорректные данные или ID
- `404` — плейлист / маршрут не найден
- `500` — внутренняя ошибка (глобальный error middleware)

## Пример тела запроса (POST / PUT)

```json
{
  "title": "Late Night Jazz",
  "description": "Джаз для совместного прослушивания",
  "owner": "dave",
  "isPublic": true,
  "tracks": [
    { "title": "Blue Hour", "artist": "Jazz Collective", "durationSec": 276 }
  ],
  "listenersOnline": 1
}
```

## Примеры curl

```bash
curl http://localhost:3000/playlists
curl http://localhost:3000/playlists/1
curl -X POST http://localhost:3000/playlists -H "Content-Type: application/json" -d "{\"title\":\"Late Night Jazz\",\"owner\":\"dave\",\"isPublic\":true,\"tracks\":[{\"title\":\"Blue Hour\",\"artist\":\"Jazz Collective\",\"durationSec\":276}]}"
curl -X PUT http://localhost:3000/playlists/1 -H "Content-Type: application/json" -d "{\"title\":\"Evening Chill Updated\",\"owner\":\"alice\",\"description\":\"Updated\",\"isPublic\":true,\"tracks\":[],\"listenersOnline\":5}"
curl -X DELETE http://localhost:3000/playlists/1
```

## Ветка

Код лабораторной работы: ветка `lab21`.
