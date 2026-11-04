# IA Review Coach — End-to-End Local Test Edition (4 November 2026)

This project preserves the existing React/Vite application and live Supabase configuration, keeps the **original IB SEHS 2026+ rubric (four criteria × 6 = 24)**, and includes a complete separate, locally running test lab for real AI document audits and draft comparisons.

## START HERE — Full, real local test

1. Configure `.env.local` with your existing Vite public Supabase values **and** your personal **server-side** `ANTHROPIC_API_KEY` (see `.env.example`). Never share or publish your key.
2. Run `npm install` (not `npm ci` after adding the PDF/DOCX dependencies).
3. Run `npm run test:local` to validate the local backend.
4. Run `npm run dev:full` (not only `npm run dev`).
5. Open **http://localhost:5173/local-lab/index.html**.

The full instructions are in **`docs/LOCAL-REAL-AI-TESTING.md`**. This is the functional reviewer: **`/workshop-demo.html` is still a separate illustrative demo**.

## Full local-lab capabilities

- Real PDF, DOCX, or TXT upload and document-text extraction (20 MB cap).
- 43 evidence-verified coaching checks mapped to 9 sequential workshop sections, with question, action, example and higher-band advice.
- Genuine external AI review using your own Anthropic API key, not a hardcoded fixture.
- The original 4 IB SEHS rubric criteria and their stored 2026+ band descriptors, separately assessed, out of 24.
- Persisted anonymous student/project history and automatically incremented draft numbers.
- Same-project Draft 1 → Draft 2 comparison across stable check IDs using evidence from each reviewed document.
- Local JSON report exports, test-data deletion, resume-on-failure, no production modifications.

## Existing app

The existing Admin Centre, upload, paid reviews, report history, annotation, credit, billing, and Netlify app code are untouched except for a **development-only** link to the local test lab in the Admin Centre. The previously added Workshop Guide and Compare Drafts views remain in place. The optional Supabase staging function and SQL migration remain included as source files but are **not deployed**.

## Actual test caveats

Text-first extraction cannot conclusively evaluate photos, scanned pages and complex graphics; those require a manual human verification or more advanced vision ingestion. Providing the AI key is necessary for live model calls. Successful syntax/API tests alone cannot establish accuracy against real student IAs or guarantee IB examiner decisions. Do not deploy the local lab as a hosted multi-user product: it is a localhost development tool with no account-authenticated API.

## Prepare GitHub + new Netlify project

Read `docs/GITHUB-NETLIFY-RELEASE.md` before pushing or deploying. The root `netlify.toml` is configured for a **new standalone** Netlify site. Deploying a separate frontend does not create a separate Supabase database, and the localhost AI server cannot run as a hosted function.
