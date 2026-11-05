-- ADDITIVE, NOT APPLIED. Run on a non-production branch after review.
-- Stores the moderator-style notes for the teacher annotated copy. Existing rubric,
-- scoring tables and pipelines are untouched; bands are copied from rubric_mappings at
-- generation time for display only and never recomputed here.
create table if not exists public.ia_teacher_notes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.ia_submissions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  notes_version text not null,
  notes jsonb not null default '[]'::jsonb,
  criterion_summaries jsonb not null default '[]'::jsonb,
  rejected_count integer not null default 0,
  model_id text,
  created_at timestamptz not null default now(),
  constraint ia_teacher_notes_unique unique (submission_id, notes_version)
);
create index if not exists ia_teacher_notes_student_idx on public.ia_teacher_notes(student_id);
alter table public.ia_teacher_notes enable row level security;
create policy "teacher notes owner full-access read"
  on public.ia_teacher_notes for select to authenticated
  using (student_id = (select auth.uid()) and public.has_full_ia_review_access(submission_id));
-- No client INSERT/UPDATE/DELETE policy: rows are written only by the server.
revoke all on public.ia_teacher_notes from anon;
grant select on public.ia_teacher_notes to authenticated;
