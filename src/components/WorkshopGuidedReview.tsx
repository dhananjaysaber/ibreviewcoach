import {useEffect,useMemo,useState} from 'react';
import {supabase} from '../lib/supabase';
import {SEHS_OFFICIAL_CRITERIA,SEHS_WORKSHOP_SECTIONS,type WorkshopCheck} from '../lib/workshopGuide';
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

 function chooseSection(id:string){setSectionId(id);setMessage('')}
 const sectionNo=SEHS_WORKSHOP_SECTIONS.findIndex(x=>x.id===sectionId)+1;
 const nextSection=SEHS_WORKSHOP_SECTIONS[sectionNo]||null;
 const highCount=issues.filter(x=>x.finding.priority==='high').length;
 const doneCount=issues.filter(x=>done.has(x.finding.id)).length;
 const auditChecks=audit?.checks||[];
 const addressed=auditChecks.filter(c=>c.status==='complete').length;
 const pageHit=auditChecks.map(c=>(c.source_location||'').match(/\b(?:page|p\.)\s*(\d+)/i)).find(Boolean);
 const status=audit?(addressed===section.checks.length?{t:'Addressed',k:'good'}:{t:'Needs refining',k:'warn'}):!issues.length&&strengths.length?{t:'Looking strong',k:'good'}:highCount?{t:'Needs work',k:'bad'}:issues.length?{t:'Needs refining',k:'warn'}:{t:'Not yet reviewed',k:'idle'};
 const templateChecks=(()=>{const seen=new Set<string>();const list:WorkshopCheck[]=[];for(const x of issues){if(x.check&&!seen.has(x.check.id)){seen.add(x.check.id);list.push(x.check)}}return (list.length?list:section.checks).slice(0,3)})();
 const todo=(()=>{const seen=new Set<string>();const out:string[]=[];for(const x of issues)for(const el of x.finding.required_elements||[]){const k=el.trim();if(k&&!seen.has(k.toLowerCase())){seen.add(k.toLowerCase());out.push(k)}}return out})();
 const whys=Array.from(new Set(issues.map(x=>x.finding.why).filter(Boolean))).slice(0,2);
 const quoteOf=(x:EnrichedFinding)=>{const q=meaningfulExcerpt(x.finding.evidence_excerpt)||(x.finding.evidence_excerpt||'').replace(/\s+/g,' ').trim();return q.length>340?q.slice(0,337)+'…':q};
 const nextAfterDone=nextSection?()=>chooseSection(nextSection.id):undefined;
 return <section className="wg2 sx" aria-label="IA section guide">
  <header className="sx-hero">
   <div><span className="sx-eyebrow">Section guide · IB SEHS</span><h2>Your IA, one section at a time</h2><p>Each section shows what your review found in your own words, why it matters under the IB rubric and the workshop template, what is missing, and the steps to take.</p></div>
   <div className="sx-hero-actions">
    {!freePreview&&<button className="sx-btn" type="button" onClick={()=>{const html=buildTemplateReportHtml({label:'Your IA',filename:'Your IA',findings,criteria});const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='SEHS-template-report.html';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000)}}>Download template report</button>}
    {onOpenAnnotatedIa&&<button className="sx-btn sx-btn-primary" type="button" onClick={onOpenAnnotatedIa}>Open annotated document ↗</button>}
   </div>
  </header>
  {!freePreview&&submissionId&&<PolicyFlagsStrip submissionId={submissionId}/>}
  <nav className="sx-nav" aria-label="IA report sections">{SEHS_WORKSHOP_SECTIONS.map((s,i)=>{
   const count=mapped.filter(x=>x.sectionId===s.id&&x.finding.finding_type!=='strength').length;
   return <button key={s.id} type="button" onClick={()=>chooseSection(s.id)} aria-current={s.id===sectionId?'true':undefined} className={s.id===sectionId?'sx-nav-active':''}><span>{String(i+1).padStart(2,'0')}</span>{s.name.replace(/^\d+\s*[·.\-]\s*/,'')}{count>0&&<b>{count}</b>}</button>;
  })}</nav>

  <article className="sx-card">
   <header className="sx-head">
    <div><span className="sx-eyebrow">{section.criterion} · Section {sectionNo} of {SEHS_WORKSHOP_SECTIONS.length}{pageHit?' · Page '+pageHit[1]:''}</span><h3>{section.name.replace(/^\d+\s*[·.\-]\s*/,'')}</h3></div>
    <div className="sx-head-side"><span className={'sx-chip sx-chip-'+status.k}>{status.t}</span>
     {official?.indicative_mark_range&&<small>Indicative IB range {official.indicative_mark_range.join('–')} of {official.criterion_max_marks??6} for {section.criterion}</small>}
     <small>{audit?addressed+' of '+section.checks.length+' checks addressed':issues.length+' improvement'+(issues.length===1?'':'s')+' found'}</small></div>
   </header>

   <section className="sx-block">
    <h4><i>1</i>What we found in your IA</h4>
    {issues.length>0?issues.map(x=><div className="sx-found" key={x.finding.id}>
      {quoteOf(x)?<blockquote><span>From your draft</span>{quoteOf(x)}</blockquote>:<div className="sx-noquote">No exact passage was saved for this point. Check the original at the matching heading.</div>}
      <p>{x.finding.issue}</p></div>)
     :auditChecks.some(c=>c.evidence_excerpt)?auditChecks.filter(c=>c.evidence_excerpt).slice(0,3).map(c=><div className="sx-found" key={c.id}><blockquote><span>From your draft</span>{meaningfulExcerpt(c.evidence_excerpt)||c.evidence_excerpt}</blockquote><p>{c.reason}</p></div>)
     :<p className="sx-muted">No specific findings are mapped to this section. That does not mean it is complete. Run the check below to compare it against the full template.</p>}
    {strengths.length>0&&<div className="sx-strengths"><strong>Doing well</strong>{strengths.map(x=><p key={x.finding.id}>{x.finding.issue}</p>)}</div>}
   </section>

   <section className="sx-block">
    <h4><i>2</i>Why it matters</h4>
    <div className="sx-two">
     <div className="sx-pane sx-pane-ib"><span className="sx-eyebrow">IB rubric · {view?.criterion||section.criterion}</span>
      {view?.currentBand?<><p><b>Where your draft sits (band {view.currentBand.band}):</b> {view.currentBand.text}</p>{view.nextBand&&<p><b>To reach band {view.nextBand.band}:</b> {view.nextBand.text}</p>}</>:<p>{issues[0]?.finding.rubric_requirement||'The IB rubric wording appears once a finding is mapped to this section.'}</p>}
      <small>Only the IB criteria decide your band.</small></div>
     <div className="sx-pane sx-pane-tpl"><span className="sx-eyebrow">Workshop template</span>
      {templateChecks.map(c=><p key={c.id}><b>{c.title}:</b> {c.question}{c.higherBand?<> <em>Stronger: {c.higherBand}</em></>:null}</p>)}
      <small>Coaching advice from the template. It never changes your band.</small></div>
    </div>
    {whys.map((w,i)=><p className="sx-why" key={i}>{w}</p>)}
   </section>

   <section className="sx-block">
    <h4><i>3</i>What is missing</h4>
    <ul className="sx-checks">
     {auditChecks.length>0?section.checks.map(c=>{const r=auditChecks.find(x=>x.id===c.id);const k=r?.status==='complete'?'ok':r?.status==='partial'?'part':r?'no':'idle';return <li key={c.id} className={'sx-check-'+k}><span aria-hidden="true">{k==='ok'?'✓':k==='part'?'~':k==='no'?'✕':'•'}</span><div><strong>{c.title}</strong><small>{r?friendlyStatus(r.status)+(r.reason?' · '+r.reason:''):'Not audited'}</small></div></li>})
      :todo.length>0?todo.map((t,i)=><li key={i} className="sx-check-no"><span aria-hidden="true">✕</span><div><strong>{t}</strong></div></li>)
      :section.checks.map(c=><li key={c.id} className="sx-check-idle"><span aria-hidden="true">•</span><div><strong>{c.title}</strong><small>Not audited yet</small></div></li>)}
    </ul>
    {auditEnabled&&submissionId&&!freePreview&&<button className="sx-btn" type="button" onClick={auditSection} disabled={loading||Boolean(audit)}>{loading?'Checking…':audit?'Full template check saved':'Check this section against the full template'}</button>}
    {message&&<p role="alert" className="sx-error">{message}</p>}
   </section>

   <section className="sx-block sx-reco">
    <h4><i>4</i>What to do next</h4>
    {issues.length>0?<ol>{issues.map(x=><li key={x.finding.id} className={done.has(x.finding.id)?'sx-done':''}>
      <label>{!freePreview&&submissionId?<input type="checkbox" checked={done.has(x.finding.id)} onChange={()=>void toggleDone(x.finding.id)}/>:<span className="sx-dot"/>}<span><strong>{x.finding.specific_action}</strong>
       {x.finding.completion_check&&<small>You'll know it's fixed when: {x.finding.completion_check}</small>}</span></label></li>)}</ol>
     :<p className="sx-muted">No steps for this section yet.</p>}
    {!freePreview&&submissionId&&issues.length>0&&<p className="sx-progress">{doneCount} of {issues.length} steps ticked. Ticking is your own note and does not change your band.</p>}
    {progressMsg&&<p role="alert" className="sx-error">{progressMsg}</p>}
    <p className="sx-promise">You write the changes. The coach never writes your text. Examples elsewhere are for understanding only.</p>
   </section>

   <footer className="sx-foot">
    <button className="sx-btn" type="button" disabled={sectionNo<=1} onClick={()=>chooseSection(SEHS_WORKSHOP_SECTIONS[sectionNo-2].id)}>← Previous section</button>
    {onOpenAnnotatedIa&&<button className="sx-btn" type="button" onClick={onOpenAnnotatedIa}>See it on the annotated IA ↗</button>}
    <button className="sx-btn sx-btn-primary" type="button" disabled={!nextAfterDone} onClick={nextAfterDone}>{nextSection?'Next: '+nextSection.name.replace(/^\d+\s*[·.\-]\s*/,'')+' →':'Last section'}</button>
   </footer>
  </article>
  <details className="sx-more"><summary>Original IB SEHS assessment rubric · 24 marks</summary><div className="sx-rubric">{SEHS_OFFICIAL_CRITERIA.map(c=><p key={c.name}>{c.name} · {c.maximum} marks</p>)}</div></details>
  <p className="sx-note">Feedback helps you revise your own IA. Each finding comes from the saved review, so check its relevance against your document.</p>
 </section>;
}
