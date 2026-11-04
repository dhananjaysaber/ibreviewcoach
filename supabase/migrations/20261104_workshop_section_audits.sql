-- ADDITIVE, NOT APPLIED. Run on a non-production branch after review.
-- The existing official IB 24-mark rubric, criterion score data and pipelines are unchanged.
create table if not exists public.ia_workshop_section_audits (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.ia_submissions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  project_id uuid references public.ia_projects(id) on delete cascade,
  section_id text not null,
  catalogue_version text not null,
  checks jsonb not null default '[]'::jsonb,
  source_completeness text not null check (source_completeness in ('complete_text','partial_text','unavailable')),
  model_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ia_workshop_section_audits_section_check check (section_id in ('rq','background','hypothesis','variables','safety','method','analysis','conclusion','evaluation')),
  constraint ia_workshop_section_audits_unique unique (submission_id,section_id,catalogue_version)
);
create index if not exists ia_workshop_section_audits_project_idx on public.ia_workshop_section_audits(project_id,student_id);
alter table public.ia_workshop_section_audits enable row level security;
-- Student-owned reads only, AND only where full review access is currently permitted.
create policy "workshop audit owner full-access read"
  on public.ia_workshop_section_audits for select to authenticated
  using (student_id = (select auth.uid()) and public.has_full_ia_review_access(submission_id));
-- No client INSERT/UPDATE/DELETE policy: audited rows may only be written by the server.
revoke all on public.ia_workshop_section_audits from anon;
grant select on public.ia_workshop_section_audits to authenticated;
