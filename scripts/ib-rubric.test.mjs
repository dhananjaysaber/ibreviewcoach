import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { IB_RUBRIC } from '../src/lib/ibRubricData.ts';
import { rubricView } from '../src/lib/ibRubric.ts';

const json = JSON.parse(readFileSync(new URL('../backend-integration/sehs-official-rubric-2026.json', import.meta.url), 'utf8'));

test('generated rubric data matches the JSON source exactly', () => {
  assert.equal(IB_RUBRIC.criteria.length, 4);
  for (const [i, c] of json.criteria.entries()) {
    const g = IB_RUBRIC.criteria[i];
    assert.equal(g.name, c.name);
    assert.equal(g.maxMarks, c.max_marks);
    assert.deepEqual(g.bands.map((b) => [b.min, b.max, b.text]), c.band_descriptors.map((b) => [b.band[0], b.band.at(-1), b.text]));
  }
});
test('current and next band resolve from a stored range', () => {
  const v = rubricView('Data Analysis', [3, 4]);
  assert.equal(v.currentBand.band, '3-4');
  assert.equal(v.nextBand.band, '5-6');
  assert.ok(v.nextBand.text.length > 20);
});
test('top band has no next band; unknown range keeps text-free current', () => {
  assert.equal(rubricView('Evaluation', [5, 6]).nextBand, null);
  const u = rubricView('Conclusion', null);
  assert.equal(u.currentBand, null);
  assert.equal(rubricView('Nonsense', [1, 2]), null);
});
test('accepts criterion codes as well as names', () => {
  assert.equal(rubricView('ResearchDesign', [1, 2]).criterion, 'Research Design');
});
