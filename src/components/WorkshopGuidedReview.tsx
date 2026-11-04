import {useEffect,useMemo,useState} from 'react';
import {supabase} from '../lib/supabase';
import {SEHS_OFFICIAL_CRITERIA,SEHS_WORKSHOP_SECTIONS,type WorkshopCheck} from '../lib/workshopGuide';
import './workshop-guided-review.css';

export type WorkshopFinding={id:string;criterion_code:string;section_title:string|null;issue:string;rubric_requirement:string;specific_action:string;why:string;completion_check:string;required_elements:string[];evidence_excerpt:string|null;priority:string;finding_type:string};
export type WorkshopCriterion={criterion:string;criterion_name:string;indicative_mark_range:[number,number]|null;criterion_max_marks:number|null};
type VerifiedResult={id:string;status:'complete'|'partial'|'missing'|'not_applicable'|'unverified';reason:string;action:string;evidence_excerpt:string|null;source_location:string|null};
type AuditRow={checks:VerifiedResult[];source_completeness:string;created_at:string};
type DetailTab='action'|'learn'|'evidence';
const auditEnabled=import.meta.env.VITE_ENABLE_WORKSHOP_AUDIT!=='false';
const criterionKey=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const stop=new Set(['this','that','with','from','which','should','their','there','about','review','could','would','what','were','have']);
const asWords=(s:string)=>new Set((s.toLowerCase().match(/[a-z]{4,}/g)||[]).filter(t=>!stop.has(t)));
function relevance(f:WorkshopFinding,c:WorkshopCheck){
 const source=(f.issue+' '+f.rubric_requirement+' '+(f.section_title||'')+' '+f.specific_action+' '+(f.required_elements||[]).join(' ')).toLowerCase();
 let n=0;for(const term of c.searchTerms||[])if(source.includes(term.toLowerCase()))n+=term.includes(' ')?3:2;
 for(const word of asWords(c.title))if(source.includes(word))n++;return n;
}
function label(status?:string){
 return ({complete:'Looks complete',partial:'Needs refining',missing:'Needs attention',not_applicable:'Not applicable',unverified:'Check needed'} as Record<string,string>)[status||'']||'Not yet checked';
}
function sourceReference(location:string|null|undefined,heading:string){
 if(!location)return heading;
 const page=location.match(/\b(?:page|p\.)\s*(\d+)\b/i);
 const display=location.replace(/\bblock\s*#?\d+\b/gi,'').replace(/\b(?:paragraph|para)\s*#?\d+\b/gi,'').replace(/[,;:\s]+$/,'').trim();
 if(page)return 'Page '+page[1]+' · '+heading;
 if(!display||/^(?:section|paragraph|location|block|\d+)$/i.test(display))return heading;
 return display.toLowerCase().includes(heading.toLowerCase())?display:heading+' · '+display;
}
function extractReadable(excerpt:string|null|undefined){
 const value=(excerpt||'').replace(/\s+/g,' ').trim();
 if(!value||value.length<28)return null;
 if(/(?:\b[a-z]{1,3}|\.\.\.)$/i.test(value)&&!/[.!?]["']?$/.test(value))return null;
 return value;
}
export function WorkshopGuidedReview({findings,criteria,freePreview=false,submissionId}:{findings:WorkshopFinding[];criteria:WorkshopCriterion[];freePreview?:boolean;submissionId?:string}){
 const [sectionId,setSectionId]=useState('rq');
 const [checkId,setCheckId]=useState<string|null>(null);
 const [detailTab,setDetailTab]=useState<DetailTab>('action');
 const [verified,setVerified]=useState<Record<string,AuditRow>>({});
 const [loading,setLoading]=useState(false);
 const [message,setMessage]=useState('');
 const section=SEHS_WORKSHOP_SECTIONS.find(s=>s.id===sectionId)!;
 const selectedId=checkId&&section.checks.some(c=>c.id===checkId)?checkId:section.checks[0]?.id;
 const check=section.checks.find(c=>c.id===selectedId)||section.checks[0];
 const audit=verified[sectionId];
 const outcome=audit?.checks?.find(c=>c.id===check?.id);
 const matched=useMemo(()=>{
  const result=new Map<string,WorkshopFinding[]>();
  for(const s of SEHS_WORKSHOP_SECTIONS){
   const idx=SEHS_OFFICIAL_CRITERIA.findIndex(c=>c.name===s.criterion);
   const relevant=findings.filter(f=>{const name=criterionKey(f.criterion_code||'');return name===criterionKey(s.criterion)||name===String(idx+1)||name===String.fromCharCode(65+idx).toLowerCase()});
   for(const c of s.checks)result.set(c.id,relevant.map(f=>({f,n:relevance(f,c)})).filter(x=>x.n>=3).sort((a,b)=>b.n-a.n).slice(0,3).map(x=>x.f));
  }return result;
 },[findings]);
 const found=matched.get(check?.id||'')||[];
 const total=section.checks.length;
 const done=section.checks.filter(c=>audit?.checks?.find(x=>x.id===c.id)?.status==='complete').length;
 const checked=section.checks.filter(c=>Boolean(audit?.checks?.find(x=>x.id===c.id))).length;
 const criterion=criteria.find(c=>criterionKey(c.criterion_name||'')===criterionKey(section.criterion)||criterionKey(c.criterion||'')===criterionKey(section.criterion)||SEHS_OFFICIAL_CRITERIA.findIndex(x=>x.name===section.criterion)===Number(c.criterion)-1);
 useEffect(()=>{setVerified({});setMessage('')},[submissionId]);
 useEffect(()=>{
  if(!auditEnabled||!submissionId||freePreview)return;
  let alive=true;
  supabase.functions.invoke('workshop-audit',{body:{submission_id:submissionId,section_id:sectionId,action:'get'}})
   .then(({data,error})=>{if(alive&&!error&&data?.audit)setVerified(p=>({...p,[sectionId]:data.audit as AuditRow}));}).catch(()=>{});
  return ()=>{alive=false};
 },[sectionId,submissionId,freePreview]);
 async function runAudit(){
  if(!submissionId||loading)return;setLoading(true);setMessage('');
  try{
   const {data,error}=await supabase.functions.invoke('workshop-audit',{body:{submission_id:submissionId,section_id:sectionId,action:'audit'}});
   if(error)throw error;if(data?.error)throw Error(String(data.error));if(!data?.audit)throw Error('No audit results returned.');
   setVerified(p=>({...p,[sectionId]:data.audit as AuditRow}));
  }catch(e){setMessage(e instanceof Error?e.message:'Could not check this section. Please retry.')}finally{setLoading(false)}
 }
 function chooseSection(id:string){setSectionId(id);setCheckId(null);setDetailTab('action');setMessage('')}
 function chooseCheck(id:string){setCheckId(id);setDetailTab('action')}
 const currentIdx=section.checks.findIndex(c=>c.id===check?.id);
 const quote=extractReadable(outcome?.evidence_excerpt);
 return <section className="wg-root" aria-label="Your IA improvement coach">
  <header className="wg-header">
   <span className="wg-kicker">YOUR IA IMPROVEMENT COACH</span>
   <h2>One improvement at a time.</h2>
   <p>Work through your IA in order. Choose a topic, understand the feedback, and move to the next step when ready. Your original IB SEHS assessment remains separate.</p>
  </header>
  <div className="wg-overview">
   <div><span className="wg-kicker">YOUR CURRENT SECTION</span><h3>{section.name}</h3><p>{checked?checked+' of '+total+' checks reviewed':'Ready to review '+total+' topics'} · {done} confirmed complete</p></div>
   <div className="wg-overview-actions">
    <span className="wg-overview-count">{SEHS_WORKSHOP_SECTIONS.findIndex(s=>s.id===sectionId)+1}<small> / {SEHS_WORKSHOP_SECTIONS.length} sections</small></span>
    {auditEnabled&&submissionId&&!freePreview&&<button type="button" className="wg-primary" disabled={loading||Boolean(audit)} onClick={runAudit}>{loading?'Reviewing…':audit?'Section reviewed':'Review this section'}</button>}
   </div>
  </div>
  {message&&<div className="wg-alert" role="alert">{message}</div>}
  <nav className="wg-nav" aria-label="IA sections">
   {SEHS_WORKSHOP_SECTIONS.map((s,i)=><button key={s.id} className={s.id===sectionId?'wg-selected':''} aria-current={s.id===sectionId?'step':undefined} onClick={()=>chooseSection(s.id)} type="button"><small>{String(i+1).padStart(2,'0')}</small><span>{s.name}</span>{verified[s.id]&&<span aria-label="Reviewed">✓</span>}</button>)}
  </nav>
  <div className="wg-workspace">
   <aside className="wg-topic-list" aria-label="Topics in this section">
    <div className="wg-topic-heading"><b>{section.name}</b><span>{total} topics</span></div>
    {section.checks.map((c,i)=>{const s=audit?.checks?.find(x=>x.id===c.id)?.status;return <button type="button" key={c.id} aria-current={check?.id===c.id?'step':undefined} className={check?.id===c.id?'wg-topic-active':''} onClick={()=>chooseCheck(c.id)}>
      <span className="wg-topic-number">{String(i+1).padStart(2,'0')}</span><span className="wg-topic-name">{c.title}<small>{s?label(s):'Not yet reviewed'}</small></span><span aria-hidden="true">›</span>
     </button>})}
   </aside>
   {check&&<article className="wg-focus">
    <div className="wg-focus-top"><div><span className="wg-kicker">TOPIC {currentIdx+1} OF {total}</span><h3>{check.title}</h3></div><span className={'wg-status wg-'+(outcome?.status||'unverified')}>{label(outcome?.status)}</span></div>
    {check.advisory&&<p className="wg-advisory">Workshop recommendation — not a separate IB marking rule.</p>}
    <div className="wg-focus-summary">
     <span className="wg-eyebrow">{outcome?'WHAT YOUR REVIEW FOUND':'START HERE'}</span>
     <p>{outcome?outcome.reason:'Use the guiding question below to check your own draft. The section needs an evidence review before the app can confirm what is present or missing.'}</p>
    </div>
    <div className="wg-tabs" role="tablist" aria-label="Coaching details">
      <button role="tab" aria-selected={detailTab==='action'} type="button" onClick={()=>setDetailTab('action')} className={detailTab==='action'?'wg-tab-current':''}>What to do</button>
      <button role="tab" aria-selected={detailTab==='learn'} type="button" onClick={()=>setDetailTab('learn')} className={detailTab==='learn'?'wg-tab-current':''}>Understand it</button>
      <button role="tab" aria-selected={detailTab==='evidence'} type="button" onClick={()=>setDetailTab('evidence')} className={detailTab==='evidence'?'wg-tab-current':''}>Find in my IA</button>
    </div>
    <div className="wg-tab-panel" role="tabpanel">
     {detailTab==='action'&&<div className="wg-coach-content">
       <span className="wg-eyebrow">YOUR NEXT STEP</span><h4>{outcome?.status==='complete'?'Check that your evidence remains accurate':outcome?.action||'Check this part of your investigation'}</h4>
       <p className="wg-coach-question">{check.question}</p>
       <div className="wg-help-note"><strong>How you know it's done</strong><p>{outcome?.status==='complete'?'You can explain this choice clearly and support it with evidence from your draft.':check.guidance}</p></div>
       <button type="button" className="wg-quiet-link" onClick={()=>setDetailTab('learn')}>Need help understanding this? →</button>
      </div>}
     {detailTab==='learn'&&<div className="wg-coach-content">
       <span className="wg-eyebrow">LET'S MAKE IT CLEAR</span><h4>How to think about this</h4><p>{check.guidance}</p>
       <div className="wg-help-note"><strong>Kickstarter example — not submission text</strong><p>{check.example}</p></div>
       {check.higherBand&&<div className="wg-higher"><strong>For stronger scientific quality</strong><p>{check.higherBand}</p></div>}
      </div>}
     {detailTab==='evidence'&&<div className="wg-coach-content">
       <span className="wg-eyebrow">FIND THIS IN YOUR IA</span>
       <h4>{sourceReference(outcome?.source_location,check.title)}</h4>
       {quote?<blockquote className="wg-quote">{quote}</blockquote>:<p>{outcome?.evidence_excerpt?'The available extract is incomplete or too unclear to quote confidently. Please refer to this section in your original IA.':'No reliable short quotation is available for this check. Open your original IA and look under the related heading.'}</p>}
       {outcome&&<p className="wg-muted">The audit identifies relevant text, but always check the original document before making a change.</p>}
       {found.length>0&&<details className="wg-previous"><summary>View related findings from your original IA review ({found.length})</summary>{found.map(f=><div key={f.id}><p><b>Concern:</b> {f.issue}</p><p><b>Action:</b> {f.specific_action}</p><p><b>Completion check:</b> {f.completion_check}</p></div>)}</details>}
       {!outcome&&!found.length&&<p className="wg-muted">No reliably matched review finding yet. This does not establish that the topic is correct or missing.</p>}
      </div>}
    </div>
    <footer className="wg-focus-footer"><button type="button" className="wg-prev" disabled={currentIdx===0} onClick={()=>chooseCheck(section.checks[currentIdx-1].id)}>← Previous</button><span>{currentIdx+1} / {total}</span><button type="button" className="wg-primary" onClick={()=>{if(currentIdx<total-1)chooseCheck(section.checks[currentIdx+1].id);else{const ix=SEHS_WORKSHOP_SECTIONS.findIndex(s=>s.id===sectionId);if(ix<SEHS_WORKSHOP_SECTIONS.length-1)chooseSection(SEHS_WORKSHOP_SECTIONS[ix+1].id)}}} disabled={currentIdx===total-1&&sectionId===SEHS_WORKSHOP_SECTIONS[SEHS_WORKSHOP_SECTIONS.length-1].id}>{currentIdx===total-1?'Next section →':'Next topic →'}</button></footer>
   </article>}
  </div>
  <details className="wg-rubric"><summary>View original IB SEHS assessment criteria (24 marks)</summary><div>{SEHS_OFFICIAL_CRITERIA.map(c=><span key={c.name}>{c.name} <b>/{c.maximum}</b></span>)}</div><p>These are the official assessment areas. Workshop suggestions support learning but do not replace rubric descriptors.</p>{criterion?.indicative_mark_range&&<p>Existing indicative range for {section.criterion}: {criterion.indicative_mark_range.join('–')}/{criterion.criterion_max_marks??6}</p>}</details>
  {freePreview&&<p className="wg-muted">Your free review contains limited findings. Additional feedback follows your existing account permissions.</p>}
  <p className="wg-integrity">Your investigation remains your own. Use questions and examples to guide decisions, not as finished text to submit.</p>
 </section>;
}
