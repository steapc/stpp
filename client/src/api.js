import axios from 'axios'

const TOKEN_KEY = 'stpp-auth-token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function login(credentials) {
  const response = await api.post('/auth/login', credentials)
  return response.data
}

export async function register(credentials) {
  const response = await api.post('/auth/register', credentials)
  return response.data
}

export async function getProfile({ signal } = {}) {
  const response = await api.get('/profile', { signal })
  return response.data.user
}

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

export function getApiErrorMessage(error) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error || error.message || 'Ошибка запроса к серверу'
  }
  return error instanceof Error ? error.message : 'Неизвестная ошибка'
}
