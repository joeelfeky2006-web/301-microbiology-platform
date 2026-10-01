-- OPTIONAL BUT STRONGLY RECOMMENDED. Run in Supabase -> SQL Editor. NOT applied automatically.
--
-- Problem found: today ANYONE on the internet can insert rows into public.materials and
-- upload / overwrite / DELETE any file in the "materials" storage bucket using your public anon key.
--
-- Do these steps IN ORDER (or you will lock yourself out of /admin):
--   1. Supabase Dashboard -> Authentication -> Users -> "Add user" (your email + password).
--   2. Authentication -> Sign In / Providers -> turn OFF "Allow new users to sign up".
--   3. Replace YOUR_ADMIN_EMAIL below with that exact email, then run this script.
--   4. Sign in at /admin with that account.

-- ===== public.materials =====
drop policy if exists "Enable insert access for all users" on public.materials;
drop policy if exists "Enable read access for all users" on public.materials; -- duplicate of "Allow public read access"

create policy "Admin can insert materials" on public.materials
  for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL');

create policy "Admin can update materials" on public.materials
  for update to authenticated
  using ((auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL')
  with check ((auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL');

create policy "Admin can delete materials" on public.materials
  for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL');

-- ===== storage bucket "materials" (bucket stays public, so file URLs keep working) =====
drop policy if exists "Allow public uploads and reads" on storage.objects;

create policy "Admin manages materials bucket" on storage.objects
  for all to authenticated
  using (bucket_id = 'materials' and (auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL')
  with check (bucket_id = 'materials' and (auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL');
