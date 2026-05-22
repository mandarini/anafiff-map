// report_pin: lets anonymous clients flag a pin. If ≥ AUTO_HIDE_THRESHOLD
// reports exist for a pin, mark it hidden automatically. Admins can override
// via admin_actions.
//
// Body shape (JSON):
//   { pin_id: uuid, reason?: string }

import { createClient } from 'jsr:@supabase/supabase-js@2'

const AUTO_HIDE_THRESHOLD = 3
const REASON_MAX = 200

type Payload = {
  pin_id?: string
  reason?: string
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

  const pinId = body.pin_id
  if (!pinId || typeof pinId !== 'string') {
    return cors(json({ error: 'pin_id_required' }, 400))
  }

  const reason =
    typeof body.reason === 'string' ? body.reason.trim().slice(0, REASON_MAX) : null

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: existing, error: lookupErr } = await supabase
    .from('pins')
    .select('id, hidden')
    .eq('id', pinId)
    .maybeSingle()
  if (lookupErr) return cors(json({ error: 'lookup_failed', detail: lookupErr.message }, 500))
  if (!existing) return cors(json({ error: 'pin_not_found' }, 404))

  const { error: insertErr } = await supabase
    .from('pin_reports')
    .insert({ pin_id: pinId, reason })
  if (insertErr) return cors(json({ error: 'report_failed', detail: insertErr.message }, 500))

  if (!existing.hidden) {
    const { count, error: countErr } = await supabase
      .from('pin_reports')
      .select('id', { count: 'exact', head: true })
      .eq('pin_id', pinId)
    if (countErr) return cors(json({ error: 'count_failed', detail: countErr.message }, 500))

    if ((count ?? 0) >= AUTO_HIDE_THRESHOLD) {
      const { error: hideErr } = await supabase
        .from('pins')
        .update({ hidden: true })
        .eq('id', pinId)
      if (hideErr) {
        return cors(json({ error: 'auto_hide_failed', detail: hideErr.message }, 500))
      }
      return cors(json({ ok: true, auto_hidden: true }, 200))
    }
  }

  return cors(json({ ok: true, auto_hidden: false }, 200))
})

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
