import {useMemo,useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';
import type {WorkshopFinding} from './WorkshopGuidedReview';
import {SEHS_OFFICIAL_CRITERIA} from '../lib/workshopGuide';
import './draft-comparison.css';
export type DraftSnapshot={submissionId:string;version:number;findings:WorkshopFinding[]};
const criterionKey=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
function tokens(x:string):Set<string>{return new Set((x.toLowerCase().match(/[a-z]{5,}/g)||[]).filter(w=>!['their','which','these','there','might','should','could','would','about','since','without','evidence','criterion','research','student','review','section','draft','needs','missing','details','include','specific'].includes(w)));}
function similarity(a:WorkshopFinding,b:WorkshopFinding){
 if(criterionKey(a.criterion_code)!==criterionKey(b.criterion_code))return 0;
 const aa=tokens(a.issue+' '+a.rubric_requirement+' '+(a.section_title||''));const bb=tokens(b.issue+' '+b.rubric_requirement+' '+(b.section_title||''));
 if(!aa.size||!bb.size)return 0;let count=0;for(const w of aa)if(bb.has(w))count++;
 return count/Math.max(aa.size,bb.size);
}
type AuditCheck={id:string;status:string;reason:string;action:string;evidence_excerpt:string|null};
type AuditSummary={section_id:string;checks:AuditCheck[]};
const evidenceEnabled=import.meta.env.VITE_ENABLE_WORKSHOP_AUDIT==='true';
export function DraftComparison({current,previous}:{current:DraftSnapshot;previous:DraftSnapshot|null}){
 const [audits,setAudits]=useState<{old:AuditSummary[];now:AuditSummary[]}|null>(null);
 const [auditWarning,setAuditWarning]=useState('');
 useEffect(()=>{
  setAudits(null);setAuditWarning('');
  if(!evidenceEnabled||!previous?.submissionId||!current.submissionId)return;
  let live=true;
  Promise.all([previous.submissionId,current.submissionId].map(submission_id=>supabase.functions.invoke('workshop-audit',{body:{submission_id,action:'summary'}})))
   .then(([oldRes,newRes])=>{
    if(!live)return;
    if(oldRes.error||newRes.error||!oldRes.data?.audits||!newRes.data?.audits){setAuditWarning('Verified section summaries are not available yet. Showing cautious feedback-only comparison.');return;}
    setAudits({old:oldRes.data.audits as AuditSummary[],now:newRes.data.audits as AuditSummary[]});
   }).catch(()=>{if(live)setAuditWarning('Verified section comparison is temporarily unavailable.');});
  return ()=>{live=false};
 },[current.submissionId,previous?.submissionId]);
 const checkComparisons=useMemo(()=>{
  if(!audits)return [];
  const olds=new Map(audits.old.flatMap(a=>a.checks).map(c=>[c.id,c] as const));
  const news=new Map(audits.now.flatMap(a=>a.checks).map(c=>[c.id,c] as const));
  const issues=[] as {id:string;status:string;old:AuditCheck;now:AuditCheck}[];
  for(const [id,a] of olds){const b=news.get(id);if(!b)continue;
   let status='Needs verification';
   if(['missing','partial'].includes(a.status)&&b.status==='complete'&&b.evidence_excerpt)status='Evidence-supported improvement';
   else if(a.status==='complete'&&['missing','partial'].includes(b.status))status='Possible regression';
   else if(['missing','partial'].includes(a.status)&&['missing','partial'].includes(b.status))status='Still needs attention';
   else if(a.status==='complete'&&b.status==='complete')status='Still demonstrated';
   issues.push({id,status,old:a,now:b});
  }
  return issues;
 },[audits]);
 const compared=useMemo(()=>{
 if(!previous)return null;
 const old=previous.findings.filter(f=>f.finding_type!=='strength');const now=current.findings.filter(f=>f.finding_type!=='strength');
 const links=old.map(f=>{let best:WorkshopFinding|null=null,score=0;for(const n of now){const s=similarity(f,n);if(s>score){score=s;best=n;}}return {old:f,newer:score>=.3?best:null,score};});
 const matchedIds=new Set(links.filter(x=>x.newer).map(x=>x.newer!.id));
 return {links,newIssues:now.filter(x=>!matchedIds.has(x.id)),continuing:links.filter(x=>x.newer).length,notRepeated:links.filter(x=>!x.newer).length};
 },[current,previous]);
 if(!previous)return <section className="dc-root"><h2>Compare IA drafts</h2><p>There is no earlier eligible report for this IA project. After a later submission is reviewed, you can compare its saved findings here.</p></section>;
 return <section className="dc-root"><header><span>STUDENT REVISION JOURNEY</span><h2>Draft {previous.version} → Draft {current.version}</h2><p>Compare the feedback from two saved reviews of the same IA project. The comparison helps prioritise the next revision, without inventing evidence of improvement.</p></header>
 {audits&&<section className="dc-verified"><h3>Workshop check comparison · document evidence</h3><p>{checkComparisons.length} checks were audited in both drafts. A positive change is shown only where Draft 2 has an excerpt verified against its extracted document text; a teacher should still confirm scientific adequacy.</p>{checkComparisons.length?checkComparisons.map(x=><article key={x.id}><b>{x.id}</b> · <strong>{x.status}</strong><p>Draft {previous.version}: {x.old.status} → Draft {current.version}: {x.now.status}</p>{x.now.evidence_excerpt&&<blockquote>{x.now.evidence_excerpt}</blockquote>}<p>Next step: {x.now.action}</p></article>):<p>No matching completed section audits yet. Audit the same section in both drafts to enable an evidence-based comparison.</p>}</section>}
 {auditWarning&&<p className="dc-warning">{auditWarning}</p>}
 <div className="dc-stats"><div><strong>{compared!.continuing}</strong><small>Similar concerns still flagged</small></div><div><strong>{compared!.notRepeated}</strong><small>Earlier concerns not repeated</small></div><div><strong>{compared!.newIssues.length}</strong><small>Newly flagged concerns</small></div></div>
 <div className="dc-warning"><b>Important verification rule:</b> an issue not repeated by the AI is <strong>not automatically resolved</strong>. To confirm a fix, check corresponding passages, tables, diagrams and evidence in both drafts. These statuses compare stored reviewer findings, not the full document contents.</div>
 {SEHS_OFFICIAL_CRITERIA.map(criterion=>{
 const old=compared!.links.filter(x=>criterionKey(x.old.criterion_code)===criterionKey(criterion.name)||x.old.criterion_code.toUpperCase()===String.fromCharCode(65+SEHS_OFFICIAL_CRITERIA.indexOf(criterion))||x.old.criterion_code===String(SEHS_OFFICIAL_CRITERIA.indexOf(criterion)+1));
 const fresh=compared!.newIssues.filter(x=>criterionKey(x.criterion_code)===criterionKey(criterion.name)||x.criterion_code.toUpperCase()===String.fromCharCode(65+SEHS_OFFICIAL_CRITERIA.indexOf(criterion))||x.criterion_code===String(SEHS_OFFICIAL_CRITERIA.indexOf(criterion)+1));
 if(!old.length&&!fresh.length)return null;
 return <section className="dc-criterion" key={criterion.name}><h3>{criterion.name}</h3>{old.map(x=><article key={x.old.id}><span className={x.newer?'dc-continuing':'dc-unverified'}>{x.newer?'Still flagged (similar finding)':'Not repeated · verify in document'}</span><strong>Previous: {x.old.issue}</strong>{x.newer&&<p><b>Current finding:</b> {x.newer.issue}</p>}<p><b>Next action:</b> {x.newer?.specific_action||x.old.specific_action}</p></article>)}{fresh.map(x=><article key={'new-'+x.id}><span className="dc-new">Newly flagged</span><strong>{x.issue}</strong><p><b>Next action:</b> {x.specific_action}</p></article>)}</section>;
 })}
 <p className="dc-foot">No comparative score or verified completion claim is generated. The four official SEHS IA assessment criteria and their existing indicative scores are untouched.</p>
 </section>;
}
