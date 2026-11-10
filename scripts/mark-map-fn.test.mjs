import test from 'node:test';
import assert from 'node:assert/strict';
import { assembleMarking, assemblePlan, assembleTrim, splitDocument, totals, WORD_LIMIT } from '../supabase/functions/mark-map/logic.ts';
import { STRANDS } from '../supabase/functions/mark-map/rubric.ts';

const blocks = [{ block_index: 0, page_number: 1, section_title: 'Method', text: 'Participants completed three trials on a 20 m track with a stopwatch.' }];
const mk = (level = '3-4', quote = 'three trials on a 20 m track') => ({
  criteria: ['A', 'B', 'C', 'E'].map((code) => ({ code, mark: 3, why_mark: 'Best fit.', confidence: 'high',
    strands: STRANDS.filter((s) => s.criterion === code).map((s) => ({ id: s.id, level, reason: 'r', missing: 'm', evidence: [{ quote, block_index: 0 }] })) })),
  appendix_check: [{ label: 'Raw data', relevant: true, reason: 'ok' }] });

test('sheet has 11 strands (3+3+3+2)', () => {
  assert.equal(STRANDS.length, 11);
  assert.deepEqual(['A', 'B', 'C', 'E'].map((c) => STRANDS.filter((s) => s.criterion === c).length), [3, 3, 3, 2]);
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
  assert.equal(m.criteria[0].strands[0].level, '0'); assert.equal(m.criteria[0].mark, 0); assert.equal(m.ungrounded_strands, 11);
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
test('whole IA is kept; tables, references and appendices do not count; cut point and template budgets found', () => {
  const w = (n) => Array(n).fill('word').join(' ');
  const b = [
    { block_index: 0, block_type: 'heading', page_number: 1, section_title: 'Introduction', text: 'Introduction' },
    { block_index: 1, block_type: 'paragraph', page_number: 1, section_title: 'Introduction', text: w(2000) },
    { block_index: 2, block_type: 'heading', page_number: 3, section_title: 'Procedure', text: 'Procedure' },
    { block_index: 3, block_type: 'table_text', page_number: 3, section_title: 'Procedure', text: w(900) },
    { block_index: 4, block_type: 'paragraph', page_number: 4, section_title: 'Procedure', text: w(1500) },
    { block_index: 5, block_type: 'heading', page_number: 8, section_title: 'References', text: 'References' },
    { block_index: 6, block_type: 'paragraph', page_number: 8, section_title: 'References', text: w(300) },
    { block_index: 7, block_type: 'heading', page_number: 9, section_title: 'Appendix A', text: 'Appendix A' },
    { block_index: 8, block_type: 'paragraph', page_number: 9, section_title: 'Appendix A', text: w(500) },
  ];
  const s = splitDocument(b);
  assert.equal(s.appendix.length, 2);
  assert.equal(s.body.length, 7);
  assert.equal(s.totalCounted, 1 + 2000 + 1 + 1500);
  assert.equal(s.overLimit, true); assert.equal(s.overBy, s.totalCounted - WORD_LIMIT);
  assert.equal(s.cutAt.heading, 'Procedure'); assert.equal(s.cutAt.block_index, 4);
  const intro = s.sections.find((x) => x.heading === 'Introduction');
  assert.equal(intro.budget.max, 750);
  assert.equal(s.sections.find((x) => x.heading === 'Procedure').table_words, 900);
  assert.equal(s.sections.find((x) => x.heading === 'References'), undefined);
});
test('trim picks real paragraphs by reason, protects marked evidence, and computes savings in code', () => {
  const w = (n) => Array(n).fill('word').join(' ');
  const body = [
    { block_index: 0, block_type: 'heading', page_number: 1, section_title: 'Introduction', text: 'Introduction' },
    { block_index: 1, block_type: 'paragraph', page_number: 1, section_title: 'Introduction', text: w(60) },
    { block_index: 2, block_type: 'paragraph', page_number: 1, section_title: 'Introduction', text: w(40) },
    { block_index: 3, block_type: 'paragraph', page_number: 2, section_title: 'Method', text: w(30) },
    { block_index: 4, block_type: 'table_text', page_number: 2, section_title: 'Method', text: w(30) },
    { block_index: 5, block_type: 'paragraph', page_number: 3, section_title: 'Method', text: w(5) },
  ];
  const m = assembleMarking(mk('3-4', 'word word'), body.map((b) => ({ ...b, text: 'word word ' + b.text })).slice(0, 0).concat([{ block_index: 0, page_number: 1, section_title: 'x', text: 'word word' }]));
  // protect block 2 by hand: it is the only evidence for a 3-4 strand
  m.criteria[0].strands[0].level = '3-4'; m.criteria[0].strands[0].evidence = [{ quote: 'q', block_index: 2, page: 1, section: 'Introduction' }];
  const raw = { trim: [
    { block_index: 2, action: 'remove', reason: 'redundant', why: 'Defines the variables.', serves: ['A1'] },
    { block_index: 1, action: 'remove', reason: 'repeated', why: 'Says the same as the method.', repeated_at: 3, serves: [] },
    { block_index: 3, action: 'remove', reason: 'repeated', why: 'x', repeated_at: 99, serves: [] },
    { block_index: 4, action: 'remove', reason: 'irrelevant', why: 'table', serves: [] },
    { block_index: 5, action: 'remove', reason: 'irrelevant', why: 'tiny', serves: [] },
    { block_index: 0, action: 'remove', reason: 'irrelevant', why: 'heading', serves: [] },
    { block_index: 7, action: 'remove', reason: 'irrelevant', why: 'fake block', serves: [] },
  ] };
  const t = assembleTrim(raw, body, m, 80);
  assert.deepEqual(t.items.map((i) => i.block_index), [1, 3, 2]);
  const p2 = t.items.find((i) => i.block_index === 2);
  assert.equal(p2.action, 'shorten'); assert.ok(p2.words_saved < 40);
  assert.equal(t.items.find((i) => i.block_index === 3).reason, 'low_value');
  assert.equal(t.items[0].repeated_at.block_index, 3);
  assert.equal(t.items[0].words_saved, 60); assert.equal(t.items[0].running_total, 60);
  assert.equal(assembleTrim({}, body, m, 80), null);
});
test('plan needs every strand with steps, example and prompts', () => {
  const plan = { criteria: ['A', 'B', 'C', 'E'].map((code) => ({ code, summary: 's', quick_wins: ['q'],
    strands: STRANDS.filter((s) => s.criterion === code).map((s) => ({ id: s.id, plain_ask: 'a', where_you_are: 'w', steps: ['one', 'two', 'three'], example: 'e', extend_prompts: ['p'], done_when: 'd' })) })) };
  assert.equal(assemblePlan(plan).length, 4);
  plan.criteria[2].strands[0].steps = ['only one'];
  assert.equal(assemblePlan(plan), null);
});

test('a strand with evidence keeps its level while an unevidenced strand in the same criterion gets 0', () => {
  const raw = mk('3-4');
  raw.criteria[0].strands[1].evidence = [{ quote: 'not in the report at all', block_index: 0 }];
  raw.criteria[0].mark = 3;
  const m = assembleMarking(raw, blocks);
  const [a1, a2] = m.criteria[0].strands;
  assert.equal(a1.level, '3-4'); assert.equal(a2.level, '0'); assert.equal(a2.no_evidence, true);
  assert.match(a2.reason, /no credit/i);
  assert.equal(m.ungrounded_strands, 1);
  assert.ok(m.criteria[0].mark <= 4);
});
test('a strand claimed at 5-6 with no evidence at all cannot lift the criterion mark', () => {
  const raw = mk('0'); raw.criteria[2].mark = 5;
  raw.criteria[2].strands[0].level = '5-6'; raw.criteria[2].strands[0].evidence = [];
  const m = assembleMarking(raw, blocks);
  assert.equal(m.criteria[2].mark, 0);
});
test('long paragraphs tagged as headings are body text, not section rows', () => {
  const long = Array(40).fill('word').join(' ');
  const b = [
    { block_index: 0, block_type: 'heading', page_number: 1, section_title: 'Hypothesis', text: 'Hypothesis' },
    { block_index: 1, block_type: 'heading', page_number: 1, section_title: 'Hypothesis', text: long },
  ];
  const s = splitDocument(b);
  assert.equal(s.sections.length, 1);
  assert.equal(s.sections[0].heading, 'Hypothesis'); assert.equal(s.sections[0].words, 41);
});

test('quote verification tolerates quote marks, dashes, spacing, ellipses and a wrongly numbered block, but never invented text', () => {
  const bl = [
    { block_index: 0, page_number: 1, section_title: 'Intro', text: 'Unrelated opening text about the topic of the study.' },
    { block_index: 7, page_number: 4, section_title: 'Method', text: 'The dynamometer was held at the participant’s side – elbow straight – and three trials were taken with 30 s rest.' },
  ];
  const run = (quote, idx) => {
    const raw = mk('3-4'); raw.criteria[0].strands[0].evidence = [{ quote, block_index: idx }];
    return assembleMarking(raw, bl).criteria[0].strands[0];
  };
  assert.equal(run("The dynamometer was held at the participant's side - elbow straight", 7).evidence.length, 1);
  assert.equal(run('The dynamometer was held at the participant’s side … three trials were taken with 30 s rest', 7).evidence.length, 1);
  const moved = run('three trials were taken with 30 s rest', 0);
  assert.equal(moved.evidence[0].block_index, 7); assert.equal(moved.evidence[0].page, 4); assert.equal(moved.level, '3-4');
  const fake = run('five trials were taken with 60 s rest and a water break', 7);
  assert.equal(fake.evidence.length, 0); assert.equal(fake.level, '0');
});

test('an uncredited strand caps the criterion mark at the rounded-up average of the strand levels', () => {
  const raw = mk('5-6'); raw.criteria[0].mark = 6;
  raw.criteria[0].strands[1].evidence = [{ quote: 'invented sentence that is not present', block_index: 0 }];
  const m = assembleMarking(raw, blocks);
  // levels 5-6, 0, 5-6 -> midpoints 5.5, 0, 5.5 -> avg 3.67 -> ceil 4
  assert.equal(m.criteria[0].mark, 4);
  assert.equal(m.criteria[1].mark, 5); // fully evidenced criteria are unaffected
});

const twoBlocks = [
  { block_index: 0, page_number: 1, section_title: 'Data', text: 'The mean grip strength of the participants was approximately 52.5 kg across the sample.' },
  { block_index: 1, page_number: 2, section_title: 'Data', text: 'The mean grip strength of 53.0 kg is only the mean of the recorded values.' },
];
const withLevels = (levels, extra = {}) => {
  const raw = mk('3-4', 'mean grip strength of the participants was approximately 52.5 kg');
  for (const c of raw.criteria) for (const s of c.strands) if (levels[s.id]) s.level = levels[s.id];
  return { ...raw, ...extra };
};
test('the criterion mark cannot round up from the strand average (5-6, 3-4, 3-4 holds A at 4)', () => {
  const raw = withLevels({ A1: '5-6' }); raw.criteria[0].mark = 5;
  const m = assembleMarking(raw, twoBlocks);
  assert.equal(m.criteria[0].mark, 4);
  assert.ok(m.limits.some((l) => l.kind === 'average' && l.criterion === 'A'));
});
test('all strands at the same level may reach the top of that level', () => {
  const raw = withLevels({ A1: '5-6', A2: '5-6', A3: '5-6' }); raw.criteria[0].mark = 6;
  assert.equal(assembleMarking(raw, twoBlocks).criteria[0].mark, 6);
});
test('a significant contradiction verified in the report caps B1 at 3-4 and is listed as a limit with an action', () => {
  const raw = withLevels({ B1: '5-6', B2: '5-6', B3: '5-6' }); raw.criteria[1].mark = 6;
  raw.inconsistencies = [{ strand: 'B1', severity: 'significant', what: 'The mean grip strength is given as two different values.', quote_a: 'approximately 52.5 kg across the sample', quote_b: 'mean grip strength of 53.0 kg is only the mean' }];
  const m = assembleMarking(raw, twoBlocks);
  const b = m.criteria[1];
  assert.equal(b.strands[0].level, '3-4'); assert.match(b.strands[0].reason, /contradicts itself/);
  assert.equal(b.mark, 5);
  assert.equal(m.inconsistencies.length, 1);
  assert.ok(m.limits.some((l) => l.kind === 'inconsistency' && /same value everywhere/.test(l.action)));
});
test('a minor slip is recorded with an action but does not cap the level', () => {
  const raw = withLevels({ B1: '5-6' });
  raw.inconsistencies = [{ strand: 'B1', severity: 'minor', what: 'Mean grip strength differs by 0.5 kg.', quote_a: 'approximately 52.5 kg across the sample', quote_b: 'mean grip strength of 53.0 kg is only the mean' }];
  const m = assembleMarking(raw, twoBlocks);
  assert.equal(m.criteria[1].strands[0].level, '5-6');
  assert.ok(m.limits.some((l) => l.kind === 'inconsistency_minor'));
});
test('a contradiction whose quotes are not in the report is ignored', () => {
  const raw = withLevels({ B1: '5-6' });
  raw.inconsistencies = [{ strand: 'B1', severity: 'significant', what: 'Invented clash.', quote_a: 'a sentence that is not in the report at all', quote_b: 'mean grip strength of 53.0 kg is only the mean' }];
  const m = assembleMarking(raw, twoBlocks);
  assert.equal(m.inconsistencies.length, 0); assert.equal(m.criteria[1].strands[0].level, '5-6');
});
test('every strand has IB checks and Evaluation is criterion E with strands E1 and E2', async () => {
  const { CHECKS, CRITERIA } = await import('../supabase/functions/mark-map/rubric.ts');
  assert.ok(STRANDS.every((s) => CHECKS[s.id]?.length >= 1));
  assert.deepEqual(CRITERIA.map((c) => c.code), ['A', 'B', 'C', 'E']);
  assert.deepEqual(STRANDS.filter((s) => s.criterion === 'E').map((s) => s.id), ['E1', 'E2']);
});
test('client strand sheet mirrors the server sheet word for word', async () => {
  const { STRAND_DESCRIPTORS } = await import('../src/lib/strandSheet.ts');
  for (const s of STRANDS) for (const l of ['1-2', '3-4', '5-6']) assert.equal(STRAND_DESCRIPTORS[s.id][l], s.levels[l]);
});
