import { useState } from 'react'
import type { Pin } from '../lib/types'
import { publicUrlFor, reportPin } from '../lib/pins'
import { FlagIcon } from '../lib/icons'

type Props = {
  pin: Pin
  onClose: () => void
}

export function PinDetailSheet({ pin, onClose }: Props) {
  const [reporting, setReporting] = useState(false)
  const [reported, setReported] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const imageUrl = publicUrlFor(pin.image_path)
  const audioUrl = publicUrlFor(pin.audio_path)

  async function handleReport() {
    if (reported || reporting) return
    if (!confirm('Report this pin for review? It will be hidden if multiple people report it.')) {
      return
    }
    setReporting(true)
    setError(null)
    try {
      await reportPin(pin.id)
      setReported(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not report pin')
    } finally {
      setReporting(false)
    }
  }

  const reportLabel = reported ? 'Reported' : reporting ? 'Reporting…' : 'Report this pin'

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h2>Pin</h2>
          <p className="sheet-coords">
            {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)} · {formatRelative(pin.created_at)}
          </p>
        </div>

        {pin.text && (
          <section className="sheet-section">
            <label className="sheet-label">Note</label>
            <p className="detail-text">{pin.text}</p>
          </section>
        )}

        {imageUrl && (
          <section className="sheet-section">
            <label className="sheet-label">Photo</label>
            <img className="detail-image" src={imageUrl} alt="Pin attachment" />
          </section>
        )}

        {audioUrl && (
          <section className="sheet-section">
            <label className="sheet-label">Voice note</label>
            <audio src={audioUrl} controls preload="metadata" />
          </section>
        )}

        {error && <p className="sheet-error">{error}</p>}

        <div className="sheet-actions">
          <button type="button" className="sheet-submit" onClick={onClose}>
            Close
          </button>
        </div>

        <button
          type="button"
          className={`pin-detail-report${reported ? ' reported' : ''}`}
          aria-label={reportLabel}
          title={reportLabel}
          disabled={reporting || reported}
          onClick={() => void handleReport()}
        >
          <FlagIcon size={18} />
        </button>
      </div>
    </div>
  )
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - then)
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}
