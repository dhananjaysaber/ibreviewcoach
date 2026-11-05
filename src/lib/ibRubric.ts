import { IB_RUBRIC } from './ibRubricData.ts';

export type BandText = { band: string; text: string };
export type RubricView = {
  criterion: string;
  currentBand: BandText | null;
  nextBand: BandText | null;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
const label = (b: { min: number; max: number }) => (b.min === b.max ? String(b.min) : `${b.min}-${b.max}`);

/** Map a stored indicative mark range, e.g. [3,4], to the band that contains it. */
export function rubricView(criterionName: string, range: [number, number] | null): RubricView | null {
  const c = IB_RUBRIC.criteria.find((x) => norm(x.name) === norm(criterionName) || norm(x.code) === norm(criterionName));
  if (!c) return null;
  const bands = [...c.bands].sort((a, b) => a.min - b.min);
  const hit = range ? bands.find((b) => range[0] >= b.min && range[1] <= b.max) : undefined;
  const idx = hit ? bands.indexOf(hit) : -1;
  const next = idx >= 0 ? bands[idx + 1] : undefined;
  const toText = (b: (typeof bands)[number] | undefined): BandText | null => (b ? { band: label(b), text: b.text } : null);
  return { criterion: c.name, currentBand: toText(hit), nextBand: toText(next) };
}
