import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { authService, authExtraService, rideService, notificationService, adminService, sindicoService, routeService, motoristaService } from '@/services'
import { requestFcmToken } from '@/services/fcm'
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
      requestFcmToken().catch(() => {})
      if (data.user.role === 'ADMIN')      navigate('/admin')
      else if (data.user.role === 'MOTORISTA') navigate('/motorista')
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

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authExtraService.forgotPassword(email),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authExtraService.resetPassword(token, password),
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

export function useAdminMotoristas(page = 1) {
  return useQuery({
    queryKey: ['admin', 'motoristas', page],
    queryFn: () => adminService.listMotoristas(page),
  })
}

export function useCreateMotorista() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => adminService.createMotorista(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'motoristas'] }),
  })
}

export function useToggleBlockMotorista() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => adminService.toggleBlockMotorista(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'motoristas'] }),
  })
}

export function useAdminRoutes() {
  return useQuery({
    queryKey: ['admin', 'routes'],
    queryFn: adminService.listAllRoutes,
  })
}

export function useCreateAdminRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => adminService.createRoute(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'routes'] })
      qc.invalidateQueries({ queryKey: ['routes'] })
    },
  })
}

export function useUpdateAdminRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Record<string, unknown>) =>
      adminService.updateRoute(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'routes'] })
      qc.invalidateQueries({ queryKey: ['routes'] })
    },
  })
}

function downloadCSV(rides: any[]) {
  const headers = ['ID', 'Status', 'Síndico', 'Motorista', 'Origem', 'Destino', 'Km', 'Duração (min)', 'Agendado em', 'Concluído em']
  const rows = rides.map((r: any) => [
    r.id,
    r.status,
    r.sindico?.user?.name ?? '',
    r.motorista?.user?.name ?? '',
    r.originAddress,
    r.destAddress,
    r.estimatedDistanceKm ?? '',
    r.estimatedDurationMin ?? '',
    r.scheduledAt ? new Date(r.scheduledAt).toLocaleString('pt-BR') : '',
    r.finishedAt  ? new Date(r.finishedAt).toLocaleString('pt-BR')  : '',
  ])
  const csv = [headers, ...rows]
    .map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `corridas-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function useExportAdminRides() {
  return useMutation({
    mutationFn: (params?: Record<string, unknown>) => adminService.exportRides(params),
    onSuccess: (data) => { if (data.rides?.length) downloadCSV(data.rides) },
  })
}

export function useDeleteAdminRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminService.deleteRoute(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'routes'] })
      qc.invalidateQueries({ queryKey: ['routes'] })
    },
  })
}

// ── Motorista ──────────────────────────────────────────────────────────────
export function useMotoristaMe() {
  return useQuery({
    queryKey: ['motorista', 'me'],
    queryFn: motoristaService.getMe,
  })
}

export function usePendingRides() {
  return useQuery({
    queryKey: ['motorista', 'rides', 'pending'],
    queryFn: motoristaService.getPendingRides,
    refetchInterval: 10_000,
  })
}

export function useMotoristaActiveRide() {
  return useQuery({
    queryKey: ['motorista', 'ride', 'active'],
    queryFn: motoristaService.getActiveRide,
    refetchInterval: (q) => {
      const s = q.state.data?.status
      return (s === 'ACEITA' || s === 'EM_ANDAMENTO') ? 5000 : 10_000
    },
  })
}

export function useToggleAvailability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (available: boolean) => motoristaService.toggleAvailability(available),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['motorista', 'me'] }),
  })
}

export function useAcceptRide() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (id: string) => rideService.accept(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['motorista'] })
      navigate('/motorista/ativa')
    },
  })
}

export function useStartRide() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => rideService.start(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['motorista', 'ride', 'active'] }),
  })
}

export function useMotoristaRideHistory(page = 1) {
  return useQuery({
    queryKey: ['motorista', 'rides', 'history', page],
    queryFn: () => motoristaService.getRideHistory(page),
  })
}

export function useFinishRide() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (id: string) => rideService.finish(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['motorista'] })
      navigate('/motorista')
    },
  })
}
