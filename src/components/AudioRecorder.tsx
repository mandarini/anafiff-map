import { useEffect, useRef, useState } from 'react'
import { AudioRecording, MAX_AUDIO_DURATION_MS, pickAudioMimeType } from '../lib/media/audio'

type Props = {
  blob: Blob | null
  durationMs: number | null
  onChange: (blob: Blob | null, durationMs: number | null) => void
}

type State = 'idle' | 'recording' | 'preview'

export function AudioRecorder({ blob, durationMs, onChange }: Props) {
  const [state, setState] = useState<State>(blob ? 'preview' : 'idle')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const recordingRef = useRef<AudioRecording | null>(null)
  const tickRef = useRef<number | null>(null)

  const supported = pickAudioMimeType() !== null

  useEffect(() => {
    if (!blob) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(blob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [blob])

  useEffect(() => {
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current)
      recordingRef.current?.stop().catch(() => {})
    }
  }, [])

  async function startRecording() {
    setError(null)
    try {
      const recording = await AudioRecording.start()
      recordingRef.current = recording
      setState('recording')
      setElapsed(0)
      const startedAt = performance.now()
      tickRef.current = window.setInterval(() => {
        const ms = performance.now() - startedAt
        setElapsed(ms)
        if (ms >= MAX_AUDIO_DURATION_MS) void stopRecording()
      }, 250)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start recording')
    }
  }

  async function stopRecording() {
    if (tickRef.current) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
    const recording = recordingRef.current
    if (!recording) return
    recordingRef.current = null
    const result = await recording.stop()
    onChange(result.blob, Math.round(result.durationMs))
    setState('preview')
  }

  function discard() {
    onChange(null, null)
    setState('idle')
  }

  if (!supported) {
    return <p className="picker-error">Audio recording isn't supported in this browser.</p>
  }

  if (state === 'recording') {
    const remaining = Math.max(0, MAX_AUDIO_DURATION_MS - elapsed)
    return (
      <div className="recorder-active">
        <div className="recorder-meter">
          <span className="recorder-dot" /> Recording — {formatMs(elapsed)} / {formatMs(MAX_AUDIO_DURATION_MS)}
        </div>
        <p className="recorder-remaining">{Math.ceil(remaining / 1000)}s remaining</p>
        <button type="button" className="picker-add" onClick={() => void stopRecording()}>
          Stop
        </button>
      </div>
    )
  }

  if (state === 'preview' && previewUrl) {
    return (
      <div className="recorder-preview">
        <audio src={previewUrl} controls />
        <div className="recorder-meta">{durationMs !== null && formatMs(durationMs)}</div>
        <button type="button" className="picker-remove" onClick={discard}>
          Discard recording
        </button>
      </div>
    )
  }

  return (
    <div className="picker-empty">
      <button type="button" className="picker-add" onClick={() => void startRecording()}>
        Record voice note
      </button>
      {error && <p className="picker-error">{error}</p>}
    </div>
  )
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}
