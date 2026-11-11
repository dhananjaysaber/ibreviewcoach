import test from 'node:test';
import assert from 'node:assert/strict';
import {checkPlan,assemblePlans} from '../supabase/functions/action-plan/plan.ts';
const good={goal:'Explain what makes your smash scores vary.',why:'A moderator wants to see causes, not just a list, so this shows your Evaluation reasoning.',steps:['Find your evaluation paragraph on smash variability.','List two causes you think affect the scores.','Decide which cause matters more and why.','Check each cause links to the spread you measured.'],example:'Imagine a sprint study where the timer is accurate to 0.1 s. A 5.0 s run could really be 4.9 to 5.1 s, so a 0.05 s gap between two runners is smaller than the timer error.',detailed_action:'In the evaluation paragraph on smash variability, name which two causes you think moved the scores, state which data in your results table supports each, and correct any sentence that blames only one cause.',must_show:['Two named causes of the smash spread','Which results-table values support each cause'],done_when:'Your paragraph names two causes and says which has more effect.'};
test('accepts a clear plan',()=>assert.equal(checkPlan(good).ok,true));
test('rejects too few steps',()=>assert.equal(checkPlan({...good,steps:['One only.']}).ok,false));
test('rejects band claims',()=>assert.equal(checkPlan({...good,why:'This lifts you to band 5 straight away.'}).ok,false));
test('rejects pasteable quoted wording',()=>{
 const q='"'+'word '.repeat(25).trim()+'"';
 assert.equal(checkPlan({...good,steps:[...good.steps.slice(0,2),'Write '+q]}).ok,false);
});
test('rejects overlong steps',()=>assert.equal(checkPlan({...good,steps:[good.steps[0],'word '.repeat(40)]}).ok,false));
test('assemble ignores unknown ids and reports missing',()=>{
 const f=[{id:'a',criterion_code:'x',section_title:null,issue:'i',rubric_requirement:'r',specific_action:'s',why:'w',completion_check:'c',required_elements:null,evidence_excerpt:null},{id:'b',criterion_code:'x',section_title:null,issue:'i',rubric_requirement:'r',specific_action:'s',why:'w',completion_check:'c',required_elements:null,evidence_excerpt:null}];
 const r=assemblePlans(f,[{finding_id:'a',...good},{finding_id:'zzz',...good}]);
 assert.deepEqual(r.missing,['b']);
 assert.equal(r.plans.size,1);
});
test('rejects a plan with no example',()=>{const {example,...rest}=good;assert.equal(checkPlan(rest).ok,false)});
