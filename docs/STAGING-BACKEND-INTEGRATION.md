# SEHS workshop evidence audit — staging integration

This project contains a new **additive**, *not deployed* Supabase Edge Function and migration. It does **not** modify or replace the existing 16 production functions, IB SEHS rubric, scores, billing, original review, or report history.

## What the Supabase inspection confirmed (4 November 2026)

The live `IA Moderation Coach` database already has `ia_projects` → `ia_submissions` version linking, `structure_maps`, `rubric_mappings`, `coaching_outputs`, `ia_detailed_findings`, `ia_document_blocks`, and saved report RPCs. Four function sources (`extract-structure`, `map-to-rubric`, `generate-coaching`, `run-ia-pipeline`) were inspected read-only. The current reviewer is criterion-oriented; workshop-by-subsection assessment was not part of the existing backend logic.

## New files

- `supabase/migrations/20261104_workshop_section_audits.sql`: table and owner+full-entitlement RLS policies for auditable section results.
- `supabase/functions/workshop-audit/index.ts`: optional section-at-a-time evidence audit, cached once per submission/section/catalogue version; separate `summary` action for two-draft comparison.
- `supabase/functions/workshop-audit/catalogue.ts`: the full 43-check, 9-section workshop map.
- `src/components/WorkshopGuidedReview.tsx`: when enabled, an **Audit this section** button on an actual saved full-access review. Default/offline behavior unchanged.
- `src/components/DraftComparison.tsx`: when enabled, a separate evidence-comparison panel only if both drafts have saved audits of the same check.

## Safe local testing

1. Keep your currently working `.env.local` private. Preserve its actual Supabase public URL and anon/publishable key. **Do not put service-role or Anthropic keys in frontend env files.**
2. Copy/replace the local app with this package (or use a separate extracted folder to preserve your working version). `npm install` then `npm run dev`.
3. Leave `VITE_ENABLE_WORKSHOP_AUDIT=false` (default). Review `/workshop-demo.html` and your saved report pages. No new database/function dependency exists in this mode.
4. For a genuine evidence-audit test, first create a **separate Supabase staging branch/project**, apply the migration, deploy `workshop-audit` with JWT verification ON, and set the server-side secret `ANTHROPIC_API_KEY` through Supabase secret management. This must be a deliberately authorised operation, not automatic. Point the frontend `.env.local` at that staging environment and set `VITE_ENABLE_WORKSHOP_AUDIT=true`.
5. Use only **completed, full-access, student-owned SEHS reviews** with retained source blocks. Open Workshop Guide and click **Audit this section**. Audits are cached and billable AI calls; they do not alter official marks.
6. For two-draft evidence comparison, run the same section audit on **both saved drafts** under the same IA project, then open **Compare Drafts**. This view distinguishes evidence-supported improvement, continuing problems, regressions and unverified items. It cannot verify a draft after source text has been deleted, and it does not guarantee an examiner grade.
7. Once results pass QA, plan integration into the existing pipeline so future completed reviews can queue section audits asynchronously. This staging package intentionally does not change the production orchestrator.

## Limitations and QA gates

- In the present live database, original extracted source content is temporary and may have been purged. An audit refuses to invent results if source is gone. Existing reports alone cannot prove that missing issues were resolved.
- Source extraction is primarily text-based. Visuals, photographs, handwritten tables, diagrams or complex layouts must be **unverified** unless adequately captured and checked separately.
- The model must not deduct marks for workshop-advisory items (750 words, four sources, mandatory CoV, error bars everywhere, exact photos/tables). The **official four 6-mark criteria** remain the only scoring basis.
- Statuses are formative evidence checks, not marks or certified completion. A model quote is checked against extracted text, but teachers must validate the scientific judgement.
- Staging audit requests incur Anthropic API costs. No audit call happens when the feature flag is off.
- This environment lacked the full npm dependency cache, so a complete TypeScript/Vite build could not be executed here. Modified TS/TSX files passed TypeScript transpile syntax validation. **Run `npm install && npm run build` on your Mac before deployment.**
- No live Supabase SQL migration, Edge Function deployment, Netlify deployment, or payment/account changes were performed.
