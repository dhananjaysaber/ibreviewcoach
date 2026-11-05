/**
 * IB policy observations for a submission. No AI, no storage, no marks.
 * POST { submission_id } -> { flags: PolicyFlag[] }
 * Requires the signed-in owner with full review access.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { policyFlags, type PolicyBlock } from './flags.ts';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  'content-type': 'application/json',
};
const reply = (status: number, payload: unknown) => new Response(JSON.stringify(payload), { status, headers: cors });
const isUuid = (s: unknown): s is string =>
  typeof s === 'string' && /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(s);

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
  if (!isUuid(submission_id)) return reply(400, { error: 'submission_id required' });

  const db = createClient(url, service, { auth: { persistSession: false } });
  const { data: submission } = await db.from('ia_submissions')
    .select('id,student_id,deleted_at,content_purged_at').eq('id', submission_id).maybeSingle();
  if (!submission || submission.deleted_at) return reply(404, { error: 'Submission not found' });
  if (submission.student_id !== user.id) return reply(403, { error: 'This is not your IA submission' });
  const { data: hasAccess, error: accessError } = await owner.rpc('has_full_ia_review_access', { p_submission_id: submission_id });
  if (accessError || hasAccess !== true) return reply(403, { error: 'Full-review entitlement is required' });
  if (submission.content_purged_at) return reply(200, { flags: [], available: false });

  const { data: blocks, error } = await db.from('ia_document_blocks')
    .select('block_type,text').eq('submission_id', submission_id).order('block_index').limit(5000);
  if (error) return reply(500, { error: 'Could not load document' });
  return reply(200, { flags: policyFlags((blocks ?? []) as PolicyBlock[]), available: true });
});
