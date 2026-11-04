import {useEffect,useMemo,useState} from 'react';
import {supabase} from '../lib/supabase';
import {SEHS_OFFICIAL_CRITERIA,SEHS_WORKSHOP_SECTIONS,type WorkshopCheck} from '../lib/workshopGuide';
import './workshop-guided-review.css';
export type WorkshopFinding = {id:string;criterion_code:string;section_title:string|null;issue:string;rubric_requirement:string;specific_action:string;why:string;completion_check:string;required_elements:string[];evidence_excerpt:string|null;priority:string;finding_type:string};
export type WorkshopCriterion = {criterion:string;criterion_name:string;indicative_mark_range:[number,number]|null;criterion_max_marks:number|null};
const criterionKey=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const asWords=(s:string)=>new Set((s.toLowerCase().match(/[a-z]{4,}/g)||[]).filter(t=>!['this','that','with','from','which','should','their','there','about','review','could','would','what','were','have'].includes(t)));
function relevance(f:WorkshopFinding, check:WorkshopCheck){
 const issue=(f.issue+' '+f.rubric_requirement+' '+(f.section_title||'')+' '+f.specific_action+' '+f.required_elements.join(' ')).toLowerCase();
 let n=0;
 for(const term of check.searchTerms){if(issue.includes(term.toLowerCase()))n+=term.includes(' ')?3:2;}
 const titleTerms=asWords(check.title);for(const w of titleTerms)if(issue.includes(w))n+=1;
 return n;
}
type VerifiedResult={id:string;status:'complete'|'partial'|'missing'|'not_applicable'|'unverified';reason:string;action:string;evidence_excerpt:string|null;source_location:string|null};
type AuditRow={checks:VerifiedResult[];source_completeness:string;created_at:string};
const auditEnabled=import.meta.env.VITE_ENABLE_WORKSHOP_AUDIT!=='false';
export function WorkshopGuidedReview({findings,criteria,freePreview=false,submissionId}:{findings:WorkshopFinding[];criteria:WorkshopCriterion[];freePreview?:boolean;submissionId?:string}){
 const [sectionId,setSectionId]=useState('rq');
 const [expanded,setExpanded]=useState<string[]>([]);
 const [verified,setVerified]=useState<Record<string,AuditRow>>({});
 const [auditLoading,setAuditLoading]=useState(false);
 const [auditMessage,setAuditMessage]=useState('');
 useEffect(()=>{setVerified({});setAuditMessage('')},[submissionId]);
 useEffect(()=>{
  if(!auditEnabled||!submissionId||freePreview)return;
  let active=true;
  supabase.functions.invoke('workshop-audit',{body:{submission_id:submissionId,section_id:sectionId,action:'get'}})
   .then(({data,error})=>{if(active&&!error&&data?.audit)setVerified(prev=>({...prev,[sectionId]:data.audit as AuditRow}));})
   .catch(()=>{});
  return ()=>{active=false};
 },[sectionId,submissionId,freePreview]);
 async function runAudit(){
  if(!submissionId||auditLoading)return;
  setAuditLoading(true);setAuditMessage('');
  try {
   const {data,error}=await supabase.functions.invoke('workshop-audit',{body:{submission_id:submissionId,section_id:sectionId,action:'audit'}});
   if(error)throw error;
   if(data?.error)throw Error(String(data.error));
   if(!data?.audit)throw Error('Audit response contained no results.');
   setVerified(prev=>({...prev,[sectionId]:data.audit as AuditRow}));
  }catch(e){setAuditMessage(e instanceof Error?e.message:'Audit could not be completed.')}
  finally{setAuditLoading(false)}
 }

 const section=SEHS_WORKSHOP_SECTIONS.find(s=>s.id===sectionId)!;
 const match=useMemo(()=>{
   const matches=new Map<string,WorkshopFinding[]>();
   for(const s of SEHS_WORKSHOP_SECTIONS)for(const check of s.checks){
      const sameCriterion=findings.filter(f=>{
        const name=criterionKey(f.criterion_code||''); const idx=SEHS_OFFICIAL_CRITERIA.findIndex(c=>c.name===s.criterion);
        return name===criterionKey(s.criterion)||name===String(idx+1)||name===String.fromCharCode(65+idx).toLowerCase();
      });
      matches.set(check.id,sameCriterion.map(f=>({f,n:relevance(f,check)})).filter(x=>x.n>=3).sort((a,b)=>b.n-a.n).slice(0,3).map(x=>x.f));
   }return matches;
 },[findings]);
 const criterion=criteria.find(c=>criterionKey(c.criterion_name||'')===criterionKey(section.criterion)||criterionKey(c.criterion||'')===criterionKey(section.criterion)||SEHS_OFFICIAL_CRITERIA.findIndex(x=>x.name===section.criterion)===Number(c.criterion)-1);
 return <section className="wg-root" aria-label="Workshop guided IA review">
  <header className="wg-header"><span className="wg-kicker">SEHS 2026+ · WORKSHOP GUIDANCE</span><h2>Follow your IA, section by section</h2><p>Every workshop topic is mapped in the recommended sequence. Your original IB SEHS rubric remains unchanged. A topic appearing here is <strong>not proof it is missing from your draft</strong>: only linked findings are specific to your submission.</p></header>
  <div className="wg-rubric"><strong>Original IB SEHS criteria · 24 marks</strong><div>{SEHS_OFFICIAL_CRITERIA.map(c=><span key={c.name}>{c.name} <b>/{c.maximum}</b></span>)}</div><small>Workshop word counts, source numbers, preferred images and tables are advisory and must not automatically change marks.</small></div>
  <nav className="wg-nav" aria-label="Choose IA section">{SEHS_WORKSHOP_SECTIONS.map(s=><button key={s.id} className={s.id===sectionId?'wg-selected':''} onClick={()=>{setSectionId(s.id);setExpanded([])}} type="button"><span>{s.name}</span><small>{s.checks.length} checks</small></button>)}</nav>
  <div className="wg-section-header"><div><span className="wg-kicker">{section.criterion} · IB assessment criterion</span><h3>{section.name}</h3><p>{section.checks.length} coaching checks · relevant to your investigation where applicable</p></div>{criterion?.indicative_mark_range&&<span className="wg-mark">Existing indicative range: {criterion.indicative_mark_range.join('–')}/{criterion.criterion_max_marks??6}</span>}</div>
  {auditEnabled&&submissionId&&!freePreview&&<div className="wg-audit-actions"><p><b>Evidence audit:</b> {verified[sectionId]?'Saved, source-verified checks available.':'This section has not been audited yet.'} Each audit uses AI processing; run it only when you want to test this section.</p><button type="button" onClick={runAudit} disabled={auditLoading||Boolean(verified[sectionId])}>{auditLoading?'Auditing section…':verified[sectionId]?'Audit saved':'Audit this section'}</button>{auditMessage&&<p role="alert">{auditMessage}</p>}</div>}
  <div className="wg-checklist">{section.checks.map((check,i)=>{
    const found=match.get(check.id)||[]; const open=expanded.includes(check.id);
    const outcome=verified[sectionId]?.checks?.find(x=>x.id===check.id);
    return <article className="wg-check" key={check.id}>
    <button type="button" className="wg-check-head" onClick={()=>setExpanded(a=>a.includes(check.id)?a.filter(x=>x!==check.id):[...a,check.id])} aria-expanded={open}>
      <span className="wg-checknum">{String(i+1).padStart(2,'0')}</span><span className="wg-checktitle">{check.title}{check.advisory&&<em>Workshop advice</em>}</span><span className={'wg-status '+(found.length?'wg-attention':'wg-unverified')}>{outcome?outcome.status.replaceAll('_',' '):found.length?'Related findings':'Check in draft'}</span><span aria-hidden="true">{open?'−':'+'}</span>
    </button>
    {open&&<div className="wg-details"><div className="wg-mini"><b>Question to ask yourself</b><p>{check.question}</p></div><div className="wg-mini"><b>How to approach it</b><p>{check.guidance}</p></div><div className="wg-mini"><b>Kickstarter example (not submission text)</b><p>{check.example}</p></div>{check.higherBand&&<div className="wg-mini wg-higher"><b>Higher-band coaching focus</b><p>{check.higherBand}</p></div>}
      {outcome&&<div className="wg-evidence"><b>Evidence-audited status: {outcome.status.replaceAll('_',' ')}</b><p>{outcome.reason}</p>{outcome.evidence_excerpt&&<blockquote>Verified excerpt: {outcome.evidence_excerpt}</blockquote>}{outcome.source_location&&<p>Source location: {outcome.source_location}</p>}<p><b>Next action:</b> {outcome.action}</p></div>}
      {found.length>0?<div className="wg-evidence"><b>Relevant findings from your saved IA review</b>{found.map(f=><div key={f.id} className="wg-finding"><p><strong>{f.issue}</strong></p>{f.evidence_excerpt&&<blockquote>Evidence: {f.evidence_excerpt}</blockquote>}<p><b>Action:</b> {f.specific_action}</p><p><b>Completion check:</b> {f.completion_check}</p></div>)}</div>:!outcome&&<p className="wg-disclaimer">No reliably matched finding in the existing review. This does not establish that the requirement is satisfied or absent; check the IA itself. A backend template-by-template evidence audit is needed for verified section-level statuses.</p>}
    </div>}
    </article>;
  })}</div>
  {freePreview&&<p className="wg-disclaimer">Your free review contains limited findings. Full evidence-linked guidance remains subject to existing access permissions.</p>}
  <p className="wg-integrity">Academic integrity: these are reflection prompts and examples, not copy-ready IA paragraphs. Never claim missing diagrams, completed safety procedures or resolved issues unless evidence supports it.</p>
 </section>;
}
