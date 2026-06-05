import { useEffect, useState } from 'react'
import { MapView } from '../components/MapView'
import { WelcomeOverlay } from '../components/WelcomeOverlay'
import { AddPinSheet } from '../components/AddPinSheet'
import { PinDetailSheet } from '../components/PinDetailSheet'
import { fetchPins, submitPin, subscribeToPins } from '../lib/pins'
import type { Pin, PinDraft } from '../lib/types'

export function MapPage() {
  const [pins, setPins] = useState<Pin[]>([])
  const [draftSpot, setDraftSpot] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const list = await fetchPins()
        if (!cancelled) setPins(list)
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load pins')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const channel = subscribeToPins({
      onInsert: (pin) =>
        setPins((prev) => (prev.some((p) => p.id === pin.id) ? prev : [pin, ...prev])),
      onHidden: (pinId) => {
        setPins((prev) => prev.filter((p) => p.id !== pinId))
        setSelectedPin((s) => (s?.id === pinId ? null : s))
      },
    })
    return () => {
      void channel.unsubscribe()
    }
  }, [])

  function handleMapClick(lat: number, lng: number) {
    setDraftSpot({ lat, lng })
  }

  async function handleSubmitDraft(draft: PinDraft) {
    const pin = await submitPin(draft)
    setPins((prev) => (prev.some((p) => p.id === pin.id) ? prev : [pin, ...prev]))
    setDraftSpot(null)
  }

  return (
    <div className="map-page">
      <MapView pins={pins} onMapClick={handleMapClick} onPinClick={setSelectedPin} />
      <div className="brand-mark" aria-hidden>
        <img src="/anafiff_logo_dark.png" alt="" />
      </div>
      <WelcomeOverlay />
      {loadError && <div className="load-error">{loadError}</div>}
      {selectedPin && (
        <PinDetailSheet pin={selectedPin} onClose={() => setSelectedPin(null)} />
      )}
      {draftSpot && !selectedPin && (
        <AddPinSheet
          lat={draftSpot.lat}
          lng={draftSpot.lng}
          onCancel={() => setDraftSpot(null)}
          onSubmit={handleSubmitDraft}
        />
      )}
    </div>
  )
}
