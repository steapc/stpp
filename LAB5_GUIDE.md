
# Лабораторная работа №5. Взаимодействие React-приложения с сервером

## 1. Цель работы

Клиентское приложение React подключено к REST API проекта. Список плейлистов загружается с сервера; создание, редактирование и удаление отправляются в API. Для запросов используются Axios и JWT, в интерфейсе показаны состояния загрузки и ошибки, а изменения списка выполняются оптимистично с возвратом исходного состояния при неудачном запросе.

В качестве дополнительного улучшения реализована отмена запросов загрузки плейлистов и профиля при очистке эффекта React (например, при размонтировании компонента).

## 2. Что реализовано

- `GET /playlists` — загрузка плейлистов с анимированным индикатором, состоянием ошибки и кнопкой повтора.
- `POST /playlists` — оптимистическое добавление с временным ID и заменой на ID из ответа сервера.
- `PUT /playlists/:id` — оптимистическое редактирование с восстановлением старых данных при ошибке.
- `DELETE /playlists/:id` — оптимистическое удаление с восстановлением элемента на исходное место при ошибке.
- Вход через `POST /auth/login`, передача JWT в `Authorization: Bearer ...` и получение текущей роли через `GET /profile`. Локальная разработка использует HTTP на localhost; production должен работать через HTTPS.
- Регистрация через `POST /auth/register` с подтверждением пароля; после успешной регистрации клиент сразу выполняет вход.
- Поиск и сортировка плейлистов в интерфейсе.
- Отмена GET-запросов с помощью `AbortController`.
- Vite proxy для локальной разработки и CORS middleware на сервере.

> В текущем серверном API чтение плейлистов доступно без входа, а создание, изменение и удаление разрешены только роли `admin`. Новая регистрация получает роль `user`. Назначение администратора выполняется вручную в PostgreSQL; публичного API для повышения роли нет.

## 3. Файлы и назначение кода

### `client/src/api.js` — единый сервис HTTP-запросов

Создаётся экземпляр Axios с базовым адресом API. Перехватчик запросов добавляет JWT из `localStorage` в заголовок `Authorization`. Компонент вызывает функции сервиса, а не формирует URL и заголовки в каждом обработчике.

Основные функции сервиса:

```js
export async function getPlaylists({ signal } = {}) {
  const response = await api.get('/playlists', { signal })
  return response.data.data
}

export async function createPlaylist(playlist) {
  const response = await api.post('/playlists', playlist)
  return response.data.data
}

export async function updatePlaylist(id, playlist) {
  const response = await api.put(`/playlists/${id}`, playlist)
  return response.data.data
}

export async function deletePlaylist(id) {
  await api.delete(`/playlists/${id}`)
}
```

Сервер возвращает список в поле `data`; ответы создания и обновления также содержат сохранённый объект в `data`. Удаление отвечает `204 No Content`, поэтому у него нет JSON-тела.

### `client/src/App.jsx` — состояние интерфейса и CRUD

`useState` хранит список, загрузку, ошибки, поля формы, состояние входа и JWT. При загрузке компонента `useEffect` вызывает `getPlaylists`. До ответа отображается индикатор загрузки; при ошибке показывается сообщение и кнопка повторного запроса.

```jsx
useEffect(() => {
  const controller = new AbortController()
  let isActive = true

  getPlaylists({ signal: controller.signal })
    .then((data) => {
      if (isActive) setPlaylists(data)
    })
    .catch((error) => {
      if (isActive && error.name !== 'CanceledError') {
        setLoadError(getApiErrorMessage(error))
      }
    })
    .finally(() => {
      if (isActive) setIsLoading(false)
    })

  return () => {
    isActive = false
    controller.abort()
  }
}, [loadVersion])
```

`AbortController` передаётся Axios через `signal`. Cleanup отменяет запрос при размонтировании/повторном запуске эффекта, а флаг `isActive` не позволяет обработчикам отменённого эффекта обновлять состояние компонента. Кнопка «Повторить запрос» очищает ошибку, включает состояние загрузки и меняет `loadVersion`, из-за чего эффект выполняет новый GET.

При добавлении интерфейс сначала вставляет плейлист с временным ID, затем отправляет POST. Успешный ответ заменяет временный объект данными сервера; ошибка удаляет временный объект и показывает сообщение.

```js
setPlaylists((current) => [temporaryPlaylist, ...current])
try {
  const savedPlaylist = await createPlaylist(playlistData)
  setPlaylists((current) =>
    current.map((item) => item.id === temporaryId ? savedPlaylist : item),
  )
} catch (error) {
  setPlaylists((current) =>
    current.filter((item) => item.id !== temporaryId),
  )
}
```

Редактирование и удаление работают аналогично: перед запросом применяется изменение в состоянии React, а при ошибке восстанавливается ранее сохранённый объект. Во время мутации повторное изменение блокируется, чтобы пользователь не запускал параллельные операции над одним списком.

`useMemo` формирует отфильтрованный и отсортированный список. Поиск выполняется по названию, описанию, владельцу и названиям/исполнителям треков; сортировка доступна по дате добавления и названию. Это клиентская фильтрация загруженных плейлистов, а не дополнительный запрос к API.

### `client/src/App.jsx` — авторизация

Переключатель формы позволяет войти или зарегистрировать аккаунт. Регистрация отправляет email и пароль в `POST /auth/register`, проверяет совпадение паролей на клиенте и после ответа `201` автоматически вызывает `POST /auth/login`. Полученный JWT сохраняется в `localStorage` под ключом `stpp-auth-token`. Затем приложение получает роль и email через `GET /profile`; при недействительном токене локальная копия удаляется. Кнопка «Выйти» удаляет токен. Сервер требует пароль длиной от 8 символов.

