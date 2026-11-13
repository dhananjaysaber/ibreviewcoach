-- Moderator review, part 2:
--  (a) hide a paid report from the student from the moment it is uploaded (not only once it completes)
--  (b) let a student upload another IA while the first waits for the moderator (queue, no "blocked")
--  (c) late-report bookkeeping for the apology email
--  (d) block share links and Word downloads for a held report

-- 1. Columns ------------------------------------------------------------------------------------
alter table public.ia_credit_reservations
  add column if not exists is_queued boolean not null default false;

alter table public.ia_submissions
  add column if not exists moderation_promised_at timestamptz,
  add column if not exists moderation_late_notified_at timestamptz;

-- One report may be *processing* per student; reports already waiting for the moderator do not count.
drop index if exists public.ia_credit_reservations_one_active_per_student;
create unique index ia_credit_reservations_one_active_per_student
  on public.ia_credit_reservations (student_id)
  where status = 'reserved' and not is_queued;

-- 2. Hold from upload ------------------------------------------------------------------------------
create or replace function public.hold_paid_submission_from_upload()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.commercial_access in ('paid_credit', 'complimentary')
     and new.moderation_status = 'none'
     and not exists (
       select 1 from public.ia_admin_users a
       where a.user_id = new.student_id and a.is_active = true
     ) then
    new.moderation_status := 'awaiting';
  end if;
  return new;
end;
$function$;

drop trigger if exists ia_submissions_hold_paid on public.ia_submissions;
create trigger ia_submissions_hold_paid
  before insert or update of commercial_access on public.ia_submissions
  for each row execute function public.hold_paid_submission_from_upload();

-- Backfill: anything already paid, unpublished, not an admin's, and still without a deadline is held.
update public.ia_submissions s
set moderation_status = 'awaiting'
where s.moderation_status = 'none'
  and s.commercial_access in ('paid_credit', 'complimentary')
  and s.deleted_at is null
  and s.moderation_held_at is null
  and s.status <> 'completed'
  and not exists (select 1 from public.ia_admin_users a where a.user_id = s.student_id and a.is_active = true);

-- 3. Finalize wrapper: start the 24-hour clock when processing finishes, and free the "processing" slot --
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

    if s.moderation_held_at is null then
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

      -- This report no longer occupies the student's single "processing" slot.
      update public.ia_credit_reservations
      set is_queued = true
      where submission_id = s.id and status = 'reserved';
    else
      v_due := s.moderation_due_at;
    end if;

    return jsonb_build_object(
      'finalized', false,
      'awaiting_moderator', true,
      'submission_id', s.id,
      'commercial_access', 'unassigned',
      'moderation_due_at', coalesce(s.moderation_promised_at, v_due),
      'credit_consumed', false,
      'report_saved', false
    );
  end if;

  return public.finalize_ia_review_success_core(p_submission_id);
end;
$function$;

revoke all on function public.finalize_ia_review_success(uuid) from public, anon, authenticated;
grant execute on function public.finalize_ia_review_success(uuid) to service_role;

-- 4. Queue and student lists only show reports that have finished processing ------------------------
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
      (s.moderation_status = 'awaiting' and s.moderation_held_at is not null and s.status = 'completed')
      or (p_include_published and s.moderation_status = 'published'
          and s.moderation_published_at > now() - interval '14 days')
    )
  order by (s.moderation_status = 'awaiting') desc, s.moderation_due_at asc nulls last, s.moderation_published_at desc nulls last
  limit 200;
end;
$function$;

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
  select s.id, s.original_filename, s.subject, s.moderation_held_at,
         coalesce(s.moderation_promised_at, s.moderation_due_at)
  from public.ia_submissions s
  where s.student_id = auth.uid() and s.deleted_at is null
    and s.moderation_status = 'awaiting' and s.moderation_held_at is not null
  order by coalesce(s.moderation_promised_at, s.moderation_due_at) asc nulls last;
end;
$function$;

