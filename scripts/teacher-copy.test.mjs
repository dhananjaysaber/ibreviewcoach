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

import { buildMarkCopyHtml } from '../src/lib/teacherCopy.ts';
const mm = {
  mark: 7, maximum: 24,
  data_sufficiency: 'n=20 limits power.',
  appendix_check: [{ label: 'Raw data', relevant: true, reason: 'Supports B1.' }],
  word_count: { counted: 3500, limit: 3200, over_by: 300, cut_at: { heading: 'Evaluation', page: 6 } },
  criteria: [{ code: 'A', criterion: 'Research design', max: 6, mark: 4, why_mark: 'A1 and A2 are met at 3-4 but A3 omits trial counts.', confidence: 'high',
    strands: [
      { id: 'A1', name: 'Research Question Context', level: '5-6', reason: 'The introduction places the question in a specific <context>.', missing: '', evidence: [{ quote: 'grip strength & smash speed', page: 2, section: 'Introduction' }] },
      { id: 'A3', name: 'Reproducibility of methodology', level: '0', no_evidence: true, reason: 'No verified quotation supports this strand, so no credit is given.', missing: 'Trial counts and distances.', evidence: [] },
    ] }],
};
test('mark copy: strand table shows level, exact descriptor, evidence and justification, escaped', () => {
  const html = buildMarkCopyHtml({ map: mm, generatedOn: '10/11/2026' });
  assert.ok(html.includes('Recommended mark: 7 / 24'));
  assert.ok(html.includes('The research question is described within a specific and appropriate context.'));
  assert.ok(html.includes('The report does not reach the standard described by the descriptors below.'));
  assert.ok(html.includes('grip strength &amp; smash speed'));
  assert.ok(html.includes('&lt;context&gt;'));
  assert.ok(!html.includes('<context>'));
  assert.ok(html.includes('No quotation in the report meets this strand.'));
  assert.ok(html.includes('Not yet at 1-2'));
  assert.ok(html.includes('300 over'));
  assert.ok(html.includes('A strand receives no credit where no quotation'));
  assert.equal((html.match(/<tr>/g) || []).length, 3); // header + two strands
});
