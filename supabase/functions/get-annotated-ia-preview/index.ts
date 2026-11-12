// supabase/functions/get-annotated-ia-preview/index.ts
//
// Strict free annotated-IA preview.
// A free student receives ONLY:
//   - the Research Design criterion and its indicative range (out of its max)
//   - locked placeholders for the other criteria (name + max marks, no marks)
//   - "N of TOTAL marked, M locked" (no overall range, no finding counts)
//   - the first 20 document blocks
// Nothing about the other criteria's marks or feedback is ever sent.
// JWT verification must remain enabled.

import { createClient } from "npm:@supabase/supabase-js@2";

const FUNCTION_NAME = "get-annotated-ia-preview";
const FUNCTION_VERSION = "2026-11-13-v2.0-strict-free";
const PREVIEW_BLOCK_LIMIT = 20;
const UNLOCKED_CRITERION = "ResearchDesign";
const CRITERION_ORDER = ["ResearchDesign", "DataAnalysis", "Conclusion", "Evaluation"];

type RecordValue = Record<string, unknown>;
type DocumentBlock = {
  id: string; block_index: number; block_type: string;
  section_title: string | null; heading_level: number | null;
  page_number: number | null; text: string;
};
type Criterion = { code: string; name: string; range: [number, number] | null; maximum: number | null };

class HttpError extends Error {
  status: number; publicMessage: string;
  constructor(status: number, publicMessage: string, internalMessage?: string) {
    super(internalMessage ?? publicMessage);
    this.status = status; this.publicMessage = publicMessage;
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: isRequestOriginAllowed(req) ? 204 : 403, headers: corsHeaders });
  }
  if (!isRequestOriginAllowed(req)) {
    return jsonResponse(req, { error: "This website is not permitted to open the review preview." }, 403);
  }
  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed." }, 405, { Allow: "POST, OPTIONS" });
  }

  try {
    const adminClient = createClient(
      requireEnvironmentVariable("SUPABASE_URL"),
      requireEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
    );

    const userId = await authenticateRequest(req, adminClient);
    const { submission_id: submissionId } = await readRequestBody(req);

    const { data: submission, error: submissionError } = await adminClient
      .from("ia_submissions")
      .select("id,student_id,subject,original_filename,status,commercial_access,access_expires_at,completed_at,uploaded_at,deleted_at")
      .eq("id", submissionId).eq("student_id", userId).is("deleted_at", null).maybeSingle();

    if (submissionError) throw new HttpError(500, "The annotated IA preview could not be prepared.", submissionError.message);
    if (!submission) throw new HttpError(404, "The selected IA review was not found.");
    if (submission.status !== "completed") throw new HttpError(409, "The IA review is not complete yet.");
    if (submission.commercial_access !== "free_review") {
      throw new HttpError(409, "Open the complete annotated IA from the full review.");
    }
    if (typeof submission.access_expires_at === "string" && Date.parse(submission.access_expires_at) <= Date.now()) {
      throw new HttpError(410, "The free review preview has expired. Purchase a review credit to run another complete review.");
    }

    const [structureResult, blocksResult] = await Promise.all([
      adminClient.from("structure_maps").select("id").eq("submission_id", submissionId).maybeSingle(),
      adminClient.from("ia_document_blocks")
        .select("id,block_index,block_type,section_title,heading_level,page_number,text")
        .eq("submission_id", submissionId)
        .order("block_index", { ascending: true })
        .limit(PREVIEW_BLOCK_LIMIT),
    ]);
    if (structureResult.error) throw new HttpError(500, "The review overview could not be prepared.", structureResult.error.message);
    if (blocksResult.error) throw new HttpError(500, "The annotated IA preview could not be prepared.", blocksResult.error.message);

    const structureMapId = readText(structureResult.data?.id);
    let criterionScores: unknown = [];
    let configuredTotal: number | null = null;

    if (structureMapId) {
      const { data: rubricMapping, error: rubricMappingError } = await adminClient
        .from("rubric_mappings").select("criterion_scores, rubric_version_id")
        .eq("structure_map_id", structureMapId).maybeSingle();
      if (rubricMappingError) throw new HttpError(500, "The review overview could not be prepared.", rubricMappingError.message);
      criterionScores = rubricMapping?.criterion_scores ?? [];

      const rubricVersionId = readText(rubricMapping?.rubric_version_id);
      if (rubricVersionId) {
        const { data: rubricVersion, error: rubricVersionError } = await adminClient
          .from("rubric_versions").select("total_marks").eq("id", rubricVersionId).maybeSingle();
        if (rubricVersionError) throw new HttpError(500, "The review overview could not be prepared.", rubricVersionError.message);
        configuredTotal = readNumber(rubricVersion?.total_marks);
      }
    }

    const all = normalizeCriterionScores(criterionScores);
    const unlocked = all.find((c) => c.code === UNLOCKED_CRITERION) ?? null;
    const lockedList = all.filter((c) => c.code !== UNLOCKED_CRITERION);
    const locked = lockedList.length
      ? lockedList.map((c) => ({ name: c.name, maximum: c.maximum ?? 6 }))
      : [
          { name: "Data Analysis", maximum: 6 },
          { name: "Conclusion", maximum: 6 },
          { name: "Evaluation", maximum: 6 },
        ];
    const unlockedMax = unlocked?.maximum ?? 6;
    const lockedMarks = locked.reduce((sum, c) => sum + c.maximum, 0);
    const totalMarks = configuredTotal ?? unlockedMax + lockedMarks;

    const blocks = normalizeBlocks(blocksResult.data);
    const html = renderPreviewHtml({
      submission, blocks, unlocked, unlockedMax, locked,
      totalMarks, lockedMarks: totalMarks - unlockedMax,
      previewBlockLimit: PREVIEW_BLOCK_LIMIT,
    });

    console.log(`[${FUNCTION_NAME}] Free annotated preview prepared`, {
      version: FUNCTION_VERSION, submissionId, userId, previewBlockCount: blocks.length,
    });

    return jsonResponse(req, {
      submission_id: submissionId, preview: true, preview_block_count: blocks.length,
      html, function_version: FUNCTION_VERSION,
    }, 200);
  } catch (error) {
    const publicError = error instanceof HttpError
      ? error : new HttpError(500, "The annotated IA preview could not be opened.", getErrorMessage(error));
    console.error(`[${FUNCTION_NAME}] Failed`, { version: FUNCTION_VERSION, error: getErrorMessage(error) });
    return jsonResponse(req, { error: publicError.publicMessage }, publicError.status);
  }
});

