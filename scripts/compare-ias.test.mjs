import test from 'node:test';
import assert from 'node:assert/strict';
import {compareSides,buildAnnotationComparisonHtml,buildTemplateAnalysisHtml,buildTemplateReportHtml} from '../src/lib/compareIas.ts';

const f=(id,issue,extra={})=>({id,criterion_code:'ResearchDesign',section_title:'Research Question',issue,rubric_requirement:'Req',specific_action:'Do it',why:'w',completion_check:'Check',required_elements:[],evidence_excerpt:'A passage from the draft that is long enough.',priority:'high',finding_type:'missing_detail',...extra});
const crit=(r)=>[{criterion:'ResearchDesign',criterion_name:'Research Design',indicative_mark_range:r,criterion_max_marks:6}];

test('detects movement, resolved and added issues',()=>{
 const a={label:'Draft 1',filename:'a.docx',findings:[f('1','The research question is not testable as written.')],criteria:crit([2,3])};
 const b={label:'Draft 2',filename:'b.docx',findings:[],criteria:crit([4,5])};
 const c=compareSides(a,b);
 assert.equal(c.criteria[0].delta,'up');
 assert.equal(c.totals.aIssues,1);
 assert.equal(c.totals.bIssues,0);
 assert.equal(c.totals.resolved,1);
});
test('same issue in both counts as persisting',()=>{
 const side=(l)=>({label:l,filename:l,findings:[f(l,'The research question is not testable as written.')],criteria:crit([3,4])});
 const c=compareSides(side('a'),side('b'));
 assert.equal(c.totals.persisting,1);
 assert.equal(c.totals.added,0);
 assert.equal(c.criteria[0].delta,'same');
});
test('html output escapes markup and keeps bands indicative',()=>{
 const a={label:'<b>x</b>',filename:'a<script>.docx',findings:[f('1','<img src=x onerror=alert(1)>')],criteria:crit([2,3])};
 const c=compareSides(a,{...a,findings:[]});
 for(const h of [buildAnnotationComparisonHtml(c),buildTemplateAnalysisHtml(c),buildTemplateReportHtml(a)]){
  assert.ok(!h.includes('<script>.docx'));
  assert.ok(!h.includes('<img src=x'));
  assert.ok(/indicative/i.test(h));
 }
});
test('missing criteria are not comparable, not a crash',()=>{
 const c=compareSides({label:'a',filename:'a',findings:[],criteria:[]},{label:'b',filename:'b',findings:[],criteria:crit([1,2])});
 assert.equal(c.criteria[0].delta,'unknown');
});
