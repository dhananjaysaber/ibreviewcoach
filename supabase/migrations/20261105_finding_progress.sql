-- ADDITIVE, NOT APPLIED. Run on a non-production branch after review.
-- Lets a student tick findings as fixed. Student-owned; never read by marking or scoring.
create table if not exists public.ia_finding_progress (
  finding_id uuid not null references public.ia_detailed_findings(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  done_at timestamptz not null default now(),
  primary key (finding_id, student_id)
);
alter table public.ia_finding_progress enable row level security;
create policy "finding progress owner read" on public.ia_finding_progress
  for select to authenticated using (student_id = (select auth.uid()));
create policy "finding progress owner insert" on public.ia_finding_progress
  for insert to authenticated with check (
    student_id = (select auth.uid())
    and exists (
      select 1 from public.ia_detailed_findings f
      join public.ia_submissions s on s.id = f.submission_id
      where f.id = finding_id and s.student_id = (select auth.uid())
    )
  );
create policy "finding progress owner delete" on public.ia_finding_progress
  for delete to authenticated using (student_id = (select auth.uid()));
revoke all on public.ia_finding_progress from anon;
grant select, insert, delete on public.ia_finding_progress to authenticated;