async function authenticateRequest(req: Request, adminClient: ReturnType<typeof createClient>): Promise<string> {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) throw new HttpError(401, "Authentication is required.");
  const token = authorization.slice("Bearer ".length).trim();
  const { data: { user }, error } = await adminClient.auth.getUser(token);
  if (error || !user) {
    throw new HttpError(401, "Your secure session is no longer valid. Refresh the page and try again.", error?.message);
  }
  return user.id;
}

async function readRequestBody(req: Request): Promise<{ submission_id: string }> {
  let body: unknown;
  try { body = await req.json(); } catch { throw new HttpError(400, "The request body must contain valid JSON."); }
  if (!isRecord(body) || !isUuid(body.submission_id)) throw new HttpError(400, "A valid submission ID is required.");
  return { submission_id: body.submission_id };
}

function normalizeBlocks(value: unknown): DocumentBlock[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((item, index) => ({
    id: readText(item.id) ?? `preview-block-${index + 1}`,
    block_index: readNumber(item.block_index) ?? index,
    block_type: readText(item.block_type) ?? "paragraph",
    section_title: readText(item.section_title),
    heading_level: readNumber(item.heading_level),
    page_number: readNumber(item.page_number),
    text: readText(item.text) ?? "",
  })).filter((block) => block.text.trim().length > 0);
}

