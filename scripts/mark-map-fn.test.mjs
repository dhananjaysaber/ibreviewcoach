import test from 'node:test';
import assert from 'node:assert/strict';
import { assembleCriterion, buildDocument, totals } from '../supabase/functions/mark-map/logic.ts';
import { RUBRIC } from '../supabase/functions/mark-map/rubric.ts';
const blocks = [{ block_index: 0, page_number: 1, section_title: 'Method', text: 'Participants completed three trials on a 20 m track with a stopwatch.' }];
const r = RUBRIC[0];
const raw = (over = {}) => ({ mark: 3, mark_high: 4, why_mark: 'Method is largely reproducible.', confidence: 'high',
  statements: [{ statement: 'Methodology allows reproduction', band: '3-4', status: 'met', reason: 'steps given', evidence: [{ quote: 'three trials on a 20 m track', block_index: 0 }] }],
  next_gaps: [{ descriptor_phrase: 'fully reproduced', block_index: 0, what_to_do: 'Check that every material and timing is stated.' }], ...over });
test('valid marking is assembled with a verified quote', () => {
  const c = assembleCriterion(r, raw(), blocks);
  assert.equal(c.mark, 3); assert.equal(c.mark_high, 4); assert.equal(c.band, '3-4');
  assert.equal(c.statements[0].evidence[0].page, 1);
});
test('invented quotes are dropped and met is downgraded', () => {
  const c = assembleCriterion(r, raw({ statements: [{ statement: 's', band: '3-4', status: 'met', reason: 'x', evidence: [{ quote: 'this sentence is not in the IA', block_index: 0 }] }] }), blocks);
  assert.equal(c.statements[0].status, 'partly'); assert.equal(c.statements[0].evidence.length, 0); assert.equal(c.dropped_quotes, 1);
});
test('out-of-range marks and missing reasoning are rejected; high is capped at mark+1', () => {
  assert.equal(assembleCriterion(r, raw({ mark: 9 }), blocks), null);
  assert.equal(assembleCriterion(r, raw({ why_mark: '' }), blocks), null);
  assert.equal(assembleCriterion(r, raw({ mark: 3, mark_high: 6 }), blocks).mark_high, 4);
});
test('document builder flags truncation and totals sum', () => {
  assert.equal(buildDocument(blocks, 10).complete, false);
  const c = assembleCriterion(r, raw(), blocks);
  assert.deepEqual(totals([c, c]), { mark: 6, mark_high: 8, maximum: 12 });
});
