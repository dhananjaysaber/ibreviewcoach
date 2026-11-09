import test from 'node:test';
import assert from 'node:assert/strict';
import { tightenRange } from '../src/lib/rangeBoundary.ts';
const f = (priority) => ({ priority, finding_type: 'issue' });
const four = (counts) => ['A','B','C','D'].map((n, i) => ({ name: n, range: [3, 4], max: 6, checks: 20, findings: Array(counts[i]).fill(0).map(() => f('high')) }));
test('narrows 12-16 to a one-mark range inside it', () => {
  const r = tightenRange(four([1, 1, 1, 1]));
  assert.deepEqual(r.official, [12, 16]);
  assert.equal(r.range[1] - r.range[0], 1);
  assert.ok(r.range[0] >= 12 && r.range[1] <= 16);
});
test('many issues push to the lower end, none to the upper end', () => {
  assert.deepEqual(tightenRange(four([9, 9, 9, 9])).range, [12, 13]);
  assert.deepEqual(tightenRange(four([0, 0, 0, 0])).range, [15, 16]);
});
test('strengths do not count as issues and empty input returns null', () => {
  const c = four([0, 0, 0, 0]); c[0].findings = [{ priority: 'high', finding_type: 'strength' }];
  assert.deepEqual(tightenRange(c).range, [15, 16]);
  assert.equal(tightenRange([]), null);
});