JWT не содержит пароль и отправляется только через HTTPS в реальной публикации. Для локальной работы используется HTTP на localhost. Клиент не может назначить себе `admin`: роль проверяет сервер.

### `client/vite.config.js` — адрес API в разработке

Браузер вызывает относительные адреса `/api/...`; Vite перенаправляет их на сервер разработки. Префикс `/api` удаляется, так как серверные маршруты объявлены как `/playlists`, `/auth/login` и `/profile`.

Построчно:

```js
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: env.VITE_SERVER_URL || 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
```

- `defineConfig` — helper Vite для настройки конфигурации.
- `mode` — режим запуска Vite, например `development`.
- `loadEnv` читает переменные `.env`; `process.cwd()` указывает рабочую папку клиента.
- `plugins: [react()]` включает обработку React/JSX.
- `server.proxy['/api']` говорит dev-серверу перенаправлять запросы с префиксом `/api`.
- `target` выбирает сервер из `VITE_SERVER_URL`; если переменной нет, берётся localhost:3000.
- `changeOrigin: true` устанавливает HTTP Host в соответствии с целевым сервером.
- `rewrite` удаляет только начальный `/api`: запрос браузера `/api/playlists` уходит в Express как `/playlists`.

Это настройка разработки, а не самостоятельный backend и не хранение данных. Для production потребуется настроить публичный API URL или reverse proxy; сервер CORS также должен разрешать фактический origin клиента.

### `server.js` — CORS

Сервер разрешает запросы от Vite (`http://localhost:5173` и `http://127.0.0.1:5173` по умолчанию). Список origins можно задать переменной `CLIENT_ORIGIN`, перечислив адреса через запятую. В режиме разработки Vite proxy обычно делает запросы same-origin; CORS middleware нужен для прямых запросов клиента к серверу.

Важные строки:

```js
app.use(express.json())
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.includes(origin))
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use('/auth', authRoutes)
app.get('/profile', authenticate, authController.getProfile)
app.use('/playlists', playlistRoutes)
```

`express.json()` разбирает JSON тела запроса и записывает объект в `req.body`. CORS — политика браузера для запросов между разными origin; localhost:5173 и localhost:3000 различаются портом и считаются разными origin. Callback разрешает запрос без browser Origin (например, серверный запрос) или origin из allowlist. После CORS подключаются маршруты: auth prefix, защищённый профиль и набор playlist routes.

Функция `startServer()` до открытия порта проверяет `JWT_SECRET` и вызывает `sequelize.authenticate()`. Это проверка конфигурации JWT и соединения с PostgreSQL. Только после успеха вызывается `app.listen(...)`.

### `routes/playlistRoutes.js` — кто может вызвать endpoint

```js
router.get('/', playlistController.getPlaylists)
router.get('/:id', playlistController.getPlaylistById)
router.post('/', authenticate, isAdmin, playlistController.createPlaylist)
router.put('/:id', authenticate, isAdmin, playlistController.updatePlaylist)
router.delete('/:id', authenticate, isAdmin, playlistController.deletePlaylist)
```

`router` — объект маршрутов Express, созданный через `express.Router()`. Путь `/:id` означает параметр URL, доступный как `req.params.id`. GET не имеет auth middleware и разрешён публично. Для POST/PUT/DELETE порядок важен: сначала authenticate устанавливает `req.user`; затем isAdmin читает `req.user.role`; только после обеих проверок вызывается controller. Без токена ответ 401, с токеном обычного user — 403.

### `controllers/playlistController.js` и слой модели

Controller принимает объекты Express `req` (входящий запрос) и `res` (ответ), проверяет данные и связывает HTTP с моделью. Например:

```js
async function createPlaylist(req, res, next) {
  try {
    const validationError = validatePlaylistPayload(req.body)
    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    const playlist = await playlistModel.create({
      title: req.body.title.trim(),
      description: req.body.description ? req.body.description.trim() : '',
      owner: req.body.owner.trim(),
      isPublic: req.body.isPublic,
      tracks: req.body.tracks,
      listenersOnline: req.body.listenersOnline,
    })

    res.status(201).json({
      message: 'Плейлист успешно создан',
      data: playlist,
    })
  } catch (error) {
    next(error)
  }
}
```

- `req.body` появляется после `express.json()` и содержит JSON, отправленный Axios.
- `validatePlaylistPayload` проверяет типы и обязательные поля до обращения к базе.
- `trim()` удаляет пробелы по краям строк.
- `await playlistModel.create(...)` ждёт запись Sequelize в БД.
- `res.status(201).json(...)` формирует HTTP-ответ; `data` — объект, который вернула модель, включая DB ID.
- `catch` передаёт ошибку в Express error handler через `next(error)`.

Аналогично controller GET вызывает `playlistModel.getAll()` и отвечает 200; PUT вызывает update и отвечает 200; DELETE вызывает remove и отвечает 204 без тела.

`models/playlistModel.js` — функции `findAll`, `findByPk`, `create`, `update`, `destroy` делегируют операции Sequelize. `models/Playlist.js` описывает колонки `playlists`, например `title`, `owner`, JSONB `tracks`, `isPublic` и timestamps. Именно Sequelize model исполняет SQL; React state и controller сами строку БД не вставляют.

### `middleware/auth.js` и `middleware/isAdmin.js`

1. `auth.js` читает `Authorization` и проверяет формат `Bearer <JWT>`.
2. `jwt.verify(token, secret)` проверяет подпись и срок действия.
3. Middleware берёт ID из проверенного payload и выполняет `User.findByPk`.
4. Актуальные id/email/role из таблицы пользователей помещаются в `req.user`.
5. `next()` передаёт обработку следующему middleware/контроллеру.
6. `isAdmin.js` возвращает 403, если `req.user.role` не равен `'admin'`; иначе вызывает `next()`.

