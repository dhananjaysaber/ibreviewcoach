/**
 * Teacher mark map. Additive: reads the stored IA text, writes only to ia_mark_maps.
 * POST { submission_id, action?: 'get' | 'generate' }
 * Marks follow the official IB SEHS descriptors judged against evidence in the IA. The Ideal IA
 * template is never an input. Requires the signed-in owner with full review access.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { RUBRIC } from './rubric.ts';
import { MARK_SYSTEM, assembleCriterion, buildDocument, buildUserPrompt, totals, type Block, type CriterionMark, type Rubric } from './logic.ts';

const VERSION = 'mark-map-v1';
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

async function markOne(apiKey: string, r: Rubric, doc: string): Promise<Record<string, unknown> | null> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 5000, temperature: 0, system: MARK_SYSTEM, messages: [{ role: 'user', content: buildUserPrompt(r, doc) }] }),
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
  const action = body.action === 'generate' ? 'generate' : 'get';
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
  if (stored?.result) return reply(200, { map: stored.result, created_at: stored.created_at });

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return reply(503, { error: 'AI provider key is not configured server-side' });
  if (submission.content_purged_at) return reply(409, { error: 'The IA text has expired, so it cannot be marked again.' });
  const { data: rows, error: bErr } = await db.from('ia_document_blocks').select('block_index,page_number,section_title,text').eq('submission_id', submission_id).order('block_index').limit(5000);
  if (bErr || !rows?.length) return reply(409, { error: 'The IA text is not available for this report.' });
  const blocks = rows as Block[];
  const { text: doc, complete } = buildDocument(blocks, MAX_DOC_CHARS);

  try {
    const done: CriterionMark[] = [];
    let pending: Rubric[] = [...RUBRIC] as unknown as Rubric[];
    for (let attempt = 0; attempt < 2 && pending.length; attempt++) {
      const results = await Promise.all(pending.map(async (r) => {
        try { const raw = await markOne(apiKey, r, doc); return raw ? assembleCriterion(r, raw, blocks) : null; } catch { return null; }
      }));
      const next: Rubric[] = [];
      results.forEach((c, i) => { if (c) done.push(c); else next.push(pending[i]); });
      pending = next;
    }
    if (pending.length) return reply(502, { error: 'The mark map could not be completed. Please try again.' });
    const order = RUBRIC.map((r) => r.name);
    done.sort((a, b) => order.indexOf(a.criterion) - order.indexOf(b.criterion));
    const map = { version: VERSION, model: MODEL, source_complete: complete, ...totals(done), criteria: done };
    const { error: saveErr } = await db.from('ia_mark_maps').upsert({ submission_id, student_id: user.id, map_version: VERSION, result: map, model_id: MODEL }, { onConflict: 'submission_id,map_version' });
    if (saveErr) return reply(500, { error: 'Could not save the mark map' });
    return reply(200, { map, created_at: new Date().toISOString() });
  } catch (e) {
    return reply(502, { error: e instanceof Error ? e.message : 'Mark map failed' });
  }
});
