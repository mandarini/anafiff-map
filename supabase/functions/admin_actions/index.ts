// admin_actions: authed endpoint that lets allowlisted admins manage pins.
//
// Body shape (JSON):
//   { action: 'hide_pin' | 'unhide_pin' | 'list_reports', pin_id?: string, limit?: number }
//
// Auth: requires a Supabase JWT in the Authorization header. The user's email
// must exist in the anafiff_admin_allowlist table.

import { createClient } from 'jsr:@supabase/supabase-js@2'

type Payload = {
  action?: 'hide_pin' | 'unhide_pin' | 'list_reports'
  pin_id?: string
  limit?: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return cors(new Response(null, { status: 204 }))
  if (req.method !== 'POST') return cors(json({ error: 'method_not_allowed' }, 405))

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const authHeader = req.headers.get('authorization') ?? ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return cors(json({ error: 'unauthenticated' }, 401))
  }

  // Verify JWT by calling getUser with the user-scoped client.
  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userResult, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userResult.user) return cors(json({ error: 'invalid_token' }, 401))
  const email = userResult.user.email
  if (!email) return cors(json({ error: 'no_email' }, 403))

  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data: allowed, error: allowErr } = await admin
    .from('anafiff_admin_allowlist')
    .select('email')
    .eq('email', email)
    .maybeSingle()
  if (allowErr) return cors(json({ error: 'allowlist_check_failed', detail: allowErr.message }, 500))
  if (!allowed) return cors(json({ error: 'not_allowed', email }, 403))

  let body: Payload
  try {
    body = (await req.json()) as Payload
  } catch {
    return cors(json({ error: 'invalid_json' }, 400))
  }

  switch (body.action) {
    case 'hide_pin':
    case 'unhide_pin': {
      if (!body.pin_id) return cors(json({ error: 'pin_id_required' }, 400))
      const hidden = body.action === 'hide_pin'
      const { error } = await admin.from('pins').update({ hidden }).eq('id', body.pin_id)
      if (error) return cors(json({ error: 'update_failed', detail: error.message }, 500))
      return cors(json({ ok: true, pin_id: body.pin_id, hidden }, 200))
    }
    case 'list_reports': {
      const limit = Math.min(Math.max(body.limit ?? 50, 1), 200)
      const { data, error } = await admin
        .from('pins')
        .select(
          'id, lat, lng, text, image_path, audio_path, audio_duration_ms, created_at, hidden, pin_reports(count)',
        )
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) return cors(json({ error: 'list_failed', detail: error.message }, 500))
      return cors(json({ pins: data }, 200))
    }
    default:
      return cors(json({ error: 'unknown_action' }, 400))
  }
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
