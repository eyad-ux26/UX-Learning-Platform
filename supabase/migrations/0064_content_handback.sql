-- Admin panel Phase 2 follow-up: which lessons the content seed (YAML route) still moves forward, and handing a lesson
-- back to the YAML route. Run after 0060 to 0063. Safe to run again.
--
-- Before: once any release of a lesson was rolled back, even to the v1 import, the seed never updated that lesson again.
-- Now, by how the live version got there:
--   import, yaml   the seed moves it to the content files' version (as before);
--   publish        kept: the panel owns it (as before);
--   rollback       to a panel-written version: kept. To an import or YAML version: the seed moves it forward to new text
--                  from the content files, but never back to a version that was live before (the one rolled back from).
-- A publisher can hand a panel-owned lesson back to the content files (admin_content_handback).

create or replace function public.content_sync_bundle(p_items jsonb)
returns table (lesson_id text, result text) language plpgsql security definer set search_path = public as $$
declare
  it record;
  v_ver uuid;
  v_live public.lesson_live;
  v_origin text;
  v_no integer;
begin
  for it in select x ->> 'lesson_id' as lid, x ->> 'hash' as h from jsonb_array_elements(coalesce(p_items, '[]')) x loop
    select id into v_ver from public.content_versions where content_versions.lesson_id = it.lid and hash = it.h;
    if v_ver is null then lesson_id := it.lid; result := 'missing'; return next; continue; end if;
    select * into v_live from public.lesson_live l where l.lesson_id = it.lid;
    if v_live.lesson_id is null then
      insert into public.content_version_info (version_id, lesson_id, version_no, origin) values (v_ver, it.lid, 1, 'import')
        on conflict (version_id) do nothing;
      insert into public.lesson_live (lesson_id, version_id, how) values (it.lid, v_ver, 'import');
      lesson_id := it.lid; result := 'import'; return next;
      continue;
    end if;
    if v_live.version_id = v_ver then continue; end if;
    select origin into v_origin from public.content_version_info where version_id = v_live.version_id;
    if v_live.how = 'publish' or v_origin = 'editor' then lesson_id := it.lid; result := 'kept_editor'; return next; continue; end if;
    if v_live.how = 'rollback' and exists (select 1 from public.content_version_info where version_id = v_ver) then
      lesson_id := it.lid; result := 'kept_rollback'; return next; continue;
    end if;
    if not exists (select 1 from public.content_version_info where version_id = v_ver) then
      select coalesce(max(version_no), 0) + 1 into v_no from public.content_version_info i where i.lesson_id = it.lid;
      insert into public.content_version_info (version_id, lesson_id, version_no, origin) values (v_ver, it.lid, v_no, 'yaml');
    end if;
    update public.lesson_live l set version_id = v_ver, since = now(), set_by = null, release_id = null, how = 'yaml' where l.lesson_id = it.lid;
    lesson_id := it.lid; result := 'yaml'; return next;
  end loop;
end $$;

-- Hands a lesson back to the content files: the version with this hash (the one the app was built with) goes live, and
-- from then on the seed moves the lesson forward again. Needs content.publish and a reason; refused while a draft of
-- the lesson is in review. A draft that is not in review stays, to be edited or discarded.
create or replace function public.admin_content_handback(p_actor uuid, p_lesson text, p_hash text, p_reason text,
  p_ip text, p_ua text, p_session uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_live public.lesson_live;
  v_ver uuid;
  v_no integer;
begin
  perform public.admin_require(p_actor, 'content.publish');
  if char_length(coalesce(trim(p_reason), '')) < 3 then raise exception 'say why' using errcode = '22023'; end if;
  select * into v_live from public.lesson_live where lesson_id = p_lesson for update;
  if v_live.lesson_id is null then raise exception 'this lesson is not live from the database yet' using errcode = '22023'; end if;
  if v_live.how in ('import', 'yaml') then raise exception 'this lesson already follows the content files' using errcode = '22023'; end if;
  if exists (select 1 from public.lesson_drafts where lesson_id = p_lesson and status = 'in_review') then
    raise exception 'a draft of this lesson is in review: withdraw or decline it first' using errcode = '22023';
  end if;
  select id into v_ver from public.content_versions where lesson_id = p_lesson and hash = p_hash;
  if v_ver is null then raise exception 'the content files'' version is not in the database yet: run the content seed first' using errcode = '22023'; end if;
  select version_no into v_no from public.content_version_info where version_id = v_ver;
  if v_no is null then
    select coalesce(max(version_no), 0) + 1 into v_no from public.content_version_info where lesson_id = p_lesson;
    insert into public.content_version_info (version_id, lesson_id, version_no, origin) values (v_ver, p_lesson, v_no, 'yaml');
  end if;
  update public.lesson_live set version_id = v_ver, since = now(), set_by = p_actor, release_id = null, how = 'yaml' where lesson_id = p_lesson;
  perform public.admin_log(p_actor, 'content.handed_back', 'content', 'lesson', p_lesson, p_lesson,
    jsonb_build_object('version_id', v_live.version_id, 'how', v_live.how), jsonb_build_object('version_id', v_ver, 'version_no', v_no, 'how', 'yaml'),
    p_reason, p_ip, p_ua, p_session);
  return v_no;
end $$;

revoke all on function public.admin_content_handback(uuid, text, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.admin_content_handback(uuid, text, text, text, text, text, uuid) to service_role;
