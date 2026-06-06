// Londrina bounding box
const LONDRINA_BOUNDS = {
  minLat: -23.7, maxLat: -23.0,
  minLng: -51.5, maxLng: -50.9,
}

const USER_AGENT = 'SindiRide/1.0 (contato@sindiride.com.br)'
const OSRM_TIMEOUT_MS = 5_000

export interface RouteResult {
  distanceMeters: number
  distanceKm: number
  durationSeconds: number
  durationMin: number
  /** JSON string of [lat, lng][] pairs — ready for Leaflet Polyline */
  polyline: string
}

export interface GeocodedAddress {
  lat: number
  lng: number
  formattedAddress: string
}

function isWithinLondrina(lat: number, lng: number): boolean {
  return (
    lat >= LONDRINA_BOUNDS.minLat && lat <= LONDRINA_BOUNDS.maxLat &&
    lng >= LONDRINA_BOUNDS.minLng && lng <= LONDRINA_BOUNDS.maxLng
  )
}

/**
 * Haversine straight-line distance in km.
 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Fallback quando OSRM está indisponível.
 * Usa distância Haversine × 1.4 (fator de tortuosidade urbana) e velocidade média de 30 km/h.
 */
function haversineFallback(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): RouteResult {
  const straightKm = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng)
  const roadKm     = Math.round(straightKm * 1.4 * 10) / 10
  const durationMin = Math.max(1, Math.round(roadKm / 30 * 60))
  return {
    distanceMeters: roadKm * 1000,
    distanceKm:     roadKm,
    durationSeconds: durationMin * 60,
    durationMin,
    // Linha reta entre origem e destino — frontend calcula rota real via browser
    polyline: JSON.stringify([[origin.lat, origin.lng], [destination.lat, destination.lng]]),
  }
}

/**
 * Calculate driving route via OSRM open API.
 * Falls back to Haversine estimate when OSRM is unreachable.
 * Polyline is returned as JSON string of [lat, lng][] pairs for Leaflet.
 */
export async function calculateRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<RouteResult> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS)

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!res.ok) return haversineFallback(origin, destination)

    const data = await res.json() as {
      code: string
      routes: Array<{
        distance: number
        duration: number
        geometry: { coordinates: [number, number][] }
      }>
    }

    if (data.code !== 'Ok' || !data.routes.length) return haversineFallback(origin, destination)

    const route = data.routes[0]
    // Flip OSRM [lng, lat] → [lat, lng] for Leaflet
    const positions = route.geometry.coordinates.map(
      ([lng, lat]) => [lat, lng] as [number, number],
    )

    return {
      distanceMeters: route.distance,
      distanceKm:     Math.round((route.distance / 1000) * 10) / 10,
      durationSeconds: route.duration,
      durationMin:    Math.round(route.duration / 60),
      polyline: JSON.stringify(positions),
    }
  } catch {
    return haversineFallback(origin, destination)
  }
}

/**
 * Geocode an address via Nominatim.
 * Returns null if address is outside Londrina area or not found.
 */
export async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
  const params = new URLSearchParams({
    q: address,
    format: 'json',
    limit: '1',
    countrycodes: 'br',
  })

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': USER_AGENT } },
    )
    if (!res.ok) return null

    const data = await res.json() as Array<{
      display_name: string
      lat: string
      lon: string
    }>

    if (!data.length) return null

    const result = data[0]
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)

    if (!isWithinLondrina(lat, lng)) return null

    return { lat, lng, formattedAddress: result.display_name }
  } catch {
    return null
  }
}
