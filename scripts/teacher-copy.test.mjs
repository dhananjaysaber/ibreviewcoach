import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildTeacherCopyHtml, escapeHtml } from '../src/lib/teacherCopy.ts';

const base = {
  generatedOn: '05/11/2026',
  summaries: [
    { criterion_code: 'Evaluation', label: 'Evaluation', indicative_band: '3-4', limiting_clause: 'Relative impact of weaknesses is explained' },
    { criterion_code: 'ResearchDesign', label: 'Research Design', indicative_band: '5-6', limiting_clause: null },
  ],
  notes: [
    { finding_id: '1', criterion_code: 'ResearchDesign', criterion_short: 'RD', kind: 'met', note: 'Method reproducible.', evidence_quote: 'trials were repeated <3> times', page_number: 2, section_title: 'Method' },
    { finding_id: '2', criterion_code: 'Evaluation', criterion_short: 'EVAL', kind: 'limit', note: 'Limitations generic.', evidence_quote: null, page_number: null, section_title: null },
  ],
};
test('escapes html and orders criteria', () => {
  const html = buildTeacherCopyHtml(base);
  assert.ok(html.includes('&lt;3&gt;'));
  assert.ok(!html.includes('<3>'));
  assert.ok(html.indexOf('Research Design') < html.indexOf('>Evaluation'));
});
test('shows stored band and limiting clause, no official mark wording', () => {
  const html = buildTeacherCopyHtml(base);
  assert.ok(html.includes('Indicative band 3-4'));
  assert.ok(html.includes('Limiting the next band'));
  assert.ok(html.includes('not an official IB mark'));
});
test('omits quote block when evidence is unverified', () => {
  const html = buildTeacherCopyHtml(base);
  assert.equal((html.match(/<blockquote>/g) || []).length, 1);
});
test('escapeHtml', () => assert.equal(escapeHtml(`<a href="x">&'`), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;'));
