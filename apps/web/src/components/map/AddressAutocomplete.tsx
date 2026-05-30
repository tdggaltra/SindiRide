import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin } from 'lucide-react'

export interface AddressResult {
  address: string
  district: string
  lat: number
  lng: number
}

interface NominatimItem {
  display_name: string
  lat: string
  lon: string
  address: {
    suburb?: string
    neighbourhood?: string
    city_district?: string
    quarter?: string
  }
}

// Londrina metro viewbox: west, north, east, south (Nominatim format)
const VIEWBOX = '-51.5,-23.0,-50.9,-23.7'

async function nominatimSearch(query: string): Promise<NominatimItem[]> {
  if (query.trim().length < 3) return []
  const params = new URLSearchParams({
    q: `${query}, Londrina, PR`,
    format: 'json',
    addressdetails: '1',
    limit: '5',
    viewbox: VIEWBOX,
    bounded: '0',
    countrycodes: 'br',
  })
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'Accept-Language': 'pt-BR, pt;q=0.9' },
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

function extractDistrict(addr: NominatimItem['address']): string {
  return addr.suburb ?? addr.neighbourhood ?? addr.city_district ?? addr.quarter ?? ''
}

interface Props {
  value?: string
  placeholder?: string
  required?: boolean
  className?: string
  onChange: (result: AddressResult) => void
  onInputChange?: (value: string) => void
}

export function AddressAutocomplete({
  value,
  placeholder = 'Rua, número ou nome do local',
  required,
  className,
  onChange,
  onInputChange,
}: Props) {
  const [inputVal, setInputVal] = useState(value ?? '')
  const [suggestions, setSuggestions] = useState<NominatimItem[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync inputVal when the parent updates value externally (e.g. geocoding completes)
  useEffect(() => {
    if (value !== undefined) setInputVal(value)
  }, [value])

  const search = useCallback(async (q: string) => {
    setLoading(true)
    const results = await nominatimSearch(q)
    setSuggestions(results)
    setOpen(results.length > 0)
    setLoading(false)
  }, [])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputVal(val)
    onInputChange?.(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (val.trim().length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }
    timerRef.current = setTimeout(() => search(val), 400)
  }

  const handleSelect = (item: NominatimItem) => {
    const result: AddressResult = {
      address: item.display_name,
      district: extractDistrict(item.address),
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }
    setInputVal(item.display_name)
    setSuggestions([])
    setOpen(false)
    onChange(result)
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Cleanup debounce timer on unmount
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <input
        className={className ?? 'input-field'}
        placeholder={placeholder}
        value={inputVal}
        required={required}
        autoComplete="off"
        onChange={handleInput}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={e => e.key === 'Escape' && setOpen(false)}
      />

      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-3.5 h-3.5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {open && suggestions.length > 0 && (
        <ul className="absolute z-[9999] mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-100 max-h-52 overflow-y-auto">
          {suggestions.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
              onMouseDown={() => handleSelect(item)}
            >
              <MapPin className="w-3.5 h-3.5 text-brand-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-700 leading-snug">{item.display_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