В payload JWT хранится идентификатор/email, а роль на каждом защищённом запросе читается из БД. Поэтому нельзя назначить себе admin, изменив JavaScript в браузере или добавив поле role в POST body.

### `client/src/App.css` и `client/index.html`

В `App.css` оформление разделено классами: `.session-panel` для авторизации, `.login-form` для полей, `.request-error` и `.action-message` для состояний, `.loading-spinner` для API-загрузки. `@keyframes loading-spin` задаёт вращение, а `animation: loading-spin 700ms linear infinite` запускает его бесконечно. Media queries перестраивают форму и сетку для узких экранов.

В `index.html` есть отдельный `.startup-loading` на случай, когда JavaScript React ещё не загрузился. Это статическая HTML-заставка; её не следует путать с React-состоянием `isLoading`, которое означает ожидание ответа GET.

## 3.1 Подробный разбор кода: от запуска React до данных на экране

В этом разделе объясняется не только назначение файлов, но и откуда берутся значения, куда они передаются и что происходит после каждой важной строки. Номера строк могут меняться при редактировании; ищи в файле указанные имена функций и состояния.

### Шаг 1. Как запускается React

**Файл: `client/src/main.jsx`**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- `import` подключает нужные библиотеки или файлы проекта.
- `document.getElementById('root')` находит `<div id="root">` из `client/index.html`.
- `createRoot(...)` создаёт React-корень в этом HTML-элементе.
- `.render(...)` отображает React-разметку в корне.
- `<App />` — главный компонент, объявленный и экспортированный из `client/src/App.jsx`.
- `<StrictMode>` — диагностическая оболочка React в разработке. Она помогает обнаруживать некорректные эффекты и может повторно выполнить цикл эффекта setup → cleanup → setup. Поэтому в DevTools иногда виден отменённый начальный GET, за которым следует успешный GET.

В `client/index.html` перед запуском JavaScript лежит простая начальная заставка «Загружаем приложение…». Это не загрузка плейлистов. Когда React запускается, он заменяет HTML-заставку своим интерфейсом. Затем сам React показывает «Загружаем плейлисты с сервера…», пока ждёт API. Это две разные стадии загрузки.

### Шаг 2. Состояния компонента `App`

**Файл: `client/src/App.jsx`, начало функции `App`**

Состояние — данные компонента, изменение которых вызывает повторную отрисовку интерфейса. Шаблон:

```js
const [value, setValue] = useState(initialValue)
```

`value` — текущее значение; `setValue` — функция изменения; `initialValue` — значение при первом рендере. Не изменяй объекты и массивы из state напрямую: создавай новые через spread, `map`, `filter` и функциональный setter.

Состояния приложения:

| Состояние | Что хранит | Начальное значение |
|---|---|---|
| `playlists` | Полученные и отображаемые плейлисты | `[]` |
| `isLoading` | Выполняется ли начальный GET | `true` |
| `loadError` | Ошибку получения списка; пустая строка означает «ошибки нет» | `''` |
| `loadVersion` | Счётчик для повторного запуска эффекта GET | `0` |
| `actionMessage` | Результат POST/PUT/DELETE для пользователя | `''` |
| `isMutating` | Идёт ли POST, PUT или DELETE | `false` |
| `query` | Текст поиска по уже загруженным объектам | `''` |
| `sortOrder` | Режим сортировки: `newest` или `title` | `'newest'` |
| `editingId` | ID редактируемой записи; `null` означает создание | `null` |
| `token` | JWT, прочитанный из `localStorage` или полученный при login | сохранённый токен либо `''` |
| `user` | Профиль, полученный с сервера по JWT | `null` |
| `authLoading` | Вход или проверка профиля ещё выполняется | зависит от наличия токена |
| `authError` / `authNotice` | Ошибка или информационное сообщение авторизации | `''` |
| `authMode` | Показывать вход или регистрацию | `'login'` |
| `loginFields` | Значения полей email/password/подтверждения | объект пустых значений |
| `form` | Значения формы плейлиста | результат `createEmptyForm()` |

Например, `setPlaylists(data)` не пишет в PostgreSQL. Он обновляет только состояние React в памяти браузера. Постоянное сохранение выполняет серверный маршрут POST, который доходит до Sequelize и PostgreSQL.

### Шаг 3. `useEffect`: загрузка списка и отображение состояний

**Файл: `client/src/App.jsx`, первый эффект внутри `App`**

```jsx
useEffect(() => {
  const controller = new AbortController()
  let isActive = true

  getPlaylists({ signal: controller.signal })
    .then((data) => {
      if (isActive) {
        setPlaylists(data)
      }
    })
    .catch((error) => {
      if (isActive && error.name !== 'CanceledError') {
        setLoadError(getApiErrorMessage(error))
      }
    })
    .finally(() => {
      if (isActive) {
        setIsLoading(false)
      }
    })

  return () => {
    isActive = false
    controller.abort()
  }
}, [loadVersion])
```

Разбор по строкам:

1. `useEffect(() => { ... }, [loadVersion])` запускает побочное действие после отображения компонента. Здесь побочный эффект — HTTP GET.
2. `new AbortController()` создаёт контроллер, с помощью которого можно отменить запрос. `controller.signal` — сигнал отмены.
3. `isActive = true` помечает этот запуск эффекта как актуальный.
4. `getPlaylists({ signal: controller.signal })` вызывает функцию API-сервиса и передаёт ей сигнал.
5. `.then((data) => ...)` выполняется при успешном ответе. `data` — массив, который вернула API-функция; `setPlaylists(data)` переносит его в React state.
6. Проверка `isActive` не позволяет старому эффекту менять state после очистки.
7. `.catch((error) => ...)` выполняется при сетевой или HTTP-ошибке. `getApiErrorMessage` выбирает понятный текст.
8. `error.name !== 'CanceledError'` отсекает штатную отмену. Отмена запроса не является для пользователя ошибкой сервера.
9. `.finally(...)` выполняется и после успеха, и после ошибки, поэтому выключает индикатор загрузки в обоих случаях.
10. Функция, возвращаемая из `useEffect`, — cleanup. React вызывает её при размонтировании компонента и перед повторным запуском эффекта.
11. `controller.abort()` отправляет сигнал отмены в Axios.
12. `[loadVersion]` — массив зависимостей. При первом рендере эффект запускается; когда `loadVersion` меняется, React очищает предыдущий запуск и запускает новый.

Состояния отображаются в JSX по очереди:

```jsx
{isLoading ? (
  <p className="empty-state loading-state" role="status">
    <span className="loading-spinner" aria-hidden="true" />
    Загружаем плейлисты с сервера…
  </p>
) : loadError ? (
  <div className="empty-state error-state" role="alert">
    <h3>Не удалось загрузить плейлисты</h3>
    <p>{loadError}</p>
    <button type="button" onClick={retryLoading}>
      Повторить запрос
    </button>
  </div>
) : (
  <div className="playlist-grid">
    {visiblePlaylists.map((playlist) => (
      <article key={playlist.id}>
        <h3>{playlist.title}</h3>
      </article>
    ))}
  </div>
)}
```

`isLoading` имеет приоритет: пока запрос выполняется, пользователь видит спиннер. После ответа React показывает ошибку, пустой список или карточки. Само вращение реализовано CSS-классами `.loading-spinner` и `@keyframes loading-spin` в `client/src/App.css`.

В сокращённом примере выше оставлены только заголовки карточек; полный JSX карточки находится в `App.jsx` и также выводит описание, владельца, треки и действия редактирования/удаления. `key={playlist.id}` нужен React для сопоставления элементов списка между рендерами; ID должен быть стабильным, поэтому временная карточка использует временный ID, а после POST — ID из БД.

**Повтор запроса:**

```js
function retryLoading() {
  setIsLoading(true)
  setLoadError('')
  setLoadVersion((version) => version + 1)
}
```

- Ошибка очищается и индикатор включается.
- Функциональный setter получает предыдущее значение счётчика и увеличивает его.
- Изменение `loadVersion` запускает эффект выше, поэтому выполняется новый GET.
- `version => version + 1` использует последнее состояние React и безопаснее, чем вычисление от потенциально устаревшей переменной.

### Шаг 4. `client/src/api.js`: Axios и путь запроса

```js
const TOKEN_KEY = 'stpp-auth-token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})
```

- `TOKEN_KEY` — единое имя ключа токена в браузерном `localStorage`.
- `axios.create(...)` создаёт настроенный экземпляр Axios, который используют все API-функции.
- `baseURL` — общий префикс маршрутов. Если `VITE_API_URL` не задан, используется `/api`.
- `import.meta.env` — механизм доступа клиента Vite к переменным окружения. В клиентский bundle разрешено помещать только публичные настройки, не пароль БД и не `JWT_SECRET`.
- `Content-Type: application/json` сообщает Express, что тело POST/PUT передаётся в JSON.

**Request interceptor:**

```js
api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

Interceptor запускается перед каждым запросом через `api`. Он читает JWT из браузера, при наличии добавляет `Authorization: Bearer <JWT>` и возвращает `config`, чтобы Axios продолжил отправку. Он не подтверждает подлинность токена — подпись и срок проверяет сервер.

**Функции API и источники параметров:**

```js
export async function getPlaylists({ signal } = {}) {
  const response = await api.get('/playlists', { signal })
  return response.data.data
}

export async function createPlaylist(playlist) {
  const response = await api.post('/playlists', playlist)
  return response.data.data
}

export async function updatePlaylist(id, playlist) {
  const response = await api.put(`/playlists/${id}`, playlist)
  return response.data.data
}