function normalizeCriterionScores(value: unknown): Criterion[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((item) => {
    const code = readText(item.criterion) ?? "Other";
    return {
      code,
      name: readText(item.criterion_name) ?? getCriterionName(code),
      range: readNumberRange(item.indicative_mark_range),
      maximum: readNumber(item.criterion_max_marks),
    };
  }).sort((a, b) => getCriterionOrder(a.code) - getCriterionOrder(b.code));
}

function renderPreviewHtml(o: {
  submission: RecordValue; blocks: DocumentBlock[]; unlocked: Criterion | null; unlockedMax: number;
  locked: Array<{ name: string; maximum: number }>; totalMarks: number; lockedMarks: number; previewBlockLimit: number;
}): string {
  const filename = readText(o.submission.original_filename) ?? "Submitted IA";
  const subject = readText(o.submission.subject) ?? "SEHS";
  const generatedAt = readText(o.submission.completed_at) ?? readText(o.submission.uploaded_at) ?? new Date().toISOString();
  const expiresAt = readText(o.submission.access_expires_at);

  const rdRange = o.unlocked?.range
    ? `${o.unlocked.range[0]}–${o.unlocked.range[1]} / ${o.unlockedMax}` : "Reviewed";

  const unlockedCard = `
    <article class="criterion-card criterion-open">
      <span>${escapeHtml(o.unlocked?.name ?? "Research Design")}</span>
      <strong>${escapeHtml(rdRange)}</strong>
    </article>`;
  const lockedCards = o.locked.map((c) => `
    <article class="criterion-card criterion-locked" aria-label="${escapeHtml(c.name)} locked">
      <span>${escapeHtml(c.name)}</span>
      <strong class="blur">0–0 / ${c.maximum}</strong>
      <em>Locked</em>
    </article>`).join("");

  const documentBlocks = o.blocks.map((b, i) => renderDocumentBlock(b, i + 1)).join("\n");

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; object-src 'none'; base-uri 'none'; form-action 'none'" />
<meta name="referrer" content="no-referrer" />
<title>Annotated IA Preview</title>
<style>
:root{color-scheme:light;--page:#f6f1e7;--paper:#fff;--ink:#14213d;--muted:#68758a;--line:#e4dccb;--navy:#0f1d3a;--amber:#e6a817;--amber-soft:#fff5d9}
*{box-sizing:border-box}
body{margin:0;color:var(--ink);background:var(--page);font-family:Inter,Arial,sans-serif}
.topbar{position:sticky;top:0;z-index:10;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;color:#fff;background:var(--navy)}
.topbar strong{font-size:15px}.topbar span{color:rgba(255,255,255,.7);font-size:12px;display:block;margin-top:3px}
.preview-pill{padding:7px 10px;border:1px solid rgba(255,255,255,.28);border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}
.shell{width:min(1100px,calc(100% - 28px));margin:0 auto;padding:30px 0 54px}
.hero,.overview-card,.criterion-summary,.legend,.document-panel,.upgrade-lock{border:1px solid var(--line);border-radius:18px;background:var(--paper);box-shadow:0 12px 32px rgba(20,33,61,.07)}
.hero{padding:clamp(22px,4vw,36px);display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,320px);gap:24px}
.eyebrow{margin:0 0 8px;color:#a8740a;font-size:12px;font-weight:900;letter-spacing:.09em;text-transform:uppercase}
h1{margin:0;color:var(--navy);font-family:Georgia,serif;font-size:clamp(28px,5vw,44px);line-height:1.08}
.hero p{margin:14px 0 0;color:var(--muted);font-size:15px;line-height:1.7}
.hero-meta{padding:16px;display:grid;gap:10px;border-radius:14px;background:#faf6ec}
.meta-row{display:grid;gap:3px;padding-bottom:9px;border-bottom:1px solid var(--line)}.meta-row:last-child{border:0;padding:0}
.meta-row span:first-child{color:var(--muted);font-size:10px;font-weight:850;letter-spacing:.05em;text-transform:uppercase}
.meta-row span:last-child{overflow-wrap:anywhere;font-size:13px;font-weight:750}
.overview-card{margin-top:18px;padding:18px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.overview-card article{padding:15px;border-radius:14px;background:#faf6ec}
.overview-card span,.criterion-card span{display:block;color:var(--muted);font-size:11px;font-weight:800;text-transform:uppercase}
.overview-card strong,.criterion-card strong{display:block;margin-top:7px;color:var(--navy);font-size:20px}
.overview-card .locked-total strong{color:#8a6a1a}
.criterion-summary{margin-top:18px;padding:18px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.criterion-card{position:relative;padding:14px;border:1px solid var(--line);border-radius:13px;background:#fffdf8}
.criterion-card strong{font-size:16px}
.criterion-open{border-color:var(--amber);background:var(--amber-soft)}
.criterion-locked{background:#f3f1ec;overflow:hidden}
.criterion-locked .blur{filter:blur(7px);user-select:none}
.criterion-locked em{position:absolute;right:10px;top:10px;font-style:normal;font-size:10px;font-weight:850;letter-spacing:.05em;text-transform:uppercase;color:#8a6a1a}
.legend{margin-top:18px;padding:14px 16px;color:#5f6e83;font-size:13px;line-height:1.55}
.document-panel{margin-top:18px;overflow:hidden}
.panel-heading{padding:22px 24px;border-bottom:1px solid var(--line);background:#faf6ec}
.panel-heading h2{margin:0;color:var(--navy);font-family:Georgia,serif;font-size:24px}
.panel-heading p{margin:7px 0 0;color:var(--muted);line-height:1.6}
.paper{padding:clamp(22px,5vw,52px);display:grid;gap:13px;background:#fff}
.preview-line{position:relative;padding-left:42px;color:#27354c;font-family:Georgia,serif;font-size:15px;line-height:1.75}
.preview-line::before{content:attr(data-line);position:absolute;left:0;top:3px;width:28px;color:#8b98a9;font-family:Inter,Arial,sans-serif;font-size:10px;text-align:right}
.preview-line-heading{margin-top:8px;color:var(--navy);font-family:Inter,Arial,sans-serif;font-size:18px;font-weight:850}
.page-label{margin:12px 0 2px;padding:6px 10px;width:fit-content;border-radius:999px;color:#8a6a1a;background:var(--amber-soft);font-size:10px;font-weight:850;text-transform:uppercase}
.upgrade-lock{margin-top:18px;padding:clamp(26px,5vw,44px);display:grid;place-items:center;gap:10px;text-align:center;background:linear-gradient(180deg,#fff,#faf6ec)}
.upgrade-lock h2{margin:0;color:var(--navy);font-family:Georgia,serif;font-size:24px}
.upgrade-lock p{max-width:620px;margin:0;color:var(--muted);line-height:1.6}
.lock-mark{width:52px;height:52px;display:grid;place-items:center;border-radius:16px;color:var(--navy);background:var(--amber)}
@media(max-width:760px){.hero{grid-template-columns:1fr}.overview-card{grid-template-columns:1fr}.criterion-summary{grid-template-columns:1fr 1fr}}
@media(max-width:480px){.criterion-summary{grid-template-columns:1fr}.preview-line{padding-left:34px}}
@media print{body>*{display:none!important}body::before{content:"Printing is available with a full review credit.";display:block!important;margin:72px auto;padding:28px;max-width:620px;border:1px solid #d0d5dd;border-radius:14px;font:700 18px/1.5 Arial,sans-serif;text-align:center}}
</style></head>
<body oncontextmenu="return false">
<header class="topbar">
  <div><strong>IB IA Review</strong><span>${escapeHtml(filename)} · Annotated IA Preview</span></div>
  <div class="preview-pill">Free preview</div>
</header>
<main class="shell">
  <section class="hero">
    <div>
      <p class="eyebrow">Annotated IA Preview</p>
      <h1>Detailed annotated review</h1>
      <p>This free preview marks one criterion, Research Design, and shows the opening ${o.previewBlockLimit} lines of your IA. The other criteria and their connected comments are locked until you unlock a full review.</p>
    </div>
    <div class="hero-meta">
      <div class="meta-row"><span>Subject</span><span>${escapeHtml(subject)}</span></div>
      <div class="meta-row"><span>File</span><span>${escapeHtml(filename)}</span></div>
      <div class="meta-row"><span>Generated</span><span>${escapeHtml(formatDateTime(generatedAt))}</span></div>
      <div class="meta-row"><span>Preview available until</span><span>${escapeHtml(expiresAt ? formatDateTime(expiresAt) : "Limited-time access")}</span></div>
    </div>
  </section>

  <section class="overview-card" aria-label="Review overview">
    <article><span>Marked in this preview</span><strong>${o.unlockedMax} out of ${o.totalMarks}</strong></article>
    <article class="locked-total"><span>Locked</span><strong>${o.lockedMarks} marks</strong></article>
    <article><span>Criteria unlocked</span><strong>1 of ${o.locked.length + 1}</strong></article>
  </section>

  <section class="criterion-summary" aria-label="Criterion summary">${unlockedCard}${lockedCards}</section>

  <div class="legend">The full annotated review uses criterion colours and numbered markers to connect each highlighted passage to its review comment.</div>

  <section class="document-panel" id="annotated-document">
    <div class="panel-heading"><h2>Annotated IA</h2><p>The opening section of your IA. Highlights and comments unlock with a full review.</p></div>
    <article class="paper">${documentBlocks || `<p class="preview-line" data-line="1">The opening section could not be displayed.</p>`}</article>
  </section>

  <section class="upgrade-lock">
    <div class="lock-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
    </div>
    <h2>The rest of the annotated IA is locked</h2>
    <p>Close this preview and use the unlock option in your review to get every criterion marked, all annotated passages with connected comments, the progress plan and downloads.</p>
  </section>
</main>
</body></html>`;
}

function renderDocumentBlock(block: DocumentBlock, lineNumber: number): string {
  const pageLabel = block.page_number ? `<div class="page-label">Page ${block.page_number}</div>` : "";
  const heading = block.block_type === "heading" || (typeof block.heading_level === "number" && block.heading_level > 0);
  return `${pageLabel}<div class="preview-line ${heading ? "preview-line-heading" : ""}" data-line="${lineNumber}">${escapeHtml(block.text)}</div>`;
}

function readNumberRange(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const a = readNumber(value[0]); const b = readNumber(value[1]);
  return a === null || b === null ? null : [a, b];
}

function getCriterionName(code: string): string {
  switch (code) {
    case "ResearchDesign": return "Research Design";
    case "DataAnalysis": return "Data Analysis";
    case "Conclusion": return "Conclusion";
    case "Evaluation": return "Evaluation";
    default: return code.replace(/([a-z])([A-Z])/g, "$1 $2").trim();
  }
}

function getCriterionOrder(code: string): number {
  const i = CRITERION_ORDER.indexOf(code);
  return i === -1 ? 99 : i;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(n) ? n : null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function requireEnvironmentVariable(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function isRequestOriginAllowed(req: Request): boolean {
  const origin = req.headers.get("Origin");
  if (!origin) return true;
  if (origin === "http://localhost:5173" || origin === "http://127.0.0.1:5173") return true;
  if (/^https:\/\/[a-z0-9-]+--5173--[a-z0-9-]+\.local-corp\.webcontainer\.io$/iu.test(origin)) return true;
  const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((v) => v.trim()).filter(Boolean);
  return configured.includes(origin);
}

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin && isRequestOriginAllowed(req) ? origin : "null",
    "Access-Control-Allow-Headers": ["authorization", "apikey", "content-type", "x-client-info"].join(", "),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonResponse(req: Request, body: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), ...extraHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