-- A report waiting for the moderator is not an "active review" the student has to reopen.
create or replace function public.get_my_active_ia_review()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid;
  v_result jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;

  select jsonb_build_object(
    'active', true,
    'submission',
      jsonb_build_object(
        'id', submission_row.id,
        'student_id', submission_row.student_id,
        'subject', submission_row.subject,
        'draft_version', submission_row.draft_version,
        'original_filename', submission_row.original_filename,
        'mime_type', submission_row.mime_type,
        'file_size_bytes', submission_row.file_size_bytes,
        'raw_file_bucket', submission_row.raw_file_bucket,
        'raw_file_path', submission_row.raw_file_path,
        'raw_file_expires_at', submission_row.raw_file_expires_at,
        'status', submission_row.status,
        'uploaded_at', submission_row.uploaded_at,
        'commercial_access', submission_row.commercial_access,
        'credit_reservation_id', submission_row.credit_reservation_id
      ),
    'reservation',
      jsonb_build_object(
        'id', reservation_row.id,
        'source_type', reservation_row.source_type,
        'status', reservation_row.status,
        'reserved_at', reservation_row.reserved_at
      )
  )
  into v_result
  from public.ia_credit_reservations as reservation_row
  join public.ia_submissions as submission_row
    on submission_row.id = reservation_row.submission_id
  where reservation_row.student_id = v_user_id
    and reservation_row.status = 'reserved'
    and not reservation_row.is_queued
    and submission_row.deleted_at is null
  order by reservation_row.reserved_at desc
  limit 1;

  return coalesce(v_result, jsonb_build_object('active', false));
end;
$function$;

-- 5. Reserving: queued reports do not block a new upload, and one credit is never reserved twice --------
create or replace function public.reserve_ia_review_access_internal(p_submission_id uuid, p_preferred_source text default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_submission public.ia_submissions;
  v_existing_reservation public.ia_credit_reservations;
  v_other_reservation public.ia_credit_reservations;
  v_credit_account public.ia_credit_accounts;
  v_credit_grant public.ia_credit_grants;
  v_reservation public.ia_credit_reservations;
  v_source_type text;
  v_preferred_source text;
begin
  if p_submission_id is null then
    raise exception 'Submission ID is required';
  end if;

  select submission_row.* into v_submission
  from public.ia_submissions as submission_row
  where submission_row.id = p_submission_id and submission_row.deleted_at is null
  for update;

  if not found then
    raise exception 'The selected review was not found';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_submission.student_id::text, 0));

  select reservation_row.* into v_existing_reservation
  from public.ia_credit_reservations as reservation_row
  where reservation_row.submission_id = v_submission.id
  limit 1
  for update;

  if found then
    return jsonb_build_object(
      'reservation_id', v_existing_reservation.id,
      'submission_id', v_existing_reservation.submission_id,
      'source_type', v_existing_reservation.source_type,
      'status', v_existing_reservation.status,
      'already_exists', true
    );
  end if;

  select reservation_row.* into v_other_reservation
  from public.ia_credit_reservations as reservation_row
  where reservation_row.student_id = v_submission.student_id
    and reservation_row.status = 'reserved'
    and not reservation_row.is_queued
  order by reservation_row.reserved_at desc
  limit 1
  for update;

  if found then
    raise exception 'Another IA review is already in progress for this account';
  end if;

  insert into public.ia_credit_accounts (student_id)
  values (v_submission.student_id)
  on conflict (student_id) do nothing;

  select account_row.* into v_credit_account
  from public.ia_credit_accounts as account_row
  where account_row.student_id = v_submission.student_id
  for update;

  v_preferred_source := lower(nullif(btrim(coalesce(p_preferred_source, '')), ''));
  if v_preferred_source not in ('paid_credit', 'complimentary', 'free_review') then
    v_preferred_source := null;
  end if;

  if v_preferred_source <> 'free_review' or v_preferred_source is null then
    select grant_row.* into v_credit_grant
    from public.ia_credit_grants as grant_row
    where grant_row.student_id = v_submission.student_id
      and grant_row.credits_remaining > 0
      -- credits already held by reports waiting for the moderator are not available again
      and grant_row.credits_remaining > (
        select count(*) from public.ia_credit_reservations as held
        where held.credit_grant_id = grant_row.id and held.status = 'reserved'
      )
      and grant_row.revoked_at is null
      and (grant_row.expires_at is null or grant_row.expires_at > now())
      and (
        (v_preferred_source = 'complimentary' and grant_row.grant_type in ('complimentary', 'admin'))
        or (v_preferred_source in ('paid_credit', null)
            and grant_row.grant_type in ('purchase', 'refund', 'complimentary', 'admin'))
        or (v_preferred_source is null
            and grant_row.grant_type in ('purchase', 'refund', 'complimentary', 'admin'))
      )
    order by
      case when grant_row.grant_type in ('purchase', 'refund') then 0 else 1 end,
      grant_row.expires_at nulls last,
      grant_row.granted_at,
      grant_row.id
    limit 1
    for update;
  end if;

  if v_credit_grant.id is not null then
    v_source_type := case when v_credit_grant.grant_type in ('purchase', 'refund') then 'paid_credit' else 'complimentary' end;
  elsif v_credit_account.free_review_status = 'available' then
    v_source_type := 'free_review';
  else
    raise exception 'No IA review allowance is available for this account';
  end if;

  insert into public.ia_credit_reservations (
    student_id, submission_id, source_type, credit_grant_id, status, reserved_at, metadata
  )
  values (
    v_submission.student_id, v_submission.id, v_source_type,
    case when v_source_type = 'free_review' then null else v_credit_grant.id end,
    'reserved', now(),
    jsonb_build_object('preferred_source', v_preferred_source, 'reservation_version', 'active-review-v1')
  )
  returning * into v_reservation;

  if v_source_type = 'free_review' then
    update public.ia_credit_accounts as account_row
    set free_review_status = 'reserved',
        free_review_submission_id = v_submission.id,
        free_review_reserved_at = v_reservation.reserved_at,
        free_review_used_at = null,
        updated_at = now()
    where account_row.student_id = v_submission.student_id
      and account_row.free_review_status = 'available';

    if not found then
      raise exception 'The free IA review could not be reserved';
    end if;
  end if;

  update public.ia_submissions as submission_row
  set commercial_access = v_source_type,
      credit_reservation_id = v_reservation.id,
      updated_at = now()
  where submission_row.id = v_submission.id;

  insert into public.ia_credit_transactions (
    student_id, event_type, credit_delta, credit_grant_id, reservation_id, submission_id, description, metadata
  )
  values (
    v_submission.student_id, 'reserve', 0, v_reservation.credit_grant_id, v_reservation.id,
    v_submission.id, 'IA review allowance reserved', jsonb_build_object('source_type', v_source_type)
  )
  on conflict (reservation_id, event_type)
  where reservation_id is not null and event_type in ('reserve', 'consume', 'release')
  do nothing;

  return jsonb_build_object(
    'reservation_id', v_reservation.id,
    'submission_id', v_reservation.submission_id,
    'source_type', v_reservation.source_type,
    'status', v_reservation.status,
    'already_exists', false
  );
