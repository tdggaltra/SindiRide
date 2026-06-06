import { api } from './api.client'
import { AuthTokens, Ride, Notification, Route, Paginated } from '@/types'

// ── Auth ───────────────────────────────────────────────────────────────────
export const authService = {
  login: async (cpf: string, password: string): Promise<AuthTokens> => {
    const { data } = await api.post('/api/auth/login', { cpf, password })
    return data
  },

  register: async (payload: Record<string, unknown>) => {
    const { data } = await api.post('/api/auth/register', payload)
    return data
  },

  logout: async (refreshToken: string) => {
    await api.post('/api/auth/logout', { refreshToken })
  },

  me: async () => {
    const { data } = await api.get('/api/auth/me')
    return data
  },
}

// ── Corridas ───────────────────────────────────────────────────────────────
export const rideService = {
  create: async (payload: Partial<Ride>) => {
    const { data } = await api.post('/api/rides', payload)
    return data as Ride
  },

  list: async (page = 1, limit = 10): Promise<Paginated<Ride>> => {
    const { data } = await api.get('/api/rides', { params: { page, limit } })
    return data
  },

  getById: async (id: string): Promise<Ride> => {
    const { data } = await api.get(`/api/rides/${id}`)
    return data
  },

  accept: async (id: string) => {
    const { data } = await api.patch(`/api/rides/${id}/accept`)
    return data as Ride
  },

  start: async (id: string) => {
    const { data } = await api.patch(`/api/rides/${id}/start`)
    return data as Ride
  },

  finish: async (id: string) => {
    const { data } = await api.patch(`/api/rides/${id}/finish`)
    return data as Ride
  },

  cancel: async (id: string, reason?: string) => {
    const { data } = await api.patch(`/api/rides/${id}/cancel`, { reason })
    return data as Ride
  },

  rate: async (id: string, rating: number, comment?: string) => {
    const { data } = await api.post(`/api/rides/${id}/rate`, { rating, comment })
    return data
  },
}

// ── Auth extra ────────────────────────────────────────────────────────────
export const authExtraService = {
  forgotPassword: async (email: string) => {
    const { data } = await api.post('/api/auth/forgot-password', { email })
    return data
  },
  resetPassword: async (token: string, password: string) => {
    const { data } = await api.post('/api/auth/reset-password', { token, password })
    return data
  },
}

// ── Síndico ────────────────────────────────────────────────────────────────
export const sindicoService = {
  getMe: async () => {
    const { data } = await api.get('/api/sindicos/me')
    return data
  },
}

// ── Rotas sugeridas ────────────────────────────────────────────────────────
export const routeService = {
  list: async (): Promise<Route[]> => {
    const { data } = await api.get('/api/routes')
    return data
  },
}

// ── Notificações ───────────────────────────────────────────────────────────
export const notificationService = {
  list: async (): Promise<Notification[]> => {
    const { data } = await api.get('/api/notifications')
    return data
  },

  markRead: async (id: string) => {
    await api.patch(`/api/notifications/${id}/read`)
  },

  markAllRead: async () => {
    await api.patch('/api/notifications/read-all')
  },
}

// ── Admin ──────────────────────────────────────────────────────────────────
export const adminService = {
  getDashboard: async () => {
    const { data } = await api.get('/api/admin/dashboard')
    return data
  },

  listPendingSindicos: async () => {
    const { data } = await api.get('/api/admin/sindicos/pending')
    return data
  },

  listSindicos: async (status?: string, page = 1) => {
    const { data } = await api.get('/api/admin/sindicos', { params: { status, page } })
    return data
  },

  approveSindico: async (userId: string) => {
    const { data } = await api.patch(`/api/admin/sindicos/${userId}/approve`)
    return data
  },

  rejectSindico: async (userId: string, reason: string) => {
    const { data } = await api.patch(`/api/admin/sindicos/${userId}/reject`, { reason })
    return data
  },

  blockUser: async (userId: string, reason: string) => {
    const { data } = await api.patch(`/api/admin/users/${userId}/block`, { reason })
    return data
  },

  listRides: async (params?: Record<string, unknown>) => {
    const { data } = await api.get('/api/admin/rides', { params })
    return data
  },

  // Motoristas
  listMotoristas: async (page = 1) => {
    const { data } = await api.get('/api/admin/motoristas', { params: { page } })
    return data
  },
  createMotorista: async (payload: Record<string, unknown>) => {
    const { data } = await api.post('/api/admin/motoristas', payload)
    return data
  },
  toggleBlockMotorista: async (userId: string) => {
    const { data } = await api.patch(`/api/admin/motoristas/${userId}/block`)
    return data
  },

  exportRides: async (params?: Record<string, unknown>) => {
    const { data } = await api.get('/api/admin/rides', { params: { limit: 1000, ...params } })
    return data
  },

  // Rotas sugeridas
  listAllRoutes: async () => {
    const { data } = await api.get('/api/admin/routes')
    return data
  },
  createRoute: async (payload: Record<string, unknown>) => {
    const { data } = await api.post('/api/admin/routes', payload)
    return data
  },
  updateRoute: async (id: string, payload: Record<string, unknown>) => {
    const { data } = await api.patch(`/api/admin/routes/${id}`, payload)
    return data
  },
  deleteRoute: async (id: string) => {
    const { data } = await api.delete(`/api/admin/routes/${id}`)
    return data
  },
}

// ── Motorista ──────────────────────────────────────────────────────────────
export const motoristaService = {
  getMe: async () => {
    const { data } = await api.get('/api/motoristas/me')
    return data
  },

  getPendingRides: async (): Promise<Ride[]> => {
    const { data } = await api.get('/api/motoristas/rides/pending')
    return data
  },

  getActiveRide: async (): Promise<Ride | null> => {
    const { data } = await api.get('/api/motoristas/rides/active')
    return data
  },

  toggleAvailability: async (available: boolean) => {
    const { data } = await api.patch('/api/motoristas/availability', { available })
    return data as { available: boolean }
  },

  getRideHistory: async (page = 1): Promise<Paginated<Ride>> => {
    const { data } = await api.get('/api/motoristas/rides/history', { params: { page } })
    return data
  },
}
