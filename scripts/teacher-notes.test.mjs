import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  checkNote, verifiedQuote, assembleNotes, summariseCriteria, kindFromFinding, countWords,
} from '../supabase/functions/teacher-notes/notes.ts';

test('accepts a moderator-style note', () => {
  assert.deepEqual(checkNote('Uncertainty recorded for raw data but not carried into the processed mean.', 'limit'), []);
});
test('rejects advice, second person, marks, length, exclamation, bad kind', () => {
  assert.ok(checkNote('You should add uncertainty.', 'limit').includes('advice'));
  assert.ok(checkNote('Your method is unclear.', 'limit').includes('second_person'));
  assert.ok(checkNote('Worth 4/6 for this section.', 'limit').includes('official_mark'));
  assert.ok(checkNote(Array(30).fill('word').join(' '), 'limit').includes('too_long'));
  assert.ok(checkNote('Clear method!', 'met').includes('exclamation'));
  assert.ok(checkNote('Fine.', 'praise').includes('bad_kind'));
  assert.ok(checkNote('   ', 'met').includes('empty'));
});
test('quote is clipped to 15 words and must be verbatim', () => {
  const block = 'The mean heart rate rose from 72 bpm at rest to 148 bpm after the shuttle run test across all trials.';
  const q = verifiedQuote(block, block);
  assert.equal(countWords(q), 15);
  assert.equal(verifiedQuote('invented sentence not in the document', block), null);
  assert.equal(verifiedQuote('MEAN heart   rate rose', block), 'MEAN heart rate rose');
  assert.equal(verifiedQuote(null, block), null);
});
test('assemble keeps valid notes, rejects bad and missing ones, ignores unknown ids', () => {
  const f = (id, c = 'DataAnalysis') => ({ id, criterion_code: c, finding_type: 'unclear', priority: 'high',
    rubric_requirement: null, issue: 'x', evidence_excerpt: 'mean heart rate rose', block_id: 'b1', page_number: 3, section_title: 'Results' });
  const blocks = new Map([['b1', 'The mean heart rate rose sharply.']]);
  const r = assembleNotes([f('1'), f('2'), f('3'), f('4', 'Other')], blocks, [
    { finding_id: '1', kind: 'limit', note: 'Uncertainty not carried into processed values.' },
    { finding_id: '2', kind: 'limit', note: 'You should add error bars.' },
    { finding_id: '99', kind: 'met', note: 'Ghost.' },
    { finding_id: '4', kind: 'met', note: 'Fine.' },
  ]);
  assert.equal(r.notes.length, 1);
  assert.equal(r.notes[0].criterion_short, 'DA');
  assert.equal(r.notes[0].evidence_quote, 'mean heart rate rose');
  const ids = Object.fromEntries(r.rejected.map((x) => [x.finding_id, x.problems[0]]));
  assert.equal(ids['2'], 'advice');
  assert.equal(ids['3'], 'no_note');
  assert.equal(ids['4'], 'unknown_criterion');
  assert.equal(ids['99'], undefined);
});
test('summary uses stored bands only and tolerates bad input', () => {
  const s = summariseCriteria([
    { criterion: 'DataAnalysis', indicative_band: '3-4', next_band_gap: { target_band: '5-6', unmet_clauses: ['Measurement uncertainty is appropriately considered'] } },
    { criterion: 'Nope', indicative_band: '1-2' },
  ]);
  assert.equal(s.length, 1);
  assert.equal(s[0].indicative_band, '3-4');
  assert.equal(s[0].limiting_clause, 'Measurement uncertainty is appropriately considered');
  assert.deepEqual(summariseCriteria(null), []);
});
test('fallback kind', () => {
  assert.equal(kindFromFinding('strength'), 'met');
  assert.equal(kindFromFinding('structural_gap'), 'gap');
  assert.equal(kindFromFinding('unclear'), 'limit');
});
