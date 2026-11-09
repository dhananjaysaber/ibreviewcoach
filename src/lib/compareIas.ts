import {SEHS_WORKSHOP_SECTIONS} from './workshopGuide.ts';
import {sectionFor,type WorkshopCriterion,type WorkshopFinding} from './sectionMap.ts';
import {escapeHtml as esc} from './teacherCopy.ts';

export type CompareSide={label:string;filename:string;findings:WorkshopFinding[];criteria:WorkshopCriterion[]};
export type Delta='up'|'down'|'same'|'unknown';
export type CriterionRow={name:string;max:number|null;a:[number,number]|null;b:[number,number]|null;delta:Delta;aCount:number;bCount:number;aHigh:number;bHigh:number};
export type IssueRef={key:string;title:string;issue:string;action:string;completion:string;requirement:string;quote:string;priority:string};
export type SectionRow={id:string;name:string;criterion:string;a:IssueRef[];b:IssueRef[];resolved:IssueRef[];persisting:{a:IssueRef;b:IssueRef}[];added:IssueRef[];strengthsB:string[]};
export type Comparison={a:CompareSide;b:CompareSide;criteria:CriterionRow[];sections:SectionRow[];totals:{aIssues:number;bIssues:number;resolved:number;persisting:number;added:number}};

const norm=(s:string)=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const clip=(s:string|null,n=300)=>{const x=(s||'').replace(/\s+/g,' ').trim();return x.length>n?x.slice(0,n-1)+'…':x};
const mid=(r:[number,number]|null)=>r?(r[0]+r[1])/2:null;
const nice=(n:string)=>n.replace(/^\d+\s*[·.\-]\s*/,'');

function refsFor(findings:WorkshopFinding[]){
 const bySection=new Map<string,IssueRef[]>();const strengths=new Map<string,string[]>();
 for(const f of findings){
  const e=sectionFor(f);
  if(f.finding_type==='strength'){const l=strengths.get(e.sectionId)||[];l.push(f.issue);strengths.set(e.sectionId,l);continue}
  const title=e.check?.title||f.section_title||'Improvement opportunity';
  const key=e.check?.id||('t:'+(norm(title).slice(0,40)||norm(f.issue).slice(0,40)));
  const ref:IssueRef={key,title,issue:f.issue,action:f.specific_action,completion:f.completion_check,requirement:f.rubric_requirement,quote:clip(f.evidence_excerpt),priority:f.priority};
  const l=bySection.get(e.sectionId)||[];l.push(ref);bySection.set(e.sectionId,l);
 }
 return {bySection,strengths};
}

export function compareSides(a:CompareSide,b:CompareSide):Comparison{
 const A=refsFor(a.findings),B=refsFor(b.findings);
 const names=Array.from(new Set([...a.criteria,...b.criteria].map(c=>c.criterion_name)));
 const countFor=(f:WorkshopFinding[],name:string)=>f.filter(x=>norm(x.criterion_code)===norm(name)&&x.finding_type!=='strength');
 const criteria:CriterionRow[]=names.map(name=>{
  const ca=a.criteria.find(c=>c.criterion_name===name),cb=b.criteria.find(c=>c.criterion_name===name);
  const ma=mid(ca?.indicative_mark_range??null),mb=mid(cb?.indicative_mark_range??null);
  const ia=countFor(a.findings,name),ib=countFor(b.findings,name);
  return {name,max:ca?.criterion_max_marks??cb?.criterion_max_marks??null,a:ca?.indicative_mark_range??null,b:cb?.indicative_mark_range??null,
   delta:ma===null||mb===null?'unknown':mb>ma?'up':mb<ma?'down':'same',aCount:ia.length,bCount:ib.length,aHigh:ia.filter(x=>x.priority==='high').length,bHigh:ib.filter(x=>x.priority==='high').length};
 });
 let resolved=0,persisting=0,added=0,aIssues=0,bIssues=0;
 const sections:SectionRow[]=SEHS_WORKSHOP_SECTIONS.map(s=>{
  const ai=A.bySection.get(s.id)||[],bi=B.bySection.get(s.id)||[];
  const bKeys=new Set(bi.map(x=>x.key)),aKeys=new Set(ai.map(x=>x.key));
  const res=ai.filter(x=>!bKeys.has(x.key)),add=bi.filter(x=>!aKeys.has(x.key));
  const per=ai.filter(x=>bKeys.has(x.key)).map(x=>({a:x,b:bi.find(y=>y.key===x.key)!}));
  resolved+=res.length;persisting+=per.length;added+=add.length;aIssues+=ai.length;bIssues+=bi.length;
  return {id:s.id,name:nice(s.name),criterion:s.criterion,a:ai,b:bi,resolved:res,persisting:per,added:add,strengthsB:B.strengths.get(s.id)||[]};
 });
 return {a,b,criteria,sections,totals:{aIssues,bIssues,resolved,persisting,added}};
}

