-- ANAFIFF psychogeography map: core schema
-- Pins are anonymous; identity = none. Writes go through edge functions only.

create extension if not exists pgcrypto;

-- Note: pins intentionally does NOT store ip_hash.
-- Realtime payloads on this table are safe to broadcast as-is.
-- Rate limiting happens in the rate_limits table, keyed by ip_hash, with no
-- link back to specific pins.
create table public.pins (
  id uuid primary key default gen_random_uuid(),
  lat double precision not null,
  lng double precision not null,
  text text,
  image_path text,
  audio_path text,
  audio_duration_ms int,
  created_at timestamptz not null default now(),
  hidden boolean not null default false,
  constraint pins_has_content check (
    text is not null or image_path is not null or audio_path is not null
  ),
  constraint pins_in_anafi_bbox check (
    lat between 36.33 and 36.39 and lng between 25.71 and 25.84
  ),
  constraint pins_text_length check (text is null or char_length(text) <= 500)
);

create index pins_visible_created_at_idx
  on public.pins (created_at desc)
  where hidden = false;

create table public.pin_reports (
  id uuid primary key default gen_random_uuid(),
  pin_id uuid not null references public.pins(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

create index pin_reports_pin_id_idx on public.pin_reports (pin_id);

create table public.admin_allowlist (
  email text primary key,
  added_at timestamptz not null default now()
);

create table public.rate_limits (
  ip_hash text primary key,
  pin_count int not null default 0,
  window_started_at timestamptz not null default now()
);

-- pins_public: public-facing view of visible pins only.
create or replace view public.pins_public as
select
  id,
  lat,
  lng,
  text,
  image_path,
  audio_path,
  audio_duration_ms,
  created_at
from public.pins
where hidden = false;

comment on view public.pins_public is
  'Visible pins (hidden = false). Clients SELECT from this view.';
