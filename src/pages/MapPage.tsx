import { useState } from 'react'
import { MapView } from '../components/MapView'
import { WelcomeOverlay } from '../components/WelcomeOverlay'
import type { Pin } from '../lib/types'

const DEMO_PINS: Pin[] = [
  {
    id: 'demo-1',
    lat: 36.355,
    lng: 25.77,
    text: 'Chora — time stretches here at noon.',
    image_path: null,
    audio_path: null,
    audio_duration_ms: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    lat: 36.36,
    lng: 25.78,
    text: null,
    image_path: 'demo.jpg',
    audio_path: null,
    audio_duration_ms: null,
    created_at: new Date().toISOString(),
  },
]

export function MapPage() {
  const [pins] = useState<Pin[]>(DEMO_PINS)

  function handleMapClick(lat: number, lng: number) {
    console.log('map click at', lat, lng)
  }

  function handlePinClick(pin: Pin) {
    console.log('pin click', pin.id)
  }

  return (
    <div className="map-page">
      <MapView pins={pins} onMapClick={handleMapClick} onPinClick={handlePinClick} />
      <WelcomeOverlay />
    </div>
  )
}
