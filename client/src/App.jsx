import { useEffect, useMemo, useState } from 'react'
import {
  createPlaylist,
  deletePlaylist,
  getApiErrorMessage,
  getPlaylists,
  getProfile,
  login,
  updatePlaylist,
} from './api'
import './App.css'

const TOKEN_KEY = 'stpp-auth-token'

function createTemporaryId() {
  return `temporary-${globalThis.crypto?.randomUUID?.() || Date.now()}`
}

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

function tracksToText(tracks) {
  return tracks
    .map((track) => `${track.title} — ${track.artist}`)
    .join('\n')
}

function createEmptyForm(owner = '') {
  return {
    title: '',
    description: '',
    owner,
    isPublic: true,
    tracksText: '',
  }
}

function App() {
  const [playlists, setPlaylists] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [loadVersion, setLoadVersion] = useState(0)
  const [actionMessage, setActionMessage] = useState('')
  const [isMutating, setIsMutating] = useState(false)
  const [query, setQuery] = useState('')
  const [sortOrder, setSortOrder] = useState('newest')
  const [editingId, setEditingId] = useState(null)
  const [token, setToken] = useState(
    () => window.localStorage.getItem(TOKEN_KEY) || '',
  )
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(
    () => Boolean(window.localStorage.getItem(TOKEN_KEY)),
  )
  const [authError, setAuthError] = useState('')
  const [loginFields, setLoginFields] = useState({ email: '', password: '' })
  const [form, setForm] = useState(createEmptyForm())

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

  useEffect(() => {
    if (!token) {
      return undefined
    }

    const controller = new AbortController()
    let isActive = true

    getProfile({ signal: controller.signal })
      .then((profile) => {
        if (isActive) {
          setUser(profile)
          setForm((currentForm) => ({
            ...currentForm,
            owner: currentForm.owner || profile.email,
          }))
        }
      })
      .catch((error) => {
        if (isActive && error.name !== 'CanceledError') {
          window.localStorage.removeItem(TOKEN_KEY)
          setToken('')
          setUser(null)
          setAuthLoading(false)
          setAuthError(`Не удалось проверить токен: ${getApiErrorMessage(error)}`)
        }
      })
      .finally(() => {
        if (isActive) {
          setAuthLoading(false)
        }
      })

    return () => {
      isActive = false
      controller.abort()
    }
  }, [token])

  useEffect(() => {
    document.title = `Плейлисты (${playlists.length}) | STPP`
  }, [playlists.length])

  const visiblePlaylists = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru')
    const filtered = playlists.filter((playlist) => {
      const searchableText = [
        playlist.title,
        playlist.description,
        playlist.owner,
        ...playlist.tracks.map((track) => `${track.title} ${track.artist}`),
      ]
        .join(' ')
        .toLocaleLowerCase('ru')

      return searchableText.includes(normalizedQuery)
    })

    return [...filtered].sort((first, second) => {
      if (sortOrder === 'title') {
        return first.title.localeCompare(second.title, 'ru')
      }
      return new Date(second.createdAt) - new Date(first.createdAt)
    })
  }, [playlists, query, sortOrder])

  function updateForm(event) {
    const { name, value, type, checked } = event.target
    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function updateLoginFields(event) {
    const { name, value } = event.target
    setLoginFields((currentFields) => ({ ...currentFields, [name]: value }))
  }

  function resetForm() {
    setForm(createEmptyForm(user?.email || ''))
    setEditingId(null)
  }

  async function handleLogin(event) {
    event.preventDefault()
    setAuthLoading(true)
    setAuthError('')

    try {
      const result = await login(loginFields)
      if (!result.token) {
        throw new Error('Сервер не вернул JWT-токен')
      }

      window.localStorage.setItem(TOKEN_KEY, result.token)
      setToken(result.token)
      setLoginFields((currentFields) => ({ ...currentFields, password: '' }))
    } catch (error) {
      setAuthError(getApiErrorMessage(error))
      setAuthLoading(false)
    }
  }

  function handleLogout() {
    window.localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setUser(null)
    setAuthLoading(false)
    setAuthError('')
    setActionMessage('Вы вышли из аккаунта.')
  }

  function retryLoading() {
    setIsLoading(true)
    setLoadError('')
    setLoadVersion((version) => version + 1)
  }

  async function submitForm(event) {
    event.preventDefault()
    if (isMutating) {
      return
    }

    const title = form.title.trim()
    const owner = form.owner.trim()
    if (!title || !owner) {
      setActionMessage('Заполните название плейлиста и владельца.')
      return
    }

    if (!token) {
      setActionMessage('Войдите в аккаунт, чтобы изменять плейлисты.')
      return
    }

    const playlistData = {
      title,
      description: form.description.trim(),
      owner,
      isPublic: form.isPublic,
      tracks: tracksFromText(form.tracksText),
      listenersOnline: editingId
        ? playlists.find((playlist) => playlist.id === editingId)?.listenersOnline || 0
        : 0,
    }

    setIsMutating(true)
    setActionMessage('')

    if (editingId) {
      const previousPlaylist = playlists.find((playlist) => playlist.id === editingId)
      if (!previousPlaylist) {
        setIsMutating(false)
        setActionMessage('Плейлист для редактирования больше не найден.')
        return
      }

      setPlaylists((currentPlaylists) =>
        currentPlaylists.map((playlist) =>
          playlist.id === editingId
            ? { ...playlist, ...playlistData }
            : playlist,
        ),
      )

      try {
        const savedPlaylist = await updatePlaylist(editingId, playlistData)
        setPlaylists((currentPlaylists) =>
          currentPlaylists.map((playlist) =>
            playlist.id === editingId ? savedPlaylist : playlist,
          ),
        )
        setActionMessage('Изменения сохранены на сервере.')
        resetForm()
      } catch (error) {
        setPlaylists((currentPlaylists) =>
          currentPlaylists.map((playlist) =>
            playlist.id === editingId ? previousPlaylist : playlist,
          ),
        )
        setActionMessage(`Не удалось изменить плейлист: ${getApiErrorMessage(error)}`)
      } finally {
        setIsMutating(false)
      }
      return
    }

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
      setActionMessage('Плейлист создан на сервере.')
      resetForm()
    } catch (error) {
      setPlaylists((currentPlaylists) =>
        currentPlaylists.filter((playlist) => playlist.id !== temporaryId),
      )
      setActionMessage(`Не удалось создать плейлист: ${getApiErrorMessage(error)}`)
    } finally {
      setIsMutating(false)
    }
  }

  function editPlaylist(playlist) {
    setEditingId(playlist.id)
    setForm({
      title: playlist.title,
      description: playlist.description || '',
      owner: playlist.owner,
      isPublic: playlist.isPublic,
      tracksText: tracksToText(playlist.tracks),
    })
    document.querySelector('#playlist-title')?.focus()
  }

  async function removePlaylist(playlistId) {
    if (isMutating) {
      return
    }

    const originalIndex = playlists.findIndex((playlist) => playlist.id === playlistId)
    const originalPlaylist = playlists[originalIndex]
    if (!originalPlaylist || !token) {
      setActionMessage('Войдите в аккаунт, чтобы удалять плейлисты.')
      return
    }

    setIsMutating(true)
    setActionMessage('')
    setPlaylists((currentPlaylists) =>
      currentPlaylists.filter((playlist) => playlist.id !== playlistId),
    )
    if (editingId === playlistId) {
      resetForm()
    }

    try {
      await deletePlaylist(playlistId)
      setActionMessage('Плейлист удалён на сервере.')
    } catch (error) {
      setPlaylists((currentPlaylists) => {
        const restoredPlaylists = [...currentPlaylists]
        restoredPlaylists.splice(originalIndex, 0, originalPlaylist)
        return restoredPlaylists
      })
      setActionMessage(`Не удалось удалить плейлист: ${getApiErrorMessage(error)}`)
    } finally {
      setIsMutating(false)
    }
  }

  const trackCount = playlists.reduce(
    (total, playlist) => total + playlist.tracks.length,
    0,
  )

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="STPP — плейлисты">
          <span className="brand-mark" aria-hidden="true">♫</span>
          <span>sound<span className="brand-light">room</span></span>
        </a>
        <span className="local-badge"><span /> Данные с сервера</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">ТВОЯ МУЗЫКА · ТВОИ ПРАВИЛА</p>
          <h1>Собери настроение<br />в один <span>плейлист.</span></h1>
          <p className="hero-description">
            Создавай коллекции треков, находи нужное настроение и возвращайся
            к любимой музыке в любой момент.
          </p>
          <a className="primary-link" href="#collection">Моя коллекция <span>↓</span></a>
        </div>
        <div className="hero-art" aria-label="Музыкальная иллюстрация">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-disc"><span>♫</span></div>
          <div className="art-note note-one">♪</div>
          <div className="art-note note-two">♫</div>
          <div className="art-chip chip-one">now playing</div>
          <div className="art-chip chip-two"><span /> good mood</div>
        </div>
      </section>

      <section className="stats-row" aria-label="Статистика коллекции">
        <div><strong>{playlists.length}</strong><span>плейлистов</span></div>
        <div><strong>{trackCount}</strong><span>треков в подборках</span></div>
        <div><strong>{user?.role || 'гость'}</strong><span>текущая роль</span></div>
      </section>

      <section className="session-panel" aria-label="Учётная запись">
        {user ? (
          <div className="session-active">
            <div>
              <p className="eyebrow">ВЫ ВОШЛИ В СИСТЕМУ</p>
              <strong>{user.email}</strong>
              <span className="role-pill">{user.role}</span>
              {user.role !== 'admin' && (
                <p className="session-hint">
                  Для записи плейлистов по правилам API нужна роль admin.
                </p>
              )}
            </div>
            <button className="secondary-button" type="button" onClick={handleLogout}>
              Выйти
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleLogin}>
            <div className="login-copy">
              <p className="eyebrow">JWT-АВТОРИЗАЦИЯ</p>
              <strong>Войдите, чтобы изменять плейлисты</strong>
            </div>
            <label>
              <span>Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={loginFields.email}
                onChange={updateLoginFields}
                required
              />
            </label>
            <label>
              <span>Пароль</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={loginFields.password}
                onChange={updateLoginFields}
                required
              />
            </label>
            <button className="secondary-button" type="submit" disabled={authLoading}>
              {authLoading ? 'Вход…' : 'Войти'}
            </button>
          </form>
        )}
        {authError && <p className="request-error" role="alert">{authError}</p>}
      </section>

      <section className="workspace" id="collection">
        <div className="collection-column">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ТВОЯ БИБЛИОТЕКА</p>
              <h2>Плейлисты <span>{playlists.length}</span></h2>
            </div>
            <div className="sort-control">
              <label htmlFor="sort-order">Сортировка</label>
              <select
                id="sort-order"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              >
                <option value="newest">Сначала новые</option>
                <option value="title">По названию</option>
              </select>
            </div>
          </div>

          <label className="search-box" htmlFor="playlist-search">
            <span aria-hidden="true">⌕</span>
            <input
              id="playlist-search"
              type="search"
              placeholder="Найти плейлист, владельца или трек..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd>⌘ K</kbd>
          </label>

          {actionMessage && (
            <p className="action-message" role="status">{actionMessage}</p>
          )}

          {isLoading ? (
            <p className="empty-state" role="status">Загружаем плейлисты с сервера…</p>
          ) : loadError ? (
            <div className="empty-state error-state" role="alert">
              <span className="empty-icon">!</span>
              <h3>Не удалось загрузить плейлисты</h3>
              <p>{loadError}</p>
              <button
                className="secondary-button"
                type="button"
                onClick={retryLoading}
              >
                Повторить запрос
              </button>
            </div>
          ) : visiblePlaylists.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">♫</span>
              <h3>{playlists.length ? 'Ничего не найдено' : 'Плейлистов пока нет'}</h3>
              <p>
                {playlists.length
                  ? 'Попробуй изменить поисковый запрос.'
                  : 'Создай первый плейлист с помощью формы справа.'}
              </p>
            </div>
          ) : (
            <div className="playlist-grid">
              {visiblePlaylists.map((playlist, index) => (
                <article
                  className={`playlist-card card-tone-${index % 4}`}
                  key={playlist.id}
                >
                  <div className="card-art">
                    <span className="card-mood">
                      {playlist.isPublic ? 'Публичный' : 'Приватный'}
                    </span>
                    <span className="card-music" aria-hidden="true">♫</span>
                    <span className="track-count">{playlist.tracks.length} треков</span>
                  </div>
                  <div className="card-content">
                    <h3>{playlist.title}</h3>
                    <p>{playlist.description || 'Без описания'}</p>
                    <p className="playlist-owner">Владелец: {playlist.owner}</p>
                    {playlist.tracks.length > 0 && (
                      <ul className="track-list">
                        {playlist.tracks.slice(0, 3).map((track, trackIndex) => (
                          <li key={`${playlist.id}-${trackIndex}`}>
                            {track.title} — {track.artist}
                          </li>
                        ))}
                        {playlist.tracks.length > 3 && (
                          <li className="more-tracks">
                            и ещё {playlist.tracks.length - 3}
                          </li>
                        )}
                      </ul>
                    )}
                    <div className="card-actions">
                      <button
                        className="text-button"
                        type="button"
                        disabled={isMutating}
                        onClick={() => editPlaylist(playlist)}
                      >
                        Редактировать
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`Удалить плейлист «${playlist.title}»`}
                        disabled={isMutating}
                        onClick={() => removePlaylist(playlist.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="form-panel">
          <div className="form-heading">
            <span className="form-icon">✳</span>
            <div>
              <p className="eyebrow">{editingId ? 'ОБНОВЛЕНИЕ' : 'НОВАЯ ПОДБОРКА'}</p>
              <h2>{editingId ? 'Измени плейлист' : 'Создай плейлист'}</h2>
            </div>
          </div>
          <p className="form-intro">
            {editingId
              ? 'Изменения сначала появятся здесь, затем отправятся на сервер.'
              : 'Данные отправятся в REST API. Для записи требуется роль admin.'}
          </p>
          <form onSubmit={submitForm}>
            <label htmlFor="playlist-title">Название</label>
            <input
              id="playlist-title"
              name="title"
              maxLength="60"
              placeholder="Например, Sunday morning"
              value={form.title}
              onChange={updateForm}
              required
            />

            <label htmlFor="playlist-owner">Владелец</label>
            <input
              id="playlist-owner"
              name="owner"
              maxLength="120"
              placeholder="Email или имя владельца"
              value={form.owner}
              onChange={updateForm}
              required
            />

            <label htmlFor="playlist-description">Описание</label>
            <textarea
              id="playlist-description"
              name="description"
              rows="3"
              maxLength="180"
              placeholder="О чём эта подборка?"
              value={form.description}
              onChange={updateForm}
            />

            <label htmlFor="playlist-tracks">Треки</label>
            <textarea
              id="playlist-tracks"
              name="tracksText"
              rows="4"
              placeholder={'По одному треку на строку\nНазвание — Исполнитель'}
              value={form.tracksText}
              onChange={updateForm}
            />
            <span className="field-hint">
              Строка без исполнителя сохранится как «Неизвестный исполнитель».
            </span>

            <label className="checkbox-label" htmlFor="playlist-public">
              <input
                id="playlist-public"
                name="isPublic"
                type="checkbox"
                checked={form.isPublic}
                onChange={updateForm}
              />
              Публичный плейлист
            </label>

            <button
              className="submit-button"
              type="submit"
              disabled={isMutating || authLoading}
            >
              {isMutating
                ? 'Сохраняем…'
                : editingId
                  ? 'Сохранить изменения'
                  : 'Создать плейлист'}
              <span aria-hidden="true">↗</span>
            </button>
            {editingId && (
              <button
                className="cancel-button"
                type="button"
                disabled={isMutating}
                onClick={resetForm}
              >
                Отменить редактирование
              </button>
            )}
          </form>
          <div className="privacy-note">
            <span aria-hidden="true">◈</span>
            Плейлисты загружаются из PostgreSQL через REST API.
          </div>
        </aside>
      </section>

      <footer className="footer">
        <span>soundroom · Лабораторная работа №5</span>
        <span>React + Express REST API</span>
      </footer>
    </main>
  )
}

export default App
