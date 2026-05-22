// MediaRecorder wrapper with Safari fallback.
//   - Chrome/Firefox/Android: audio/webm with opus
//   - Safari (iOS 14.3+): audio/mp4 with aac

export const MAX_AUDIO_DURATION_MS = 60_000

export function pickAudioMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? null
}

export type RecordingResult = {
  blob: Blob
  durationMs: number
  mimeType: string
}

export class AudioRecording {
  private stream: MediaStream
  private recorder: MediaRecorder
  private chunks: BlobPart[] = []
  private startedAt = 0
  private finished: Promise<RecordingResult>

  private constructor(stream: MediaStream, recorder: MediaRecorder) {
    this.stream = stream
    this.recorder = recorder

    this.recorder.addEventListener('dataavailable', (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data)
    })

    this.finished = new Promise((resolve) => {
      this.recorder.addEventListener('stop', () => {
        const mimeType = this.recorder.mimeType || 'audio/webm'
        const blob = new Blob(this.chunks, { type: mimeType })
        const durationMs = performance.now() - this.startedAt
        for (const track of this.stream.getTracks()) track.stop()
        resolve({ blob, durationMs, mimeType })
      })
    })
  }

  static async start(): Promise<AudioRecording> {
    const mimeType = pickAudioMimeType()
    if (!mimeType) throw new Error('Audio recording is not supported in this browser')
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream, { mimeType })
    const recording = new AudioRecording(stream, recorder)
    recording.startedAt = performance.now()
    recorder.start()
    return recording
  }

  stop(): Promise<RecordingResult> {
    if (this.recorder.state !== 'inactive') this.recorder.stop()
    return this.finished
  }
}
