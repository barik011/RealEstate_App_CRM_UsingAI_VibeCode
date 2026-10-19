begin;

alter table public.profiles
  add column permissions text[] not null default '{}',
  add column login_enabled boolean not null default true,
  add column access_version bigint not null default 1;

-- Existing agents retain their previously granted workspace access. All newly
-- provisioned agents default to profile-only until an administrator grants more.
update public.profiles set permissions = array['dashboard','leads','leadUpdates','tasks','taskUpdates','viewings','viewingUpdates','calendar','reports'] where role='AGENT';

create function app_private.valid_agent_permissions(value text[]) returns boolean
language sql immutable set search_path='' as $$
  select value is not null and array_position(value,null) is null
    and value <@ array['dashboard','leads','leadUpdates','tasks','taskUpdates','viewings','viewingUpdates','calendar','reports']::text[]
    and (cardinality(value)=0 or 'leads'=any(value))
    and (not ('taskUpdates'=any(value)) or 'tasks'=any(value))
    and (not ('viewingUpdates'=any(value)) or 'viewings'=any(value))
    and (not ('calendar'=any(value)) or ('tasks'=any(value) and 'viewings'=any(value)));
$$;
alter table public.profiles add constraint valid_agent_permissions check(app_private.valid_agent_permissions(permissions));

create or replace function app_private.agent_id() returns text
language sql stable security definer set search_path='' as $$
  select p.agent_id from public.profiles p join public.agents a on a.id=p.agent_id
  where p.id=auth.uid() and p.role='AGENT' and p.login_enabled and a.status='ACTIVE';
$$;
create function app_private.can_agent(permission text) returns boolean
language sql stable security definer set search_path='' as $$
  select app_private.is_admin() or exists(select 1 from public.profiles p
    where p.id=auth.uid() and p.agent_id=app_private.agent_id() and permission=any(p.permissions));
$$;
create or replace function app_private.can_read_lead(lead_key text) returns boolean
language sql stable security definer set search_path='' as $$
  select app_private.is_admin() or (app_private.can_agent('leads') and exists(
    select 1 from public.leads where id=lead_key and assigned_agent_id=app_private.agent_id()));
$$;
drop policy leads_read on public.leads;
create policy leads_read on public.leads for select to authenticated using (
  (select app_private.is_admin()) or ((select app_private.can_agent('leads')) and assigned_agent_id=(select app_private.agent_id())));
drop policy tasks_read on public.tasks;
create policy tasks_read on public.tasks for select to authenticated using (
  app_private.can_read_lead(lead_id) and (select app_private.can_agent('tasks')) and
  ((select app_private.is_admin()) or agent_id=(select app_private.agent_id())));
drop policy viewings_read on public.viewings;
create policy viewings_read on public.viewings for select to authenticated using (
  app_private.can_read_lead(lead_id) and (select app_private.can_agent('viewings')) and
  ((select app_private.is_admin()) or agent_id=(select app_private.agent_id())));
drop policy notifications_read on public.notifications;
create policy notifications_read on public.notifications for select to authenticated using (
  (select app_private.is_admin()) or ((select app_private.can_agent('tasks')) and (select app_private.can_agent('viewings'))
  and agent_id=(select app_private.agent_id()) and app_private.can_read_lead(lead_id)));

alter function public.crm_command(text,jsonb) set schema app_private;
alter function app_private.crm_command(text,jsonb) rename to crm_command_properties;
revoke all on function app_private.crm_command_properties(text,jsonb) from public,anon,authenticated;
create function public.crm_command(command text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor public.profiles; required_permission text;
begin
  select * into actor from public.profiles where id=auth.uid() for share;
  if actor.id is null then raise exception 'Sign in to continue.' using errcode='42501'; end if;
  if actor.role='AGENT' then
    if app_private.agent_id() is null then raise exception 'Your agent login is disabled or inactive.' using errcode='42501'; end if;
    required_permission := case
      when command in ('status','priority','note','communication','won','lost') then 'leadUpdates'
      when command in ('createTask','updateTask') then 'taskUpdates'
      when command in ('createViewing','updateViewing') then 'viewingUpdates'
      when command='readNotifications' then 'leads'
      when command='saveAgent' then null
      else '__admin_only__' end;
    if required_permission='__admin_only__' then raise exception 'Administrator access is required.' using errcode='42501'; end if;
    if required_permission is not null and not app_private.can_agent(required_permission) then
      raise exception 'Your administrator has not granted permission for this action.' using errcode='42501';
    end if;
  end if;
  return app_private.crm_command_properties(command,payload);
end;
$$;

create function public.set_agent_access(target_agent text,granted_permissions text[],login_enabled boolean,expected_version bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor public.profiles; target public.profiles;
begin
  select * into actor from public.profiles where id=auth.uid();
  if actor.role is distinct from 'ADMIN' then raise exception 'Administrator access is required.' using errcode='42501'; end if;
  select * into target from public.profiles where agent_id=target_agent and role='AGENT' for update;
  if target.id is null then raise exception 'Create the agent login first.'; end if;
  if target.access_version is distinct from expected_version then raise exception 'Access was changed by another administrator. Refresh and review before saving.' using errcode='40001'; end if;
  if not app_private.valid_agent_permissions(granted_permissions) or login_enabled is null then raise exception 'Choose valid permissions and their required read access.'; end if;
  update public.profiles p set permissions=granted_permissions,login_enabled=set_agent_access.login_enabled,
    access_version=p.access_version+1 where id=target.id;
  insert into public.agent_events(agent_id,type,message,author,actor_id)
    values(target_agent,'UPDATED','Updated login access: '||case when login_enabled then 'enabled' else 'disabled' end||'; permissions: '||coalesce(nullif(array_to_string(granted_permissions,', '),''),'profile only')||'.',actor.name,actor.id);
  return jsonb_build_object('id',target.id,'accessVersion',target.access_version+1);
end;
$$;
revoke all on function public.set_agent_access(text,text[],boolean,bigint),public.crm_command(text,jsonb) from public,anon;
grant execute on function public.set_agent_access(text,text[],boolean,bigint),public.crm_command(text,jsonb) to authenticated;
revoke all on function app_private.can_agent(text),app_private.valid_agent_permissions(text[]) from public,anon,authenticated;
grant execute on function app_private.can_agent(text) to authenticated;
grant execute on function app_private.valid_agent_permissions(text[]) to service_role;

do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
    select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;
commit;
