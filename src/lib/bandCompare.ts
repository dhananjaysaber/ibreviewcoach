import { rubricView, type BandText } from './ibRubric.ts';

export type CriterionBand = { criterion_name: string; indicative_mark_range: [number, number] | null };
export type ActionFinding = { criterion_code: string; finding_type: string; priority: string; specific_action: string; issue: string };

export type BandChange = {
  criterion: string;
  before: string | null;
  after: string | null;
  direction: 'up' | 'same' | 'down' | 'unknown';
  nextBand: BandText | null;
  topAction: string | null;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
const label = (r: [number, number] | null) => (r ? (r[0] === r[1] ? String(r[0]) : `${r[0]}-${r[1]}`) : null);

/**
 * Compare stored indicative bands between two reviews. Bands are copied from the
 * saved marking; this never computes or adjusts a mark. A missing range on either
 * side gives direction "unknown" rather than a guess.
 */
export function compareBands(
  previous: CriterionBand[],
  current: CriterionBand[],
  currentFindings: ActionFinding[],
): BandChange[] {
  return current.map((c) => {
    const p = previous.find((x) => norm(x.criterion_name) === norm(c.criterion_name));
    const before = label(p?.indicative_mark_range ?? null);
    const after = label(c.indicative_mark_range);
    let direction: BandChange['direction'] = 'unknown';
    if (p?.indicative_mark_range && c.indicative_mark_range) {
      const d = c.indicative_mark_range[0] - p.indicative_mark_range[0];
      direction = d > 0 ? 'up' : d < 0 ? 'down' : 'same';
    }
    const view = rubricView(c.criterion_name, c.indicative_mark_range);
    const open = currentFindings
      .filter((f) => norm(f.criterion_code) === norm(c.criterion_name) && f.finding_type !== 'strength' && f.specific_action)
      .sort((a, b) => (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3))[0];
    return {
      criterion: view?.criterion ?? c.criterion_name,
      before,
      after,
      direction,
      nextBand: view?.nextBand ?? null,
      topAction: open?.specific_action ?? null,
    };
  });
}
