# IB Review Coach — GitHub and Netlify deployment

## What this release includes

- The original IA Review Coach React/Vite app, including sign-in, existing IA report history, Admin Control Centre, billing and four original 2026+ IB SEHS rubric criteria (24 marks).
- A workshop-guided review UI covering **43 advisory coaching checks across nine IA sections**.
- A cautious **previous-draft vs current-draft findings comparison** for saved reports of the same IA project, without interpreting a missing repeated comment as proof of resolution.
- A local AI test lab with its own private Node server. It works using `npm run dev:full` on your Mac, but **it is not a production Netlify function** and must not be exposed as a public multi-user API.
- Source for a planned `workshop-audit` Supabase Edge Function and additive SQL migration, **neither deployed**.

## 1. GitHub repository

Create a new **private**, empty GitHub repository named `ibreviewcoach` under your GitHub account. Do NOT initialise it with a README, license or .gitignore, because this package already supplies those files. The assistant can then push the complete source via the GitHub connection when the empty repository is available. Alternatively, on your Mac:

```bash
git init
git branch -M main
git add .
git commit -m "Initial IB Review Coach workshop-mapped release"
git remote add origin https://github.com/YOUR-GITHUB-USER/ibreviewcoach.git
git push -u origin main
```

Do not add `.env.local`, `.env`, credentials, or student documents to GitHub. The supplied `.gitignore` already excludes them.

## 2. Netlify

1. In Netlify, **Add new project → Import an existing project**.
2. Choose **GitHub** and the new private repository `ibreviewcoach`.
3. Site name: `ibreviewcoach` if available. The actual Netlify domain ends in **`.netlify.app`**.
4. Build: `npm run build`; publish directory: `dist`. Both are provided in `netlify.toml`.
5. In **Site configuration → Environment variables**, set:
   - `VITE_SUPABASE_URL` = the current IA Moderation Coach public URL.
   - `VITE_SUPABASE_ANON_KEY` = the project's public anon/publishable key (not `service_role`).
   - `VITE_ENABLE_WORKSHOP_AUDIT` = `false` until the workshop-audit backend and migration have been tested and intentionally deployed.
6. Configure new site URL in Supabase **Authentication → URL Configuration → Redirect URLs** as appropriate for your login flow (keep existing URLs intact).
7. Deploy, sign in, and confirm original saved IA reports open from the authenticated app. Test with a non-sensitive account first.

Never add `ANTHROPIC_API_KEY` to a client-side Vite setting or publish a local `.env.local`. Existing Supabase Edge Functions already manage their server-side AI credentials. The local lab uses a server-side secret only on your own Mac.

## 3. Local full AI test (not a hosted multi-user feature)

```bash
npm install
npm run test:local
npm run dev:full
```

Open `http://localhost:5173/local-lab/index.html` and test PDF/DOCX/TXT upload, nine sections, official rubric, progress plan, and the next draft. Use anonymised documents. Actual API calls require `ANTHROPIC_API_KEY` in your local `.env.local`.

## 4. What must happen before hosted 43-check AI auditing can be enabled

The source in `supabase/functions/workshop-audit/` must be reviewed, the additive migration must be applied to a **separate staging Supabase project**, and the function must be deployed there with appropriate server-side secrets and authentication. Only after real document and access-control tests should `VITE_ENABLE_WORKSHOP_AUDIT=true` be used on a site pointing to that staging backend. A separate Netlify site connected to the existing Supabase project does **not** isolate production database changes.

## Important limitations

- Source documents are purged under the existing data retention policy. Saved reports can be compared as reports, but a retroactive **verified** comparison of original prose, diagrams or tables may require re-uploading the source drafts.
- The local lab's AI checks have not been validated against real examiner judgements; results are formative and may require teacher verification.
- Do not assume the sample `/workshop-demo.html` or offline `local-lab` paths are live AI endpoints on Netlify.
- Student reports are private. Existing RLS and report entitlements must be preserved; do not create a public all-students browser.
