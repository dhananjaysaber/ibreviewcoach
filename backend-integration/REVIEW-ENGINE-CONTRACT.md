# Backend integration contract — SEHS workshop mapping v1

**The uploaded project did not include Supabase Edge Function implementations or database migrations.** This folder describes the backend work required for evidence-verified, automatic review of all 43 template checks. Do not claim this backend work has been deployed by running the frontend alone.

## Current official IB assessment rubric — unchanged

Research Design /6, Data Analysis /6, Conclusion /6, Evaluation /6, total /24. Preserve the current four-criterion grading prompt, mark descriptors, scoring logic, storage, report display and existing historical marks. The workshop checklist is a pedagogical coaching layer, **not** a new grading rubric. Verify official rubrics against the IB guide before changing any assessment descriptor.

## Template catalogue

`workshop-checks-v1.json` contains 9 major sections and 43 checks in workshop sequence, each with a `id`, an official criterion mapping, reflection question, help, example, higher-band advice and advisory flag. Use these IDs as stable, versioned identifiers across submissions.

## Proposed automatic audit in `run-ia-pipeline`

1. Extract actual PDF/DOCX content and supporting visuals/tables; retain trustworthy page, paragraph and image anchors. Do not judge absent diagrams from text-only extraction.
2. Detect scientific content independent of heading names; check for content wherever it occurs.
3. Evaluate all 43 checklist items independently, but respect appropriateness: `demonstrated`, `partial`, `missing`, `not_applicable`, `uncertain`. `not_applicable`/`missing` must have clear, evidenced justifications; don't force a coefficient of variation, error bars or a diagram when not appropriate.
4. Each assessment must provide `evidence` (quote/anchor or absence-scope details), `why`, `question`, `specific_action`, `non_copy_ready_example`, `higher_band_hint`, `confidence`, `advisory`, and official `criterion` name. Avoid unsupported claims. A missing item may only be reported after checking all document content.
5. Persist `template_version`, `check_id`, `evidence` with source positions, `source_submission_id`, and optionally `prior_check_id`. Ensure same project/student ownership, access permissions and RLS isolation.
6. Output coaching in original workshop order, but do NOT change marks without following the official rubric assessment independently.

## Suggested JSON per check

```json
{
  "template_version": "sehs-workshop-2026-v1",
  "check_id": "rq-measure",
  "criterion": "Research Design",
  "status": "partial",
  "document_evidence": [{"page": 1, "section": "RQ", "excerpt": "Speed (km/h)"}],
  "reason": "Instrument uncertainty not stated in the full document",
  "student_question": "What is the verified uncertainty of your speed gun?",
  "specific_action": "Check the manual for the actual instrument and identify uncertainty.",
  "example": "Look for measurement accuracy in your device's technical sheet; do not invent it.",
  "higher_band_hint": "Reproducible, appropriately precise measurements",
  "advisory": false,
  "confidence": "high"
}
```

## Multi-draft comparison

- Project ID and student ID must match. Compare adjacent submitted versions or allow choosing baseline versions.
- Match the SAME stable check ID across versions; optionally align exact sections/claims even if moved.
- `resolved` only if new-document evidence explicitly satisfies the former requirement; `partial` if evidence improved but still incomplete; `open` if still unmet; `regressed` if previously demonstrated and now unsupported; `new` for previously absent issues; `uncertain` if insufficient extraction or evidence.
- Keep source-linked before/after excerpts and note what changed; do not infer resolved merely from a finding disappearing.
- Show an editable student action list and limit repeated annotations to active items. Store each review independently; never overwrite an older report.
- Compare mark estimates separately using unchanged four-criterion marking logic, never numeric scores from checklist items.
- Respect the existing free/paid review restriction and report expiration policies.

## Proposed persistence

Prefer extending existing review data structures with versioned JSON alongside official rubric results, or add a child table keyed by `(submission_id, template_version, check_id)`, with RLS matching parent submission ownership. Do not run migrations until existing schema and deployed functions are supplied and reconciled.

## Non-negotiable quality tests

- Multiple heading layouts with the same content produce equivalent evidence statuses.
- Content located in appendix or figure is checked before declaring missing.
- A technique not relevant to a study becomes `not_applicable`, not a mark deduction.
- Actual numbers/instrument uncertainty/peer-reviewed sources are never fabricated.
- Different student/project drafts never cross-match.
- Old IA reports, PayPal credits, login and permission gating continue working.
