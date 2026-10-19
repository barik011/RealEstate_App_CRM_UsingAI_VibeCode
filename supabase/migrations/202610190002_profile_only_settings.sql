begin;
-- Profile-only agents must not read company settings through the API either.
drop policy settings_read on public.crm_settings;
create policy settings_read on public.crm_settings for select to authenticated
  using ((select app_private.can_agent('leads')));
commit;
