import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareBands } from '../src/lib/bandCompare.ts';

const f = (c, p, a, t = 'unclear') => ({ criterion_code: c, finding_type: t, priority: p, specific_action: a, issue: 'x' });
test('direction, labels, next band and top action', () => {
  const r = compareBands(
    [{ criterion_name: 'Data Analysis', indicative_mark_range: [1, 2] }, { criterion_name: 'Evaluation', indicative_mark_range: [3, 4] }],
    [{ criterion_name: 'Data Analysis', indicative_mark_range: [3, 4] }, { criterion_name: 'Evaluation', indicative_mark_range: [3, 4] }],
    [f('DataAnalysis', 'low', 'Check units'), f('DataAnalysis', 'high', 'Propagate uncertainty'), f('DataAnalysis', 'high', 'ignored strength', 'strength')],
  );
  assert.equal(r[0].direction, 'up');
  assert.equal(r[0].before, '1-2');
  assert.equal(r[0].after, '3-4');
  assert.equal(r[0].nextBand.band, '5-6');
  assert.equal(r[0].topAction, 'Propagate uncertainty');
  assert.equal(r[1].direction, 'same');
  assert.equal(r[1].topAction, null);
});
test('down and unknown are reported, not guessed', () => {
  const r = compareBands(
    [{ criterion_name: 'Conclusion', indicative_mark_range: [5, 6] }, { criterion_name: 'Research Design', indicative_mark_range: null }],
    [{ criterion_name: 'Conclusion', indicative_mark_range: [3, 4] }, { criterion_name: 'Research Design', indicative_mark_range: [3, 4] }, { criterion_name: 'Evaluation', indicative_mark_range: null }],
    [],
  );
  assert.equal(r[0].direction, 'down');
  assert.equal(r[1].direction, 'unknown');
  assert.equal(r[1].before, null);
  assert.equal(r[2].direction, 'unknown');
  assert.equal(r[2].after, null);
});
test('top band has no next band', () => {
  const r = compareBands([], [{ criterion_name: 'Conclusion', indicative_mark_range: [5, 6] }], []);
  assert.equal(r[0].nextBand, null);
});
