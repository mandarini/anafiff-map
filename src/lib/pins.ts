import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { SUPABASE_URL } from '../config'
import type { Pin, PinDraft } from './types'

export async function fetchPins(): Promise<Pin[]> {
  const { data, error } = await supabase
    .from('pins_public')
    .select('id, lat, lng, text, image_path, audio_path, audio_duration_ms, created_at')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return (data ?? []) as Pin[]
}

export async function submitPin(draft: PinDraft): Promise<Pin> {
  const [image, audio] = await Promise.all([
    draft.imageBlob ? blobToBase64Payload(draft.imageBlob) : null,
    draft.audioBlob
      ? blobToBase64Payload(draft.audioBlob).then((p) => ({
          ...p,
          durationMs: draft.audioDurationMs,
        }))
      : null,
  ])

  const { data, error } = await supabase.functions.invoke<{ pin: Pin }>('submit_pin', {
    body: {
      lat: draft.lat,
      lng: draft.lng,
      text: draft.text,
      image,
      audio,
    },
  })

  if (error) throw error
  if (!data?.pin) throw new Error('submit_pin returned no pin')
  return data.pin
}

export function publicUrlFor(path: string | null): string | null {
  if (!path) return null
  return `${SUPABASE_URL}/storage/v1/object/public/pin-media/${path}`
}

export type PinChangeHandler = {
  onInsert: (pin: Pin) => void
  onHidden: (pinId: string) => void
}

// Subscribes to INSERT and UPDATE on the pins table. The table has no
// identity columns (see migration 0001), so payloads are safe to broadcast.
// Newly hidden pins arrive as UPDATE with hidden=true; the SELECT RLS policy
// filters them out client-side, so we treat any UPDATE we see for hidden=true
// as a removal signal too.
export function subscribeToPins(handler: PinChangeHandler): RealtimeChannel {
  const channel = supabase
    .channel('pins-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'pins' },
      (payload) => {
        const pin = payload.new as Pin & { hidden?: boolean }
        if (pin.hidden) return
        handler.onInsert(toPin(pin))
      },
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'pins' },
      (payload) => {
        const next = payload.new as Pin & { hidden?: boolean }
        if (next.hidden) handler.onHidden(next.id)
      },
    )
    .subscribe()
  return channel
}

function toPin(row: Pin): Pin {
  return {
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    text: row.text,
    image_path: row.image_path,
    audio_path: row.audio_path,
    audio_duration_ms: row.audio_duration_ms,
    created_at: row.created_at,
  }
}

export async function reportPin(pinId: string, reason?: string): Promise<void> {
  const { error } = await supabase.functions.invoke('report_pin', {
    body: { pin_id: pinId, reason },
  })
  if (error) throw error
}

async function blobToBase64Payload(blob: Blob): Promise<{ contentType: string; base64: string }> {
  const base64 = await blobToBase64(blob)
  return { contentType: blob.type || 'application/octet-stream', base64 }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
