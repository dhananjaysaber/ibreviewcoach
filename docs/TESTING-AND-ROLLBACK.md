# Testing and rollback: teacher copy, policy checks, progress ticks

## What is live on Supabase (project IA Moderation Coach, zcmsfbvmltzeyrtbqlxl)
Applied 2026-11-05, additive only:
- Tables `ia_teacher_notes`, `ia_finding_progress` (RLS on, owner-only).
- Edge functions `teacher-notes` (v1), `policy-flags` (v1), both `verify_jwt = true`.
No existing table, function, policy or data was changed. Row counts before and after matched
(7 submissions, 153 findings, 1,180 blocks, 7 mappings, 7 coaching outputs, 22 share links).

## How to test (signed in as a student who owns a completed, full-access review)
1. Merge the branch (or use a Netlify deploy preview) so the new screens are served.
2. Open a completed review, Detailed review tab:
   - Each finding shows "IB RUBRIC" and "TEMPLATE" panels. Band wording must match the IB guide.
   - An "IB policy checks" strip appears only when something is detected.
   - Tick "I've dealt with this", refresh the page: the tick must persist.
3. Annotated tab: click "Prepare teacher copy" (needs content still retained, takes ~20-60 s), then
   "Download teacher copy". Open the HTML: notes <= 25 words, impersonal, each with a quoted passage
   that exists in the report, bands shown as indicative.
4. Compare tab (needs two drafts of one project): per-criterion band movement appears at the top.
5. Old reviews: where the original document has expired, "Prepare teacher copy" shows the message
   that evidence cannot be verified, and the policy strip is hidden. Everything else is unchanged.

## Rollback (removes only what this release added)
```sql
drop table if exists public.ia_teacher_notes;
drop table if exists public.ia_finding_progress;
```
Delete the functions `teacher-notes` and `policy-flags` in the Supabase dashboard (Edge Functions).
To revert the front end, revert the merge commit on `main`.
