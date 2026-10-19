create table public.website_content_drafts (
  kind text primary key references public.public_content(kind),
  data jsonb not null,
  version bigint not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
create table public.website_content_events (
  id bigint generated always as identity primary key,
  kind text not null, action text not null, actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.website_content_drafts enable row level security;
alter table public.website_content_events enable row level security;
revoke all on public.website_content_drafts,public.website_content_events from anon,authenticated;
grant all on public.website_content_drafts,public.website_content_events to service_role;

create function public.website_content(collection text, action text default 'read', payload jsonb default null, expected_version bigint default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare draft public.website_content_drafts; item jsonb; field text; fields text[]; identifier text; ids text[] := '{}';
begin
  if not app_private.is_admin() then raise exception 'Administrator access is required.'; end if;
  if collection not in ('site','locations','categories','articles','testimonials') then raise exception 'Unknown content collection.'; end if;
  insert into public.website_content_drafts(kind,data) select kind,data from public.public_content where kind=collection on conflict do nothing;
  select * into draft from public.website_content_drafts where kind=collection for update;
  if not found then raise exception 'Content collection is not configured.'; end if;
  if action='read' then return jsonb_build_object('data',draft.data,'version',draft.version); end if;
  if action not in ('draft','publish') then raise exception 'Unknown content action.'; end if;
  if expected_version is null or draft.version<>expected_version then raise exception 'Content has changed. Reload before saving.'; end if;
  if payload is null or octet_length(payload::text)>500000 then raise exception 'Content is empty or too large.'; end if;
  if collection='site' then
    if jsonb_typeof(payload)<>'object' or nullif(btrim(payload->>'brand'),'') is null or nullif(btrim(payload->>'phone'),'') is null or coalesce(payload->>'email','') !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Brand, phone and email are required.'; end if;
    if jsonb_typeof(payload->'heroImages') is distinct from 'array' then raise exception 'Hero images are required.'; end if;
    if jsonb_array_length(payload->'heroImages') not between 1 and 10 then raise exception 'Provide 1-10 hero images.'; end if;
    for item in select value from jsonb_array_elements(payload->'heroImages') loop
      if jsonb_typeof(item)<>'string' or (item#>>'{}') !~ '^https://[^/[:space:]]+' then raise exception 'Image URLs must use HTTPS.'; end if;
    end loop;
    if coalesce(payload->>'paginationSize','') !~ '^([3-9]|[12][0-9]|30)$' then raise exception 'Properties per page must be 3-30.'; end if;
    if jsonb_typeof(payload->'socials') is distinct from 'object' then raise exception 'Social links are required.'; end if;
    for item in select value from jsonb_each(payload->'socials') loop
      if jsonb_typeof(item)<>'string' or (item#>>'{}') !~ '^https://[^/[:space:]]+' then raise exception 'Social links must use HTTPS.'; end if;
    end loop;
  else
    if jsonb_typeof(payload)<>'array' then raise exception 'Content must be a list.'; end if;
    if jsonb_array_length(payload)>100 then raise exception 'Use at most 100 items.'; end if;
    fields := case collection when 'categories' then array['slug','name','description','image'] when 'locations' then array['slug','name','tagline','description','image'] when 'articles' then array['slug','title','category','date','image','excerpt'] else array['name','role','quote','avatar'] end;
    for item in select value from jsonb_array_elements(payload) loop
      if jsonb_typeof(item)<>'object' then raise exception 'Each item must be an object.'; end if;
      foreach field in array fields loop
        if jsonb_typeof(item->field) is distinct from 'string' or length(btrim(item->>field)) not between 1 and 20000 then raise exception 'Missing or invalid field: %',field; end if;
      end loop;
      if coalesce(item->>'image',item->>'avatar','') !~ '^https://[^/[:space:]]+' then raise exception 'Image URLs must use HTTPS.'; end if;
      identifier:=case when collection='testimonials' then item->>'id' else item->>'slug' end;
      if identifier is null or identifier=any(ids) then raise exception 'Identifiers must be unique.'; end if;
      if collection<>'testimonials' and identifier !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Invalid URL slug.'; end if;
      ids:=array_append(ids,identifier);
      if collection='articles' then
        if jsonb_typeof(item->'paragraphs') is distinct from 'array' then raise exception 'Article paragraphs are required.'; end if;
        if jsonb_array_length(item->'paragraphs')=0 or exists(select 1 from jsonb_array_elements(item->'paragraphs') p where jsonb_typeof(p)<>'string' or length(btrim(p#>>'{}'))=0) then raise exception 'Article paragraphs are required.'; end if;
        perform (item->>'date')::date;
      end if;
    end loop;
    if action='publish' and collection in ('categories','locations') and exists(select 1 from public.properties p where not ((case when collection='categories' then p.category else p.location_slug end)=any(ids))) then raise exception 'A property still uses a removed item. Update the property first.'; end if;
  end if;
  update public.website_content_drafts set data=payload,version=version+1,updated_at=now(),updated_by=auth.uid() where kind=collection returning * into draft;
  if action='publish' then update public.public_content set data=payload,updated_at=now() where kind=collection; end if;
  insert into public.website_content_events(kind,action,actor_id) values(collection,action,auth.uid());
  return jsonb_build_object('data',draft.data,'version',draft.version);
end $$;
revoke all on function public.website_content(text,text,jsonb,bigint) from public,anon;
grant execute on function public.website_content(text,text,jsonb,bigint) to authenticated;
