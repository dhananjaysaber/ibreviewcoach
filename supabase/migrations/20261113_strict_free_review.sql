-- Strict free review (Research Design only) + one free review per person.
-- 1) get_my_ia_review_content: for free access, also return the locked criteria
--    (name + max marks only, never feedback or marks) and the overall total.
-- 2) ia_free_review_claims + reserve_my_ia_review_access_strict: a free review is
--    claimed against a normalised email (gmail dots / +tags removed), so a second
--    account with the same underlying address cannot get another free review.

create or replace function public.get_my_ia_review_content(p_submission_id uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  v_user_id uuid;
  v_submission public.ia_submissions;
  v_structure_map_id uuid;
  v_rubric_mapping_id uuid;
  v_coaching_output_id uuid;
  v_per_criterion jsonb;
  v_first_criterion text;
  v_full_access boolean;
  v_expired boolean;
  v_findings jsonb;
  v_criteria jsonb;
  v_progress_plan jsonb;
  v_artifact jsonb;
  v_preview_available boolean;
  v_locked jsonb := '[]'::jsonb;
  v_total_marks integer := 24;
  v_unlocked_marks integer := 6;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;

  select submission_row.* into v_submission
  from public.ia_submissions as submission_row
  where submission_row.id = p_submission_id
    and submission_row.student_id = v_user_id
    and submission_row.deleted_at is null;

  if not found then
    raise exception 'The selected IA review was not found';
  end if;
  if v_submission.status <> 'completed' then
    raise exception 'The IA review is not complete yet';
  end if;

  v_full_access := v_submission.commercial_access in ('paid_credit','complimentary');

  v_expired := v_submission.commercial_access = 'free_review'
    and v_submission.access_expires_at is not null
    and v_submission.access_expires_at <= now();

  if v_expired then
    return jsonb_build_object(
      'submission_id', v_submission.id,
      'access_mode', v_submission.commercial_access,
      'full_access', false,
      'expired', true,
      'access_expires_at', v_submission.access_expires_at,
      'findings', '[]'::jsonb,
      'criteria', '[]'::jsonb,
      'progress_plan', null,
      'progress_plan_locked', true,
      'annotated_preview_available', false,
      'annotated_artifact', null,
      'can_download', false,
      'can_print', false
    );
  end if;

  select structure_row.id into v_structure_map_id
  from public.structure_maps as structure_row
  where structure_row.submission_id = v_submission.id
  limit 1;

  if v_structure_map_id is not null then
    select mapping_row.id into v_rubric_mapping_id
    from public.rubric_mappings as mapping_row
    where mapping_row.structure_map_id = v_structure_map_id
    limit 1;
  end if;

  if v_rubric_mapping_id is not null then
    select output_row.id, coalesce(output_row.per_criterion, '[]'::jsonb)
    into v_coaching_output_id, v_per_criterion
    from public.coaching_outputs as output_row
    where output_row.rubric_mapping_id = v_rubric_mapping_id
    limit 1;
  end if;

  v_per_criterion := coalesce(v_per_criterion, '[]'::jsonb);

  -- The free preview is always Research Design, whatever order the model saved.
  v_first_criterion := 'ResearchDesign';

  select coalesce(jsonb_agg(to_jsonb(finding_row) order by
      case finding_row.criterion_code
        when 'ResearchDesign' then 1 when 'DataAnalysis' then 2
        when 'Conclusion' then 3 when 'Evaluation' then 4 else 99 end,
      finding_row.finding_index), '[]'::jsonb)
  into v_findings
  from public.ia_detailed_findings as finding_row
  where finding_row.submission_id = v_submission.id
    and (v_full_access or finding_row.criterion_code = v_first_criterion);

  if v_full_access then
    v_criteria := v_per_criterion;
  else
    select coalesce(jsonb_agg(e), '[]'::jsonb) into v_criteria
    from jsonb_array_elements(v_per_criterion) as e
    where e ->> 'criterion' = v_first_criterion;

    -- Locked criteria: name and maximum only. No marks, ranges or feedback.
    select coalesce(jsonb_agg(jsonb_build_object(
             'code', e ->> 'criterion',
             'name', coalesce(nullif(e ->> 'criterion_name',''), e ->> 'criterion'),
             'max_marks', coalesce((e ->> 'criterion_max_marks')::integer, 6))), '[]'::jsonb)
    into v_locked
    from jsonb_array_elements(v_per_criterion) as e
    where e ->> 'criterion' <> v_first_criterion;

    if jsonb_array_length(v_locked) = 0 then
      v_locked := jsonb_build_array(
        jsonb_build_object('code','DataAnalysis','name','Data Analysis','max_marks',6),
        jsonb_build_object('code','Conclusion','name','Conclusion','max_marks',6),
        jsonb_build_object('code','Evaluation','name','Evaluation','max_marks',6));
    end if;

    select coalesce((e ->> 'criterion_max_marks')::integer, 6) into v_unlocked_marks
    from jsonb_array_elements(v_per_criterion) as e
    where e ->> 'criterion' = v_first_criterion
    limit 1;
    v_unlocked_marks := coalesce(v_unlocked_marks, 6);

    select v_unlocked_marks + coalesce(sum((l ->> 'max_marks')::integer), 0)
    into v_total_marks
    from jsonb_array_elements(v_locked) as l;
  end if;

  if v_full_access then
    select to_jsonb(plan_row) into v_progress_plan
    from public.progress_plans as plan_row
    where plan_row.current_submission_id = v_submission.id
      and plan_row.student_id = v_user_id
    limit 1;

    select jsonb_build_object(
      'id', artifact_row.id, 'artifact_type', artifact_row.artifact_type,
      'storage_bucket', artifact_row.storage_bucket, 'storage_path', artifact_row.storage_path,
      'status', artifact_row.status, 'expires_at', artifact_row.expires_at,
      'retention_policy', artifact_row.retention_policy)
    into v_artifact
    from public.ia_review_artifacts as artifact_row
    where artifact_row.submission_id = v_submission.id
      and artifact_row.student_id = v_user_id
      and artifact_row.artifact_type = 'annotated_html'
      and artifact_row.status = 'ready'
      and artifact_row.deleted_at is null
      and (artifact_row.retention_policy = 'account' or artifact_row.expires_at > now())
    limit 1;
  else
    v_progress_plan := null;
    v_artifact := null;
  end if;

  select exists (select 1 from public.ia_document_blocks as block_row
                 where block_row.submission_id = v_submission.id)
  into v_preview_available;

  return jsonb_build_object(
    'submission_id', v_submission.id,
    'access_mode', v_submission.commercial_access,
    'full_access', v_full_access,
    'expired', false,
    'access_expires_at', v_submission.access_expires_at,
    'preview_criterion', v_first_criterion,
    'findings', coalesce(v_findings, '[]'::jsonb),
    'criteria', coalesce(v_criteria, '[]'::jsonb),
    'locked_criteria', case when v_full_access then '[]'::jsonb else v_locked end,
    'unlocked_marks', case when v_full_access then null else v_unlocked_marks end,
    'total_marks', case when v_full_access then null else v_total_marks end,
    'progress_plan', v_progress_plan,
    'progress_plan_locked', not v_full_access,
    'annotated_preview_available', (not v_full_access and v_preview_available),
    'annotated_artifact', v_artifact,
    'can_download', v_full_access,
    'can_print', v_full_access
  );
end;
$function$;

-- ---- one free review per person ------------------------------------------
create table if not exists public.ia_free_review_claims (
  claim_key text primary key,
  student_id uuid not null,
  created_at timestamptz not null default now()
);
alter table public.ia_free_review_claims enable row level security;
-- no policies: only SECURITY DEFINER functions touch this table

create or replace function public.ia_normalise_email_key(p_email text)
 returns text
 language sql
 immutable
 set search_path to ''
as $$
  select case
    when p_email is null or position('@' in p_email) = 0 then null
    when split_part(lower(btrim(p_email)),'@',2) in ('gmail.com','googlemail.com') then
      replace(split_part(split_part(lower(btrim(p_email)),'@',1),'+',1),'.','') || '@gmail.com'
    else split_part(split_part(lower(btrim(p_email)),'@',1),'+',1) || '@' || split_part(lower(btrim(p_email)),'@',2)
  end
$$;

-- Backfill: accounts that already used or reserved their free review.
insert into public.ia_free_review_claims (claim_key, student_id)
select distinct on (public.ia_normalise_email_key(u.email))
       public.ia_normalise_email_key(u.email), a.student_id
from public.ia_credit_accounts a
join auth.users u on u.id = a.student_id
where a.free_review_status <> 'available'
  and public.ia_normalise_email_key(u.email) is not null
on conflict do nothing;

create or replace function public.reserve_my_ia_review_access_strict(p_submission_id uuid, p_requested_source text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_user_id uuid;
  v_is_anonymous boolean;
  v_requested_source text;
  v_has_full_credit boolean;
  v_free_status text;
  v_claim_key text;
  v_claim_owner uuid;
  v_result jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;

  v_is_anonymous := coalesce(nullif(auth.jwt() ->> 'is_anonymous', '')::boolean, true);
  if v_is_anonymous then
    raise exception 'Create and verify your account before starting an IA review';
  end if;

  if not exists (
    select 1 from public.ia_submissions as submission_row
    where submission_row.id = p_submission_id
      and submission_row.student_id = v_user_id
      and submission_row.deleted_at is null
  ) then
    raise exception 'The selected review was not found';
  end if;

  insert into public.ia_credit_accounts (student_id) values (v_user_id)
  on conflict (student_id) do nothing;

  if public.is_ia_admin() then
    perform public.ensure_ia_admin_unlimited_entitlement(v_user_id);
    return public.reserve_ia_review_access_internal(p_submission_id, 'complimentary');
  end if;

  v_requested_source := lower(nullif(btrim(coalesce(p_requested_source, '')), ''));
  if v_requested_source not in ('paid_credit', 'free_review') then
    raise exception 'Choose a full review credit or the free limited review';
  end if;

  if v_requested_source = 'paid_credit' then
    select exists (
      select 1 from public.ia_credit_grants as grant_row
      where grant_row.student_id = v_user_id
        and grant_row.credits_remaining > 0
        and grant_row.revoked_at is null
        and (grant_row.expires_at is null or grant_row.expires_at > now())
        and grant_row.grant_type in ('purchase','refund','complimentary','admin')
    ) into v_has_full_credit;

    if not v_has_full_credit then
      raise exception 'No full IA review credit is available for this account';
    end if;

    return public.reserve_ia_review_access_internal(p_submission_id, 'paid_credit');
  end if;

  select account_row.free_review_status into v_free_status
  from public.ia_credit_accounts as account_row
  where account_row.student_id = v_user_id;

  if v_free_status is distinct from 'available' then
    raise exception 'The free limited review has already been used. Please buy a review credit';
  end if;

  -- One free review per person: claim the normalised email.
  select public.ia_normalise_email_key(u.email) into v_claim_key
  from auth.users u where u.id = v_user_id;

  if v_claim_key is not null then
    select c.student_id into v_claim_owner
    from public.ia_free_review_claims c where c.claim_key = v_claim_key;

    if v_claim_owner is not null and v_claim_owner <> v_user_id then
      raise exception 'A free review has already been used with this email address. Please buy a review credit';
    end if;
  end if;

  v_result := public.reserve_ia_review_access_internal(p_submission_id, 'free_review');

  if v_claim_key is not null then
    insert into public.ia_free_review_claims (claim_key, student_id)
    values (v_claim_key, v_user_id)
    on conflict (claim_key) do nothing;
  end if;

  return v_result;
end;
$function$;
