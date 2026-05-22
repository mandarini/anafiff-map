import { useEffect, useRef } from 'react'
import { loadMaps, loadMarker } from '../lib/google/loader'
import { ANAFI_CENTER, ANAFI_BOUNDS } from '../lib/google/anafi'
import { GOOGLE_MAPS_MAP_ID } from '../config'
import type { Pin } from '../lib/types'

type Props = {
  pins: Pin[]
  onMapClick: (lat: number, lng: number) => void
  onPinClick: (pin: Pin) => void
}

export function MapView({ pins, onMapClick, onPinClick }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map())
  const onMapClickRef = useRef(onMapClick)
  const onPinClickRef = useRef(onPinClick)

  useEffect(() => {
    onMapClickRef.current = onMapClick
  }, [onMapClick])

  useEffect(() => {
    onPinClickRef.current = onPinClick
  }, [onPinClick])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [maps] = await Promise.all([loadMaps(), loadMarker()])
      if (cancelled || !containerRef.current || mapRef.current) return

      const map = new maps.Map(containerRef.current, {
        center: ANAFI_CENTER,
        zoom: 13,
        mapId: GOOGLE_MAPS_MAP_ID,
        colorScheme: google.maps.ColorScheme.DARK,
        restriction: {
          latLngBounds: ANAFI_BOUNDS,
          strictBounds: false,
        },
        minZoom: 12,
        maxZoom: 18,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
      })

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return
        onMapClickRef.current(e.latLng.lat(), e.latLng.lng())
      })

      mapRef.current = map
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    void syncMarkers(map, pins, markersRef.current, (pin) => onPinClickRef.current(pin))
  }, [pins])

  return <div ref={containerRef} className="map-canvas" />
}

async function syncMarkers(
  map: google.maps.Map,
  pins: Pin[],
  markers: Map<string, google.maps.marker.AdvancedMarkerElement>,
  onClick: (pin: Pin) => void,
) {
  const { AdvancedMarkerElement } = await loadMarker()

  const incomingIds = new Set(pins.map((p) => p.id))
  for (const [id, marker] of markers) {
    if (!incomingIds.has(id)) {
      marker.map = null
      markers.delete(id)
    }
  }

  for (const pin of pins) {
    if (markers.has(pin.id)) {
      const m = markers.get(pin.id)!
      m.position = { lat: pin.lat, lng: pin.lng }
      continue
    }

    const dot = document.createElement('div')
    dot.className = 'pin-dot'
    dot.innerHTML = pinIconHtml(pin)

    const marker = new AdvancedMarkerElement({
      map,
      position: { lat: pin.lat, lng: pin.lng },
      content: dot,
    })

    marker.addListener('gmp-click', () => onClick(pin))

    markers.set(pin.id, marker)
  }
}

function pinIconHtml(pin: Pin): string {
  const icons: string[] = []
  if (pin.text) icons.push('T')
  if (pin.image_path) icons.push('◯')
  if (pin.audio_path) icons.push('~')
  return `<span class="pin-icons">${icons.join('')}</span>`
}
