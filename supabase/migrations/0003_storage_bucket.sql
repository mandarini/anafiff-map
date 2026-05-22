-- Public-read storage bucket for pin media (images + audio).
-- Writes go through edge functions using the service role key.

insert into storage.buckets (id, name, public)
values ('pin-media', 'pin-media', true)
on conflict (id) do update set public = true;

-- Anon role can read objects (bucket is public anyway).
-- Anon role cannot write — only service role can.

create policy "pin-media public read"
  on storage.objects for select
  to public
  using (bucket_id = 'pin-media');

-- No INSERT/UPDATE/DELETE policies for anon: clients cannot upload directly.
-- The edge function (service role) bypasses RLS to upload.
