import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Car, Star, Phone, MapPin, CheckCircle, X, Power, Navigation, Clock, Zap, History } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuthStore } from '@/store/auth.store'
import {
  useMotoristaMe, usePendingRides, useMotoristaActiveRide,
  useToggleAvailability, useAcceptRide, useStartRide, useFinishRide,
  useCancelRide, useLogout, useMotoristaRideHistory,
} from '@/hooks'
import { RideStatusBadge } from '@/components/ui'
import { Button, Card, Spinner, ErrorBoundary } from '@/components/ui'
import { MapView } from '@/components/map/MapView'
import { useSocket } from '@/hooks/useSocket'

// ── Dashboard ──────────────────────────────────────────────────────────────
export function MotoristaDashboardPage() {
  const { user } = useAuthStore()
  const { data: motorista, isLoading } = useMotoristaMe()
  const { data: activeRide } = useMotoristaActiveRide()
  const toggle = useToggleAvailability()

  const firstName = user?.name?.split(' ')[0] ?? 'Motorista'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  if (isLoading) return <div className="flex justify-center pt-20"><Spinner /></div>

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className={`px-4 pt-12 pb-8 transition-colors ${motorista?.isAvailable ? 'bg-green-600' : 'bg-gray-700'}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-white/70 text-xs">{greeting},</p>
            <h1 className="text-white text-lg font-medium mt-0.5">{firstName}</h1>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-medium text-sm">
            {firstName[0]}
          </div>
        </div>

        {/* Toggle disponibilidade */}
        <button
          onClick={() => toggle.mutate(!motorista?.isAvailable)}
          disabled={toggle.isPending}
          className={`w-full h-12 rounded-xl font-medium text-sm flex items-center justify-center gap-2.5 transition-colors ${
            motorista?.isAvailable
              ? 'bg-white/20 text-white border border-white/30 hover:bg-white/30'
              : 'bg-white text-gray-800 hover:bg-gray-100'
          }`}
        >
          <Power className="w-4 h-4" />
          {toggle.isPending ? 'Aguarde...' : motorista?.isAvailable ? 'Ficar offline' : 'Ficar online'}
        </button>
      </div>

      <div className="flex-1 px-4 py-5 flex flex-col gap-5">
        {/* Corrida ativa */}
        {activeRide && (
          <Link to="/motorista/ativa">
            <Card className="border-amber-200 bg-amber-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-medium text-amber-800">Corrida em andamento</span>
              </div>
              <p className="text-sm font-medium text-gray-900 truncate">{activeRide.destAddress}</p>
              <p className="text-xs text-gray-500 mt-1">
                {activeRide.status === 'ACEITA' ? 'A caminho da origem' : 'Em andamento'}
              </p>
            </Card>
          </Link>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-100 rounded-xl p-4">
            <Star className="w-4 h-4 text-amber-500 mb-2" />
            <p className="text-xl font-medium text-gray-900">
              {motorista?.ratingAvg?.toFixed(1) ?? '—'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Avaliação média</p>
          </div>
          <div className="bg-gray-100 rounded-xl p-4">
            <Car className="w-4 h-4 text-brand-600 mb-2" />
            <p className="text-xl font-medium text-gray-900">{motorista?.ratingCount ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Corridas realizadas</p>
          </div>
        </div>

        {/* Veículo */}
        {motorista && (
          <Card>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Veículo</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <Car className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {motorista.vehicleBrand} {motorista.vehicleModel} {motorista.vehicleYear}
                </p>
                <p className="text-xs text-gray-400">
                  {motorista.vehicleColor} · {motorista.vehiclePlate}
                </p>
              </div>
            </div>
          </Card>
        )}

        {!motorista?.isAvailable && !activeRide && (
          <div className="text-center py-6 text-gray-400">
            <Power className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Você está offline</p>
            <p className="text-xs mt-1">Fique online para receber corridas</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Corridas (disponíveis + histórico) ────────────────────────────────────
export function MotoristaRidesPage() {
  const [tab, setTab] = useState<'pending' | 'history'>('pending')
  const [histPage, setHistPage] = useState(1)

  const { data: pendingRides, isLoading: pendingLoading } = usePendingRides()
  const { data: histData,     isLoading: histLoading     } = useMotoristaRideHistory(histPage)
  const accept = useAcceptRide()

  return (
    <div className="px-4 pt-12 pb-4">
      <h1 className="text-lg font-medium text-gray-900 mb-4">Corridas</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5">
        <button
          onClick={() => setTab('pending')}
          className={`flex-1 h-8 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            tab === 'pending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          Disponíveis
          {!!pendingRides?.length && (
            <span className="badge-warning ml-0.5">{pendingRides.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex-1 h-8 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            tab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Histórico
        </button>
      </div>

      {/* ── Tab: Disponíveis ── */}
      {tab === 'pending' && (
        pendingLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !pendingRides?.length ? (
          <div className="text-center py-12 text-gray-400">
            <Car className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma corrida disponível</p>
            <p className="text-xs mt-1">Aguarde novas solicitações</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pendingRides.map(ride => (
              <Card key={ride.id}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-800 text-xs font-medium flex-shrink-0">
                    {ride.sindico?.user?.name?.split(' ').slice(0, 2).map(n => n[0]).join('') ?? '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{ride.sindico?.user?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{ride.sindico?.condominiumName ?? ''}</p>
                  </div>
                  <span className="ml-auto text-xs text-gray-400">
                    {format(new Date(ride.scheduledAt), 'HH:mm', { locale: ptBR })}
                    {ride.isImmediate && <span className="ml-1 text-green-600 font-medium">Agora</span>}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 mb-3 pl-1">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="w-2 h-2 rounded-full bg-brand-600 flex-shrink-0" />
                    <span className="truncate">{ride.originAddress}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <MapPin className="w-2.5 h-2.5 text-green-600 flex-shrink-0" />
                    <span className="truncate">{ride.destAddress}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  {ride.estimatedDistanceKm ? (
                    <span className="text-xs text-gray-400">
                      ~{ride.estimatedDistanceKm} km · ~{ride.estimatedDurationMin} min
                    </span>
                  ) : <span />}
                  <Button size="sm" loading={accept.isPending} onClick={() => accept.mutate(ride.id)}>
                    <CheckCircle className="w-3.5 h-3.5" />
                    Aceitar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* ── Tab: Histórico ── */}
      {tab === 'history' && (
        histLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !histData?.data?.length ? (
          <div className="text-center py-12 text-gray-400">
            <History className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma corrida finalizada ainda</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {histData.data.map(ride => (
                <Card key={ride.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-800 text-xs font-medium flex-shrink-0">
                        {ride.sindico?.user?.name?.split(' ').slice(0, 2).map(n => n[0]).join('') ?? '?'}
                      </div>
                      <p className="text-sm font-medium text-gray-900">{ride.sindico?.user?.name ?? '—'}</p>
                    </div>
                    <RideStatusBadge status={ride.status} />
                  </div>
                  <div className="flex flex-col gap-1 pl-1 mb-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-2 h-2 rounded-full bg-brand-400 flex-shrink-0" />
                      <span className="truncate">{ride.originAddress}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <MapPin className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />
                      <span className="truncate">{ride.destAddress}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
                    <span>{format(new Date(ride.scheduledAt), "dd/MM/yy · HH:mm", { locale: ptBR })}</span>
                    {ride.estimatedDistanceKm && (
                      <span>{ride.estimatedDistanceKm} km</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Paginação */}
            {histData.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-5">
                <button
                  onClick={() => setHistPage(p => Math.max(1, p - 1))}
                  disabled={histPage === 1}
                  className="h-8 px-3 rounded-lg border border-gray-200 text-xs text-gray-500 disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-xs text-gray-500">{histPage} / {histData.totalPages}</span>
                <button
                  onClick={() => setHistPage(p => Math.min(histData.totalPages, p + 1))}
                  disabled={histPage === histData.totalPages}
                  className="h-8 px-3 rounded-lg border border-gray-200 text-xs text-gray-500 disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )
      )}
    </div>
  )
}

// ── Corrida ativa ──────────────────────────────────────────────────────────
export function MotoristaActiveRidePage() {
  const { data: ride, isLoading } = useMotoristaActiveRide()
  const startRide = useStartRide()
  const finishRide = useFinishRide()
  const cancelRide = useCancelRide()
  const socket = useSocket()
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Envia localização via Socket.io a cada 5s durante EM_ANDAMENTO
  useEffect(() => {
    if (ride?.status !== 'EM_ANDAMENTO' || !socket) return

    socket.emit('ride:join', { rideId: ride.id })

    locationIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          socket.emit('location:update', {
            rideId: ride.id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
        },
        null,
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
      )
    }, 5000)

    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current)
      socket.emit('ride:leave', { rideId: ride.id })
    }
  }, [ride?.status, ride?.id, socket])

  if (isLoading) return <div className="flex justify-center pt-20"><Spinner /></div>

  if (!ride) {
    return (
      <div className="px-4 pt-12 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Zap className="w-7 h-7 text-gray-400" />
        </div>
        <h1 className="text-lg font-medium text-gray-900 mb-2">Nenhuma corrida ativa</h1>
        <p className="text-sm text-gray-400 mb-6">Acesse "Corridas" para aceitar uma nova solicitação.</p>
        <Link to="/motorista/corridas">
          <Button>
            <Car className="w-4 h-4" />
            Ver corridas disponíveis
          </Button>
        </Link>
      </div>
    )
  }

  const polyline = ride.polyline ?? undefined

  return (
    <div className="flex flex-col min-h-full">
      {/* Mapa */}
      <div className="relative h-52">
        <ErrorBoundary inline>
          <MapView
            origin={{ lat: ride.originLat, lng: ride.originLng }}
            destination={{ lat: ride.destLat, lng: ride.destLng }}
            encodedPolyline={polyline}
            className="w-full h-full"
          />
        </ErrorBoundary>
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white shadow text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${ride.status === 'EM_ANDAMENTO' ? 'bg-green-500 animate-pulse' : 'bg-amber-400'}`} />
          {ride.status === 'ACEITA' ? 'A caminho da origem' : 'Em andamento'}
        </div>
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col gap-4">
        {/* Síndico */}
        <Card className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center text-brand-800 font-medium flex-shrink-0">
            {ride.sindico?.user?.name?.split(' ').slice(0, 2).map(n => n[0]).join('') ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{ride.sindico?.user?.name ?? '—'}</p>
            <p className="text-xs text-gray-400 truncate">{ride.sindico?.condominiumName ?? ''}</p>
          </div>
          {ride.sindico?.user?.phone && (
            <a
              href={`tel:${ride.sindico.user.phone}`}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center"
            >
              <Phone className="w-4 h-4 text-brand-600" />
            </a>
          )}
        </Card>

        {/* Rota */}
        <Card>
          <div className="flex items-start gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-brand-50 flex items-center justify-center mt-0.5 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-brand-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{ride.originAddress}</p>
              <p className="text-xs text-gray-400">{ride.originDistrict}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center mt-0.5 flex-shrink-0">
              <Navigation className="w-3 h-3 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{ride.destAddress}</p>
              <p className="text-xs text-gray-400">{ride.destDistrict}</p>
            </div>
          </div>
          {ride.estimatedDistanceKm && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3" />{ride.estimatedDistanceKm} km
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />{ride.estimatedDurationMin} min
              </span>
            </div>
          )}
        </Card>

        {/* Ações */}
        {ride.status === 'ACEITA' && (
          <div className="flex flex-col gap-2">
            <Button
              loading={startRide.isPending}
              onClick={() => startRide.mutate(ride.id)}
            >
              <CheckCircle className="w-4 h-4" />
              Iniciar corrida
            </Button>
            <Button
              variant="danger"
              loading={cancelRide.isPending}
              onClick={() => cancelRide.mutate({ id: ride.id })}
            >
              <X className="w-4 h-4" />
              Cancelar
            </Button>
          </div>
        )}

        {ride.status === 'EM_ANDAMENTO' && (
          <Button
            loading={finishRide.isPending}
            onClick={() => finishRide.mutate(ride.id)}
          >
            <CheckCircle className="w-4 h-4" />
            Concluir corrida
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Perfil do motorista ────────────────────────────────────────────────────
export function MotoristaProfilePage() {
  const { user } = useAuthStore()
  const { data: motorista, isLoading } = useMotoristaMe()
  const toggle = useToggleAvailability()
  const logout = useLogout()

  const initials = user?.name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() ?? 'MO'

  return (
    <div className="px-4 pt-12 pb-4">
      <h1 className="text-lg font-medium text-gray-900 mb-5">Perfil</h1>

      {/* Avatar + disponibilidade */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-800 text-xl font-medium mb-3">
          {initials}
        </div>
        <p className="text-base font-medium text-gray-900">{user?.name}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <div className={`w-2 h-2 rounded-full ${motorista?.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-sm text-gray-500">
            {motorista?.isAvailable ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Toggle disponibilidade */}
      <button
        onClick={() => toggle.mutate(!motorista?.isAvailable)}
        disabled={toggle.isPending}
        className={`w-full h-11 rounded-xl font-medium text-sm flex items-center justify-center gap-2 mb-4 transition-colors ${
          motorista?.isAvailable
            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
            : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
        }`}
      >
        <Power className="w-4 h-4" />
        {toggle.isPending ? 'Aguarde...' : motorista?.isAvailable ? 'Ficar offline' : 'Ficar online'}
      </button>

      {isLoading ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : motorista && (
        <>
          {/* Avaliação */}
          <Card className="mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Desempenho</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-xl font-medium text-gray-900">
                  {motorista.ratingAvg?.toFixed(1) ?? '—'}
                </span>
                <span className="text-sm text-gray-400">/ 5</span>
              </div>
              <span className="text-sm text-gray-500">{motorista.ratingCount} avaliações</span>
            </div>
          </Card>

          {/* Veículo */}
          <Card className="mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Veículo</p>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Modelo</span>
                <span className="font-medium text-gray-900">
                  {motorista.vehicleBrand} {motorista.vehicleModel} {motorista.vehicleYear}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Cor</span>
                <span className="text-gray-700">{motorista.vehicleColor}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Placa</span>
                <span className="font-mono font-medium text-gray-900">{motorista.vehiclePlate}</span>
              </div>
            </div>
          </Card>
        </>
      )}

      <Button variant="danger" className="w-full" loading={logout.isPending} onClick={() => logout.mutate()}>
        <X className="w-4 h-4" />
        Sair da conta
      </Button>
    </div>
  )
}
