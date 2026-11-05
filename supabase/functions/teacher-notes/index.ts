/**
 * Teacher annotated copy notes. Additive: reads existing findings and stored bands,
 * writes only to ia_teacher_notes. Does not change any mark or existing pipeline.
 *
 * POST { submission_id, action?: 'get' | 'generate' }
 * Requires the signed-in owner with full review access. Every note is validated
 * (length, voice, no advice, no marks) and every evidence quote is verified
 * verbatim against the stored document block before saving.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  MODERATOR_SYSTEM, assembleNotes, buildUserPrompt, summariseCriteria,
  type FindingInput, type ModelNote,
} from './notes.ts';

const VERSION = 'teacher-notes-v1';
const MODEL = 'claude-sonnet-4-6';
const BATCH = 40;
const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  'content-type': 'application/json',
};
const reply = (status: number, payload: unknown) => new Response(JSON.stringify(payload), { status, headers: cors });
const isUuid = (s: unknown): s is string =>
  typeof s === 'string' && /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(s);

async function askModel(apiKey: string, findings: FindingInput[]): Promise<ModelNote[]> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL, max_tokens: 4000, temperature: 0, system: MODERATOR_SYSTEM,
      messages: [{ role: 'user', content: buildUserPrompt(findings) }],
    }),
  });
  if (!res.ok) throw new Error(`AI provider returned ${res.status}`);
  const data = await res.json();
  const text: string = (data?.content ?? []).map((c: { text?: string }) => c.text ?? '').join('');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return [];
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed?.notes) ? parsed.notes : [];
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'POST required' });
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
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
  const { data: submission } = await db.from('ia_submissions')
    .select('id,student_id,subject,status,deleted_at,content_purged_at').eq('id', submission_id).maybeSingle();
  if (!submission || submission.deleted_at) return reply(404, { error: 'Submission not found' });
  if (submission.student_id !== user.id) return reply(403, { error: 'This is not your IA submission' });
  const { data: hasAccess, error: accessError } = await owner.rpc('has_full_ia_review_access', { p_submission_id: submission_id });
  if (accessError || hasAccess !== true) return reply(403, { error: 'Full-review entitlement is required' });

  const { data: cached, error: cacheError } = await db.from('ia_teacher_notes').select('*')
    .eq('submission_id', submission_id).eq('notes_version', VERSION).maybeSingle();
  if (cacheError) return reply(500, { error: 'The teacher notes schema has not been installed on this environment' });
  if (cached) return reply(200, { teacher_notes: cached, cached: true });
  if (action === 'get') return reply(200, { teacher_notes: null, available: false });
  if (!['completed', 'complete'].includes(String(submission.status).toLowerCase())) {
    return reply(409, { error: 'IA review must be completed first' });
  }
  if (submission.content_purged_at) {
    return reply(409, { error: 'Original document content has expired, so evidence quotes cannot be verified. Re-upload a new draft.' });
  }
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return reply(503, { error: 'AI provider key is not configured server-side' });

  const { data: findingRows, error: fErr } = await db.from('ia_detailed_findings')
    .select('id,criterion_code,finding_type,priority,rubric_requirement,issue,evidence_excerpt,block_id,page_number,section_title')
    .eq('submission_id', submission_id).order('criterion_code').order('finding_index').limit(400);
  if (fErr) return reply(500, { error: 'Could not load findings' });
  const findings = (findingRows ?? []) as FindingInput[];
  if (!findings.length) return reply(409, { error: 'No detailed findings are available for this submission' });

  const { data: blocks } = await db.from('ia_document_blocks').select('id,text').eq('submission_id', submission_id).limit(5000);
  const blockText = new Map<string, string>((blocks ?? []).map((b: { id: string; text: string }) => [b.id, b.text ?? '']));

  // Stored marking: latest structure map -> rubric mapping. Display only; never recomputed.
  const { data: sm } = await db.from('structure_maps').select('id').eq('submission_id', submission_id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  let summaries: ReturnType<typeof summariseCriteria> = [];
  if (sm) {
    const { data: rm } = await db.from('rubric_mappings').select('criterion_scores').eq('structure_map_id', sm.id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    summaries = summariseCriteria(rm?.criterion_scores);
  }

  try {
    const collected: ReturnType<typeof assembleNotes>['notes'] = [];
    let pending = findings;
    for (let attempt = 0; attempt < 2 && pending.length; attempt++) {
      const modelNotes: ModelNote[] = [];
      for (let i = 0; i < pending.length; i += BATCH) {
        modelNotes.push(...await askModel(apiKey, pending.slice(i, i + BATCH)));
      }
      const { notes, rejected } = assembleNotes(pending, blockText, modelNotes);
      collected.push(...notes);
      const rejectedIds = new Set(rejected.map((r) => r.finding_id));
      pending = pending.filter((f) => rejectedIds.has(f.id));
    }
    if (!collected.length) return reply(502, { error: 'No valid notes could be produced. Please try again.' });
    const row = {
      submission_id, student_id: user.id, notes_version: VERSION, notes: collected,
      criterion_summaries: summaries, rejected_count: pending.length, model_id: MODEL,
    };
    const { data: saved, error: saveErr } = await db.from('ia_teacher_notes').insert(row).select('*').single();
    if (saveErr) return reply(500, { error: 'Could not save teacher notes' });
    return reply(200, { teacher_notes: saved, cached: false });
  } catch (e) {
    return reply(502, { error: e instanceof Error ? e.message : 'Teacher notes failed' });
  }
});
