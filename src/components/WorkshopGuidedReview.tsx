import {useEffect,useMemo,useState} from 'react';
import {supabase} from '../lib/supabase';
import {SEHS_OFFICIAL_CRITERIA,SEHS_WORKSHOP_SECTIONS,type WorkshopCheck} from '../lib/workshopGuide';
import './workshop-guided-review.css';

export type WorkshopFinding={id:string;criterion_code:string;section_title:string|null;issue:string;rubric_requirement:string;specific_action:string;why:string;completion_check:string;required_elements:string[];evidence_excerpt:string|null;priority:string;finding_type:string};
export type WorkshopCriterion={criterion:string;criterion_name:string;indicative_mark_range:[number,number]|null;criterion_max_marks:number|null};
type VerifiedResult={id:string;status:'complete'|'partial'|'missing'|'not_applicable'|'unverified';reason:string;action:string;evidence_excerpt:string|null;source_location:string|null};
type AuditRow={checks:VerifiedResult[];source_completeness:string;created_at:string};
type EnrichedFinding={finding:WorkshopFinding;sectionId:string;check:WorkshopCheck|null};
const norm=(s:string)=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const words=(s:string)=>(String(s||'').toLowerCase().match(/[a-z]{4,}/g)||[]).filter(x=>!['this','that','with','from','should','which','their','there','review','could','would','have','more','what','than','into','using','your'].includes(x));
const auditEnabled=import.meta.env.VITE_ENABLE_WORKSHOP_AUDIT!=='false';
const friendlyStatus=(s:string)=>({complete:'Addressed',partial:'Needs refining',missing:'Missing evidence',not_applicable:'Not applicable',unverified:'Needs verification'} as Record<string,string>)[s]||'Review';
const meaningfulExcerpt=(s:string|null)=>{const x=(s||'').replace(/\s+/g,' ').trim();return x.length>=25&&!/(\.\.\.|…)$/.test(x)?x:null;};
function sectionFor(f:WorkshopFinding):EnrichedFinding{
 const group=norm(f.criterion_code);const target=(f.section_title||'').toLowerCase();
 const relevantSections=SEHS_WORKSHOP_SECTIONS.filter(s=>{
  const idx=SEHS_OFFICIAL_CRITERIA.findIndex(c=>norm(c.name)===norm(s.criterion));
  return group===norm(s.criterion)||group===String(idx+1)||group===String.fromCharCode(65+idx).toLowerCase();
 });
 const candidates=relevantSections.length?relevantSections:SEHS_WORKSHOP_SECTIONS;
 let best:{sectionId:string;check:WorkshopCheck|null;score:number}={sectionId:candidates[0]?.id||'rq',check:null,score:-1};
 const material=[f.issue,f.rubric_requirement,f.specific_action,(f.required_elements||[]).join(' '),target].join(' ').toLowerCase();
 for(const s of candidates){
  const sectionName=s.name.toLowerCase().replace(/^\d+\s*[·.\-]\s*/, '');
  let sectionScore=target&&(target.includes(sectionName)||sectionName.includes(target))?9:0;
  if(s.id==='rq'&&/research question/.test(material))sectionScore+=3;
  if(s.id==='background'&&/background|literature|introduction|scientific rationale/.test(material))sectionScore+=4;
  if(s.id==='method'&&/protocol|testing procedure|warm.up|randomis|reproduc|participant selection/.test(material))sectionScore+=4;
  if(s.id==='variables'&&/controlled variable|independent variable|dependent variable|confound/.test(material))sectionScore+=4;
  if(s.id==='safety'&&/safety|consent|ethical|hazard/.test(material))sectionScore+=5;
  if(s.id==='data'&&/graph|statistic|analysis|raw data|anova|standard deviation/.test(material))sectionScore+=4;
  if(s.id==='conclusion'&&/conclusion|literature comparison|practical implication/.test(material))sectionScore+=4;
  if(s.id==='evaluation'&&/limitation|validity|reliability|evaluation|improvement/.test(material))sectionScore+=4;
  for(const c of s.checks){
   let score=sectionScore;
   for(const term of c.searchTerms||[])if(material.includes(term.toLowerCase()))score+=term.includes(' ')?3:1;
   for(const w of words(c.title))if(material.includes(w))score+=1;
   if(target&&c.title.toLowerCase().includes(target))score+=5;
   if(score>best.score)best={sectionId:s.id,check:c,score};
  }
 }
 return {finding:f,sectionId:best.sectionId,check:best.score>=3?best.check:null};
}
function locationText(location:string|null, fallback:string){
 const page=(location||'').match(/\b(?:page|p\.)\s*(\d+)/i);
 return page?'Page '+page[1]+' · '+fallback:fallback;
}
export function WorkshopGuidedReview({findings,criteria,freePreview=false,submissionId,onOpenAnnotatedIa}:{findings:WorkshopFinding[];criteria:WorkshopCriterion[];freePreview?:boolean;submissionId?:string;onOpenAnnotatedIa?:()=>void}){
 const [sectionId,setSectionId]=useState(SEHS_WORKSHOP_SECTIONS[0].id);
 const [selected,setSelected]=useState<string|null>(null);
 const [showHelp,setShowHelp]=useState(false);
 const [showEvidence,setShowEvidence]=useState(false);
 const [showAllChecks,setShowAllChecks]=useState(false);
 const [verified,setVerified]=useState<Record<string,AuditRow>>({});
 const [loading,setLoading]=useState(false);
 const [message,setMessage]=useState('');
 const mapped=useMemo(()=>findings.map(sectionFor),[findings]);
 const section=SEHS_WORKSHOP_SECTIONS.find(s=>s.id===sectionId)!;
 const issues=mapped.filter(x=>x.sectionId===sectionId&&x.finding.finding_type!=='strength');
 const strengths=mapped.filter(x=>x.sectionId===sectionId&&x.finding.finding_type==='strength');
 const active=issues.find(x=>x.finding.id===selected)||issues[0]||null;
 const audit=verified[sectionId];
 const currentIndex=active?issues.findIndex(x=>x.finding.id===active.finding.id):-1;
 const currentCheck=active?.check||null;
 const currentAudit=audit?.checks?.find(x=>x.id===currentCheck?.id);
 const official=criteria.find(x=>norm(x.criterion_name)===norm(section.criterion)||norm(x.criterion)===norm(section.criterion));
 useEffect(()=>{setVerified({});setMessage('')},[submissionId]);
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
 function chooseSection(id:string){setSectionId(id);setSelected(null);setShowHelp(false);setShowEvidence(false);setShowAllChecks(false);setMessage('')}
 function chooseFinding(id:string){setSelected(id);setShowHelp(false);setShowEvidence(false)}
 const quoted=active?meaningfulExcerpt(active.finding.evidence_excerpt):null;
 return <section className="wg2" aria-label="IA annotated improvement coach">
  <header className="wg2-hero">
   <div><span className="wg2-eyebrow">PERSONALISED IA REVIEW · IB SEHS</span><h2>Your IA, explained clearly.</h2><p>Real feedback from your draft. One finding at a time, with the exact change to make and how to check your work.</p></div>
   {onOpenAnnotatedIa&&<button className="wg2-document" type="button" onClick={onOpenAnnotatedIa}>Open annotated document ↗</button>}
  </header>
  <nav className="wg2-sections" aria-label="IA report sections">{SEHS_WORKSHOP_SECTIONS.map((s,i)=>{
   const count=mapped.filter(x=>x.sectionId===s.id&&x.finding.finding_type!=='strength').length;
   return <button key={s.id} type="button" onClick={()=>chooseSection(s.id)} className={s.id===sectionId?'wg2-section-active':''}><span className="wg2-section-num">{String(i+1).padStart(2,'0')}</span><span>{s.name}</span>{count>0&&<b>{count}</b>}</button>;
  })}</nav>
  <div className="wg2-heading"><div><span className="wg2-eyebrow">{section.criterion} · SECTION {SEHS_WORKSHOP_SECTIONS.findIndex(s=>s.id===sectionId)+1} OF 9</span><h3>{section.name}</h3><p>{issues.length?issues.length+' focused improvement'+(issues.length===1?'':'s')+' identified from your submitted draft':'No specific improvement findings mapped to this section yet.'}</p></div>{official?.indicative_mark_range&&<span className="wg2-mark">Original IB mark range: {official.indicative_mark_range.join('–')}/{official.criterion_max_marks??6}</span>}</div>
  {issues.length>0?<div className="wg2-layout">
   <aside className="wg2-findings" aria-label="Specific feedback"><div className="wg2-aside-title">YOUR FEEDBACK <small>{issues.length} findings</small></div>
    {issues.map((x,i)=><button type="button" onClick={()=>chooseFinding(x.finding.id)} key={x.finding.id} className={active?.finding.id===x.finding.id?'wg2-finding-active':''}><span className="wg2-finding-no">{String(i+1).padStart(2,'0')}</span><span><strong>{x.check?.title||x.finding.section_title||'Improvement opportunity'}</strong><small>{x.finding.priority==='high'?'High priority':x.finding.priority==='medium'?'Medium priority':'Feedback'}</small></span><span>›</span></button>)}
   </aside>
   {active&&<article className="wg2-focus">
    <header className="wg2-focus-head"><span className="wg2-eyebrow">FEEDBACK {currentIndex+1} OF {issues.length}</span><span className={'wg2-priority wg2-priority-'+active.finding.priority}>{active.finding.priority==='high'?'Important improvement':active.finding.priority==='medium'?'Worth improving':'Review suggestion'}</span></header>
    <h4>{active.check?.title||active.finding.section_title||'Your IA feedback'}</h4>
    <div className="wg2-issue"><span className="wg2-eyebrow">WHAT YOUR REVIEW FOUND</span><p>{active.finding.issue}</p></div>
    <div className="wg2-action"><span className="wg2-eyebrow">WHAT TO DO NEXT</span><p>{active.finding.specific_action}</p></div>
    {active.finding.required_elements?.length>0&&<div className="wg2-elements"><strong>Make sure you include</strong><ul>{active.finding.required_elements.map((el,i)=><li key={i}>{el}</li>)}</ul></div>}
    <div className="wg2-finish"><span className="wg2-eyebrow">HOW YOU'LL KNOW IT'S FIXED</span><p>{active.finding.completion_check}</p></div>
    <div className="wg2-more">
     <button type="button" aria-expanded={showEvidence} onClick={()=>setShowEvidence(x=>!x)}>{showEvidence?'Hide':'Show'} evidence from my IA <span>{showEvidence?'−':'+'}</span></button>
     {showEvidence&&<div className="wg2-more-content"><strong>{locationText(currentAudit?.source_location||null,active.finding.section_title||section.name)}</strong>{quoted?<blockquote>{quoted}</blockquote>:<p>No reliable exact quotation is available in this saved finding. Please check the original IA at the relevant heading.</p>}{active.finding.why&&<p><b>Why it matters:</b> {active.finding.why}</p>}</div>}
     <button type="button" aria-expanded={showHelp} onClick={()=>setShowHelp(x=>!x)}>{showHelp?'Hide':'Show'} help with this improvement <span>{showHelp?'−':'+'}</span></button>
     {showHelp&&<div className="wg2-more-content"><p><b>Think about:</b> {currentCheck?.question||active.finding.rubric_requirement}</p>{currentCheck?.guidance&&<p><b>Approach:</b> {currentCheck.guidance}</p>}{currentCheck?.example&&<p><b>Illustrative example (not submission text):</b> {currentCheck.example}</p>}{currentCheck?.higherBand&&<p><b>Stronger scientific quality:</b> {currentCheck.higherBand}</p>}</div>}
    </div>
    <footer className="wg2-footer"><button type="button" disabled={currentIndex===0} onClick={()=>chooseFinding(issues[currentIndex-1].finding.id)}>← Previous finding</button><span>{currentIndex+1} / {issues.length}</span><button type="button" onClick={()=>{if(currentIndex<issues.length-1)chooseFinding(issues[currentIndex+1].finding.id);else{const next=SEHS_WORKSHOP_SECTIONS.findIndex(x=>x.id===sectionId)+1;if(next<SEHS_WORKSHOP_SECTIONS.length)chooseSection(SEHS_WORKSHOP_SECTIONS[next].id)}}} disabled={currentIndex===issues.length-1&&sectionId===SEHS_WORKSHOP_SECTIONS[SEHS_WORKSHOP_SECTIONS.length-1].id}>{currentIndex===issues.length-1?'Next section →':'Next finding →'}</button></footer>
   </article>}
  </div>:<div className="wg2-empty"><h4>No specific findings mapped here</h4><p>This doesn't mean the entire section is complete. You can check it against the workshop guidance or run an evidence audit of this section.</p></div>}
  {strengths.length>0&&<details className="wg2-strength"><summary>What you're doing well ({strengths.length})</summary>{strengths.map(x=><p key={x.finding.id}>{x.finding.issue}</p>)}</details>}
  <details className="wg2-coverage"><summary>Full workshop coverage · {section.checks.length} checks</summary><p>These are optional coaching checks, not a substitute for the original IB rubric.</p>{section.checks.map(c=>{const result=audit?.checks?.find(x=>x.id===c.id);return <div key={c.id}><strong>{c.title}</strong><span>{result?friendlyStatus(result.status):'Not audited'}</span>{result&&<p>{result.reason}</p>}</div>})}{auditEnabled&&submissionId&&!freePreview&&<button className="wg2-audit" type="button" onClick={auditSection} disabled={loading||Boolean(audit)}>{loading?'Checking…':audit?'Audit saved':'Check this section against the full template'}</button>}{message&&<p role="alert">{message}</p>}</details>
  <details className="wg2-coverage"><summary>Original IB SEHS assessment rubric · 24 marks</summary><div className="wg2-rubric">{SEHS_OFFICIAL_CRITERIA.map(c=><p key={c.name}>{c.name} · {c.maximum} marks</p>)}</div></details>
  <p className="wg2-note">Feedback helps you revise your own IA. Examples are for understanding—not paragraphs to submit. Each finding is taken from the saved review; its relevance should be confirmed against your actual document.</p>
 </section>;
}