export async function deletePlaylist(id) {
  await api.delete(`/playlists/${id}`)
}
```

- `export` позволяет импортировать функцию в `App.jsx`.
- `async` означает, что функция возвращает Promise; `await` ждёт ответ сервера.
- `signal` приходит из `AbortController` в `App.jsx`; `{ signal } = {}` делает параметр необязательным.
- `playlist` — объект, собранный из формы в `submitForm`.
- `id` — ID объекта из PostgreSQL, который находится в `playlist.id`.
- `response.data` — JSON-тело HTTP-ответа; `.data.data` — поле с плейлистом/массивом в принятом формате API.
- DELETE возвращает статус `204 No Content`, поэтому JSON-ответ не читается.

### Шаг 5. Поля формы и преобразование треков

**Файл: `client/src/App.jsx`, `updateForm`, `tracksFromText`, `tracksToText`**

```js
function updateForm(event) {
  const { name, value, type, checked } = event.target
  setForm((currentForm) => ({
    ...currentForm,
    [name]: type === 'checkbox' ? checked : value,
  }))
}
```

- `event` создаёт браузер при изменении input/textarea/checkbox.
- `event.target` — конкретное HTML-поле, в котором произошло событие.
- `name` связывает поле с ключом объекта формы, например `title`, `owner` или `isPublic`.
- Для обычного поля берётся `value`; для checkbox берётся boolean `checked`.
- `...currentForm` копирует остальные значения, чтобы изменить только одно поле.
- Новому объекту присваивается `[name]`, то есть ключ вычисляется из имени поля.

Треки в форме — обычный текст, по одному треку на строку. `tracksFromText` превращает строки в объекты:

```js
function tracksFromText(value) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.match(/\s+[—–-]\s+/)
      if (!separator) {
        return { title: line, artist: 'Неизвестный исполнитель' }
      }
      const separatorIndex = line.indexOf(separator[0])
      return {
        title: line.slice(0, separatorIndex).trim(),
        artist: line.slice(separatorIndex + separator[0].length).trim(),
      }
    })
    .filter((track) => track.title && track.artist)
}
```

`.split('\n')` делит текст по строкам; `trim()` убирает пробелы по краям; `filter(Boolean)` убирает пустые строки. Регулярное выражение ищет тире/дефис, окружённый пробелами. Левая часть становится `title`, правая — `artist`. Если разделителя нет, исполнитель получает значение «Неизвестный исполнитель». Итоговый массив соответствует серверной модели: `[{ title, artist }, ...]`.

`tracksToText` делает обратное для редактирования: из объектов треков собирает строки `title — artist`, чтобы поместить их в textarea.

### Шаг 6. Авторизация: регистрация и вход

**Файл: `client/src/App.jsx`, `handleAuthSubmit`**

```js
async function handleAuthSubmit(event) {
  event.preventDefault()

  if (
    authMode === 'register' &&
    loginFields.password !== loginFields.passwordConfirmation
  ) {
    setAuthError('Пароли не совпадают.')
    return
  }

  setAuthLoading(true)
  setAuthError('')
  setAuthNotice('')
  let accountCreated = false

  try {
    if (authMode === 'register') {
      await register({
        email: loginFields.email,
        password: loginFields.password,
      })
      accountCreated = true
    }

    const result = await login({
      email: loginFields.email,
      password: loginFields.password,
    })
    if (!result.token) {
      throw new Error('Сервер не вернул JWT-токен')
    }

    window.localStorage.setItem(TOKEN_KEY, result.token)
    setToken(result.token)
    setAuthMode('login')
    setLoginFields((currentFields) => ({
      ...currentFields,
      password: '',
      passwordConfirmation: '',
    }))
    if (accountCreated) {
      setAuthNotice('Аккаунт создан, вход выполнен.')
    }
  } catch (error) {
    setAuthError(getApiErrorMessage(error))
    setAuthLoading(false)
    if (accountCreated) {
      setAuthMode('login')
      setAuthNotice('Аккаунт создан. Теперь войдите с указанными данными.')
    }
  }
}
```

1. `event.preventDefault()` не позволяет HTML-форме перезагрузить страницу.
2. В режиме регистрации проверяется совпадение паролей. Это удобная клиентская проверка; сервер независимо проверяет email, уникальность и длину пароля.
3. `setAuthLoading(true)` отключает кнопку и показывает «Вход…»/«Создаём аккаунт…». Старые сообщения очищаются.
4. Если выбран `register`, вызывается API `POST /auth/register`. В `accountCreated` запоминается, что пользователь уже создан.
5. После регистрации (или сразу в режиме входа) вызывается `POST /auth/login`.
6. Серверный ответ находится в `result`. В нём ожидается поле `token`.
7. Токен сохраняется в `localStorage` и одновременно попадает в React state `token`.
8. Изменение `token` запускает эффект профиля, который делает `GET /profile`; profile-ответ содержит актуальные email и роль.
9. Пароль очищается из полей после успешного входа.
10. `catch` отображает ошибку, например «email уже существует» или неверный пароль. Если аккаунт успел создаться, но запрос входа завершился ошибкой, интерфейс переключается на форму входа и сообщает об этом.

После успешного login `authLoading` не снимается сразу в `handleAuthSubmit`: токен запускает профильный эффект, а его `.finally()` снимает флаг после ответа `/profile`. При ошибке регистрации/login профильный запрос не начинается, поэтому `catch` сам вызывает `setAuthLoading(false)`.

Регистрация не создаёт admin. Сервер `controllers/authController.js` создаёт нового пользователя с ролью `user`; повышение роли через публичный API отсутствует.

### Шаг 7. Создание плейлиста — путь каждого значения

**Файл: `client/src/App.jsx`, `submitForm`**

Путь от ввода до базы:

1. Пользователь вводит текст в поля формы.
2. `onChange={updateForm}` передаёт событие в `updateForm`.
3. `setForm` обновляет объект формы в React state.
4. Нажатие submit вызывает `submitForm`.
5. Из `form` формируется объект `playlistData`.
6. `createPlaylist(playlistData)` в `api.js` отправляет JSON POST.
7. Vite proxy перенаправляет `/api/playlists` на Express `/playlists`.
8. Маршрут Express применяет JWT middleware и admin middleware.
9. Controller валидирует данные и вызывает Sequelize model.
10. `Playlist.create(...)` выполняет INSERT в PostgreSQL.
11. Сервер отвечает `201` и объектом с ID/timestamps из базы.
12. Axios возвращает объект в `App`; временная карточка заменяется серверной.

До запроса `submitForm` проверяет, не идёт ли уже другая мутация, что заполнены `title` и `owner`, и что пользователь вошёл. Затем собирает поля:

- `title`, `owner`, `description` — текст из соответствующих полей, очищенный от пробелов по краям;
- `isPublic` — boolean из checkbox;
- `tracks` — массив от `tracksFromText`;
- `listenersOnline` — при создании 0; при редактировании текущее значение существующей записи.

Оптимистический POST:

```js
const temporaryId = createTemporaryId()
const temporaryPlaylist = {
  id: temporaryId,
  ...playlistData,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}
