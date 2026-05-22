-- RLS: clients can read public view; all writes happen via edge functions (service role bypasses RLS).

alter table public.pins enable row level security;
alter table public.pin_reports enable row level security;
alter table public.admin_allowlist enable row level security;
alter table public.rate_limits enable row level security;

-- Reading model:
--   Clients SELECT from public.pins_public (the view), never from pins directly.
--   The view filters hidden = false.
-- Writing model:
--   All writes happen via edge functions running with the service-role key,
--   which bypasses RLS. There are no INSERT/UPDATE/DELETE policies for anon.
-- Realtime model:
--   Clients subscribe to INSERT/UPDATE on public.pins; payloads are safe
--   because the table has no IP/identity columns. The client filters
--   hidden = false from the payload.

-- Grant anon SELECT on pins (needed so realtime payloads pass auth checks) and
-- on the public view (for the initial fetch).
grant select on public.pins to anon, authenticated;
grant select on public.pins_public to anon, authenticated;

-- Block all other access for anon.
revoke insert, update, delete on public.pins from anon, authenticated;
revoke all on public.pin_reports from anon, authenticated;
revoke all on public.admin_allowlist from anon, authenticated;
revoke all on public.rate_limits from anon, authenticated;

-- Add an explicit SELECT policy for pins so realtime can apply it on each row.
create policy pins_select_visible on public.pins
  for select
  to anon, authenticated
  using (hidden = false);
