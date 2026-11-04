# IA Review Coach · End-to-end local testing

This is a real local test environment, not the illustrated workshop demo. It runs alongside the original app but **does not create or edit Supabase rows, payment records, Edge Functions, Netlify deployments or student accounts**. It uses a separate local Node HTTP service (bound to `127.0.0.1` only) for private upload, document extraction, persistent drafts, actual Anthropic AI analysis and before/after comparison.

## Quick start on macOS

1. Extract the ZIP into a **new folder**, keeping your current working copy.
2. Copy your existing `.env.local` into the new folder, next to `package.json`. Retain your existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for testing the original app, if desired.
3. Add a **server-side** secret line to `.env.local`:

   ```env
   ANTHROPIC_API_KEY=YOUR_ACTUAL_ANTHROPIC_API_KEY
   LOCAL_LAB_MODEL=claude-sonnet-4-6
   ```

   Obtain the key from your own Anthropic developer console. **Do not add `VITE_` to this name**: the key must remain server-side. Do not send your key to the chat. The existing Supabase secret key cannot be read back from the project connection.

4. Stop any existing Vite process on port 5173 (`Ctrl+C`).
5. Run:

   ```bash
   npm install
   npm run test:local
   npm run dev:full
   ```

6. Open **http://localhost:5173/local-lab/index.html**. Do NOT open `workshop-demo.html` if you want actual uploads and real AI analysis.

## Actual end-to-end workflow

1. Enter an anonymised student label and IA project name. Choose a **searchable** PDF, DOCX or TXT (maximum 20 MB).
2. Upload the first IA. The local server extracts text and saves the result as Draft 1.
3. Click **Run all 43 checks**. The server calls Anthropic separately for each of the nine workshop sections. Completed sections are saved after every request; if your connection fails you can resume without rerunning completed checks. This produces real evidence-based statuses, scientific concerns, guided questions, actions, examples and higher-band advice.
4. Open **Official IB SEHS rubric · /24** and click **Assess against official rubric**. The engine uses the original criteria and band descriptors retrieved read-only from the connected IA Moderation Coach database. This rubric is the official assessment framework, not a new scoring system. AI marks remain indicative.
5. Upload a revised document with the **same student label and project name**. It automatically becomes Draft 2.
6. Audit Draft 2, then open **Draft comparison**, select Draft 1 as previous, and click **Compare**. The output distinguishes evidence-supported improvements, remaining problems, possible regressions, new unverified items and sustained strengths by *stable check ID*, not only wording similarity.
7. Export the analysis as JSON, or delete any local draft and associated content when testing is complete.

## What counts as verified

- A **complete** check is allowed only if the AI quotes exact text that actually exists in the uploaded draft.
- Workshop preferences such as exactly 750 background words, four studies, tables, pictures, every graph having error bars, and calculating CV are **advisory**, not automatic IB mark requirements.
- The original IB SEHS rubric is independently assessed using 4 criteria × 6 marks.
- A change is labelled evidence-supported improvement only if the new draft supplies a directly verified excerpt; it is not an examiner certification.
- For diagrams, complex graphics, photos, scanned pages, equations not extracted as text, or truncated inputs, the engine should mark unverified when evidence is not accessible rather than guess.
- Source text is sent to Anthropic when you trigger a review. Do not use identifiable or confidential student documents without appropriate consent/authorisation.

## Data and security

- Local draft text and findings are saved in the project's `.local-lab-data/` folder; that folder is ignored by git and is not part of the distributed ZIP.
- The API binds to loopback (`127.0.0.1`), never `0.0.0.0`.
- Your Anthropic key is loaded only by the server from `.env.local`, never served to browsers.
- This test environment does not share billing or student review credit entitlements with Supabase; each AI call may incur Anthropic API fees on your account.
- **Nothing is deployed** to Supabase or Netlify, and the new optional `supabase/functions/workshop-audit` source in the ZIP is not invoked by this local lab.
- To discard all test data, stop the server and delete `.local-lab-data/`.

## Validation

`npm run test:local` verifies the local service, all 43 mapped checks, the 24-mark rubric, two text-draft uploads, draft version numbering, persistence, comparison, redaction of source text from API responses and rejection of AI requests without the provider key. To validate AI output you must supply a working API key and run a real anonymised IA: API calls cannot be simulated as proof of actual AI review quality.

`npm run build` validates the original React/Vite app after installing all dependencies. If the build reports errors, send the Terminal output for diagnosis rather than deploying.
