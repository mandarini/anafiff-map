export type Pin = {
  id: string
  lat: number
  lng: number
  text: string | null
  image_path: string | null
  audio_path: string | null
  audio_duration_ms: number | null
  created_at: string
}

export type PinDraft = {
  lat: number
  lng: number
  text?: string
  imageBlob?: Blob
  audioBlob?: Blob
  audioDurationMs?: number
}
