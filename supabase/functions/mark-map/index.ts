/**
 * Strand-based mark map (mark-map-v2). Reads the stored IA text, writes only to ia_mark_maps.
 * POST { submission_id, action?: 'get' | 'generate' | 'plan' }
 *  generate = AI call 1: marks the IA against the 11-strand teacher sheet (whole-number mark per criterion).
 *  plan     = AI call 2: IA-specific, plain-language fix plan for every strand.
 * The Ideal IA template is never an input to a mark. Requires the signed-in owner with full review access.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { MARK_SYSTEM, PLAN_SYSTEM, TRIM_SYSTEM, WORD_LIMIT, assembleCriterionPlan, appendixDigest, assembleMarking, assemblePlan, assembleTrim, buildDocument, buildMarkPrompt, buildPlanPrompt, splitDocument, totals, wordGuide, type Block } from './logic.ts';

const VERSION = 'mark-map-v2';
const MODEL = 'claude-sonnet-4-6';
const MAX_DOC_CHARS = 110_000;
const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  'content-type': 'application/json',
};
const reply = (status: number, payload: unknown) => new Response(JSON.stringify(payload), { status, headers: cors });
const isUuid = (s: unknown): s is string =>
  typeof s === 'string' && /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(s);

async function callClaude(apiKey: string, system: string, user: string, maxTokens: number): Promise<Record<string, unknown> | null> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, temperature: 0, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error(`AI provider returned ${res.status}`);
  const data = await res.json();
  const text: string = (data?.content ?? []).map((c: { text?: string }) => c.text ?? '').join('');
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(text.slice(a, b + 1)); } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'POST required' });
  const url = Deno.env.get('SUPABASE_URL'), anon = Deno.env.get('SUPABASE_ANON_KEY'), service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !service) return reply(500, { error: 'Supabase server configuration missing' });
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return reply(401, { error: 'Sign-in required' });
  const owner = createClient(url, anon, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: { user }, error: authError } = await owner.auth.getUser();
  if (authError || !user) return reply(401, { error: 'Invalid session' });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply(400, { error: 'Invalid JSON' }); }
  const { submission_id } = body;
  const action = body.action === 'generate' ? 'generate' : body.action === 'plan' ? 'plan' : 'get';
  if (!isUuid(submission_id)) return reply(400, { error: 'submission_id required' });

  const db = createClient(url, service, { auth: { persistSession: false } });
  const { data: submission } = await db.from('ia_submissions').select('id,student_id,deleted_at,content_purged_at').eq('id', submission_id).maybeSingle();
  if (!submission || submission.deleted_at) return reply(404, { error: 'Submission not found' });
  if (submission.student_id !== user.id) return reply(403, { error: 'This is not your IA submission' });
  const { data: hasAccess, error: accessError } = await owner.rpc('has_full_ia_review_access', { p_submission_id: submission_id });
  if (accessError || hasAccess !== true) return reply(403, { error: 'Full-review entitlement is required' });

  const { data: stored, error: stErr } = await db.from('ia_mark_maps').select('result,created_at').eq('submission_id', submission_id).eq('map_version', VERSION).maybeSingle();
  if (stErr) return reply(500, { error: 'The mark map schema has not been installed on this environment' });
  if (action === 'get') return reply(200, { map: stored?.result ?? null, created_at: stored?.created_at ?? null });
  if (action === 'generate' && stored?.result) return reply(200, { map: stored.result, created_at: stored.created_at });
  if (action === 'plan' && !stored?.result) return reply(409, { error: 'Mark the IA first.' });
  if (action === 'plan' && (stored!.result as { plan?: unknown }).plan) return reply(200, { map: stored!.result, created_at: stored!.created_at });

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return reply(503, { error: 'AI provider key is not configured server-side' });
  if (submission.content_purged_at) return reply(409, { error: 'The IA text has expired, so it cannot be marked again.' });
  const { data: rows, error: bErr } = await db.from('ia_document_blocks').select('block_index,block_type,page_number,section_title,text').eq('submission_id', submission_id).order('block_index').limit(5000);
  if (bErr || !rows?.length) return reply(409, { error: 'The IA text is not available for this report.' });
  const split = splitDocument(rows as Block[]);
  const { text: doc, complete } = buildDocument(split.body, MAX_DOC_CHARS);

  try {
    if (action === 'generate') {
      let marking = null;
      for (let attempt = 0; attempt < 2 && !marking; attempt++) {
        const raw = await callClaude(apiKey, MARK_SYSTEM, buildMarkPrompt(doc, appendixDigest(split.appendix), split), 9000);
        marking = raw ? assembleMarking(raw, split.body) : null;
      }
      if (!marking) return reply(502, { error: 'The marking could not be completed. Please try again.' });
      const map = {
        version: VERSION, model: MODEL, source_complete: complete,
        word_count: { counted: split.totalCounted, limit: WORD_LIMIT, over_by: split.overBy, cut_at: split.cutAt, sections: split.sections },
        over_word_limit: split.overLimit, ...totals(marking.criteria), ...marking, plan: null,
      };
      const { error: saveErr } = await db.from('ia_mark_maps').upsert({ submission_id, student_id: user.id, map_version: VERSION, result: map, model_id: MODEL }, { onConflict: 'submission_id,map_version' });
      if (saveErr) return reply(500, { error: 'Could not save the mark map' });
      return reply(200, { map, created_at: new Date().toISOString() });
    }
    const map = stored!.result as Record<string, unknown> & { criteria: never };
    const guide = split.overLimit ? wordGuide(split.sections, split.totalCounted) : '';
    const codes = ['A', 'B', 'C', 'D'];
    // Each criterion is its own short call, run in parallel, so the whole plan stays well inside the 150 s function limit.
    const planCall = async (code: string) => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const raw = await callClaude(apiKey, PLAN_SYSTEM, buildPlanPrompt(map as never, doc, '', code), 6500);
          const got = assembleCriterionPlan(raw, code);
          if (got) return got;
        } catch (_e) { /* retry once */ }
      }
      return null;
    };
    const trimCall = async () => {
      if (!split.overLimit) return null;
      try {
        const raw = await callClaude(apiKey, TRIM_SYSTEM, buildPlanPrompt(map as never, doc, guide), 5000);
        return raw ? assembleTrim(raw, split.body, map as never, split.overBy) : null;
      } catch (_e) { return null; }
    };
    const [parts, trim] = await Promise.all([Promise.all(codes.map(planCall)), trimCall()]);
    const plan = parts.every(Boolean) ? parts : null;
    if (!plan) return reply(502, { error: 'The fix plan could not be completed. Please try again.' });
    const next = { ...map, plan, trim };
    const { error: saveErr } = await db.from('ia_mark_maps').upsert({ submission_id, student_id: user.id, map_version: VERSION, result: next, model_id: MODEL }, { onConflict: 'submission_id,map_version' });
    if (saveErr) return reply(500, { error: 'Could not save the fix plan' });
    return reply(200, { map: next, created_at: new Date().toISOString() });
  } catch (e) {
    return reply(502, { error: e instanceof Error ? e.message : 'Mark map failed' });
  }
});
