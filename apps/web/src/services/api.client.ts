import axios, { AxiosError } from 'axios'
import { useAuthStore } from '@/store/auth.store'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3333',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

// Injeta Bearer token em todas as requisições
api.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Refresh token automático em 401
let isRefreshing = false
let queue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = []

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as any

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          },
          reject,
        })
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const { refreshToken, setTokens, logout } = useAuthStore.getState()
      if (!refreshToken) throw new Error('No refresh token')

      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:3333'}/api/auth/refresh`,
        { refreshToken },
      )

      setTokens(data.accessToken, data.refreshToken)
      queue.forEach(({ resolve }) => resolve(data.accessToken))
      queue = []

      original.headers.Authorization = `Bearer ${data.accessToken}`
      return api(original)
    } catch (err) {
      queue.forEach(({ reject }) => reject(err))
      queue = []
      useAuthStore.getState().logout()
      window.location.href = '/login'
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  },
)
