-- Report history: free-review submissions expose only the Research Design score.
create or replace function public.get_my_ia_report_history()
 returns table(submission_id uuid, student_id uuid, project_id uuid, project_title text, research_question text, subject text, version_number integer, original_filename text, mime_type text, file_size_bytes bigint, status text, uploaded_at timestamp with time zone, report_generated_at timestamp with time zone, saved_at timestamp with time zone, retention_policy text, word_count integer, page_count integer, criterion_scores jsonb, progress_plan_ready boolean, annotated_html_ready boolean, annotated_docx_ready boolean, is_latest_version boolean)
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;

  return query
  select
    submission_row.id, submission_row.student_id, submission_row.project_id,
    project_row.title, project_row.research_question, project_row.subject,
    submission_row.draft_version, submission_row.original_filename, submission_row.mime_type,
    submission_row.file_size_bytes, submission_row.status, submission_row.uploaded_at,
    submission_row.completed_at, submission_row.saved_at, submission_row.retention_policy,
    submission_row.word_count, submission_row.page_count,
    (
      select case
        when submission_row.commercial_access in ('paid_credit','complimentary')
          then mapping_row.criterion_scores
        else coalesce((
          select jsonb_agg(e)
          from jsonb_array_elements(
                 case when jsonb_typeof(mapping_row.criterion_scores) = 'array'
                      then mapping_row.criterion_scores else '[]'::jsonb end) as e
          where e ->> 'criterion' = 'ResearchDesign'), '[]'::jsonb)
      end
      from public.structure_maps as structure_row
      join public.rubric_mappings as mapping_row
        on mapping_row.structure_map_id = structure_row.id
      where structure_row.submission_id = submission_row.id
      limit 1
    ),
    exists (select 1 from public.progress_plans as plan_row
            where plan_row.current_submission_id = submission_row.id),
    exists (select 1 from public.ia_review_artifacts as artifact_row
            where artifact_row.submission_id = submission_row.id
              and artifact_row.artifact_type = 'annotated_html'
              and artifact_row.status = 'ready' and artifact_row.deleted_at is null
              and (artifact_row.retention_policy = 'account' or artifact_row.expires_at > now())),
    exists (select 1 from public.ia_review_artifacts as artifact_row
            where artifact_row.submission_id = submission_row.id
              and artifact_row.artifact_type = 'annotated_docx'
              and artifact_row.status = 'ready' and artifact_row.deleted_at is null
              and (artifact_row.retention_policy = 'account' or artifact_row.expires_at > now())),
    (submission_row.draft_version = (
        select max(other_submission.draft_version)
        from public.ia_submissions as other_submission
        where other_submission.project_id = submission_row.project_id
          and other_submission.deleted_at is null))
  from public.ia_submissions as submission_row
  join public.ia_projects as project_row on project_row.id = submission_row.project_id
  where submission_row.student_id = v_user_id
    and submission_row.retention_policy = 'account'
    and submission_row.status = 'completed'
    and submission_row.deleted_at is null
    and project_row.deleted_at is null
  order by project_row.title, submission_row.draft_version desc;
end;
$function$;
