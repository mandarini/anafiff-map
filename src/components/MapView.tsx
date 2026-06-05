import { useEffect, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { loadMaps, loadMarker } from '../lib/google/loader'
import { ANAFI_CENTER } from '../lib/google/anafi'
import { GOOGLE_MAPS_MAP_ID } from '../config'
import { TextIcon, ImageIcon, AudioIcon, LocateIcon } from '../lib/icons'
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
  const locateMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const onMapClickRef = useRef(onMapClick)
  const onPinClickRef = useRef(onPinClick)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)

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

  async function handleLocate() {
    if (locating) return
    if (!('geolocation' in navigator)) {
      setLocateError("This device doesn't support location.")
      return
    }
    setLocating(true)
    setLocateError(null)

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        })
      })

      const map = mapRef.current
      if (!map) return
      const here = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      map.panTo(here)
      if ((map.getZoom() ?? 0) < 15) map.setZoom(16)

      const { AdvancedMarkerElement } = await loadMarker()
      if (locateMarkerRef.current) {
        locateMarkerRef.current.position = here
      } else {
        const dot = document.createElement('div')
        dot.className = 'locate-dot'
        locateMarkerRef.current = new AdvancedMarkerElement({
          map,
          position: here,
          content: dot,
        })
      }
    } catch (err) {
      const msg =
        err instanceof GeolocationPositionError && err.code === err.PERMISSION_DENIED
          ? 'Location permission denied.'
          : "Couldn't get your location."
      setLocateError(msg)
      window.setTimeout(() => setLocateError(null), 3000)
    } finally {
      setLocating(false)
    }
  }

  return (
    <>
      <div ref={containerRef} className="map-canvas" />
      <button
        type="button"
        className="locate-btn"
        aria-label="Use my location"
        disabled={locating}
        onClick={() => void handleLocate()}
      >
        <LocateIcon size={22} />
      </button>
      {locateError && <div className="map-toast">{locateError}</div>}
    </>
  )
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
    dot.innerHTML = pinContentHtml(pin)

    const marker = new AdvancedMarkerElement({
      map,
      position: { lat: pin.lat, lng: pin.lng },
      content: dot,
    })

    marker.addListener('gmp-click', () => onClick(pin))

    markers.set(pin.id, marker)
  }
}

function pinContentHtml(pin: Pin): string {
  const parts: string[] = []
  if (pin.text) {
    parts.push(wrapIcon('icon-text', renderToStaticMarkup(<TextIcon size={16} />)))
  }
  if (pin.image_path) {
    parts.push(wrapIcon('icon-image', renderToStaticMarkup(<ImageIcon size={16} />)))
  }
  if (pin.audio_path) {
    parts.push(wrapIcon('icon-audio', renderToStaticMarkup(<AudioIcon size={16} />)))
  }
  return parts.join('')
}

function wrapIcon(className: string, svg: string): string {
  return `<span class="${className}">${svg}</span>`
}
