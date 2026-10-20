create function app_private.valid_website_highlights(data jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb;
begin
 if not (data ? 'dubaiHighlights') then return true; end if;
 if jsonb_typeof(data->'dubaiHighlights') is distinct from 'array' then return false; end if;
 if jsonb_array_length(data->'dubaiHighlights')>12 then return false; end if;
 for item in select value from jsonb_array_elements(data->'dubaiHighlights') loop
   if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'title') is distinct from 'string' or length(btrim(item->>'title')) not between 1 and 120 or jsonb_typeof(item->'description') is distinct from 'string' or length(btrim(item->>'description')) not between 1 and 500 or coalesce(item->>'icon','') not in ('globe','business','building','waterfront','key','home','community','growth') then return false; end if;
 end loop;
 return true;
end $$;
alter table public.public_content add constraint published_highlights_valid check (kind<>'site' or app_private.valid_website_highlights(data));
alter table public.website_content_drafts add constraint draft_highlights_valid check (kind<>'site' or app_private.valid_website_highlights(data));
