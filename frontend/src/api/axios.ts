import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Fix #7 — envoie le cookie refreshToken automatiquement
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Fix #6 — une seule promesse de refresh partagée pour éviter les appels parallèles
let refreshPromise: Promise<string> | null = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      if (!refreshPromise) {
        refreshPromise = axios
          .post('/api/auth/refresh', {}, { withCredentials: true })
          .then(({ data }) => data.accessToken as string)
          .finally(() => {
            refreshPromise = null
          })
      }

      try {
        const newToken = await refreshPromise
        useAuthStore.getState().setAccessToken(newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
      }
    }
    return Promise.reject(error)
  }
)

export default api
