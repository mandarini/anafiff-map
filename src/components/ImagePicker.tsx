import { useEffect, useRef, useState } from 'react'
import { processImage } from '../lib/media/image'

type Props = {
  blob: Blob | null
  onChange: (blob: Blob | null) => void
}

export function ImagePicker({ blob, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(blob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [blob])

  async function handleFile(file: File) {
    setError(null)
    setBusy(true)
    try {
      const processed = await processImage(file)
      onChange(processed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process image')
    } finally {
      setBusy(false)
    }
  }

  if (previewUrl) {
    return (
      <div className="picker-preview">
        <img src={previewUrl} alt="Pin attachment preview" />
        <button type="button" className="picker-remove" onClick={() => onChange(null)}>
          Remove image
        </button>
      </div>
    )
  }

  return (
    <div className="picker-empty">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        className="picker-add"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? 'Processing…' : 'Add photo'}
      </button>
      {error && <p className="picker-error">{error}</p>}
    </div>
  )
}
