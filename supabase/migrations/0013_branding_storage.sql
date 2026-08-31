-- ============================================================================
-- 0013: branding_storage
-- Create 'branding' storage bucket for logo and favicon
-- Allow public read, admin write/update.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('branding', 'branding', true);

create policy "branding_select_public" on storage.objects
  for select to public using (bucket_id = 'branding');

create policy "branding_insert_admin" on storage.objects
  for insert to authenticated with check (bucket_id = 'branding' and is_admin());

create policy "branding_update_admin" on storage.objects
  for update to authenticated using (bucket_id = 'branding' and is_admin());

create policy "branding_delete_admin" on storage.objects
  for delete to authenticated using (bucket_id = 'branding' and is_admin());
