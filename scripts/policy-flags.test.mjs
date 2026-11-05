import assert from 'node:assert/strict';
import { test } from 'node:test';
import { policyFlags, countBodyWords, WORD_LIMIT } from '../supabase/functions/policy-flags/flags.ts';

const para = (text, block_type = 'paragraph') => ({ block_type, text });
test('no flags for a clean short report', () => {
  assert.deepEqual(policyFlags([para('Participants completed a 20 m shuttle run on a sports hall floor.')]), []);
});
test('word count ignores tables and figures and flags only above the limit', () => {
  const long = Array(WORD_LIMIT + 50).fill('word').join(' ');
  assert.equal(countBodyWords([para(long), para(long, 'table')]), WORD_LIMIT + 50);
  assert.ok(policyFlags([para(long)]).some((f) => f.id === 'word_count'));
  assert.ok(!policyFlags([para(long.split(' ').slice(0, 3000).join(' ')), para(long, 'table')]).some((f) => f.id === 'word_count'));
});
test('experimentation words are flagged with a short verbatim snippet', () => {
  const t = 'Each participant was asked to consume 3 mg per kg of caffeine before the test.';
  const f = policyFlags([para(t)]).find((x) => x.id === 'experimentation');
  assert.ok(f);
  assert.ok(f.evidence.every((e) => e.split(' ').length <= 12 && t.includes(e.split(' ').slice(1, 4).join(' '))));
});
test('school names and contact details are flagged', () => {
  const f = policyFlags([para('Data were collected at Greenfield International School, contact jay@example.com.')]).find((x) => x.id === 'school_identifying');
  assert.ok(f);
  assert.ok(f.evidence.length >= 1);
});
test('appendix reliance is flagged', () => {
  assert.ok(policyFlags([para('Raw data are shown in Appendix B.')]).some((f) => f.id === 'appendix_reliance'));
  assert.ok(!policyFlags([para('Table 1 shows the data.')]).some((f) => f.id === 'appendix_reliance'));
});
