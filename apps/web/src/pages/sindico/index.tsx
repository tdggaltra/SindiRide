import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { Plus, Car, Calendar, Clock, MapPin, Phone, MessageCircle, CheckCircle, Star, X, LogOut, Navigation } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuthStore } from '@/store/auth.store'
import { useRides, useRide, useCreateRide, useCancelRide, useRateRide, useSindicoMe, useLogout, useRoutes } from '@/hooks'
import { Button, Card, RideStatusBadge, Spinner } from '@/components/ui'
import { useSocketEvent } from '@/hooks/useSocket'
import { useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { AddressAutocomplete, AddressResult } from '@/components/map/AddressAutocomplete'
import { MapView } from '@/components/map/MapView'

// ── Dashboard ──────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { user } = useAuthStore()
  const { data, isLoading } = useRides(1)

  const firstName = user?.name.split(' ')[0] ?? 'Síndico'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  const activeRide = data?.data?.find(r =>
    ['AGENDADA', 'ACEITA', 'EM_ANDAMENTO'].includes(r.status)
  )

  const stats = {
    total:     data?.total ?? 0,
    concluidas: data?.data?.filter(r => r.status === 'CONCLUIDA').length ?? 0,
    agendadas:  data?.data?.filter(r => r.status === 'AGENDADA').length ?? 0,
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero azul */}
      <div className="bg-brand-600 px-4 pt-12 pb-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-brand-200 text-xs">{greeting},</p>
            <h1 className="text-white text-lg font-medium mt-0.5">{firstName}</h1>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-medium text-sm">
            {firstName[0]}
          </div>
        </div>

        {/* CTA de agendar */}
        <Link to="/corridas/nova">
          <div className="bg-white rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-brand-800 text-sm">Agendar nova corrida</p>
              <p className="text-xs text-brand-600 mt-0.5">Gratuita · Londrina e região</p>
            </div>
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
          </div>
        </Link>
      </div>

      <div className="flex-1 px-4 py-5 flex flex-col gap-5">
        {/* Corrida ativa */}
        {activeRide && (
          <Link to={`/corridas/${activeRide.id}`}>
            <Card className="border-brand-200 bg-brand-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-brand-800">Corrida ativa</span>
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">{activeRide.destAddress}</p>
              <RideStatusBadge status={activeRide.status} />
            </Card>
          </Link>
        )}

        {/* Stats */}
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-3">Resumo</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Car,      label: 'Realizadas',  value: stats.concluidas },
              { icon: Calendar, label: 'Agendadas',   value: stats.agendadas },
              { icon: Clock,    label: 'Total',       value: stats.total },
              { icon: MapPin,   label: 'Este mês',    value: data?.data?.filter(r => new Date(r.createdAt).getMonth() === new Date().getMonth()).length ?? 0 },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-gray-100 rounded-xl p-3">
                <Icon className="w-4 h-4 text-brand-600 mb-1.5" />
                <p className="text-xl font-medium text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Últimas corridas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-700">Últimas corridas</h2>
            <Link to="/corridas" className="text-xs text-brand-600">Ver todas</Link>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <div className="flex flex-col gap-2">
              {data?.data?.slice(0, 4).map(ride => (
                <Link key={ride.id} to={`/corridas/${ride.id}`}>
                  <Card className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                      ${ride.status === 'CONCLUIDA' ? 'bg-green-50' : ride.status === 'CANCELADA' ? 'bg-red-50' : 'bg-brand-50'}`}>
                      <Car className={`w-4 h-4 ${ride.status === 'CONCLUIDA' ? 'text-green-600' : ride.status === 'CANCELADA' ? 'text-red-500' : 'text-brand-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{ride.destAddress}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {format(new Date(ride.scheduledAt), "dd/MM, HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <RideStatusBadge status={ride.status} />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── RideHistory ────────────────────────────────────────────────────────────
export function RideHistoryPage() {
  const { data, isLoading } = useRides(1)

  return (
    <div className="px-4 pt-12 pb-4">
      <h1 className="text-lg font-medium text-gray-900 mb-5">Minhas corridas</h1>
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !data?.data?.length ? (
        <div className="text-center py-12 text-gray-400">
          <Car className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhuma corrida ainda</p>
          <Link to="/corridas/nova" className="text-brand-600 text-sm font-medium mt-2 inline-block">Agendar primeira corrida</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.data.map(ride => (
            <Link key={ride.id} to={`/corridas/${ride.id}`}>
              <Card className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <Car className="w-4 h-4 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{ride.destAddress}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(ride.scheduledAt), "EEEE, dd/MM · HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <RideStatusBadge status={ride.status} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ── NewRide ────────────────────────────────────────────────────────────────
export function NewRidePage() {
  const createRide = useCreateRide()
  const { data: sindico } = useSindicoMe()
  const location = useLocation()
  const prefilled = location.state as AddressResult | null
  const [isImmediate, setIsImmediate] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00')
  const [scheduleError, setScheduleError] = useState('')
  const [dest, setDest] = useState<AddressResult | null>(prefilled ?? null)
  const [destError, setDestError] = useState('')
  const [origin, setOrigin] = useState<AddressResult | null>(null)
  const [originError, setOriginError] = useState('')
  const [notes, setNotes] = useState('')
  const [routePreview, setRoutePreview] = useState<{
    distanceText: string
    durationText: string
    polyline: string
  } | null>(null)

  // Geocode condominium address via Nominatim and pre-fill origin
  useEffect(() => {
    if (!sindico?.condominiumAddress || origin !== null) return
    const params = new URLSearchParams({
      q: `${sindico.condominiumAddress}, ${sindico.condominiumDistrict}, Londrina, PR, Brasil`,
      format: 'json',
      limit: '1',
      countrycodes: 'br',
    })
    fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'Accept-Language': 'pt-BR' },
    })
      .then(r => r.json())
      .then((results: Array<{ lat: string; lon: string }>) => {
        const lat = results.length > 0 ? parseFloat(results[0].lat) : -23.325
        const lng = results.length > 0 ? parseFloat(results[0].lon) : -51.170
        setOrigin({
          address: sindico.condominiumAddress,
          district: sindico.condominiumDistrict,
          lat,
          lng,
        })
      })
      .catch(() => {
        setOrigin({
          address: sindico.condominiumAddress,
          district: sindico.condominiumDistrict,
          lat: -23.325,
          lng: -51.170,
        })
      })
  }, [sindico?.condominiumAddress])

  // Calculate route preview via OSRM whenever origin + destination are known
  useEffect(() => {
    if (!origin?.lat || !origin?.lng || !dest) return
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`
    fetch(url)
      .then(r => r.json())
      .then((data: { code: string; routes: Array<{ distance: number; duration: number; geometry: { coordinates: [number, number][] } }> }) => {
        if (data.code !== 'Ok' || !data.routes.length) return
        const route = data.routes[0]
        // Flip OSRM [lng, lat] → [lat, lng] for Leaflet
        const positions = route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number])
        setRoutePreview({
          distanceText: `${(route.distance / 1000).toFixed(1)} km`,
          durationText: `${Math.round(route.duration / 60)} min`,
          polyline: JSON.stringify(positions),
        })
      })
      .catch(() => {})
  }, [origin?.lat, origin?.lng, dest?.lat, dest?.lng])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setScheduleError('')
    setDestError('')
    setOriginError('')

    if (!origin) {
      setOriginError('Aguarde o carregamento da origem ou selecione um endereço.')
      return
    }
    if (!dest) {
      setDestError('Selecione um endereço da lista de sugestões.')
      return
    }

    let scheduledAt: string
    if (isImmediate) {
      scheduledAt = new Date().toISOString()
    } else {
      if (!date || !time) {
        setScheduleError('Preencha a data e o horário.')
        return
      }
      const combined = new Date(`${date}T${time}:00`)
      if (isNaN(combined.getTime())) {
        setScheduleError('Data ou horário inválido.')
        return
      }
      if (combined <= new Date()) {
        setScheduleError('O agendamento deve ser para uma data futura.')
        return
      }
      scheduledAt = combined.toISOString()
    }

    createRide.mutate({
      originAddress: origin.address,
      originDistrict: origin.district,
      originLat: origin.lat,
      originLng: origin.lng,
      destAddress: dest.address,
      destDistrict: dest.district,
      destLat: dest.lat,
      destLng: dest.lng,
      scheduledAt,
      isImmediate,
      notes,
    } as any)
  }

  return (
    <div className="px-4 pt-12 pb-4">
      <h1 className="text-lg font-medium text-gray-900 mb-5">Agendar corrida</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Mapa de preview */}
        <MapView
          origin={origin ?? undefined}
          destination={dest ? { lat: dest.lat, lng: dest.lng } : undefined}
          encodedPolyline={routePreview?.polyline}
          className="w-full h-44 rounded-xl overflow-hidden"
        />

        {/* Info de rota */}
        {routePreview && (
          <div className="flex items-center gap-3 px-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin className="w-3.5 h-3.5 text-brand-500" />
              {routePreview.distanceText}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5 text-brand-500" />
              {routePreview.durationText}
            </div>
          </div>
        )}

        {/* Origem */}
        <Card>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Origem</p>
          {!sindico ? (
            <div className="flex items-center gap-2 h-10">
              <div className="w-3.5 h-3.5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-400">Carregando...</span>
            </div>
          ) : (
            <>
              <AddressAutocomplete
                value={origin?.address ?? ''}
                placeholder="Endereço de partida"
                onChange={result => { setOrigin(result); setOriginError(''); setRoutePreview(null) }}
                onInputChange={() => { setOrigin(null); setRoutePreview(null) }}
              />
              {originError && (
                <p className="text-xs text-red-500 mt-1">{originError}</p>
              )}
            </>
          )}
        </Card>

        {/* Destino */}
        <Card>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Destino</p>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Endereço</label>
            <AddressAutocomplete
              value={dest?.address ?? ''}
              placeholder="Rua, número ou nome do local"
              onChange={result => { setDest(result); setDestError('') }}
              onInputChange={() => { setDest(null); setRoutePreview(null) }}
            />
            {destError && (
              <p className="text-xs text-red-500 mt-1">{destError}</p>
            )}
          </div>
        </Card>

        {/* Quando */}
        <Card>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Quando?</p>
          <div className="flex gap-2 mb-3">
            {[{ label: 'Agora', value: true }, { label: 'Agendar', value: false }].map(opt => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => { setIsImmediate(opt.value); setScheduleError('') }}
                className={`flex-1 h-9 rounded-lg text-sm font-medium border transition-colors ${
                  isImmediate === opt.value
                    ? 'bg-brand-50 border-brand-600 text-brand-800'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {!isImmediate && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Data</label>
                  <input
                    type="date"
                    className="input-field"
                    value={date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => { setDate(e.target.value); setScheduleError('') }}
                    required={!isImmediate}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Horário</label>
                  <input
                    type="time"
                    className="input-field"
                    value={time}
                    onChange={e => { setTime(e.target.value); setScheduleError('') }}
                    required={!isImmediate}
                  />
                </div>
              </div>
              {scheduleError && (
                <p className="text-xs text-red-500 mt-2">{scheduleError}</p>
              )}
            </>
          )}
        </Card>

        {/* Observação */}
        <Card>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Observação (opcional)</p>
          <textarea
            className="input-field h-16 resize-none py-2"
            placeholder="Ex: necessito de ajuda com documentos..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </Card>

        <p className="text-xs text-center text-gray-400">Corrida gratuita. Nenhum valor será cobrado.</p>

        {createRide.isError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 text-center">
            {(createRide.error as any)?.response?.data?.message ?? 'Erro ao criar corrida. Tente novamente.'}
          </p>
        )}

        <Button type="submit" loading={createRide.isPending} disabled={!dest}>
          <Calendar className="w-4 h-4" />
          Confirmar agendamento
        </Button>
      </form>
    </div>
  )
}

// ── RideTracking ───────────────────────────────────────────────────────────
export function RideTrackingPage() {
  const { id } = useParams<{ id: string }>()
  const { data: ride, isLoading } = useRide(id!)
  const cancelRide = useCancelRide()
  const rateRide = useRateRide()
  const qc = useQueryClient()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Atualiza a corrida em tempo real quando o motorista muda status
  useSocketEvent('ride:accepted',  () => qc.invalidateQueries({ queryKey: ['ride', id] }))
  useSocketEvent('ride:started',   () => qc.invalidateQueries({ queryKey: ['ride', id] }))
  useSocketEvent('ride:finished',  () => qc.invalidateQueries({ queryKey: ['ride', id] }))
  useSocketEvent('ride:cancelled', () => qc.invalidateQueries({ queryKey: ['ride', id] }))
  useSocketEvent<{ rideId: string; lat: number; lng: number }>('driver:location', (data) => {
    if (data.rideId === id) setDriverLocation({ lat: data.lat, lng: data.lng })
  })

  if (isLoading || !ride) return <div className="flex justify-center pt-20"><Spinner /></div>

  const statusSteps = [
    { key: 'AGENDADA',     label: 'Aceita' },
    { key: 'ACEITA',       label: 'A caminho' },
    { key: 'EM_ANDAMENTO', label: 'Em andamento' },
    { key: 'CONCLUIDA',    label: 'Concluída' },
  ]
  const currentStep = statusSteps.findIndex(s => s.key === ride.status)

  // Tela de avaliação pós-corrida
  if (ride.status === 'CONCLUIDA' && !ride.rating) {
    return (
      <div className="px-4 pt-12 pb-4 flex flex-col items-center">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle className="w-7 h-7 text-green-600" />
        </div>
        <h1 className="text-lg font-medium text-gray-900 mb-1">Chegamos!</h1>
        <p className="text-sm text-gray-500 mb-6">Sua corrida foi concluída com sucesso.</p>

        <Card className="w-full mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Motorista</span>
            <span className="font-medium">{ride.motorista?.user.name ?? '—'}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Distância</span>
            <span>{ride.estimatedDistanceKm ? `${ride.estimatedDistanceKm} km` : '—'}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-gray-100 pt-2 mt-2">
            <span className="text-gray-500">Valor cobrado</span>
            <span className="font-medium text-green-700">R$ 0,00 — Gratuito</span>
          </div>
        </Card>

        <p className="text-sm font-medium text-gray-700 mb-3">Como foi a corrida?</p>
        <div className="flex gap-2 mb-4">
          {[1,2,3,4,5].map(s => (
            <button key={s} onClick={() => setRating(s)}>
              <Star className={`w-8 h-8 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
            </button>
          ))}
        </div>
        <textarea
          className="input-field w-full h-16 resize-none py-2 mb-4"
          placeholder="Comentário opcional..."
          value={comment}
          onChange={e => setComment(e.target.value)}
        />
        <Button
          className="w-full"
          loading={rateRide.isPending}
          disabled={rating === 0}
          onClick={() => rateRide.mutate({ id: ride.id, rating, comment })}
        >
          Enviar avaliação
        </Button>
        <button className="text-xs text-gray-400 mt-3" onClick={() => rateRide.mutate({ id: ride.id, rating: 5 })}>
          Pular avaliação
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Mapa de rastreamento */}
      <div className="relative h-48">
        <MapView
          origin={{ lat: ride.originLat, lng: ride.originLng }}
          destination={{ lat: ride.destLat, lng: ride.destLng }}
          driverLocation={driverLocation ?? undefined}
          encodedPolyline={ride.polyline}
          className="w-full h-full"
        />
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-medium px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow">
          <Clock className="w-3.5 h-3.5" />
          {ride.estimatedDurationMin ? `Chega em ${ride.estimatedDurationMin} min` : 'Calculando...'}
        </div>
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col gap-4">
        {/* Status atual */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-gray-900">
            {ride.status === 'AGENDADA' ? 'Aguardando motorista'
             : ride.status === 'ACEITA' ? 'Motorista a caminho'
             : ride.status === 'EM_ANDAMENTO' ? 'A caminho do destino'
             : 'Corrida cancelada'}
          </span>
          <span className="ml-auto text-xs text-gray-400">
            {ride.estimatedDistanceKm ? `${ride.estimatedDistanceKm} km` : ''}
          </span>
        </div>

        {/* Card do motorista */}
        {ride.motorista && (
          <Card className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center text-brand-800 font-medium">
              {ride.motorista.user.name.split(' ').map(n => n[0]).slice(0,2).join('')}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{ride.motorista.user.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {ride.motorista.vehicleModel} {ride.motorista.vehicleColor} · {ride.motorista.vehiclePlate}
              </p>
            </div>
            <div className="flex gap-2">
              <a href={`tel:${ride.motorista.user.phone}`} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center">
                <Phone className="w-4 h-4 text-brand-600" />
              </a>
              <button className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-brand-600" />
              </button>
            </div>
          </Card>
        )}

        {/* Progress steps */}
        <div className="flex items-center gap-0">
          {statusSteps.map((step, i) => (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs
                  ${i < currentStep ? 'bg-brand-600 text-white'
                  : i === currentStep ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-400'}`}>
                  {i < currentStep ? <CheckCircle className="w-3 h-3" /> : i + 1}
                </div>
                <span className={`text-[10px] text-center leading-tight max-w-[52px] ${i === currentStep ? 'text-brand-600 font-medium' : 'text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
              {i < statusSteps.length - 1 && (
                <div className={`flex-1 h-px mx-1 mb-4 ${i < currentStep ? 'bg-brand-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

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
              <MapPin className="w-3 h-3 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{ride.destAddress}</p>
              <p className="text-xs text-gray-400">{ride.destDistrict}</p>
            </div>
          </div>
        </Card>

        {/* Cancelar */}
        {['AGENDADA', 'ACEITA'].includes(ride.status) && (
          <Button
            variant="danger"
            loading={cancelRide.isPending}
            onClick={() => cancelRide.mutate({ id: ride.id })}
          >
            <X className="w-4 h-4" />
            Cancelar corrida
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Profile ────────────────────────────────────────────────────────────────
export function ProfilePage() {
  const { user } = useAuthStore()
  const { data: sindico, isLoading } = useSindicoMe()
  const logout = useLogout()

  const mandateLabels: Record<string, string> = {
    ELEITO: 'Síndico eleito',
    PROFISSIONAL: 'Síndico profissional',
    SUBSINDICO: 'Subsíndico',
    INTERINO: 'Síndico interino',
  }

  const initials = user?.name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase() ?? 'SI'

  return (
    <div className="px-4 pt-12 pb-4">
      <h1 className="text-lg font-medium text-gray-900 mb-5">Perfil</h1>

      {/* Avatar + nome */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-800 text-xl font-medium mb-3">
          {initials}
        </div>
        <p className="text-base font-medium text-gray-900">{user?.name}</p>
        <p className="text-sm text-gray-400">{user?.email}</p>
      </div>

      {/* Dados pessoais */}
      <Card className="mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Dados pessoais</p>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Nome</span>
            <span className="font-medium text-gray-900">{user?.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">E-mail</span>
            <span className="text-gray-700">{user?.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Celular</span>
            <span className="text-gray-700">{user?.phone ?? '—'}</span>
          </div>
        </div>
      </Card>

      {/* Condomínio */}
      {isLoading ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : sindico && (
        <Card className="mb-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Condomínio</p>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Nome</span>
              <span className="font-medium text-gray-900 text-right max-w-[55%]">{sindico.condominiumName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Endereço</span>
              <span className="text-gray-700 text-right max-w-[55%]">{sindico.condominiumAddress}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Bairro</span>
              <span className="text-gray-700">{sindico.condominiumDistrict}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">CEP</span>
              <span className="text-gray-700">{sindico.condominiumZip}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Mandato</span>
              <span className="text-gray-700">{mandateLabels[sindico.mandateType] ?? sindico.mandateType}</span>
            </div>
          </div>
        </Card>
      )}

      <Button
        variant="danger"
        className="w-full"
        loading={logout.isPending}
        onClick={() => logout.mutate()}
      >
        <LogOut className="w-4 h-4" />
        Sair da conta
      </Button>
    </div>
  )
}

// ── Routes (destinos sugeridos) ────────────────────────────────────────────
export function RoutesPage() {
  const { data: routes, isLoading } = useRoutes()
  const navigate = useNavigate()

  const categoryColors: Record<string, string> = {
    'Órgão público': 'bg-blue-50 text-blue-700',
    'Judiciário':    'bg-purple-50 text-purple-700',
    'Cartório':      'bg-amber-50 text-amber-700',
    'Órgão federal': 'bg-red-50 text-red-700',
    'Banco':         'bg-green-50 text-green-700',
  }

  const scheduleRoute = (route: { name: string; address: string; district: string; lat: number; lng: number }) => {
    const dest: AddressResult = {
      address: `${route.name} — ${route.address}`,
      district: route.district,
      lat: route.lat,
      lng: route.lng,
    }
    navigate('/corridas/nova', { state: dest })
  }

  return (
    <div className="px-4 pt-12 pb-4">
      <div className="mb-5">
        <h1 className="text-lg font-medium text-gray-900">Destinos sugeridos</h1>
        <p className="text-sm text-gray-400 mt-0.5">Toque em um destino para agendar a corrida</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !routes?.length ? (
        <p className="text-center text-gray-400 text-sm py-12">Nenhum destino cadastrado</p>
      ) : (
        <div className="flex flex-col gap-3">
          {routes.map(route => (
            <button
              key={route.id}
              onClick={() => scheduleRoute(route)}
              className="text-left w-full"
            >
              <Card className="flex items-center gap-3 hover:border-brand-300 hover:bg-brand-50/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <Navigation className="w-4 h-4 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{route.name}</p>
                  <p className="text-xs text-gray-400 truncate">{route.address} · {route.district}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {route.category && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${categoryColors[route.category] ?? 'bg-gray-100 text-gray-600'}`}>
                      {route.category}
                    </span>
                  )}
                  <span className="text-xs text-brand-600 font-medium">Agendar →</span>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
