-- Admin sees every moderated report (no date limit), with filter, search and paging.
create or replace function public.admin_list_moderated_reports(
  p_status text default 'all',
  p_search text default '',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  submission_id uuid,
  student_id uuid,
  student_email text,
  subject text,
  original_filename text,
  word_count integer,
  held_at timestamptz,
  due_at timestamptz,
  hours_waiting numeric,
  is_overdue boolean,
  is_due_soon boolean,
  moderation_status text,
  published_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_q text := nullif(btrim(coalesce(p_search, '')), '');
begin
  perform public.require_ia_admin();
  return query
  with base as (
    select s.*, u.email::text as email
    from public.ia_submissions s
    left join auth.users u on u.id = s.student_id
    where s.deleted_at is null
      and s.moderation_held_at is not null
      and (
        (s.moderation_status = 'awaiting' and s.status = 'completed')
        or s.moderation_status = 'published'
      )
      and (p_status = 'all' or s.moderation_status = case p_status when 'waiting' then 'awaiting' else p_status end)
      and (v_q is null or u.email ilike '%' || v_q || '%' or s.original_filename ilike '%' || v_q || '%')
  )
  select
    b.id, b.student_id, b.email, b.subject, b.original_filename, b.word_count,
    b.moderation_held_at, b.moderation_due_at,
    round(extract(epoch from (now() - b.moderation_held_at)) / 3600.0, 1),
    (b.moderation_status = 'awaiting' and b.moderation_due_at is not null and now() > b.moderation_due_at),
    (b.moderation_status = 'awaiting' and b.moderation_due_at is not null
       and now() <= b.moderation_due_at and now() > b.moderation_due_at - interval '4 hours'),
    b.moderation_status, b.moderation_published_at,
    count(*) over ()
  from base b
  order by (b.moderation_status = 'awaiting') desc, b.moderation_due_at asc nulls last,
           b.moderation_published_at desc nulls last
  limit greatest(least(coalesce(p_limit, 50), 200), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$function$;

revoke all on function public.admin_list_moderated_reports(text, text, integer, integer) from public, anon;
grant execute on function public.admin_list_moderated_reports(text, text, integer, integer) to authenticated, service_role;

-- The admin report view needs the same finding fields the student sees (fix steps, checks, type).
create or replace function public.admin_get_ia_review_for_moderation(p_submission_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  s public.ia_submissions;
  v_email text;
  v_structure_id uuid;
  v_mapping public.rubric_mappings;
  v_output public.coaching_outputs;
  v_findings jsonb;
begin
  perform public.require_ia_admin();

  select * into s from public.ia_submissions where id = p_submission_id and deleted_at is null;
  if not found then
    raise exception 'The selected review was not found';
  end if;

  select u.email::text into v_email from auth.users u where u.id = s.student_id;

  select st.id into v_structure_id from public.structure_maps st where st.submission_id = s.id limit 1;
  if v_structure_id is not null then
    select m.* into v_mapping from public.rubric_mappings m where m.structure_map_id = v_structure_id limit 1;
  end if;
  if v_mapping.id is not null then
    select c.* into v_output from public.coaching_outputs c where c.rubric_mapping_id = v_mapping.id limit 1;
  end if;

  select coalesce(jsonb_agg(to_jsonb(f) order by
      case f.criterion_code when 'ResearchDesign' then 1 when 'DataAnalysis' then 2
        when 'Conclusion' then 3 when 'Evaluation' then 4 else 99 end,
      f.finding_index), '[]'::jsonb)
  into v_findings
  from public.ia_detailed_findings f
  where f.submission_id = s.id;

  return jsonb_build_object(
    'submission', jsonb_build_object(
      'id', s.id,
      'student_email', v_email,
      'subject', s.subject,
      'original_filename', s.original_filename,
      'word_count', s.word_count,
      'status', s.status,
      'moderation_status', s.moderation_status,
      'held_at', s.moderation_held_at,
      'due_at', s.moderation_due_at,
      'published_at', s.moderation_published_at
    ),
    'criteria', coalesce(v_output.per_criterion, '[]'::jsonb),
    'findings', v_findings,
    'extracted_text', s.extracted_text
  );
end;
$function$;