setPlaylists((currentPlaylists) => [temporaryPlaylist, ...currentPlaylists])

try {
  const savedPlaylist = await createPlaylist(playlistData)
  setPlaylists((currentPlaylists) =>
    currentPlaylists.map((playlist) =>
      playlist.id === temporaryId ? savedPlaylist : playlist,
    ),
  )
} catch (error) {
  setPlaylists((currentPlaylists) =>
    currentPlaylists.filter((playlist) => playlist.id !== temporaryId),
  )
} finally {
  setIsMutating(false)
}
```

- Временный ID нужен, потому что ID из PostgreSQL ещё не получен.
- Вставка через `setPlaylists` немедленно отображает карточку; это изменение только браузерного state, ещё не подтверждение базы.
- `await createPlaylist(...)` ждёт HTTP-ответ.
- При успехе серверный объект заменяет временный: в нём уже реальный DB ID и timestamps.
- При ошибке временная карточка убирается, а сообщение попадает в `actionMessage`.
- `finally` выполняется после успеха и ошибки и снова разрешает кнопки.

**Как доказать, что запись действительно в PostgreSQL:** дождись `POST /api/playlists` со статусом `201`, затем перезагрузи страницу и проверь, что плейлист снова приходит в `GET /api/playlists`. Одна только карточка до ответа может быть временной.

### Шаг 8. Редактирование и удаление

**Редактирование:** `editPlaylist(playlist)` получает весь объект из карточки, записывает `playlist.id` в `editingId` и копирует поля в `form`. `tracksToText` преобразует массив объектов треков обратно в текст. При отправке формы наличие `editingId` выбирает ветку PUT.

Ветка PUT сохраняет `previousPlaylist` — копию состояния до изменения. Затем `setPlaylists` немедленно отображает новые поля. `updatePlaylist(editingId, playlistData)` отправляет PUT. При успехе локальная версия заменяется ответом сервера; при ошибке `previousPlaylist` восстанавливается. `finally` снимает `isMutating`.

**Удаление:** `removePlaylist(playlistId)`:

1. Проверяет, что другая операция не выполняется.
2. Находит исходный объект и индекс до удаления.
3. Убеждается, что есть объект и JWT.
4. Убирает объект из React state сразу, не ожидая DELETE.
5. Отправляет `DELETE /playlists/:id`.
6. При успехе показывает уведомление; API отвечает `204`.
7. При ошибке вставляет исходный объект обратно на сохранённый индекс.
8. В `finally` снимает блокировку.

Удаление из React state само по себе не удаляет строку PostgreSQL. Постоянное удаление выполняет только сервер после успешной обработки DELETE.

### Шаг 9. Фильтрация и сортировка

`visiblePlaylists` вычисляется через `useMemo` из `playlists`, `query` и `sortOrder`:

1. Поисковая строка обрезается через `trim()` и приводится к нижнему регистру.
2. Для каждого плейлиста собирается строка из названия, описания, владельца и названий/исполнителей треков.
3. `.filter(...)` оставляет совпадения.
4. `[...filtered].sort(...)` сортирует копию массива, не изменяя React state напрямую.
5. Режим `title` сортирует через `localeCompare`; иначе сравнивается `createdAt` от новых к старым.

Это локальная фильтрация загруженного списка. При вводе текста новый HTTP-запрос не выполняется.

## 3.2 Дополнительное улучшение — подробно

### Что именно выбрано

Дополнительное улучшение лабораторной — **отмена незавершённых запросов GET с помощью `AbortController` при очистке `useEffect`**. Она применяется к первоначальной загрузке списка плейлистов и к запросу профиля. Это улучшение не является retry: кнопка повтора — отдельная обработка ошибки, а дополнительная задача — именно отмена устаревшего GET.

### Зачем нужна отмена

Запрос может стать ненужным, если компонент размонтирован, эффект повторно запускается или пользовательское состояние сменилось до ответа. Без cleanup поздний ответ может попытаться изменить state уже неактуального компонента. `AbortController` просит Axios/браузер отменить HTTP-запрос; флаг `isActive` отдельно защищает от применения устаревшего результата.

### Цепочка отмены по файлам

1. `App.jsx`: эффект создаёт `new AbortController()`.
2. `App.jsx`: передаёт `controller.signal` в `getPlaylists({ signal })` или `getProfile({ signal })`.
3. `api.js`: передаёт этот сигнал Axios, например `api.get('/playlists', { signal })`.
4. Cleanup эффекта в `App.jsx` вызывает `controller.abort()`.
5. Axios отклоняет Promise отменённого запроса с `CanceledError`.
6. `.catch` проверяет `error.name !== 'CanceledError'` и не показывает штатную отмену как сетевую ошибку.
7. `isActive = false` не даёт старому callback вызвать `setPlaylists`, `setUser` или setter ошибки.

### Как проверить вручную

В development приложение обёрнуто в React `StrictMode` (`client/src/main.jsx`). В режиме разработки StrictMode проверяет эффекты дополнительным циклом setup → cleanup → setup. Поэтому после полной загрузки приложения открой DevTools → Network, включи `Preserve log`, очисти список и перезагрузи страницу. При медленной сети можно увидеть отменённый первый `GET /api/playlists` и последующий успешный `GET /api/playlists` со статусом `200`.

Для проверки:

1. Сначала открой сайт без throttling и дождись карточек — так JavaScript React уже загружен.
2. В Network выбери медленный профиль сети (можно создать Custom с задержкой около 3000 ms) и включи `Preserve log`.
3. Очисти список запросов и перезагрузи страницу.
4. Найди `GET /api/playlists`, отмеченный `(canceled)`/`net::ERR_ABORTED`, и последующий GET со статусом 200.
5. Если браузер не показывает отменённый GET, попробуй увеличить задержку; это зависит от таймингов dev-сборки и браузера. Не называй обычный `failed` из-за выключенного backend отменой эффекта.

Возможен ещё один способ проверки: при открытой странице временно размонтировать и смонтировать компонент через тестовую оболочку/React DevTools или вызвать повтор эффекта в dev. Для отчёта достаточно Network-демонстрации StrictMode, если отмена реально видна.

### Границы выбранного решения

- Отмена относится к GET загрузки списка и профиля; операции POST/PUT/DELETE намеренно не отменяются при unmount: сервер мог уже принять и сохранить изменение, а прерывание клиента не гарантирует отмену транзакции.
- Отмена не удаляет/не меняет записи PostgreSQL.
- StrictMode — диагностический способ увидеть cleanup при разработке; в production двойной проверочный цикл не выполняется.
- `isActive` защищает состояние React, а `AbortController` пытается прекратить сам HTTP-запрос. Это связанные, но разные меры.
- Если преподаватель спросит «какая дополнительная задача?», ответ: «Отмена GET при очистке эффекта через AbortController; сигнал проходит из App.jsx в Axios-функции api.js, а cleanup вызывает abort».

### Как отличить от других улучшений

В интерфейсе также есть поиск и сортировка, однако это локальная обработка уже загруженных данных. Retry-кнопка относится к обработке ошибок. В отчёте как выбранное дополнительное улучшение заявляется AbortController, потому что это отдельный сценарий из списка лабораторной: отмена запроса при размонтировании/очистке эффекта.

## 3.3 Серверная часть: от маршрута до PostgreSQL

Чтобы объяснить, почему React карточка сохраняется между перезагрузками, проследи серверную цепочку:

`client/src/api.js` → `client/vite.config.js` → `server.js` → `routes/playlistRoutes.js` → middleware → `controllers/playlistController.js` → `models/playlistModel.js` → `models/Playlist.js` → PostgreSQL.

- `client/vite.config.js`: проксирует `/api/playlists` к `http://localhost:3000/playlists`; rewrite удаляет `/api`.
- `server.js`: `express.json()` разбирает JSON тела запроса; CORS задаёт допустимые origin и заголовки; `app.use('/playlists', playlistRoutes)` подключает маршруты.
- `routes/playlistRoutes.js`: GET публичен; POST/PUT/DELETE последовательно проходят `authenticate`, затем `isAdmin`, затем controller.
- `middleware/auth.js`: извлекает Bearer-токен, проверяет JWT подпись/срок, ищет пользователя в таблице users и помещает актуальные id/email/role в `req.user`.
- `middleware/isAdmin.js`: возвращает 403, если `req.user.role !== 'admin'`.
- `controllers/playlistController.js`: валидирует тело, вызывает модель и выбирает статус ответа: POST 201, PUT 200, DELETE 204.
- `models/playlistModel.js`: выполняет Sequelize `findAll`, `create`, `update`, `destroy`.
- `models/Playlist.js`: описывает поля таблицы `playlists`; Sequelize превращает вызов модели в SQL для PostgreSQL.

