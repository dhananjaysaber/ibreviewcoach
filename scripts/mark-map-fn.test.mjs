import test from 'node:test';
import assert from 'node:assert/strict';
import { assembleMarking, assemblePlan, splitDocument, totals, WORD_LIMIT } from '../supabase/functions/mark-map/logic.ts';
import { STRANDS } from '../supabase/functions/mark-map/rubric.ts';

const blocks = [{ block_index: 0, page_number: 1, section_title: 'Method', text: 'Participants completed three trials on a 20 m track with a stopwatch.' }];
const mk = (level = '3-4', quote = 'three trials on a 20 m track') => ({
  criteria: ['A', 'B', 'C', 'D'].map((code) => ({ code, mark: 3, why_mark: 'Best fit.', confidence: 'high',
    strands: STRANDS.filter((s) => s.criterion === code).map((s) => ({ id: s.id, level, reason: 'r', missing: 'm', evidence: [{ quote, block_index: 0 }] })) })),
  appendix_check: [{ label: 'Raw data', relevant: true, reason: 'ok' }] });

test('sheet has 11 strands (3+3+3+2)', () => {
  assert.equal(STRANDS.length, 11);
  assert.deepEqual(['A', 'B', 'C', 'D'].map((c) => STRANDS.filter((s) => s.criterion === c).length), [3, 3, 3, 2]);
  assert.ok(STRANDS.every((s) => !/Justification$/.test(s.levels['3-4'])));
});
test('valid marking assembles with verified quotes and totals', () => {
  const m = assembleMarking(mk(), blocks);
  assert.equal(m.criteria.length, 4);
  assert.equal(m.criteria[0].strands[0].evidence[0].page, 1);
  assert.deepEqual(totals(m.criteria), { mark: 12, maximum: 24 });
});
test('invented quotes are dropped', () => {
  const m = assembleMarking(mk('3-4', 'this sentence is not in the IA'), blocks);
  assert.equal(m.criteria[0].strands[0].evidence.length, 0); assert.equal(m.dropped_quotes, 11);
});
test('mark is clamped into the strand range (best fit cannot leave it)', () => {
  const raw = mk('1-2'); raw.criteria[0].mark = 6;
  assert.equal(assembleMarking(raw, blocks).criteria[0].mark, 2);
});
test('missing strand or criterion rejects the marking', () => {
  const raw = mk(); raw.criteria[1].strands.pop();
  assert.equal(assembleMarking(raw, blocks), null);
  const raw2 = mk(); raw2.criteria.pop();
  assert.equal(assembleMarking(raw2, blocks), null);
});
test('appendices are excluded and the word limit stops reading', () => {
  const w = (n) => Array(n).fill('word').join(' ');
  const b = [
    { block_index: 0, page_number: 1, section_title: 'Introduction', text: w(2000) },
    { block_index: 1, page_number: 3, section_title: 'Method', text: w(1500) },
    { block_index: 2, page_number: 9, section_title: 'Appendix A', text: w(500) },
  ];
  const s = splitDocument(b);
  assert.equal(s.body.length, 1); assert.equal(s.appendix.length, 1); assert.equal(s.overLimit, true);
  assert.ok(s.wordsMarked <= WORD_LIMIT);
});
test('plan needs every strand with steps, example and prompts', () => {
  const plan = { criteria: ['A', 'B', 'C', 'D'].map((code) => ({ code, summary: 's', quick_wins: ['q'],
    strands: STRANDS.filter((s) => s.criterion === code).map((s) => ({ id: s.id, plain_ask: 'a', where_you_are: 'w', steps: ['one', 'two', 'three'], example: 'e', extend_prompts: ['p'], done_when: 'd' })) })) };
  assert.equal(assemblePlan(plan).length, 4);
  plan.criteria[2].strands[0].steps = ['only one'];
  assert.equal(assemblePlan(plan), null);
});
