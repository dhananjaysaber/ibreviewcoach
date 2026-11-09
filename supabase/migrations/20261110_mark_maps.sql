-- Additive: stores the evidence-based mark map (official-rubric marking) per submission.
create table if not exists public.ia_mark_maps (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.ia_submissions(id) on delete cascade,
  student_id uuid not null,
  map_version text not null,
  result jsonb not null,
  model_id text,
  created_at timestamptz not null default now(),
  unique (submission_id, map_version)
);
alter table public.ia_mark_maps enable row level security;
drop policy if exists ia_mark_maps_owner_select on public.ia_mark_maps;
create policy ia_mark_maps_owner_select on public.ia_mark_maps for select
  using (student_id = (select auth.uid()) and public.has_full_ia_review_access(submission_id));
