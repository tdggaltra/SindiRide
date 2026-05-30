// ── Enums ──────────────────────────────────────────────────────────────────
export type Role = 'SINDICO' | 'MOTORISTA' | 'ADMIN'
export type UserStatus = 'PENDENTE' | 'ATIVO' | 'BLOQUEADO' | 'REJEITADO'
export type RideStatus = 'AGENDADA' | 'ACEITA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA'
export type CancelledBy = 'SINDICO' | 'MOTORISTA' | 'ADMIN' | 'SISTEMA'
export type MandateType = 'ELEITO' | 'PROFISSIONAL' | 'SUBSINDICO' | 'INTERINO'
export type NotificationType =
  | 'CORRIDA_ACEITA' | 'CORRIDA_INICIADA' | 'CORRIDA_CONCLUIDA'
  | 'CORRIDA_CANCELADA' | 'CADASTRO_APROVADO' | 'CADASTRO_REJEITADO' | 'SEM_MOTORISTA'

// ── Usuário ────────────────────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: Role
  status: UserStatus
  avatarUrl?: string
  sindicoId?: string
  motoristaId?: string
}

export interface Sindico {
  id: string
  userId: string
  condominiumName: string
  condominiumAddress: string
  condominiumDistrict: string
  condominiumCity: string
  condominiumState: string
  condominiumZip: string
  mandateType: MandateType
  user: Pick<User, 'name' | 'email' | 'phone' | 'avatarUrl'>
}

export interface Motorista {
  id: string
  userId: string
  vehicleBrand: string
  vehicleModel: string
  vehicleColor: string
  vehiclePlate: string
  vehicleYear: number
  isAvailable: boolean
  ratingAvg: number
  ratingCount: number
  user: Pick<User, 'name' | 'phone'>
}

// ── Corrida ────────────────────────────────────────────────────────────────
export interface Ride {
  id: string
  sindicoId: string
  motoristaId?: string
  originAddress: string
  originDistrict: string
  originLat: number
  originLng: number
  destAddress: string
  destDistrict: string
  destLat: number
  destLng: number
  routeId?: string
  estimatedDistanceKm?: number
  estimatedDurationMin?: number
  polyline?: string
  scheduledAt: string
  isImmediate: boolean
  status: RideStatus
  acceptedAt?: string
  startedAt?: string
  finishedAt?: string
  cancelledAt?: string
  cancelledBy?: CancelledBy
  cancelReason?: string
  rating?: number
  ratingComment?: string
  notes?: string
  createdAt: string
  motorista?: Motorista
  route?: Route
}

// ── Rota pré-cadastrada ────────────────────────────────────────────────────
export interface Route {
  id: string
  name: string
  category?: string
  address: string
  district: string
  lat: number
  lng: number
  isPopular: boolean
}

// ── Notificação ────────────────────────────────────────────────────────────
export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  isRead: boolean
  rideId?: string
  createdAt: string
}

// ── Auth ───────────────────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  user: User
}

// ── Paginação ──────────────────────────────────────────────────────────────
export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  totalPages: number
}