const range=(r:[number,number]|null,max:number|null)=>r?r[0]+'–'+r[1]+(max?' / '+max:''):'Not available';
const arrow=(d:Delta)=>d==='up'?'Moved up':d==='down'?'Moved down':d==='same'?'No change':'Not comparable';
const CSS='body{font-family:Manrope,Segoe UI,system-ui,sans-serif;color:#1b1740;margin:0;padding:28px;background:#faf9fe;line-height:1.55}h1,h2,h3{font-family:Sora,Segoe UI,sans-serif;margin:0 0 8px}h1{font-size:1.5rem}h2{font-size:1.15rem;margin-top:26px}h3{font-size:1rem;margin-top:18px}.card{background:#fff;border:1px solid #e6e1f7;border-radius:16px;padding:16px 20px;margin:12px 0}table{width:100%;border-collapse:collapse;font-size:.92rem}th,td{text-align:left;padding:9px 10px;border-bottom:1px solid #eee9fb;vertical-align:top}th{color:#6a6590;font-size:.74rem;letter-spacing:.08em;text-transform:uppercase}.up{color:#17683a;font-weight:700}.down{color:#a52c14;font-weight:700}.muted{color:#6a6590}.tag{display:inline-block;font-size:.74rem;font-weight:700;padding:3px 9px;border-radius:99px;margin-right:6px}.t-ok{background:#e1f6ea;color:#17683a}.t-new{background:#ffe5e1;color:#a52c14}.t-keep{background:#fff1d6;color:#8a5a00}blockquote{margin:8px 0;padding:10px 14px;border-left:4px solid #8a6df0;background:#f4f1ff;border-radius:0 10px 10px 0;font-size:.9rem}.note{font-size:.82rem;color:#6a6590;margin-top:24px}';
function page(title:string,body:string){return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>'+CSS+'</style></head><body>'+body+'</body></html>'}
const head=(c:Comparison,t:string,sub:string)=>'<h1>'+esc(t)+'</h1><p class="muted">'+esc(sub)+'</p><p><b>First IA:</b> '+esc(c.a.label)+' ('+esc(c.a.filename)+')<br><b>Second IA:</b> '+esc(c.b.label)+' ('+esc(c.b.filename)+')</p>';
const foot='<p class="note">Bands are indicative and non-binding. Only the official IB SEHS criteria decide a band; template items are coaching advice. This report never writes your text.</p>';

export function buildAnnotationComparisonHtml(c:Comparison){
 let h=head(c,'Annotation comparison','Marked against the official IB SEHS rubric. Issues are matched by topic between the two IAs.');
 h+='<h2>Indicative band by criterion</h2><div class="card"><table><tr><th>Criterion</th><th>First IA</th><th>Second IA</th><th>Change</th><th>Findings (first → second)</th></tr>'+c.criteria.map(r=>'<tr><td>'+esc(r.name)+'</td><td>'+esc(range(r.a,r.max))+'</td><td>'+esc(range(r.b,r.max))+'</td><td class="'+(r.delta==='up'?'up':r.delta==='down'?'down':'muted')+'">'+arrow(r.delta)+'</td><td>'+r.aCount+' → '+r.bCount+' <span class="muted">(high: '+r.aHigh+' → '+r.bHigh+')</span></td></tr>').join('')+'</table></div>';
 h+='<h2>What changed in the annotations</h2><p>'+c.totals.resolved+' issue(s) no longer flagged, '+c.totals.persisting+' still flagged, '+c.totals.added+' newly flagged.</p>';
 for(const s of c.sections){
  if(!s.a.length&&!s.b.length)continue;
  h+='<h3>'+esc(s.name)+' <span class="muted">· '+esc(s.criterion)+'</span></h3>';
  for(const r of s.resolved)h+='<div class="card"><span class="tag t-ok">No longer flagged</span><b>'+esc(r.title)+'</b><p>'+esc(r.issue)+'</p></div>';
  for(const p of s.persisting)h+='<div class="card"><span class="tag t-keep">Still flagged</span><b>'+esc(p.b.title)+'</b><p>IB requirement: '+esc(p.b.requirement)+'</p><p>'+esc(p.b.issue)+'</p>'+(p.b.quote?'<blockquote>'+esc(p.b.quote)+'</blockquote>':'')+'</div>';
  for(const r of s.added)h+='<div class="card"><span class="tag t-new">Newly flagged</span><b>'+esc(r.title)+'</b><p>IB requirement: '+esc(r.requirement)+'</p><p>'+esc(r.issue)+'</p>'+(r.quote?'<blockquote>'+esc(r.quote)+'</blockquote>':'')+'</div>';
 }
 return page('Annotation comparison',h+foot);
}

export function buildTemplateAnalysisHtml(c:Comparison){
 let h=head(c,'Ideal IA template recommendations and analysis','Ideal IA template view of the second IA, with movement from the first.');
 h+='<h2>Section overview</h2><div class="card"><table><tr><th>Section</th><th>First IA issues</th><th>Second IA issues</th><th>Movement</th></tr>'+c.sections.map(s=>{const d=s.b.length-s.a.length;return '<tr><td>'+esc(s.name)+'</td><td>'+s.a.length+'</td><td>'+s.b.length+'</td><td class="'+(d<0?'up':d>0?'down':'muted')+'">'+(d<0?'Fewer issues':d>0?'More issues':'No change')+'</td></tr>'}).join('')+'</table></div>';
 h+='<h2>Recommendations for the second IA</h2>';
 for(const s of c.sections){
  if(!s.b.length&&!s.strengthsB.length)continue;
  h+='<h3>'+esc(s.name)+'</h3>';
  if(s.strengthsB.length)h+='<div class="card"><span class="tag t-ok">Doing well</span>'+s.strengthsB.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>';
  for(const r of s.b){const isNew=s.added.includes(r);h+='<div class="card"><span class="tag '+(isNew?'t-new':'t-keep')+'">'+(isNew?'New in second IA':'Carried over')+'</span><b>'+esc(r.title)+'</b>'+(r.quote?'<blockquote>'+esc(r.quote)+'</blockquote>':'')+'<p>'+esc(r.issue)+'</p><p><b>What to do:</b> '+esc(r.action)+'</p><p class="muted"><b>You will know it is fixed when:</b> '+esc(r.completion)+'</p></div>'}
 }
 if(c.totals.resolved)h+='<h2>Improvements since the first IA</h2><div class="card">'+c.sections.flatMap(s=>s.resolved.map(r=>'<p><span class="tag t-ok">Resolved</span>'+esc(s.name)+': '+esc(r.title)+'</p>')).join('')+'</div>';
 return page('Ideal IA template recommendations and analysis',h+foot);
}

export function buildTemplateReportHtml(side:CompareSide){
 const c=compareSides(side,{label:'',filename:'',findings:[],criteria:[]});
 let h='<h1>Ideal IA template report</h1><p class="muted">Built on the Ideal IA template. '+esc(side.filename)+'</p>';
 for(const s of c.sections){
  if(!s.a.length)continue;
  h+='<h2>'+esc(s.name)+'</h2>';
  for(const r of s.a)h+='<div class="card"><b>'+esc(r.title)+'</b>'+(r.quote?'<blockquote>'+esc(r.quote)+'</blockquote>':'')+'<p>'+esc(r.issue)+'</p><p><b>What to do:</b> '+esc(r.action)+'</p><p class="muted"><b>You will know it is fixed when:</b> '+esc(r.completion)+'</p></div>';
 }
 return page('Ideal IA template report',h+foot);
}
