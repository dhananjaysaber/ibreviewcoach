import {useEffect,useMemo,useState} from 'react';
import {supabase} from '../lib/supabase';
import {SEHS_WORKSHOP_SECTIONS,type WorkshopCheck} from '../lib/workshopGuide';
import {rubricView} from '../lib/ibRubric';
import {PolicyFlagsStrip} from './PolicyFlagsStrip';
import {buildTemplateReportHtml} from '../lib/compareIas';
import './workshop-guided-review.css';
import './section-cards.css';

export type {WorkshopFinding,WorkshopCriterion} from '../lib/sectionMap';
import {sectionFor,type EnrichedFinding,type WorkshopFinding,type WorkshopCriterion} from '../lib/sectionMap';
type VerifiedResult={id:string;status:'complete'|'partial'|'missing'|'not_applicable'|'unverified';reason:string;action:string;evidence_excerpt:string|null;source_location:string|null};
type AuditRow={checks:VerifiedResult[];source_completeness:string;created_at:string};
export const norm=(s:string)=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
type PlanView={goal:string;why:string;steps:string[];example:string;done_when:string};
const auditEnabled=import.meta.env.VITE_ENABLE_WORKSHOP_AUDIT!=='false';
const friendlyStatus=(s:string)=>({complete:'Addressed',partial:'Needs refining',missing:'Missing evidence',not_applicable:'Not applicable',unverified:'Needs verification'} as Record<string,string>)[s]||'Review';
const meaningfulExcerpt=(s:string|null)=>{const x=(s||'').replace(/\s+/g,' ').trim();return x.length>=25&&!/(\.\.\.|…)$/.test(x)?x:null;};
export function WorkshopGuidedReview({findings,criteria,freePreview=false,submissionId,onOpenAnnotatedIa}:{findings:WorkshopFinding[];criteria:WorkshopCriterion[];freePreview?:boolean;submissionId?:string;onOpenAnnotatedIa?:()=>void}){
 const [sectionId,setSectionId]=useState(SEHS_WORKSHOP_SECTIONS[0].id);
 const [verified,setVerified]=useState<Record<string,AuditRow>>({});
 const [loading,setLoading]=useState(false);
 const [message,setMessage]=useState('');
 const [done,setDone]=useState<Set<string>>(new Set());
 const [progressMsg,setProgressMsg]=useState('');
 const [plans,setPlans]=useState<Record<string,PlanView>>({});
 const [plansReady,setPlansReady]=useState(false);
 const [planBusy,setPlanBusy]=useState(false);
 const [planMsg,setPlanMsg]=useState('');
 const mapped=useMemo(()=>findings.map(sectionFor),[findings]);
 const section=SEHS_WORKSHOP_SECTIONS.find(s=>s.id===sectionId)!;
 const issues=mapped.filter(x=>x.sectionId===sectionId&&x.finding.finding_type!=='strength');
 const strengths=mapped.filter(x=>x.sectionId===sectionId&&x.finding.finding_type==='strength');
 const audit=verified[sectionId];
 const view=rubricView(section.criterion,criteria.find(x=>norm(x.criterion_name)===norm(section.criterion)||norm(x.criterion)===norm(section.criterion))?.indicative_mark_range??null);
 const official=criteria.find(x=>norm(x.criterion_name)===norm(section.criterion)||norm(x.criterion)===norm(section.criterion));
 useEffect(()=>{setVerified({});setMessage('')},[submissionId]);
 useEffect(()=>{
  if(freePreview||!submissionId||!findings.length){setDone(new Set());return;}
  let live=true;
  supabase.from('ia_finding_progress').select('finding_id').in('finding_id',findings.map(f=>f.id)).then(({data,error})=>{
   if(live&&!error&&Array.isArray(data))setDone(new Set(data.map((r:{finding_id:string})=>r.finding_id)));
  });
  return ()=>{live=false};
 },[findings,freePreview,submissionId]);
 useEffect(()=>{
  setPlans({});setPlansReady(false);
  if(freePreview||!submissionId||!findings.length)return;
  let live=true;
  supabase.from('ia_action_plans').select('finding_id,plan').in('finding_id',findings.map(f=>f.id)).then(({data,error})=>{
   if(!live||error||!Array.isArray(data))return;
   const m:Record<string,PlanView>={};
   for(const r of data as {finding_id:string;plan:PlanView}[])if(r.plan&&Array.isArray(r.plan.steps))m[r.finding_id]=r.plan;
   setPlans(m);setPlansReady(true);
  });
  return ()=>{live=false};
 },[findings,freePreview,submissionId]);
 async function makePlans(ids:string[]){
  if(!submissionId||planBusy||!ids.length)return;
  setPlanBusy(true);setPlanMsg('');
  try{
   const {data,error}=await supabase.functions.invoke('action-plan',{body:{submission_id:submissionId,action:'generate',finding_ids:ids.slice(0,30)}});
   if(error)throw error;if(data?.error)throw Error(String(data.error));
   const m:Record<string,PlanView>={};
   for(const [k,v] of Object.entries((data?.plans||{}) as Record<string,PlanView>))if(v&&Array.isArray(v.steps))m[k]=v;
   setPlans(old=>({...old,...m}));
  }catch(e){setPlanMsg(e instanceof Error?e.message:'The plan could not be made right now. Try again.')}finally{setPlanBusy(false)}
 }
 async function toggleDone(id:string){
  if(freePreview||!submissionId)return;
  setProgressMsg('');
  const wasDone=done.has(id);
  setDone(old=>{const n=new Set(old);if(wasDone)n.delete(id);else n.add(id);return n;});
  const {data:{user}}=await supabase.auth.getUser();
  const res=!user?{error:Error('Sign in again to save progress.')}:wasDone
   ?await supabase.from('ia_finding_progress').delete().eq('finding_id',id).eq('student_id',user.id)
   :await supabase.from('ia_finding_progress').insert({finding_id:id,student_id:user.id});
  if(res.error){
   setDone(old=>{const n=new Set(old);if(wasDone)n.add(id);else n.delete(id);return n;});
   setProgressMsg('Your progress could not be saved right now. Please try again.');
  }
 }
 useEffect(()=>{
  if(!auditEnabled||!submissionId||freePreview)return;
  let mounted=true;
  supabase.functions.invoke('workshop-audit',{body:{submission_id:submissionId,section_id:sectionId,action:'get'}}).then(({data,error})=>{
   if(mounted&&!error&&data?.audit)setVerified(old=>({...old,[sectionId]:data.audit as AuditRow}));
  }).catch(()=>{});
  return ()=>{mounted=false};
 },[submissionId,sectionId,freePreview]);
 async function auditSection(){
  if(!submissionId||loading)return;
  setLoading(true);setMessage('');
  try{
   const {data,error}=await supabase.functions.invoke('workshop-audit',{body:{submission_id:submissionId,section_id:sectionId,action:'audit'}});
   if(error)throw error;if(data?.error)throw Error(String(data.error));if(!data?.audit)throw Error('No audit results returned.');
   setVerified(old=>({...old,[sectionId]:data.audit as AuditRow}));
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to audit this section.')}finally{setLoading(false)}
 }


 function chooseSection(id:string){setSectionId(id);setMessage('');setPlanMsg('')}
 const sectionNo=SEHS_WORKSHOP_SECTIONS.findIndex(x=>x.id===sectionId)+1;
 const nextSection=SEHS_WORKSHOP_SECTIONS[sectionNo]||null;
 const highCount=issues.filter(x=>x.finding.priority==='high').length;
 const doneCount=issues.filter(x=>done.has(x.finding.id)).length;
 const auditChecks=audit?.checks||[];
 const addressed=auditChecks.filter(c=>c.status==='complete').length;
 const pageHit=auditChecks.map(c=>(c.source_location||'').match(/\b(?:page|p\.)\s*(\d+)/i)).find(Boolean);
 const status=audit?(addressed===section.checks.length?{t:'Addressed',k:'good'}:{t:'Needs refining',k:'warn'}):!issues.length&&strengths.length?{t:'Looking strong',k:'good'}:highCount?{t:'Needs work',k:'bad'}:issues.length?{t:'Needs refining',k:'warn'}:{t:'Not yet reviewed',k:'idle'};
 const templateChecks=(()=>{const seen=new Set<string>();const list:WorkshopCheck[]=[];for(const x of issues){if(x.check&&!seen.has(x.check.id)){seen.add(x.check.id);list.push(x.check)}}return (list.length?list:section.checks).slice(0,3)})();
 const quoteOf=(x:EnrichedFinding)=>{const q=meaningfulExcerpt(x.finding.evidence_excerpt)||(x.finding.evidence_excerpt||'').replace(/\s+/g,' ').trim();return q.length>340?q.slice(0,337)+'…':q};
 const short=(t:string,n=120)=>{const x=t.replace(/\s+/g,' ').trim();return x.length>n?x.slice(0,n-1).trimEnd()+'…':x};
 const goodRows=[
  ...strengths.map(x=>({key:x.finding.id,title:short(x.finding.section_title||x.check?.title||'Doing well',70),text:x.finding.issue,quote:quoteOf(x)})),
  ...auditChecks.filter(c=>c.status==='complete').map(c=>{const meta=section.checks.find(m=>m.id===c.id);return {key:'a-'+c.id,title:meta?.title||'Addressed',text:c.reason,quote:meaningfulExcerpt(c.evidence_excerpt)||''}}),
 ];
 const needPlan=issues.filter(x=>!plans[x.finding.id]).map(x=>x.finding.id);
 const doneTotal=issues.length;
 return <section className="wg2 sx" aria-label="IA section guide">
  <header className="sx-hero">
   <div><span className="sx-eyebrow">Section guide · IB SEHS</span><h2>Fix what is on screen, one section at a time</h2><p>Red items need work. Green ticks are done well. Tap any row to open it.</p></div>
   <div className="sx-hero-actions">
    {!freePreview&&<button className="sx-btn" type="button" onClick={()=>{const html=buildTemplateReportHtml({label:'Your IA',filename:'Your IA',findings,criteria});const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='SEHS-template-report.html';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000)}}>Download Ideal IA template report</button>}
    {onOpenAnnotatedIa&&<button className="sx-btn sx-btn-primary" type="button" onClick={onOpenAnnotatedIa}>Open annotated document ↗</button>}
   </div>
  </header>
  {!freePreview&&submissionId&&<PolicyFlagsStrip submissionId={submissionId}/>}
  <nav className="sx-nav" aria-label="IA report sections">{SEHS_WORKSHOP_SECTIONS.map((s,i)=>{
   const list=mapped.filter(x=>x.sectionId===s.id&&x.finding.finding_type!=='strength');
   const left=list.filter(x=>!done.has(x.finding.id)).length;
   return <button key={s.id} type="button" onClick={()=>chooseSection(s.id)} aria-current={s.id===sectionId?'true':undefined} className={s.id===sectionId?'sx-nav-active':''}><span>{String(i+1).padStart(2,'0')}</span>{s.name.replace(/^\d+\s*[·.\-]\s*/,'')}{list.length>0?(left>0?<b>{left}</b>:<b className="sx-nav-ok">✓</b>):null}</button>;
  })}</nav>

  <article className="sx-card">
   <header className="sx-head">
    <div><span className="sx-eyebrow">{section.criterion} · Section {sectionNo} of {SEHS_WORKSHOP_SECTIONS.length}{pageHit?' · Page '+pageHit[1]:''}</span><h3>{section.name.replace(/^\d+\s*[·.\-]\s*/,'')}</h3></div>
    <div className="sx-head-side"><span className={'sx-chip sx-chip-'+status.k}>{status.t}</span>
     {official?.indicative_mark_range&&<small>Indicative IB range {official.indicative_mark_range.join('–')} of {official.criterion_max_marks??6} for {section.criterion}</small>}
     <small>{doneTotal>0?doneCount+' of '+doneTotal+' fixes ticked':'Nothing to fix here yet'}</small></div>
   </header>

   <section className="sx-block">
    <div className="sx-group-head"><h4><span className="sx-mark sx-mark-todo">!</span>Fix these{issues.length>0?' ('+(issues.length-doneCount)+' left)':''}</h4>
     {plansReady&&needPlan.length>0&&!freePreview&&<button className="sx-btn" type="button" onClick={()=>void makePlans(needPlan)} disabled={planBusy}>{planBusy?'Making your plan…':'Make a clear step-by-step plan'}</button>}</div>
    {planMsg&&<p role="alert" className="sx-error">{planMsg}</p>}
    {issues.length===0&&<p className="sx-muted">{auditChecks.length?'Nothing flagged here. Open the green items below to see why.':'No specific problems are mapped to this section. That does not mean it is perfect. Open the full check at the bottom to compare it with the Ideal IA template.'}</p>}
    {issues.map(x=>{const f=x.finding;const pl=plans[f.id];const isDone=done.has(f.id);const quote=quoteOf(x);const example=pl?.example||x.check?.example||'';
     return <details key={f.id} className={'sx-row '+(isDone?'sx-row-done':'sx-row-todo')}>
      <summary><span className={'sx-mark '+(isDone?'sx-mark-ok':'sx-mark-todo')} aria-hidden="true">{isDone?'✓':'!'}</span>
       <span className="sx-row-title"><strong>{pl?.goal||x.check?.title||f.section_title||'Improvement'}</strong><small>{short(f.issue)}</small></span>
       <span className={'sx-pri sx-pri-'+f.priority}>{f.priority==='high'?'Important':f.priority==='medium'?'Worth fixing':'Small fix'}</span><i className="sx-caret" aria-hidden="true"/></summary>
      <div className="sx-row-body">
       {quote?<blockquote><span>From your draft</span>{quote}</blockquote>:null}
       <h5>What is missing</h5><p>{f.issue}</p>
       <h5>Why it matters</h5><p>{pl?.why||f.why||f.rubric_requirement}</p>
       <h5>Your plan</h5>
       {pl?<ol className="sx-steps">{pl.steps.map((st,i)=><li key={i}>{st}</li>)}</ol>:<p>{f.specific_action}</p>}
       {example&&<div className="sx-example"><span>Example to help you understand. It is not text for your IA.</span><p>{example}</p></div>}
       <h5>You are done when</h5><p>{pl?.done_when||f.completion_check}</p>
       {f.required_elements?.length>0&&<div className="sx-chips">{f.required_elements.map((el,i)=><span key={i}>{el}</span>)}</div>}
       {!freePreview&&submissionId&&<label className="sx-tick"><input type="checkbox" checked={isDone} onChange={()=>void toggleDone(f.id)}/> I have fixed this in my draft</label>}
      </div>
     </details>})}
    {progressMsg&&<p role="alert" className="sx-error">{progressMsg}</p>}
    {!freePreview&&submissionId&&issues.length>0&&<p className="sx-promise">Ticking is your own note and does not change your band. You write the changes; the coach never writes your text.</p>}
   </section>

   {goodRows.length>0&&<section className="sx-block">
    <div className="sx-group-head"><h4><span className="sx-mark sx-mark-ok">✓</span>Done well ({goodRows.length})</h4></div>
    {goodRows.map(g=><details key={g.key} className="sx-row sx-row-good"><summary><span className="sx-mark sx-mark-ok" aria-hidden="true">✓</span><span className="sx-row-title"><strong>{g.title}</strong><small>{short(g.text,110)}</small></span><i className="sx-caret" aria-hidden="true"/></summary>
     <div className="sx-row-body">{g.quote?<blockquote><span>From your draft</span>{g.quote}</blockquote>:null}<p>{g.text}</p></div></details>)}
   </section>}

   <section className="sx-block">
    <details className="sx-ref"><summary>IB rubric and Ideal IA template for this section</summary>
     <div className="sx-two">
      <div className="sx-pane sx-pane-ib"><span className="sx-eyebrow">IB rubric · {view?.criterion||section.criterion}</span>
       {view?.currentBand?<><p><b>Where your draft sits (band {view.currentBand.band}):</b> {view.currentBand.text}</p>{view.nextBand&&<p><b>To reach band {view.nextBand.band}:</b> {view.nextBand.text}</p>}</>:<p>{issues[0]?.finding.rubric_requirement||'The IB rubric wording appears once a finding is mapped to this section.'}</p>}
       <small>Only the IB criteria decide your band.</small></div>
      <div className="sx-pane sx-pane-tpl"><span className="sx-eyebrow">Ideal IA template</span>
       {templateChecks.map(c=><p key={c.id}><b>{c.title}:</b> {c.question}{c.higherBand?<> <em>Stronger: {c.higherBand}</em></>:null}</p>)}
       <small>Coaching advice from the template. It never changes your band.</small></div>
     </div>
     {auditChecks.length>0&&<ul className="sx-checks">{section.checks.map(c=>{const r=auditChecks.find(y=>y.id===c.id);const k=r?.status==='complete'?'ok':r?.status==='partial'?'part':r?'no':'idle';return <li key={c.id} className={'sx-check-'+k}><span aria-hidden="true">{k==='ok'?'✓':k==='part'?'~':k==='no'?'✕':'•'}</span><div><strong>{c.title}</strong><small>{r?friendlyStatus(r.status)+(r.reason?' · '+r.reason:''):'Not audited'}</small></div></li>})}</ul>}
     {auditEnabled&&submissionId&&!freePreview&&<button className="sx-btn" type="button" onClick={auditSection} disabled={loading||Boolean(audit)}>{loading?'Checking…':audit?'Full template check saved':'Check this section against the full Ideal IA template'}</button>}
     {message&&<p role="alert" className="sx-error">{message}</p>}
    </details>
   </section>

   <footer className="sx-foot">
    <button className="sx-btn" type="button" disabled={sectionNo<=1} onClick={()=>chooseSection(SEHS_WORKSHOP_SECTIONS[sectionNo-2].id)}>← Previous section</button>
    {onOpenAnnotatedIa&&<button className="sx-btn" type="button" onClick={onOpenAnnotatedIa}>See it on the annotated IA ↗</button>}
    <button className="sx-btn sx-btn-primary" type="button" disabled={!nextSection} onClick={()=>nextSection&&chooseSection(nextSection.id)}>{nextSection?'Next: '+nextSection.name.replace(/^\d+\s*[·.\-]\s*/,'')+' →':'Last section'}</button>
   </footer>
  </article>
  <p className="sx-note">Feedback helps you revise your own IA. Each finding comes from the saved review, so check its relevance against your document.</p>
 </section>;
}
