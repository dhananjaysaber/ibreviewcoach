import {SEHS_OFFICIAL_CRITERIA,SEHS_WORKSHOP_SECTIONS,type WorkshopCheck} from './workshopGuide.ts';
export type WorkshopFinding={id:string;criterion_code:string;section_title:string|null;issue:string;rubric_requirement:string;specific_action:string;why:string;completion_check:string;required_elements:string[];evidence_excerpt:string|null;priority:string;finding_type:string};
export type WorkshopCriterion={criterion:string;criterion_name:string;indicative_mark_range:[number,number]|null;criterion_max_marks:number|null};
export type EnrichedFinding={finding:WorkshopFinding;sectionId:string;check:WorkshopCheck|null};
const norm=(s:string)=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const words=(s:string)=>(String(s||'').toLowerCase().match(/[a-z]{4,}/g)||[]).filter(x=>!['this','that','with','from','should','which','their','there','review','could','would','have','more','what','than','into','using','your'].includes(x));
export function sectionFor(f:WorkshopFinding):EnrichedFinding{
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
