/**
 * IA Workshop Audit — additive server-side evidence audit for IB Review Coach.
 * Additive section-at-a-time audit with evidence verification.
 * Existing IB SEHS rubric and published review functions are never mutated.
 *
 * POST { submission_id, section_id, action?: 'get'|'audit' }
 * Requires signed-in student and full review entitlement. The caller can
 * request each of nine sections; results persist independently by version.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { CATALOGUE } from './catalogue.ts';

const VERSION = 'sehs-workshop-2026-v1';
const MODEL = 'claude-sonnet-4-6';
const MAX_INPUT_CHARS = 125_000;
const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  'content-type': 'application/json',
};
const reply = (status: number, payload: unknown) => new Response(JSON.stringify(payload), {status, headers:cors});
const isUuid = (s:unknown):s is string => typeof s==='string' && /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(s);
const asText=(x:unknown)=>typeof x==='string'?x:'';
const norm=(x:string)=>x.replace(/\s+/g,' ').trim().toLocaleLowerCase();
const allowedStatus = new Set(['complete','partial','missing','not_applicable','unverified']);
type Result = {id:string;status:string;reason:string;question:string;action:string;evidence_excerpt:string|null;source_location:string|null;higher_band:string|null};

Deno.serve(async req => {
  if(req.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return reply(405,{error:'POST required'});
  const url=Deno.env.get('SUPABASE_URL');
  const anon=Deno.env.get('SUPABASE_ANON_KEY');
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!anon||!service)return reply(500,{error:'Supabase server configuration missing'});
  const authHeader=req.headers.get('authorization')||'';
  if(!authHeader.startsWith('Bearer '))return reply(401,{error:'Sign-in required'});
  const owner=createClient(url,anon,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false}});
  const {data:{user},error:authError}=await owner.auth.getUser();
  if(authError||!user)return reply(401,{error:'Invalid session'});
  let body:Record<string,unknown>;
  try{body=await req.json()}catch{return reply(400,{error:'Invalid JSON'})}
  const {submission_id,section_id}=body;
  const action=body.action==='audit'?'audit':body.action==='summary'?'summary':'get';
  if(!isUuid(submission_id)||(action!=='summary'&&typeof section_id!=='string'))return reply(400,{error:'submission_id and section_id required'});
  const section=CATALOGUE.sections.find(s=>s.id===section_id);
  if(action!=='summary'&&!section)return reply(400,{error:'Unknown section ID'});
  const db=createClient(url,service,{auth:{persistSession:false}});
  const {data:submission,error:subErr}=await db.from('ia_submissions')
    .select('id,student_id,project_id,subject,status,extracted_text,content_purged_at,deleted_at')
    .eq('id',submission_id).maybeSingle();
  if(subErr||!submission||submission.deleted_at)return reply(404,{error:'Submission not found'});
  if(submission.student_id!==user.id)return reply(403,{error:'This is not your IA submission'});
  if(String(submission.subject||'').toUpperCase()!=='SEHS')return reply(400,{error:'Only SEHS workshop mapping is supported'});
  const {data:hasAccess,error:accessError}=await owner.rpc('has_full_ia_review_access',{p_submission_id:submission_id});
  if(accessError||hasAccess!==true)return reply(403,{error:'Full-review entitlement is required'});
  if(action==='summary') {
    const {data:audits,error:summaryErr}=await db.from('ia_workshop_section_audits').select('section_id,checks,catalogue_version,source_completeness,created_at')
      .eq('submission_id',submission_id).eq('catalogue_version',VERSION);
    return summaryErr?reply(500,{error:'Audit summary unavailable'}):reply(200,{audits:audits||[]});
  }
  const requiredSection=section!;
  const {data:cached,error:cacheError}=await db.from('ia_workshop_section_audits').select('*')
    .eq('submission_id',submission_id).eq('section_id',section_id).eq('catalogue_version',VERSION).maybeSingle();
  if(cacheError)return reply(500,{error:'The workshop audit schema has not been installed on this environment'});
  if(cached)return reply(200,{audit:cached,cached:true});
  if(action==='get')return reply(200,{audit:null,available:false});
  if(!['completed','complete'].includes(String(submission.status).toLowerCase()))return reply(409,{error:'IA review must be completed before workshop auditing'});
  const {data:blocks,error:blocksError}=await db.from('ia_document_blocks')
    .select('block_index,page_number,section_title,text,block_type').eq('submission_id',submission_id).order('block_index',{ascending:true}).limit(5000);
  if(blocksError)return reply(500,{error:'Could not load source document blocks'});
  let source=(blocks||[]).filter(b=>asText(b.text).trim()).map(b=>
    `[block ${b.block_index}, page ${b.page_number??'?'}; ${asText(b.section_title).slice(0,80)}] ${asText(b.text)}`
  ).join('\n');
  if(!source.trim())source=asText(submission.extracted_text);
  if(!source.trim()||submission.content_purged_at)return reply(409,{error:'Original document content has expired. A verified audit cannot be generated retroactively. Re-upload a new draft for review.'});
  const sourceCompleteness=source.length>MAX_INPUT_CHARS?'partial_text':'complete_text';
  source=source.slice(0,MAX_INPUT_CHARS);
  const apiKey=Deno.env.get('ANTHROPIC_API_KEY');
  if(!apiKey)return reply(503,{error:'AI provider key is not configured server-side'});
  const userPrompt=`AUDIT: ${requiredSection.name}\nOFFICIAL CRITERION ASSOCIATION: ${requiredSection.criterion}\nCHECKS: ${JSON.stringify(requiredSection.checks.map(c=>({id:c.id,title:c.title,question:c.question,guidance:c.guidance,advisory:c.advisory||false,higherBand:c.higherBand||null})))}\nSOURCE COMPLETENESS: ${sourceCompleteness}\nSOURCE DOCUMENT:\n${source}`;
  const system=`You are an IB SEHS formative-feedback auditor. The workshop checklist is SCHOOL COACHING GUIDANCE, NOT the official IB assessment rubric. Never provide marks, completed IA prose or invented data. Assess all supplied check IDs independently, even if material is in a different section. Return JSON only: {"results":[{"id":"...","status":"complete|partial|missing|not_applicable|unverified","reason":"short evidence-grounded reason","action":"one targeted student-owned action, not a paragraph","evidence_excerpt":"short exact verbatim quote or null","source_location":"block/page label or null"}]}. Prefer unverified for images/diagrams inaccessible in text, limited source or uncertainty. A 'complete' judgement MUST quote exact visible document evidence. 'missing' requires full source and a relevant requirement; advisory preferences (word counts, source counts, tables, images) must NEVER be mandatory. Do not imply consent, ethical approval or statistical tests occurred unless documented. Different valid research designs are allowed. Explain scientific weaknesses, not just formatting. Do not repeat generic advice.`;
  let raw='';
  try {
    const response=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',headers:{'content-type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:MODEL,max_tokens:5000,temperature:0,system,messages:[{role:'user',content:userPrompt}]}),
      signal:AbortSignal.timeout(140000),
    });
    if(!response.ok){console.error('Workshop audit provider error',response.status);return reply(502,{error:'AI audit service unavailable; no partial result saved'})}
    const payload=await response.json();
    raw=(payload.content||[]).filter((c:{type:string})=>c.type==='text').map((c:{text:string})=>c.text).join('');
  }catch(e){console.error('Workshop audit call failed',e);return reply(504,{error:'Audit timed out; please retry'})}
  let parsed: {results:unknown[]};
  try{
    const cleaned=raw.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
    parsed=JSON.parse(cleaned);
    if(!Array.isArray(parsed.results))throw Error('results not array');
  }catch{return reply(502,{error:'AI audit returned an invalid response; no data saved'})}
  const found=new Map<string,Record<string,unknown>>();
  for(const item of parsed.results){
    if(!item||typeof item!=='object')continue;
    const r=item as Record<string,unknown>;
    if(typeof r.id==='string'&&!found.has(r.id))found.set(r.id,r);
  }
  const results:Result[]=requiredSection.checks.map(check=>{
    const r=found.get(check.id)||{};
    let status=allowedStatus.has(r.status as string)?r.status as string:'unverified';
    let evidence=asText(r.evidence_excerpt).trim().slice(0,320)||null;
    // Verify every cited quote directly against the extracted source; never claim resolution on a fabricated citation.
    if(evidence&&!norm(source).includes(norm(evidence)))evidence=null;
    if(status==='complete'&&!evidence)status='unverified';
    if(status==='missing'&&(sourceCompleteness!=='complete_text'||check.advisory))status='unverified';
    if(status==='not_applicable'&&!asText(r.reason).trim())status='unverified';
    return {
      id:check.id,status,
      reason:asText(r.reason).slice(0,600)||'The document evidence could not be verified.',
      question:check.question,action:asText(r.action).slice(0,500)||check.guidance,
      evidence_excerpt:evidence,
      source_location:evidence?asText(r.source_location).slice(0,120)||null:null,
      higher_band:check.higherBand||null,
    };
  });
  const {data:saved,error:saveError}=await db.from('ia_workshop_section_audits').upsert({
    submission_id,student_id:user.id,project_id:submission.project_id,section_id,
    catalogue_version:VERSION,checks:results,source_completeness:sourceCompleteness,
    model_id:MODEL,updated_at:new Date().toISOString(),
  },{onConflict:'submission_id,section_id,catalogue_version'}).select('*').single();
  if(saveError){console.error('Audit insert failed',saveError.code);return reply(500,{error:'Audit could not be saved'})}
  return reply(200,{audit:saved,cached:false});
});
