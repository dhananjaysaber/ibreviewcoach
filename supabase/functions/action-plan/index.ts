/**
 * Student action plans. Additive: reads stored findings, writes only to ia_action_plans.
 * POST { submission_id, action?: 'get' | 'generate', finding_ids?: string[] }
 * Requires the signed-in owner with full review access. Does not touch marks or the pipeline.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { PLAN_SYSTEM, assemblePlans, buildUserPrompt, type FindingInput, type ModelPlan } from './plan.ts';

const VERSION = 'action-plan-v1';
const MODEL = 'claude-sonnet-4-6';
const MAX_PER_CALL = 30;
const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  'content-type': 'application/json',
};
const reply = (status: number, payload: unknown) => new Response(JSON.stringify(payload), { status, headers: cors });
const isUuid = (s: unknown): s is string =>
  typeof s === 'string' && /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(s);

async function askModel(apiKey: string, findings: FindingInput[]): Promise<ModelPlan[]> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL, max_tokens: 6000, temperature: 0.2, system: PLAN_SYSTEM,
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
    return Array.isArray(parsed?.plans) ? parsed.plans : [];
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
    .select('id,student_id,status,deleted_at').eq('id', submission_id).maybeSingle();
  if (!submission || submission.deleted_at) return reply(404, { error: 'Submission not found' });
  if (submission.student_id !== user.id) return reply(403, { error: 'This is not your IA submission' });
  const { data: hasAccess, error: accessError } = await owner.rpc('has_full_ia_review_access', { p_submission_id: submission_id });
  if (accessError || hasAccess !== true) return reply(403, { error: 'Full-review entitlement is required' });

  const { data: existing, error: exErr } = await db.from('ia_action_plans').select('finding_id,plan')
    .eq('submission_id', submission_id).eq('plan_version', VERSION).limit(1000);
  if (exErr) return reply(500, { error: 'The action plan schema has not been installed on this environment' });
  const have = new Map<string, unknown>((existing ?? []).map((r: { finding_id: string; plan: unknown }) => [r.finding_id, r.plan]));
  if (action === 'get') return reply(200, { plans: Object.fromEntries(have) });

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return reply(503, { error: 'AI provider key is not configured server-side' });
  const requested = Array.isArray(body.finding_ids) ? body.finding_ids.filter(isUuid).slice(0, MAX_PER_CALL) : [];
  if (!requested.length) return reply(400, { error: 'finding_ids required' });
  const todoIds = requested.filter((id) => !have.has(id));
  if (!todoIds.length) return reply(200, { plans: Object.fromEntries(have), generated: 0 });

  const { data: rows, error: fErr } = await db.from('ia_detailed_findings')
    .select('id,criterion_code,section_title,issue,rubric_requirement,specific_action,why,completion_check,required_elements,evidence_excerpt,finding_type')
    .eq('submission_id', submission_id).in('id', todoIds);
  if (fErr) return reply(500, { error: 'Could not load findings' });
  const findings = ((rows ?? []) as (FindingInput & { finding_type: string })[]).filter((f) => f.finding_type !== 'strength');
  if (!findings.length) return reply(409, { error: 'No matching findings' });

  try {
    let pending: FindingInput[] = findings;
    const saved: { submission_id: string; finding_id: string; student_id: string; plan: unknown; plan_version: string; model_id: string }[] = [];
    for (let attempt = 0; attempt < 2 && pending.length; attempt++) {
      const { plans, missing } = assemblePlans(pending, await askModel(apiKey, pending));
      for (const [finding_id, plan] of plans) {
        saved.push({ submission_id, finding_id, student_id: user.id, plan, plan_version: VERSION, model_id: MODEL });
      }
      pending = pending.filter((f) => missing.includes(f.id));
    }
    if (!saved.length) return reply(502, { error: 'No valid plans could be produced. Please try again.' });
    const { error: saveErr } = await db.from('ia_action_plans').upsert(saved, { onConflict: 'finding_id,plan_version' });
    if (saveErr) return reply(500, { error: 'Could not save the plans' });
    for (const s of saved) have.set(s.finding_id, s.plan);
    return reply(200, { plans: Object.fromEntries(have), generated: saved.length, skipped: pending.length });
  } catch (e) {
    return reply(502, { error: e instanceof Error ? e.message : 'Action plan failed' });
  }
});
