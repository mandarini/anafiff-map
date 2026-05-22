import { useState } from 'react'
import { ImagePicker } from './ImagePicker'
import { AudioRecorder } from './AudioRecorder'
import type { PinDraft } from '../lib/types'

type Props = {
  lat: number
  lng: number
  onCancel: () => void
  onSubmit: (draft: PinDraft) => Promise<void> | void
}

const PROMPTS = [
  'Where does time feel slower?',
  'A spot that repels you? Or one that attracts you?',
  'Which colour keeps appearing?',
  'What did you notice that others might miss?',
]

export function AddPinSheet({ lat, lng, onCancel, onSubmit }: Props) {
  const [text, setText] = useState('')
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioDurationMs, setAudioDurationMs] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)]

  const hasContent = text.trim().length > 0 || imageBlob !== null || audioBlob !== null
  const canSubmit = hasContent && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        lat,
        lng,
        text: text.trim() || undefined,
        imageBlob: imageBlob ?? undefined,
        audioBlob: audioBlob ?? undefined,
        audioDurationMs: audioDurationMs ?? undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit pin')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h2>Add a pin</h2>
          <p className="sheet-coords">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
        </div>

        <section className="sheet-section">
          <label className="sheet-label">Note</label>
          <textarea
            className="sheet-textarea"
            rows={3}
            maxLength={500}
            placeholder={prompt}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="sheet-counter">{text.length} / 500</p>
        </section>

        <section className="sheet-section">
          <label className="sheet-label">Photo</label>
          <ImagePicker blob={imageBlob} onChange={setImageBlob} />
        </section>

        <section className="sheet-section">
          <label className="sheet-label">Voice note</label>
          <AudioRecorder
            blob={audioBlob}
            durationMs={audioDurationMs}
            onChange={(blob, durationMs) => {
              setAudioBlob(blob)
              setAudioDurationMs(durationMs)
            }}
          />
        </section>

        {error && <p className="sheet-error">{error}</p>}

        <div className="sheet-actions">
          <button type="button" className="sheet-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="sheet-submit"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {submitting ? 'Sending…' : 'Drop pin'}
          </button>
        </div>
      </div>
    </div>
  )
}
