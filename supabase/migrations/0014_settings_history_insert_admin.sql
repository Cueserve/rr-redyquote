-- ============================================================================
-- 0014: settings_history_insert_admin
-- Allow admins to insert into settings_history directly, so we can track
-- branding asset uploads (logo, favicon) which don't trigger the update on
-- the settings table.
-- ============================================================================

create policy "settings_history_insert_admin"
  on settings_history for insert to authenticated
  with check (is_admin());
