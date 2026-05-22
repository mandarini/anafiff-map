// submit_pin: validates an anonymous pin submission, uploads any media to
// Storage with the service role, and inserts a row.
//
// Body shape (JSON):
//   {
//     lat: number,
//     lng: number,
//     text?: string,
//     image?: { contentType: string, base64: string },
//     audio?: { contentType: string, base64: string, durationMs?: number }
//   }
//
// Returns the created public row (matches pins_public columns).

import { createClient } from 'jsr:@supabase/supabase-js@2'

const ANAFI_BOUNDS = { north: 36.39, south: 36.33, west: 25.71, east: 25.84 } as const
const TEXT_MAX = 500
const IMAGE_MAX_BYTES = 1_500_000
const AUDIO_MAX_BYTES = 2_000_000
const RATE_LIMIT_PER_HOUR = 8

type Payload = {
  lat?: number
  lng?: number
  text?: string
  image?: { contentType?: string; base64?: string } | null
  audio?: { contentType?: string; base64?: string; durationMs?: number } | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return cors(new Response(null, { status: 204 }))
  if (req.method !== 'POST') return cors(json({ error: 'method_not_allowed' }, 405))

  let body: Payload
  try {
    body = (await req.json()) as Payload
  } catch {
    return cors(json({ error: 'invalid_json' }, 400))
  }

  const lat = body.lat
  const lng = body.lng
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return cors(json({ error: 'lat_lng_required' }, 400))
  }
  if (
    lat < ANAFI_BOUNDS.south ||
    lat > ANAFI_BOUNDS.north ||
    lng < ANAFI_BOUNDS.west ||
    lng > ANAFI_BOUNDS.east
  ) {
    return cors(json({ error: 'outside_anafi_bounds' }, 400))
  }

  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (text.length > TEXT_MAX) {
    return cors(json({ error: 'text_too_long', limit: TEXT_MAX }, 400))
  }

  const hasText = text.length > 0
  const hasImage = !!body.image?.base64
  const hasAudio = !!body.audio?.base64
  if (!hasText && !hasImage && !hasAudio) {
    return cors(json({ error: 'pin_empty' }, 400))
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const ipHash = await hashIp(req)
  const rate = await checkRate(supabase, ipHash)
  if (!rate.allowed) {
    return cors(json({ error: 'rate_limited', retryAfterMs: rate.retryAfterMs }, 429))
  }

  let imagePath: string | null = null
  if (body.image?.base64) {
    const bytes = decodeBase64(body.image.base64)
    if (bytes.byteLength > IMAGE_MAX_BYTES) {
      return cors(json({ error: 'image_too_large', limit: IMAGE_MAX_BYTES }, 400))
    }
    const ext = extFromContentType(body.image.contentType) ?? 'webp'
    imagePath = `images/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('pin-media').upload(imagePath, bytes, {
      contentType: body.image.contentType || 'image/webp',
      upsert: false,
    })
    if (error) return cors(json({ error: 'image_upload_failed', detail: error.message }, 500))
  }

  let audioPath: string | null = null
  let audioDurationMs: number | null = null
  if (body.audio?.base64) {
    const bytes = decodeBase64(body.audio.base64)
    if (bytes.byteLength > AUDIO_MAX_BYTES) {
      return cors(json({ error: 'audio_too_large', limit: AUDIO_MAX_BYTES }, 400))
    }
    const ext = extFromContentType(body.audio.contentType) ?? 'webm'
    audioPath = `audio/${crypto.randomUUID()}.${ext}`
    audioDurationMs = typeof body.audio.durationMs === 'number' ? body.audio.durationMs : null
    const { error } = await supabase.storage.from('pin-media').upload(audioPath, bytes, {
      contentType: body.audio.contentType || 'audio/webm',
      upsert: false,
    })
    if (error) return cors(json({ error: 'audio_upload_failed', detail: error.message }, 500))
  }

  const { data, error } = await supabase
    .from('pins')
    .insert({
      lat,
      lng,
      text: hasText ? text : null,
      image_path: imagePath,
      audio_path: audioPath,
      audio_duration_ms: audioDurationMs,
    })
    .select('id, lat, lng, text, image_path, audio_path, audio_duration_ms, created_at')
    .single()

  if (error) return cors(json({ error: 'db_insert_failed', detail: error.message }, 500))

  return cors(json({ pin: data }, 200))
})

async function hashIp(req: Request): Promise<string> {
  const fwd = req.headers.get('x-forwarded-for') ?? ''
  const ip = fwd.split(',')[0].trim() || 'unknown'
  const salt = Deno.env.get('IP_HASH_SALT') ?? ''
  const buf = new TextEncoder().encode(salt + ip)
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function checkRate(
  supabase: ReturnType<typeof createClient>,
  ipHash: string,
): Promise<{ allowed: true } | { allowed: false; retryAfterMs: number }> {
  const now = Date.now()
  const { data } = await supabase
    .from('anafiff_rate_limits')
    .select('pin_count, window_started_at')
    .eq('ip_hash', ipHash)
    .maybeSingle()

  if (!data) {
    await supabase.from('anafiff_rate_limits').insert({ ip_hash: ipHash, pin_count: 1 })
    return { allowed: true }
  }

  const windowStart = new Date(data.window_started_at as string).getTime()
  const windowExpired = now - windowStart > 60 * 60 * 1000
  if (windowExpired) {
    await supabase
      .from('anafiff_rate_limits')
      .update({ pin_count: 1, window_started_at: new Date(now).toISOString() })
      .eq('ip_hash', ipHash)
    return { allowed: true }
  }

  if ((data.pin_count as number) >= RATE_LIMIT_PER_HOUR) {
    return { allowed: false, retryAfterMs: 60 * 60 * 1000 - (now - windowStart) }
  }

  await supabase
    .from('anafiff_rate_limits')
    .update({ pin_count: (data.pin_count as number) + 1 })
    .eq('ip_hash', ipHash)
  return { allowed: true }
}

function decodeBase64(b64: string): Uint8Array {
  const clean = b64.includes(',') ? b64.split(',')[1] : b64
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function extFromContentType(ct?: string): string | null {
  if (!ct) return null
  if (ct.includes('webp')) return 'webp'
  if (ct.includes('jpeg')) return 'jpg'
  if (ct.includes('png')) return 'png'
  if (ct.includes('webm')) return 'webm'
  if (ct.includes('mp4')) return 'm4a'
  if (ct.includes('mpeg')) return 'mp3'
  return null
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function cors(res: Response): Response {
  const headers = new Headers(res.headers)
  headers.set('access-control-allow-origin', '*')
  headers.set('access-control-allow-headers', 'authorization, x-client-info, apikey, content-type')
  headers.set('access-control-allow-methods', 'POST, OPTIONS')
  return new Response(res.body, { status: res.status, headers })
}
