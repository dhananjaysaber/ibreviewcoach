/**
 * Tightens the overall indicative range. The official IB SEHS rubric (via each criterion's stored
 * range) always sets the outer limits. Inside those limits, the flagged findings and the number of
 * Ideal IA template checks place the draft nearer the lower or upper mark of each criterion.
 * The result is always a one-mark-wide range inside the official sum. It never leaves it.
 */
export type CriterionInput = { name: string; range: [number, number]; max: number | null; findings: { priority: string; finding_type: string }[]; checks: number };
export type TightRange = { range: [number, number]; official: [number, number]; maximum: number; perCriterion: { name: string; official: [number, number]; point: number }[] };

const WEIGHT: Record<string, number> = { high: 1, medium: 0.6, low: 0.3 };

export function criterionPoint(c: CriterionInput): number {
  const [lo, hi] = c.range;
  if (hi <= lo) return lo;
  const load = c.findings.filter((f) => f.finding_type !== 'strength').reduce((s, f) => s + (WEIGHT[f.priority] ?? 0.6), 0);
  const deficit = Math.min(1, load / Math.max(3, c.checks * 0.25));
  return lo + (hi - lo) * (1 - deficit);
}

export function tightenRange(criteria: CriterionInput[]): TightRange | null {
  const valid = criteria.filter((c) => Number.isFinite(c.range?.[0]) && Number.isFinite(c.range?.[1]));
  if (!valid.length) return null;
  const officialLo = valid.reduce((s, c) => s + c.range[0], 0);
  const officialHi = valid.reduce((s, c) => s + c.range[1], 0);
  const maximum = valid.reduce((s, c) => s + (c.max ?? c.range[1]), 0);
  const points = valid.map((c) => criterionPoint(c));
  const total = points.reduce((s, p) => s + p, 0);
  let lo = Math.floor(total + 1e-9);
  lo = Math.min(Math.max(lo, officialLo), Math.max(officialLo, officialHi - 1));
  const hi = Math.min(lo + 1, officialHi);
  return {
    range: [lo, Math.max(hi, lo)], official: [officialLo, officialHi], maximum,
    perCriterion: valid.map((c, i) => ({ name: c.name, official: c.range, point: Math.round(points[i] * 10) / 10 })),
  };
}
