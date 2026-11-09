import {useEffect,useMemo,useState} from 'react';
import {supabase} from '../lib/supabase';
import {buildAnnotationComparisonHtml,buildTemplateAnalysisHtml,compareSides,type Comparison} from '../lib/compareIas';
import type {WorkshopCriterion,WorkshopFinding} from '../lib/sectionMap';
import './section-cards.css';
import './compare-ias.css';

type HistoryRow={submission_id:string;project_title:string;version_number:number;original_filename:string;uploaded_at:string;report_generated_at:string|null;word_count:number|null;status:string};
const rec=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const txt=(v:unknown,d='')=>typeof v==='string'&&v.trim()?v:d;
const arr=(v:unknown)=>Array.isArray(v)?v:[];
function toFindings(v:unknown):WorkshopFinding[]{
 return arr(v).filter(rec).map((r,i)=>({id:txt(r.id,'f'+i),criterion_code:txt(r.criterion_code,'Other'),section_title:typeof r.section_title==='string'?r.section_title:null,issue:txt(r.issue,'A review finding was identified.'),rubric_requirement:txt(r.rubric_requirement,'Review the relevant rubric requirement.'),specific_action:txt(r.specific_action,'Review and address this finding yourself.'),why:txt(r.why),completion_check:txt(r.completion_check,'Confirm the required evidence is visible.'),required_elements:arr(r.required_elements).filter((x):x is string=>typeof x==='string'),evidence_excerpt:typeof r.evidence_excerpt==='string'?r.evidence_excerpt:null,priority:txt(r.priority,'medium'),finding_type:txt(r.finding_type,'missing_detail')}));
}
function toCriteria(v:unknown):WorkshopCriterion[]{
 return arr(v).filter(rec).map(r=>{const m=r.indicative_mark_range;return {criterion:txt(r.criterion,'Other'),criterion_name:txt(r.criterion_name,txt(r.criterion,'Other')),indicative_mark_range:Array.isArray(m)&&m.length===2&&typeof m[0]==='number'&&typeof m[1]==='number'?[m[0],m[1]] as [number,number]:null,criterion_max_marks:typeof r.criterion_max_marks==='number'?r.criterion_max_marks:null}});
}
const when=(s:string|null)=>s?new Date(s).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'';
function download(name:string,html:string){
 const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),4000);
}
function Preview({html,title}:{html:string;title:string}){
 const [h,setH]=useState(640);
 return <iframe className="cmp-frame" title={title} srcDoc={html} sandbox="allow-same-origin" style={{height:h}} onLoad={e=>{const d=e.currentTarget.contentDocument;if(d?.body)setH(Math.min(Math.max(d.body.scrollHeight+24,360),1400))}}/>;
}

