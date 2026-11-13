-- Moderator review: paid/complimentary reports are held until an admin (the moderator) publishes them.
-- Free reviews and admin accounts are unaffected.

-- 1. Columns ---------------------------------------------------------------------------------
alter table public.ia_submissions
  add column if not exists moderation_status text not null default 'none',
  add column if not exists moderation_held_at timestamptz,
  add column if not exists moderation_due_at timestamptz,
  add column if not exists moderation_published_at timestamptz,
  add column if not exists moderation_published_by uuid;

alter table public.ia_submissions drop constraint if exists ia_submissions_moderation_status_check;
alter table public.ia_submissions
  add constraint ia_submissions_moderation_status_check
  check (moderation_status in ('none', 'awaiting', 'published'));

create index if not exists ia_submissions_moderation_queue_idx
  on public.ia_submissions (moderation_status, moderation_due_at)
  where moderation_status = 'awaiting';

-- 2. Settings: pause, resume date, daily limit ------------------------------------------------
create or replace function public.set_ia_app_setting(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if auth.uid() is null or not public.is_ia_admin() then
    raise exception 'Admin access is required';
  end if;
  if p_key not in ('block_right_click', 'paypal_enabled', 'usd_inr_rate',
                   'moderation_paused', 'moderation_resume_date', 'moderation_daily_limit') then
    raise exception 'Unknown setting';
  end if;
  if p_key in ('paypal_enabled', 'moderation_paused') and jsonb_typeof(p_value) <> 'boolean' then
    raise exception '% must be true or false', p_key;
  end if;
  -- usd_inr_rate: a number between 50 and 150 (fixed rate), or JSON null (use the live rate)
  if p_key = 'usd_inr_rate' then
    if jsonb_typeof(p_value) = 'number' then
      if (p_value #>> '{}')::numeric < 50 or (p_value #>> '{}')::numeric > 150 then
        raise exception 'usd_inr_rate must be between 50 and 150';
      end if;
    elsif jsonb_typeof(p_value) <> 'null' then
      raise exception 'usd_inr_rate must be a number or null';
    end if;
  end if;
  -- moderation_resume_date: YYYY-MM-DD text or JSON null
  if p_key = 'moderation_resume_date' then
    if jsonb_typeof(p_value) = 'string' then
      if (p_value #>> '{}') !~ '^\d{4}-\d{2}-\d{2}$' then
        raise exception 'moderation_resume_date must look like 2026-12-01';
      end if;
    elsif jsonb_typeof(p_value) <> 'null' then
      raise exception 'moderation_resume_date must be a date or null';
    end if;
  end if;
  -- moderation_daily_limit: whole number 1 to 200
  if p_key = 'moderation_daily_limit' then
    if jsonb_typeof(p_value) <> 'number'
       or (p_value #>> '{}')::numeric < 1 or (p_value #>> '{}')::numeric > 200
       or (p_value #>> '{}')::numeric <> trunc((p_value #>> '{}')::numeric) then
      raise exception 'moderation_daily_limit must be a whole number from 1 to 200';
    end if;
  end if;
  insert into public.ia_app_settings (key, value, updated_at)
  values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end;
$function$;

-- 3. Public availability (pause / daily limit) --------------------------------------------------
create or replace function public.get_moderation_availability()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_paused boolean := false;
  v_resume date;
  v_limit integer := 10;
  v_taken integer;
  v_effective_paused boolean;
  v_raw text;
begin
  select (s.value #>> '{}')::boolean into v_paused
  from public.ia_app_settings s where s.key = 'moderation_paused';
  v_paused := coalesce(v_paused, false);

  select nullif(s.value #>> '{}', '') into v_raw
  from public.ia_app_settings s where s.key = 'moderation_resume_date';
  if v_raw is not null and v_raw ~ '^\d{4}-\d{2}-\d{2}$' then
    v_resume := v_raw::date;
  end if;

  select coalesce((s.value #>> '{}')::numeric::integer, 10) into v_limit
  from public.ia_app_settings s where s.key = 'moderation_daily_limit';
  v_limit := coalesce(v_limit, 10);

  v_effective_paused := v_paused and (v_resume is null or v_today < v_resume);

  select count(*)::integer into v_taken
  from public.ia_submissions x
  where x.moderation_held_at >= (v_today::timestamp at time zone 'Asia/Kolkata');

  return jsonb_build_object(
    'paused', v_effective_paused,
    'resume_date', case when v_effective_paused then v_resume else null end,
    'daily_limit', v_limit,
    'taken_today', v_taken,
    'slots_full', v_taken >= v_limit,
    'next_opening', ((v_today + 1)::timestamp at time zone 'Asia/Kolkata'),
    'turnaround_hours', 24
  );
end;
$function$;

revoke all on function public.get_moderation_availability() from public;
grant execute on function public.get_moderation_availability() to anon, authenticated, service_role;

-- 4. Hold paid reports instead of finalising them ------------------------------------------------
alter function public.finalize_ia_review_success(uuid) rename to finalize_ia_review_success_core;

create or replace function public.finalize_ia_review_success(p_submission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  s public.ia_submissions;
  v_avail jsonb;
  v_start timestamptz;
  v_due timestamptz;
begin
  select * into s
  from public.ia_submissions
  where id = p_submission_id and deleted_at is null
  for update;

  if not found then
    raise exception 'The selected review was not found';
  end if;

  if s.status = 'completed'
     and s.commercial_access in ('paid_credit', 'complimentary')
     and s.moderation_status <> 'published'
     and not exists (
       select 1 from public.ia_admin_users a
       where a.user_id = s.student_id and a.is_active = true
     ) then

    if s.moderation_status = 'none' then
      v_avail := public.get_moderation_availability();
      v_start := now();
      if (v_avail ->> 'paused')::boolean and (v_avail ->> 'resume_date') is not null then
        v_start := greatest(now(), ((v_avail ->> 'resume_date')::date::timestamp at time zone 'Asia/Kolkata'));
      elsif (v_avail ->> 'slots_full')::boolean then
        v_start := greatest(now(), (v_avail ->> 'next_opening')::timestamptz);
      end if;

      update public.ia_submissions
      set moderation_status = 'awaiting',
          moderation_held_at = now(),
          moderation_due_at = v_start + interval '24 hours',
          updated_at = now()
      where id = s.id
      returning moderation_due_at into v_due;
    else
      v_due := s.moderation_due_at;
    end if;

    return jsonb_build_object(
      'finalized', false,
      'awaiting_moderator', true,
      'submission_id', s.id,
      'commercial_access', 'unassigned',
      'moderation_due_at', v_due,
      'credit_consumed', false,
      'report_saved', false
    );
  end if;

  return public.finalize_ia_review_success_core(p_submission_id);
end;
$function$;

revoke all on function public.finalize_ia_review_success_core(uuid) from public, anon, authenticated;
revoke all on function public.finalize_ia_review_success(uuid) from public, anon, authenticated;
grant execute on function public.finalize_ia_review_success(uuid) to service_role;

-- 5. Hide held reports from the student ---------------------------------------------------------
create or replace function public.has_full_ia_review_access(p_submission_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.ia_submissions as submission_row
    where submission_row.id = p_submission_id
      and submission_row.student_id = auth.uid()
      and submission_row.deleted_at is null
      and submission_row.moderation_status <> 'awaiting'
      and submission_row.commercial_access in ('paid_credit', 'complimentary')
  );
$function$;

alter policy coaching_outputs_select_full_access on public.coaching_outputs
  using (exists (
    select 1
    from public.rubric_mappings mapping_row
    join public.structure_maps structure_row on structure_row.id = mapping_row.structure_map_id
    join public.ia_submissions submission_row on submission_row.id = structure_row.submission_id
    where mapping_row.id = coaching_outputs.rubric_mapping_id
      and submission_row.student_id = auth.uid()
      and submission_row.deleted_at is null
      and submission_row.moderation_status <> 'awaiting'
      and submission_row.commercial_access = any (array['paid_credit'::text, 'complimentary'::text])
  ));

alter policy rubric_mappings_select_full_access on public.rubric_mappings
  using (exists (
    select 1
    from public.structure_maps structure_row
    join public.ia_submissions submission_row on submission_row.id = structure_row.submission_id
    where structure_row.id = rubric_mappings.structure_map_id
      and submission_row.student_id = auth.uid()
      and submission_row.deleted_at is null
      and submission_row.moderation_status <> 'awaiting'
      and submission_row.commercial_access = any (array['paid_credit'::text, 'complimentary'::text])
  ));

alter policy structure_maps_select_full_access on public.structure_maps
  using (exists (
    select 1
    from public.ia_submissions submission_row
    where submission_row.id = structure_maps.submission_id
      and submission_row.student_id = auth.uid()
      and submission_row.deleted_at is null
      and submission_row.moderation_status <> 'awaiting'
      and submission_row.commercial_access = any (array['paid_credit'::text, 'complimentary'::text])
  ));

alter policy progress_plans_select_full_access on public.progress_plans
  using ((student_id = auth.uid()) and exists (
    select 1
    from public.ia_submissions submission_row
    where submission_row.id = progress_plans.current_submission_id
      and submission_row.student_id = auth.uid()
      and submission_row.deleted_at is null
      and submission_row.moderation_status <> 'awaiting'
      and submission_row.commercial_access = any (array['paid_credit'::text, 'complimentary'::text])
  ));

alter policy ia_pipeline_runs_select_own on public.ia_pipeline_runs
  using (
    public.owns_submission(submission_id)
    and not exists (
      select 1 from public.ia_submissions held
      where held.id = ia_pipeline_runs.submission_id and held.moderation_status = 'awaiting'
    )
  );

alter function public.get_my_ia_review_content(uuid) rename to get_my_ia_review_content_core;

create or replace function public.get_my_ia_review_content(p_submission_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  s public.ia_submissions;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  select * into s
  from public.ia_submissions
  where id = p_submission_id and student_id = auth.uid() and deleted_at is null;

  if found and s.moderation_status = 'awaiting' then
    return jsonb_build_object(
      'submission_id', s.id,
      'awaiting_moderator', true,
      'moderation_due_at', s.moderation_due_at,
      'access_mode', 'unassigned',
      'full_access', false,
      'expired', false,
      'findings', '[]'::jsonb,
      'criteria', '[]'::jsonb,
      'locked_criteria', '[]'::jsonb,
      'progress_plan', null,
      'progress_plan_locked', true,
      'annotated_preview_available', false,
      'annotated_artifact', null,
      'can_download', false,
      'can_print', false
    );
  end if;

  return public.get_my_ia_review_content_core(p_submission_id);
end;
$function$;

revoke all on function public.get_my_ia_review_content_core(uuid) from public, anon, authenticated;
revoke all on function public.get_my_ia_review_content(uuid) from public, anon;
grant execute on function public.get_my_ia_review_content(uuid) to authenticated, service_role;

-- 6. Student: list of reports being reviewed ------------------------------------------------------
create or replace function public.get_my_pending_moderator_reviews()
returns table (
  submission_id uuid,
  original_filename text,
  subject text,
  held_at timestamptz,
  due_at timestamptz
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;
  return query
  select s.id, s.original_filename, s.subject, s.moderation_held_at, s.moderation_due_at
  from public.ia_submissions s
  where s.student_id = auth.uid() and s.deleted_at is null and s.moderation_status = 'awaiting'
  order by s.moderation_due_at asc nulls last;
end;
$function$;

revoke all on function public.get_my_pending_moderator_reviews() from public, anon;
grant execute on function public.get_my_pending_moderator_reviews() to authenticated, service_role;

-- 7. Admin: queue, review, save edits, publish ----------------------------------------------------
create or replace function public.admin_list_moderation_queue(p_include_published boolean default false)
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
  published_at timestamptz
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  perform public.require_ia_admin();
  return query
  select
    s.id, s.student_id, u.email::text, s.subject, s.original_filename, s.word_count,
    s.moderation_held_at, s.moderation_due_at,
    round(extract(epoch from (now() - s.moderation_held_at)) / 3600.0, 1),
    (s.moderation_status = 'awaiting' and s.moderation_due_at is not null and now() > s.moderation_due_at),
    (s.moderation_status = 'awaiting' and s.moderation_due_at is not null
       and now() <= s.moderation_due_at and now() > s.moderation_due_at - interval '4 hours'),
    s.moderation_status, s.moderation_published_at
  from public.ia_submissions s
  left join auth.users u on u.id = s.student_id
  where s.deleted_at is null
    and (
      s.moderation_status = 'awaiting'
      or (p_include_published and s.moderation_status = 'published'
          and s.moderation_published_at > now() - interval '14 days')
    )
  order by (s.moderation_status = 'awaiting') desc, s.moderation_due_at asc nulls last, s.moderation_published_at desc nulls last
  limit 200;
end;
$function$;

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

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', f.id,
      'criterion_code', f.criterion_code,
      'finding_index', f.finding_index,
      'priority', f.priority,
      'section_title', f.section_title,
      'evidence_excerpt', f.evidence_excerpt,
      'rubric_requirement', f.rubric_requirement,
      'issue', f.issue,
      'specific_action', f.specific_action,
      'why', f.why
    ) order by
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

create or replace function public.admin_save_ia_moderation_edits(
  p_submission_id uuid,
  p_criteria jsonb,
  p_findings jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_admin uuid;
  s public.ia_submissions;
  v_structure_id uuid;
  v_mapping_id uuid;
  v_output_id uuid;
  c jsonb;
  f jsonb;
  v_max numeric;
  v_low numeric;
  v_high numeric;
  v_updated_findings integer := 0;
begin
  v_admin := public.require_ia_admin();

  select * into s from public.ia_submissions where id = p_submission_id and deleted_at is null for update;
  if not found then
    raise exception 'The selected review was not found';
  end if;
  if s.moderation_status <> 'awaiting' then
    raise exception 'Only a report that is waiting for moderation can be edited';
  end if;

  select st.id into v_structure_id from public.structure_maps st where st.submission_id = s.id limit 1;
  select m.id into v_mapping_id from public.rubric_mappings m where m.structure_map_id = v_structure_id limit 1;
  select co.id into v_output_id from public.coaching_outputs co where co.rubric_mapping_id = v_mapping_id limit 1;

  if jsonb_typeof(coalesce(p_criteria, '[]'::jsonb)) <> 'array' then
    raise exception 'criteria must be a list';
  end if;

  for c in select * from jsonb_array_elements(coalesce(p_criteria, '[]'::jsonb)) loop
    select coalesce((e ->> 'criterion_max_marks')::numeric, 6) into v_max
    from public.coaching_outputs co, jsonb_array_elements(co.per_criterion) e
    where co.id = v_output_id and e ->> 'criterion' = c ->> 'criterion'
    limit 1;

    if v_max is null then
      raise exception 'Unknown criterion %', c ->> 'criterion';
    end if;

    v_low := (c ->> 'mark_low')::numeric;
    v_high := (c ->> 'mark_high')::numeric;
    if v_low is null or v_high is null or v_low < 0 or v_high > v_max or v_low > v_high then
      raise exception 'Marks for % must be between 0 and % and the low mark cannot exceed the high mark', c ->> 'criterion', v_max;
    end if;
  end loop;

  update public.coaching_outputs co
  set per_criterion = (
    select coalesce(jsonb_agg(
      case when edit.e is null then pc.elem
        else pc.elem || jsonb_build_object(
          'indicative_mark_range', jsonb_build_array((edit.e -> 'mark_low'), (edit.e -> 'mark_high')),
          'indicative_band', coalesce(nullif(edit.e ->> 'band', ''), pc.elem ->> 'indicative_band'),
          'why_this_range', coalesce(nullif(edit.e ->> 'rationale', ''), pc.elem ->> 'why_this_range'))
      end order by pc.ord), '[]'::jsonb)
    from jsonb_array_elements(co.per_criterion) with ordinality as pc(elem, ord)
    left join lateral (
      select e from jsonb_array_elements(coalesce(p_criteria, '[]'::jsonb)) e
      where e ->> 'criterion' = pc.elem ->> 'criterion' limit 1
    ) edit on true
  )
  where co.id = v_output_id;

  update public.rubric_mappings rm
  set criterion_scores = (
    select coalesce(jsonb_agg(
      case when edit.e is null then pc.elem
        else pc.elem || jsonb_build_object(
          'indicative_mark_range', jsonb_build_array((edit.e -> 'mark_low'), (edit.e -> 'mark_high')),
          'indicative_band', coalesce(nullif(edit.e ->> 'band', ''), pc.elem ->> 'indicative_band'),
          'rationale', coalesce(nullif(edit.e ->> 'rationale', ''), pc.elem ->> 'rationale'))
      end order by pc.ord), '[]'::jsonb)
    from jsonb_array_elements(rm.criterion_scores) with ordinality as pc(elem, ord)
    left join lateral (
      select e from jsonb_array_elements(coalesce(p_criteria, '[]'::jsonb)) e
      where e ->> 'criterion' = pc.elem ->> 'criterion' limit 1
    ) edit on true
  )
  where rm.id = v_mapping_id and jsonb_typeof(rm.criterion_scores) = 'array';

  if jsonb_typeof(coalesce(p_findings, '[]'::jsonb)) = 'array' then
    for f in select * from jsonb_array_elements(coalesce(p_findings, '[]'::jsonb)) loop
      update public.ia_detailed_findings df
      set issue = coalesce(f ->> 'issue', df.issue),
          specific_action = coalesce(f ->> 'specific_action', df.specific_action),
          why = coalesce(f ->> 'why', df.why),
          updated_at = now()
      where df.id = (f ->> 'id')::uuid and df.submission_id = s.id;
      v_updated_findings := v_updated_findings + 1;
    end loop;
  end if;

  insert into public.ia_admin_audit_log (actor_user_id, action, entity_type, entity_id, target_user_id, details)
  values (v_admin, 'moderation_edit_saved', 'ia_submission', s.id::text, s.student_id,
          jsonb_build_object('criteria_edited', jsonb_array_length(coalesce(p_criteria, '[]'::jsonb)),
                             'findings_edited', v_updated_findings));

  return jsonb_build_object('saved', true, 'findings_updated', v_updated_findings);
end;
$function$;

create or replace function public.admin_publish_ia_review(p_submission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_admin uuid;
  s public.ia_submissions;
  v_email text;
  v_result jsonb;
begin
  v_admin := public.require_ia_admin();

  select * into s from public.ia_submissions where id = p_submission_id and deleted_at is null for update;
  if not found then
    raise exception 'The selected review was not found';
  end if;
  if s.status <> 'completed' then
    raise exception 'The report is not complete yet';
  end if;
  if s.moderation_status <> 'awaiting' then
    raise exception 'This report is not waiting for moderation';
  end if;

  update public.ia_submissions
  set moderation_status = 'published',
      moderation_published_at = now(),
      moderation_published_by = v_admin,
      updated_at = now()
  where id = s.id;

  v_result := public.finalize_ia_review_success(s.id);

  select u.email::text into v_email from auth.users u where u.id = s.student_id;

  insert into public.ia_admin_audit_log (actor_user_id, action, entity_type, entity_id, target_user_id, details)
  values (v_admin, 'moderation_published', 'ia_submission', s.id::text, s.student_id,
          jsonb_build_object('finalization', v_result));

  return jsonb_build_object(
    'published', true,
    'submission_id', s.id,
    'student_email', v_email,
    'original_filename', s.original_filename,
    'finalization', v_result
  );
end;
$function$;

revoke all on function public.admin_list_moderation_queue(boolean) from public, anon;
revoke all on function public.admin_get_ia_review_for_moderation(uuid) from public, anon;
revoke all on function public.admin_save_ia_moderation_edits(uuid, jsonb, jsonb) from public, anon;
revoke all on function public.admin_publish_ia_review(uuid) from public, anon;
grant execute on function public.admin_list_moderation_queue(boolean) to authenticated, service_role;
grant execute on function public.admin_get_ia_review_for_moderation(uuid) to authenticated, service_role;
grant execute on function public.admin_save_ia_moderation_edits(uuid, jsonb, jsonb) to authenticated, service_role;
grant execute on function public.admin_publish_ia_review(uuid) to authenticated, service_role;

-- 8. Starting prices (editable later from Admin > pack editor) --------------------------------------
update public.ia_credit_packs set price_usd = 25, validity_days = 365,
  description = 'One complete SEHS IA review, marked and approved by an authorised IB moderator, with saved report and downloads.'
  where pack_code = 'single-review';
update public.ia_credit_packs set price_usd = 65, validity_days = 365,
  description = 'Three moderator-marked reviews for an initial, improved and final draft.'
  where pack_code = 'draft-improvement-3';
update public.ia_credit_packs set price_usd = 99, validity_days = 365,
  description = 'Five moderator-marked reviews for multiple drafting and improvement cycles.'
  where pack_code = 'complete-ia-5';