Проверка прав сервера важнее ограничений интерфейса. Скрыть кнопку или убрать карточку в React не является авторизацией: любой клиент может отправить HTTP-запрос напрямую. Поэтому защищены сами серверные POST/PUT/DELETE routes.

## 3.4 Как читать частые конструкции в коде

- `async function ...`: функция может выполнять асинхронные операции и возвращает Promise.
- `await`: ждёт Promise внутри async-функции; код после него выполняется после ответа или передаёт ошибку в `catch`.
- `try/catch/finally`: `try` — операция; `catch` — отказ; `finally` — очистка, выполняемая в любом случае.
- `setState((current) => ...)`: functional update; `current` — последнее состояние React, полезно при обновлении массивов.
- `map`: создаёт новый массив, заменяя отдельный объект.
- `filter`: создаёт новый массив, исключая объект.
- `[...array]`: поверхностная копия массива.
- `{ ...object, field: value }`: копирует поля объекта и задаёт новое значение выбранного поля.
- `event.preventDefault()`: отменяет стандартное поведение браузера, например перезагрузку при отправке формы.
- `role="status"` и `role="alert"`: помогают вспомогательным технологиям понять, что это статус/важное сообщение; сетевую логику не меняют.
- `aria-hidden="true"`: скрывает декоративный spinner от screen reader, потому что рядом уже есть текст статуса.
- `required`, `type="email"`, `minLength`: первичная проверка браузера; полноценную валидацию обязательно выполняет сервер.

## 4. Настройка и запуск

Нужны Node.js, npm и настроенный PostgreSQL, используемый сервером из предыдущих лабораторных работ. Сервер читает параметры подключения из корневого `.env`. Не публикуй этот файл и не помещай секреты в скриншоты или Git.

В корневом `.env` должны быть настроены существующая строка PostgreSQL `DATABASE_URL` и случайный `JWT_SECRET` длиной не менее 32 байт. Если секрет ещё нужно создать, в PowerShell выполни:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Скопируй выведенное значение в `.env`:

```dotenv
DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/stpp_playlists
JWT_SECRET=ВСТАВЬ_СЮДА_СЛУЧАЙНУЮ_СТРОКУ_ИЗ_КОМАНДЫ
```

Значения в примере условные: укажи параметры своей базы данных. Если схема ещё не создана, выполни миграции и начальные данные:

```powershell
npm.cmd install
npm.cmd run db:migrate
npm.cmd run db:seed
```

### Терминал 1 — сервер

Из корневой папки репозитория запусти:

```powershell
npm.cmd run dev
```

