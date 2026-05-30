import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { authService, rideService, notificationService, adminService, sindicoService, routeService } from '@/services'
import { Ride } from '@/types'


// ── Auth ───────────────────────────────────────────────────────────────────
export function useLogin() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  return useMutation({
    mutationFn: ({ cpf, password }: { cpf: string; password: string }) =>
      authService.login(cpf, password),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken)
      if (data.user.role === 'ADMIN') navigate('/admin')
      else navigate('/dashboard')
    },
  })
}

export function useRegister() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => authService.register(payload),
    onSuccess: () => navigate('/pendente'),
  })
}

export function useLogout() {
  const navigate = useNavigate()
  const { refreshToken, logout } = useAuthStore()

  return useMutation({
    mutationFn: () => authService.logout(refreshToken ?? ''),
    onSettled: () => {
      logout()
      navigate('/login')
    },
  })
}

// ── Síndico ────────────────────────────────────────────────────────────────
export function useSindicoMe() {
  return useQuery({
    queryKey: ['sindico', 'me'],
    queryFn: sindicoService.getMe,
  })
}

// ── Corridas ───────────────────────────────────────────────────────────────
export function useRides(page = 1) {
  return useQuery({
    queryKey: ['rides', page],
    queryFn: () => rideService.list(page),
  })
}

export function useRide(id: string) {
  return useQuery({
    queryKey: ['ride', id],
    queryFn: () => rideService.getById(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'AGENDADA' || status === 'ACEITA' || status === 'EM_ANDAMENTO') return 5000
      return false
    },
  })
}

export function useCreateRide() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (payload: Partial<Ride>) => rideService.create(payload),
    onSuccess: (ride) => {
      qc.invalidateQueries({ queryKey: ['rides'] })
      navigate(`/corridas/${ride.id}`)
    },
  })
}

export function useCancelRide() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      rideService.cancel(id, reason),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ride', vars.id] })
      qc.invalidateQueries({ queryKey: ['rides'] })
    },
  })
}

export function useRateRide() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rating, comment }: { id: string; rating: number; comment?: string }) =>
      rideService.rate(id, rating, comment),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ride', vars.id] })
    },
  })
}

// ── Rotas sugeridas ────────────────────────────────────────────────────────
export function useRoutes() {
  return useQuery({
    queryKey: ['routes'],
    queryFn: routeService.list,
    staleTime: 1000 * 60 * 10, // destinos mudam raramente
  })
}

// ── Notificações ───────────────────────────────────────────────────────────
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.list,
    refetchInterval: 30_000, // atualiza a cada 30s
  })
}

// ── Admin ──────────────────────────────────────────────────────────────────
export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminService.getDashboard,
    refetchInterval: 30_000,
  })
}

export function usePendingSindicos() {
  return useQuery({
    queryKey: ['admin', 'sindicos', 'pending'],
    queryFn: adminService.listPendingSindicos,
  })
}

export function useApproveSindico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => adminService.approveSindico(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'sindicos'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}

export function useRejectSindico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminService.rejectSindico(userId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'sindicos'] })
    },
  })
}

export function useAdminRides(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['admin', 'rides', params],
    queryFn: () => adminService.listRides(params),
    refetchInterval: 15_000,
  })
}

export function useSindicos(status?: string, page = 1) {
  return useQuery({
    queryKey: ['admin', 'sindicos', status, page],
    queryFn: () => adminService.listSindicos(status, page),
  })
}
