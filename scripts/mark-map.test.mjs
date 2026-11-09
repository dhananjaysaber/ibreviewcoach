import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMarkMap } from '../src/lib/markMap.ts';
const crit = ['Research Design', 'Data Analysis', 'Conclusion', 'Evaluation'].map((n) => ({ criterion: n, criterion_name: n, indicative_mark_range: [3, 4], criterion_max_marks: 6 }));
const finding = (i, code, priority) => ({ id: 'f' + i, criterion_code: code, section_title: null, issue: 'issue ' + i, rubric_requirement: 'req', specific_action: 'act', why: 'w', completion_check: 'c', required_elements: [], evidence_excerpt: null, priority, finding_type: 'issue' });
test('no findings gives the top of each official range', () => {
  const m = buildMarkMap(crit, []);
  assert.equal(m.mark, 16); assert.deepEqual(m.official, [12, 16]); assert.equal(m.maximum, 24);
});
test('many findings lower the mark but never below the official range', () => {
  const f = []; for (let i = 0; i < 80; i++) f.push(finding(i, ['Research Design', 'Data Analysis', 'Conclusion', 'Evaluation'][i % 4], 'high'));
  const m = buildMarkMap(crit, f);
  assert.ok(m.mark >= 12 && m.mark <= 16);
  assert.ok(m.boundary[0] <= m.boundary[1] && m.boundary[1] - m.boundary[0] <= 1);
});
test('strengths are ignored and empty input returns null', () => {
  const s = finding(1, 'Data Analysis', 'high'); s.finding_type = 'strength';
  assert.equal(buildMarkMap(crit, [s]).mark, 16);
  assert.equal(buildMarkMap([], []), null);
});
