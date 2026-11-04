import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
const port=45000+Math.floor(Math.random()*1000);
const server=spawn(process.execPath,['server/local-lab.mjs'],{env:{...process.env,LOCAL_LAB_PORT:String(port),ANTHROPIC_API_KEY:'',NODE_ENV:'test',LOCAL_LAB_E2E_STUB:'1'},stdio:['ignore','pipe','pipe']});
const base=`http://127.0.0.1:${port}/api/local-lab`;
const wait=()=>new Promise(r=>setTimeout(r,100));
async function request(path,body){const res=await fetch(base+path,{method:body?'POST':'GET',headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json()}}
async function start(){let last;for(let i=0;i<45;i++){try{return await request('/health')}catch(e){last=e;await wait()}}throw last}
const toBase=s=>Buffer.from(s).toString('base64');
let ids=[];
try{
 const health=await start();assert.equal(health.data.ok,true);assert.equal(health.data.catalogue_checks,43);
 const meta=await request('/meta');assert.equal(meta.data.catalogue.sections.length,9);assert.equal(meta.data.rubric.criteria.length,4);assert.equal(meta.data.rubric.total_marks,24);
 const text=('Research question: Does different footwear affect sprint speed of adolescent athletes? Participant groups completed a warm-up before a timed sprint test.\n').repeat(6);
 const project='LOCAL QA '+crypto.randomUUID(),student='Test Anonymous';
 for(let version=1;version<=2;version++){
  const r=await request('/upload',{project,student,filename:'test.txt',base64:toBase(text+` Draft ${version}`)});
  assert.equal(r.status,200,r.data.error);assert.equal(r.data.review.version,version);ids.push(r.data.review.id);
 }
 const compare=await request('/compare',{old_id:ids[0],new_id:ids[1]});assert.equal(compare.status,200);assert.equal(compare.data.rows.length,0);
 const review=await request(`/reviews/${ids[0]}`);assert.equal(review.status,200);assert.equal(review.data.review.text,undefined);
 for(const id of ids){for(const s of meta.data.catalogue.sections){const result=await request(`/reviews/${id}/audit`,{section_id:s.id});assert.equal(result.status,200,result.data.error);assert.equal(result.data.results.length,s.checks.length)}const grade=await request(`/reviews/${id}/rubric`,{});assert.equal(grade.status,200,grade.data.error);assert.equal(grade.data.rubric.criteria.length,4)}
 const verified=await request('/compare',{old_id:ids[0],new_id:ids[1]});assert.equal(verified.status,200);assert.equal(verified.data.rows.length,43);assert.equal(verified.data.summary.still_demonstrated,43);
 console.log('PASS — 43 mapped checks, 9 sections, 4 original rubric criteria, 2 draft uploads, local persistence, comparisons, synthetic contract-test of 43 section results, 4 rubric scores, privacy. Real AI requests still require your own Anthropic key.');
}finally{for(const id of ids){try{await request('/delete',{id})}catch{}}server.kill('SIGTERM')}