export function CompareIas(){
 const [rows,setRows]=useState<HistoryRow[]|null>(null);
 const [error,setError]=useState('');
 const [picked,setPicked]=useState<string[]>([]);
 const [busy,setBusy]=useState(false);
 const [result,setResult]=useState<Comparison|null>(null);

 useEffect(()=>{
  let live=true;
  supabase.rpc('get_my_ia_report_history').then(({data,error:e})=>{
   if(!live)return;
   if(e){setError('Your reports could not be loaded. Refresh the page and try again.');setRows([]);return}
   setRows(arr(data).filter(rec).filter(r=>typeof r.submission_id==='string'&&r.report_generated_at).map(r=>({submission_id:String(r.submission_id),project_title:txt(r.project_title,'IA project'),version_number:typeof r.version_number==='number'?r.version_number:1,original_filename:txt(r.original_filename,'IA draft'),uploaded_at:txt(r.uploaded_at),report_generated_at:typeof r.report_generated_at==='string'?r.report_generated_at:null,word_count:typeof r.word_count==='number'?r.word_count:null,status:txt(r.status)})).sort((a,b)=>b.uploaded_at.localeCompare(a.uploaded_at)));
  });
  return ()=>{live=false};
 },[]);

 function toggle(id:string){setResult(null);setError('');setPicked(p=>p.includes(id)?p.filter(x=>x!==id):p.length>=2?[p[1],id]:[...p,id])}
 const ordered=useMemo(()=>picked.map(id=>rows?.find(r=>r.submission_id===id)).filter((r):r is HistoryRow=>Boolean(r)),[picked,rows]);

 async function run(){
  if(ordered.length!==2||busy)return;
  setBusy(true);setError('');setResult(null);
  try{
   const sides=await Promise.all(ordered.map(async r=>{
    const res=await supabase.rpc('get_my_ia_review_content',{p_submission_id:r.submission_id});
    if(res.error)throw res.error;
    if(!rec(res.data)||res.data.full_access!==true)throw new Error('"'+r.original_filename+'" needs a full review to be compared.');
    return {label:r.project_title+' · draft '+r.version_number,filename:r.original_filename,findings:toFindings(res.data.findings),criteria:toCriteria(res.data.criteria)};
   }));
   setResult(compareSides(sides[0],sides[1]));
  }catch(e){setError(e instanceof Error?e.message:'The comparison could not be prepared. Try again.')}
  finally{setBusy(false)}
 }

 const annotationHtml=useMemo(()=>result?buildAnnotationComparisonHtml(result):'',[result]);
 const templateHtml=useMemo(()=>result?buildTemplateAnalysisHtml(result):'',[result]);

 return <section className="sx cmp" aria-label="Compare two IAs">
  <header className="sx-hero"><div><span className="sx-eyebrow">Compare IAs</span><h2>Compare two of your IAs</h2><p>Choose two completed reports. You get an annotation comparison against the IB SEHS rubric, and template recommendations with analysis. Both can be downloaded.</p></div></header>
  <article className="sx-card">
   <div className="sx-block">
    <h4><i>1</i>Select two reports</h4>
    {rows===null?<p className="sx-muted">Loading your reports…</p>
     :rows.length<2?<p className="sx-muted">You need at least two completed reports to compare. Complete another review and it will appear here.</p>
     :<ul className="cmp-list">{rows.map(r=>{const n=picked.indexOf(r.submission_id);return <li key={r.submission_id}><label className={n>=0?'cmp-on':''}><input type="checkbox" checked={n>=0} onChange={()=>toggle(r.submission_id)}/><span className="cmp-main"><strong>{r.original_filename}</strong><small>{r.project_title} · draft {r.version_number} · {when(r.report_generated_at||r.uploaded_at)}{r.word_count?' · '+r.word_count.toLocaleString()+' words':''}</small></span>{n>=0&&<b className="cmp-badge">{n===0?'First':'Second'}</b>}</label></li>})}</ul>}
    <div className="cmp-actions"><button className="sx-btn sx-btn-primary" type="button" onClick={()=>void run()} disabled={ordered.length!==2||busy}>{busy?'Preparing comparison…':ordered.length===2?'Compare these two':'Select two reports'}</button><small className="sx-muted">Order matters: the first is treated as the earlier IA.</small></div>
    {error&&<p role="alert" className="sx-error">{error}</p>}
   </div>
  </article>
  {result&&<>
   <article className="sx-card"><div className="sx-block"><div className="cmp-row"><h4><i>2</i>Annotation comparison</h4><button className="sx-btn" type="button" onClick={()=>download('SEHS-annotation-comparison.html',annotationHtml)}>Download file</button></div><p className="sx-muted">Marked against the official IB SEHS rubric.</p><Preview html={annotationHtml} title="Annotation comparison"/></div></article>
   <article className="sx-card"><div className="sx-block"><div className="cmp-row"><h4><i>3</i>Ideal IA Ideal IA template recommendations and analysis</h4><button className="sx-btn" type="button" onClick={()=>download('SEHS-template-analysis.html',templateHtml)}>Download file</button></div><p className="sx-muted">Ideal IA template view of the second IA, with movement since the first.</p><Preview html={templateHtml} title="Ideal IA Ideal IA template recommendations and analysis"/></div></article>
  </>}
 </section>;
}
