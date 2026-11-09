-- Additive: stores plain-language action plans generated from existing findings.
create table if not exists public.ia_action_plans (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.ia_submissions(id) on delete cascade,
  finding_id uuid not null references public.ia_detailed_findings(id) on delete cascade,
  student_id uuid not null,
  plan jsonb not null,
  plan_version text not null,
  model_id text,
  created_at timestamptz not null default now(),
  unique (finding_id, plan_version)
);
create index if not exists ia_action_plans_submission_idx on public.ia_action_plans (submission_id);
alter table public.ia_action_plans enable row level security;
drop policy if exists ia_action_plans_owner_select on public.ia_action_plans;
create policy ia_action_plans_owner_select on public.ia_action_plans for select
  using (student_id = (select auth.uid()) and public.has_full_ia_review_access(submission_id));