end;
$function$;

-- 6. A held report cannot be shared or turned into a Word download ------------------------------------
create or replace function public.block_artifacts_for_held_report()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_status text;
begin
  select s.moderation_status into v_status from public.ia_submissions s where s.id = new.submission_id;
  if v_status = 'awaiting' then
    raise exception 'This report is not available until it has been released';
  end if;
  return new;
end;
$function$;

drop trigger if exists ia_annotation_share_links_block_held on public.ia_annotation_share_links;
create trigger ia_annotation_share_links_block_held
  before insert on public.ia_annotation_share_links
  for each row execute function public.block_artifacts_for_held_report();

create or replace function public.block_docx_for_held_report()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_status text;
begin
  if new.artifact_type = 'annotated_docx' then
    select s.moderation_status into v_status from public.ia_submissions s where s.id = new.submission_id;
    if v_status = 'awaiting' then
      raise exception 'This report is not available until it has been released';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists ia_review_artifacts_block_docx_held on public.ia_review_artifacts;
create trigger ia_review_artifacts_block_docx_held
  before insert or update on public.ia_review_artifacts
  for each row execute function public.block_docx_for_held_report();

-- Stored files: the policy also has to wait for the release.
alter policy "Students can read full-access IA review artifacts" on storage.objects
  using (
    bucket_id = 'ia-review-artifacts'
    and (storage.foldername(name))[1] = (auth.uid())::text
    and exists (
      select 1
      from public.ia_review_artifacts artifact_row
      join public.ia_submissions submission_row on submission_row.id = artifact_row.submission_id
      where artifact_row.storage_bucket = objects.bucket_id
        and artifact_row.storage_path = objects.name
        and artifact_row.student_id = auth.uid()
        and artifact_row.status = 'ready'
        and artifact_row.deleted_at is null
        and (artifact_row.retention_policy = 'account' or artifact_row.expires_at > now())
        and submission_row.student_id = auth.uid()
        and submission_row.deleted_at is null
        and submission_row.moderation_status <> 'awaiting'
        and submission_row.commercial_access = any (array['paid_credit'::text, 'complimentary'::text])
    )
  );
