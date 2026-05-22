# Supabase setup

## 1. Apply migrations

Open the Supabase Dashboard → SQL Editor → paste and run each file in order:

1. `migrations/0001_pins_schema.sql`
2. `migrations/0002_rls_policies.sql`
3. `migrations/0003_storage_bucket.sql`

Or, if you've linked the Supabase CLI to this project:

```bash
pnpm dlx supabase link --project-ref <your-project-ref>
pnpm dlx supabase db push
```

## 2. Set edge function secrets

In Dashboard → Project Settings → Edge Functions → Secrets, add:

- `IP_HASH_SALT` — any random string. Used to salt the SHA-256 of caller IPs
  for rate limiting. Pick something long; rotating it resets all rate-limit
  windows but otherwise has no effect.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by
the platform — no need to set them.

## 3. Deploy the edge functions

```bash
pnpm dlx supabase functions deploy submit_pin --no-verify-jwt
pnpm dlx supabase functions deploy report_pin --no-verify-jwt
pnpm dlx supabase functions deploy admin_actions
```

`--no-verify-jwt` is intentional for `submit_pin` and `report_pin`: those are
anonymous, so they accept calls from anyone with the project's publishable
key (the body is still validated server-side). `admin_actions` keeps JWT
verification because it requires a signed-in user whose email matches a row
in `anafiff_admin_allowlist`.

## 4a. Add an admin

```sql
insert into public.anafiff_admin_allowlist (email)
values ('you@example.com');
```

Then visit `/admin` in the app and request a magic link to that address.

## 4. Confirm

In the Dashboard → Edge Functions → submit_pin → Invoke, POST something like:

```json
{
  "lat": 36.355,
  "lng": 25.77,
  "text": "Hello from the SQL editor"
}
```

You should get back `{ "pin": { ... } }`. Then check the `pins` table in the
SQL editor — the row should be there.
