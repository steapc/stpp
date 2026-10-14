import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'stpp-playlists-v1'

const initialPlaylists = [
  {
    id: 'demo-evening',
    title: 'Вечерний чилл',
    mood: 'Спокойное',
    description: 'Мягкая музыка для отдыха после длинного дня.',
    tracks: ['Sunset Drive — Night Owl', 'Blue Hour — Jazz Collective'],
    createdAt: '2026-10-01T18:00:00.000Z',
  },
  {
    id: 'demo-focus',
    title: 'Фокус и работа',
    mood: 'Для фокуса',
    description: 'Инструментальные треки для концентрации.',
    tracks: ['Quiet Motion — Luma', 'Soft Signals — Northbound'],
    createdAt: '2026-10-02T12:00:00.000Z',
  },
]

function createPlaylistId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function isPlaylistList(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (playlist) =>
        playlist &&
        typeof playlist.id === 'string' &&
        typeof playlist.title === 'string' &&
        typeof playlist.mood === 'string' &&
        typeof playlist.description === 'string' &&
        Array.isArray(playlist.tracks) &&
        playlist.tracks.every((track) => typeof track === 'string'),
    )
  )
}

function App() {
  const [playlists, setPlaylists] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [query, setQuery] = useState('')
  const [sortOrder, setSortOrder] = useState('newest')
  const [editingId, setEditingId] = useState(null)
  const [storageMessage, setStorageMessage] = useState(
    'Изменения сохраняются в этом браузере.',
  )
  const [form, setForm] = useState({
    title: '',
    mood: 'Спокойное',
    description: '',
    tracksText: '',
  })

  useEffect(() => {
    let isActive = true

    queueMicrotask(() => {
      let loadedPlaylists = initialPlaylists
      let loadMessage = ''

      try {
        const savedValue = window.localStorage.getItem(STORAGE_KEY)
        if (savedValue !== null) {
          const parsedValue = JSON.parse(savedValue)
          if (!isPlaylistList(parsedValue)) {
            throw new Error('Сохранённые данные имеют неверный формат.')
          }
          loadedPlaylists = parsedValue
        }
      } catch (error) {
        loadMessage = `Не удалось загрузить данные из localStorage: ${error.message}`
      }

      if (isActive) {
        setPlaylists(loadedPlaylists)
        if (loadMessage) {
          setStorageMessage(loadMessage)
        }
        setIsLoaded(true)
      }
    })

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (!isLoaded) {
      return
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists))
    } catch (error) {
      const saveMessage = `Не удалось сохранить данные в localStorage: ${error.message}`
      queueMicrotask(() => setStorageMessage(saveMessage))
    }
  }, [playlists, isLoaded])

  useEffect(() => {
    document.title = `Плейлисты (${playlists.length}) | STPP`
  }, [playlists.length])

  const visiblePlaylists = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru')
    const filtered = playlists.filter((playlist) => {
      const searchableText = [
        playlist.title,
        playlist.mood,
        playlist.description,
        ...playlist.tracks,
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
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  function resetForm() {
    setForm({
      title: '',
      mood: 'Спокойное',
      description: '',
      tracksText: '',
    })
    setEditingId(null)
  }

  function submitForm(event) {
    event.preventDefault()
    const title = form.title.trim()
    if (!title) {
      return
    }

    const playlistData = {
      title,
      mood: form.mood,
      description: form.description.trim(),
      tracks: form.tracksText
        .split('\n')
        .map((track) => track.trim())
        .filter(Boolean),
    }

    if (editingId) {
      setPlaylists((currentPlaylists) =>
        currentPlaylists.map((playlist) =>
          playlist.id === editingId
            ? { ...playlist, ...playlistData }
            : playlist,
        ),
      )
    } else {
      setPlaylists((currentPlaylists) => [
        {
          id: createPlaylistId(),
          ...playlistData,
          createdAt: new Date().toISOString(),
        },
        ...currentPlaylists,
      ])
    }

    resetForm()
  }

  function editPlaylist(playlist) {
    setEditingId(playlist.id)
    setForm({
      title: playlist.title,
      mood: playlist.mood,
      description: playlist.description,
      tracksText: playlist.tracks.join('\n'),
    })
    document.querySelector('#playlist-title')?.focus()
  }

  function deletePlaylist(id) {
    setPlaylists((currentPlaylists) =>
      currentPlaylists.filter((playlist) => playlist.id !== id),
    )
    if (editingId === id) {
      resetForm()
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
        <span className="local-badge"><span /> Локальная коллекция</span>
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
        <div><strong>100%</strong><span>твоё настроение</span></div>
      </section>

      <section className="workspace" id="collection">
        <div className="collection-column">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ТВОЯ БИБЛИОТЕКА</p>
              <h2>Мои плейлисты <span>{playlists.length}</span></h2>
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
              placeholder="Найти плейлист, настроение или трек..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd>⌘ K</kbd>
          </label>

          {storageMessage && (
            <p className="storage-message" role="status">{storageMessage}</p>
          )}

          {!isLoaded ? (
            <p className="empty-state">Загружаем твою коллекцию…</p>
          ) : visiblePlaylists.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">♫</span>
              <h3>{playlists.length ? 'Ничего не найдено' : 'Плейлистов пока нет'}</h3>
              <p>
                {playlists.length
                  ? 'Попробуй изменить запрос или добавь новую подборку.'
                  : 'Создай первую подборку в форме справа.'}
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
                    <span className="card-mood">{playlist.mood}</span>
                    <span className="card-music" aria-hidden="true">♫</span>
                    <span className="track-count">{playlist.tracks.length} треков</span>
                  </div>
                  <div className="card-content">
                    <h3>{playlist.title}</h3>
                    <p>{playlist.description || 'Без описания'}</p>
                    {playlist.tracks.length > 0 && (
                      <ul className="track-list">
                        {playlist.tracks.slice(0, 3).map((track, trackIndex) => (
                          <li key={`${playlist.id}-${trackIndex}`}>{track}</li>
                        ))}
                        {playlist.tracks.length > 3 && (
                          <li className="more-tracks">и ещё {playlist.tracks.length - 3}</li>
                        )}
                      </ul>
                    )}
                    <div className="card-actions">
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => editPlaylist(playlist)}
                      >
                        Редактировать
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`Удалить плейлист «${playlist.title}»`}
                        onClick={() => deletePlaylist(playlist.id)}
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
              ? 'Обнови название, настроение или список треков.'
              : 'Задай настроение и добавь треки, которые ему подходят.'}
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

            <label htmlFor="playlist-mood">Настроение</label>
            <select
              id="playlist-mood"
              name="mood"
              value={form.mood}
              onChange={updateForm}
            >
              <option>Спокойное</option>
              <option>Для фокуса</option>
              <option>Энергичное</option>
              <option>Романтичное</option>
              <option>Ностальгия</option>
            </select>

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
            <span className="field-hint">Каждая строка будет отдельным треком.</span>

            <button className="submit-button" type="submit">
              {editingId ? 'Сохранить изменения' : 'Создать плейлист'}
              <span aria-hidden="true">↗</span>
            </button>
            {editingId && (
              <button
                className="cancel-button"
                type="button"
                onClick={resetForm}
              >
                Отменить редактирование
              </button>
            )}
          </form>
          <div className="privacy-note">
            <span aria-hidden="true">◈</span>
            Данные хранятся только в localStorage этого браузера.
          </div>
        </aside>
      </section>

      <footer className="footer">
        <span>soundroom · Лабораторная работа №4</span>
        <span>Управление состоянием в React</span>
      </footer>
    </main>
  )
}

export default App
