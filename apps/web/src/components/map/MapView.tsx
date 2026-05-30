import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { MapPin } from 'lucide-react'

interface LatLng { lat: number; lng: number }

interface Props {
  origin?: LatLng
  destination?: LatLng
  driverLocation?: LatLng
  /** JSON string of [lat, lng][] coordinate pairs */
  encodedPolyline?: string
  className?: string
}

const LONDRINA_CENTER: [number, number] = [-23.3045, -51.1696]

const originIcon = L.divIcon({
  className: '',
  html: '<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="9" fill="#185FA5" stroke="#fff" stroke-width="2.5"/></svg>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

const destIcon = L.divIcon({
  className: '',
  html: '<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="9" fill="#16a34a" stroke="#fff" stroke-width="2.5"/></svg>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

const driverIcon = L.divIcon({
  className: '',
  html: '<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><polygon points="11,2 20,20 11,15 2,20" fill="#f59e0b" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

// ── Child component — uses useMap() for reactive map mutations ──────────────
interface ControllerProps {
  origin?: LatLng
  destination?: LatLng
  driverLocation?: LatLng
  polylinePositions: [number, number][] | null
}

function MapController({ origin, destination, driverLocation, polylinePositions }: ControllerProps) {
  const map = useMap()

  // Fit to polyline (highest priority)
  useEffect(() => {
    if (!polylinePositions || polylinePositions.length < 2) return
    map.fitBounds(polylinePositions as L.LatLngBoundsExpression, { padding: [48, 48] })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polylinePositions])

  // Fit to origin + destination when no polyline yet
  useEffect(() => {
    if (polylinePositions || !origin || !destination) return
    map.fitBounds(
      [[origin.lat, origin.lng], [destination.lat, destination.lng]],
      { padding: [56, 56], maxZoom: 16 },
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng])

  // Pan to destination when it first appears (no origin geocoded yet)
  useEffect(() => {
    if (polylinePositions || origin || !destination) return
    map.setView([destination.lat, destination.lng], 15)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination?.lat, destination?.lng])

  // Track driver in real-time
  useEffect(() => {
    if (!driverLocation) return
    map.panTo([driverLocation.lat, driverLocation.lng])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverLocation?.lat, driverLocation?.lng])

  return null
}

// ── MapView ─────────────────────────────────────────────────────────────────
export function MapView({ origin, destination, driverLocation, encodedPolyline, className = '' }: Props) {
  const polylinePositions = useMemo<[number, number][] | null>(() => {
    if (!encodedPolyline) return null
    try {
      return JSON.parse(encodedPolyline) as [number, number][]
    } catch {
      return null
    }
  }, [encodedPolyline])

  const initialCenter: [number, number] = origin
    ? [origin.lat, origin.lng]
    : destination
    ? [destination.lat, destination.lng]
    : LONDRINA_CENTER

  if (typeof window === 'undefined') {
    return (
      <div className={`bg-brand-50 flex items-center justify-center ${className}`}>
        <MapPin className="w-6 h-6 text-brand-300 animate-pulse" />
      </div>
    )
  }

  return (
    <MapContainer
      center={initialCenter}
      zoom={13}
      zoomControl
      className={className}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      <MapController
        origin={origin}
        destination={destination}
        driverLocation={driverLocation}
        polylinePositions={polylinePositions}
      />

      {origin && (
        <Marker position={[origin.lat, origin.lng]} icon={originIcon} />
      )}
      {destination && (
        <Marker position={[destination.lat, destination.lng]} icon={destIcon} />
      )}
      {driverLocation && (
        <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon} />
      )}
      {polylinePositions && polylinePositions.length >= 2 && (
        <Polyline
          positions={polylinePositions}
          pathOptions={{ color: '#185FA5', weight: 4, opacity: 0.8 }}
        />
      )}
    </MapContainer>
  )
}