Сервер должен быть доступен по адресу `http://localhost:3000`. Оставь этот терминал работающим.

### Терминал 2 — клиент

Открой второй терминал в корневой папке репозитория:

```powershell
npm.cmd --prefix client install
Copy-Item client\.env.example client\.env
npm.cmd --prefix client run dev
```

Открой адрес, напечатанный Vite (обычно `http://localhost:5173`). Клиентские параметры по умолчанию:

```dotenv
VITE_API_URL=/api
VITE_SERVER_URL=http://localhost:3000
```

После изменения `.env` клиента перезапусти Vite. Для другого адреса сервера укажи его в `VITE_SERVER_URL`.

## 5. Подготовка учётной записи администратора

1. Зарегистрируй учётную запись в API запросом `POST http://localhost:3000/auth/register`:

```http
Content-Type: application/json
```

```json
{
  "email": "student@example.com",
  "password": "StrongPassword123!"
}
```

2. Регистрация назначает роль `user`. Чтобы проверять запись плейлистов, назначь административную роль через PostgreSQL, заменив email на свой:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'student@example.com';
```

3. Перезайди в приложении (или нажми «Выйти», затем войди снова), чтобы проверить роль через `/profile`. Назначение роли не доступно из клиентского интерфейса.

## 6. Проверка API и интерфейса

### Вход

Отправь `POST http://localhost:3000/auth/login` с теми же email и password. При успехе ожидается `200 OK` и поле `token`. Не публикуй сам токен.

В интерфейсе введи те же данные и нажми «Войти». После успешного входа отобразятся email и роль. Axios автоматически добавит Bearer-токен к API-запросам.

### Получение данных

При открытии страницы клиент выполняет:

```http
GET http://localhost:3000/playlists
```

Ожидается `200 OK` и массив объектов в `data`. Проверь также состояния при недоступном сервере: клиент покажет текст ошибки; после запуска сервера кнопка «Повторить запрос» снова загрузит список.

### CRUD-проверки

В приложении выполни операции с плейлистом:

| Действие | Запрос | Ожидаемый результат |
|---|---|---|
| Создать | `POST /playlists` | `201`, новый объект в списке |
| Изменить | `PUT /playlists/:id` | `200`, обновлённый объект |
| Удалить | `DELETE /playlists/:id` | `204`, объект удалён |

Пример тела создания/обновления:

```json
{
  "title": "Вечерний джаз",
  "description": "Спокойные композиции",
  "owner": "student@example.com",
  "isPublic": true,
  "tracks": [
    {
      "title": "Blue Hour",
      "artist": "Jazz Collective",
      "durationSec": 276
    }
  ],
  "listenersOnline": 0
}
```

Треки вводятся в форме по одному на строку. Формат `Название — Исполнитель` сохраняет оба поля; строка без разделителя сохраняется с исполнителем «Неизвестный исполнитель».

Проверь откат оптимистического обновления: войди под ролью `user` и попробуй изменить или удалить плейлист. Сервер вернёт отказ авторизации, интерфейс покажет сообщение, а список вернётся к серверному состоянию. Выход из аккаунта тоже блокирует изменение, но на клиенте до отправки запроса, поэтому для проверки серверного отказа используй именно роль `user`. После проверки войди под аккаунтом с ролью `admin`.

## 7. Что показать в отчёте

Сделай реальные скриншоты приложения и запросов, на которых видны адрес, метод, статус и результат:

1. список плейлистов после успешного `GET`;
2. форма входа и отображённая роль после входа;
3. успешное создание плейлиста;
4. успешное изменение и удаление;
5. сообщение об ошибке и восстановленное состояние при отказе сервера.

Секрет `JWT_SECRET`, пароль базы данных, пароль пользователя и полный JWT на скриншоты не помещай.

Текстовый шаблон отчёта с титульным листом, схемой взаимодействия, ключевыми
фрагментами кода и 16 примерными ответами на контрольные вопросы находится в
[`LAB5_REPORT.txt`](LAB5_REPORT.txt). Замени поля-заполнители и вставь свои
скриншоты перед сдачей.

Подробные пошаговые инструкции для каждого скриншота и соответствующие участки
кода приведены в [`LAB5_SCREENSHOT_GUIDE.md`](LAB5_SCREENSHOT_GUIDE.md).

Для подробного объяснения React state/hooks, API-запросов, JWT и серверной
цепочки для начинающего используй [`LAB5_BEGINNER_EXPLANATION.txt`](LAB5_BEGINNER_EXPLANATION.txt).

## 8. Проверка соответствия заданию

- [x] Список получен серверным GET с состояниями загрузки/ошибки и повторным запросом.
- [x] Добавление выполняется POST с оптимистическим обновлением и откатом.
- [x] Редактирование выполняется PUT с оптимистическим обновлением и откатом.
- [x] Удаление выполняется DELETE с оптимистическим обновлением и откатом.
- [x] JWT хранится после входа и автоматически добавляется к запросам Axios.
- [x] Используется API проекта на Express/PostgreSQL; серверные права RBAC сохранены.
- [x] Реализована отмена запросов при очистке эффекта как дополнительное улучшение.
- [x] Поиск и сортировка сохранены для удобной работы с коллекцией.

## 9. Вывод

React-клиент подключён к REST API: плейлисты загружаются из PostgreSQL, а CRUD-операции отправляются на сервер. Обработка загрузки и ошибок делает результат запросов понятным пользователю; оптимистическое обновление позволяет сразу увидеть изменение, а откат сохраняет согласованность интерфейса при отказе сервера. JWT передаётся Axios автоматически, а возможность изменять данные по-прежнему определяется серверной ролью пользователя.
