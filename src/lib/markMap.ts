/**
 * Teacher-style recommended mark, mapped criterion by criterion and section by section.
 * The official IB SEHS rubric range stored for each criterion is the outer limit and is never
 * exceeded. Inside it, every Ideal IA template section is scored by how many of its checks are
 * clear of flagged findings, and the sections are combined in proportion to their number of checks.
 * Bands are indicative and non-binding; the coach never writes student text.
 */
import { SEHS_WORKSHOP_SECTIONS } from './workshopGuide.ts';
import { sectionFor, type WorkshopCriterion, type WorkshopFinding } from './sectionMap.ts';
import { IB_RUBRIC } from './ibRubricData.ts';

const WEIGHT: Record<string, number> = { high: 1, medium: 0.6, low: 0.3 };
const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

export type SectionMark = { id: string; name: string; checks: number; clear: number; gaps: { title: string; priority: string; issue: string }[] };
export type CriterionMark = {
  name: string; official: [number, number]; max: number; point: number; mark: number; borderline: boolean;
  band: string | null; bandText: string | null; nextBand: string | null; nextText: string | null;
  sections: SectionMark[]; moveUp: { title: string; priority: string; section: string }[];
};
export type MarkMap = { mark: number; boundary: [number, number]; official: [number, number]; maximum: number; criteria: CriterionMark[] };

export function buildMarkMap(criteria: WorkshopCriterion[], findings: WorkshopFinding[]): MarkMap | null {
  const enriched = findings.filter((f) => f.finding_type !== 'strength').map(sectionFor);
  const out: CriterionMark[] = [];
  for (const c of criteria) {
    const range = c.indicative_mark_range;
    if (!range || !Number.isFinite(range[0]) || !Number.isFinite(range[1])) continue;
    const secs = SEHS_WORKSHOP_SECTIONS.filter((s) => norm(s.criterion) === norm(c.criterion_name) || norm(s.criterion) === norm(c.criterion));
    if (!secs.length) continue;
    const sections: SectionMark[] = secs.map((s) => {
      const mine = enriched.filter((e) => e.sectionId === s.id);
      const byCheck = new Map<string, { w: number; title: string; priority: string; issue: string }>();
      for (const e of mine) {
        const key = e.check?.id ?? e.finding.id;
        const w = WEIGHT[e.finding.priority] ?? 0.6;
        const prev = byCheck.get(key);
        if (!prev || w > prev.w) byCheck.set(key, { w, title: e.check?.title ?? e.finding.issue.slice(0, 80), priority: e.finding.priority, issue: e.finding.issue });
      }
      const load = [...byCheck.values()].reduce((a, g) => a + g.w, 0);
      const n = s.checks.length;
      return { id: s.id, name: s.name.replace(/^\d+\s*[·.\-]\s*/, ''), checks: n, clear: Math.max(0, n - Math.min(n, load)),
        gaps: [...byCheck.values()].sort((a, b) => b.w - a.w).map(({ title, priority, issue }) => ({ title, priority, issue })) };
    });
    const totalChecks = sections.reduce((a, s) => a + s.checks, 0) || 1;
    const share = sections.reduce((a, s) => a + s.clear, 0) / totalChecks;
    const [lo, hi] = range;
    const point = lo + (hi - lo) * share;
    const mark = Math.min(hi, Math.max(lo, Math.round(point)));
    const frac = point - Math.floor(point);
    const rub = IB_RUBRIC.criteria.find((x) => norm(x.name) === norm(c.criterion_name) || norm(x.code) === norm(c.criterion));
    const bands = rub ? [...rub.bands].sort((a, b) => a.min - b.min) : [];
    const cur = bands.find((b) => mark >= b.min && mark <= b.max);
    const nxt = cur ? bands[bands.indexOf(cur) + 1] : undefined;
    const lab = (b?: { min: number; max: number }) => (b ? (b.min === b.max ? String(b.min) : `${b.min}-${b.max}`) : null);
    const moveUp = sections.flatMap((s) => s.gaps.map((g) => ({ ...g, section: s.name })))
      .sort((a, b) => (WEIGHT[b.priority] ?? 0.6) - (WEIGHT[a.priority] ?? 0.6)).slice(0, 4).map(({ title, priority, section }) => ({ title, priority, section }));
    out.push({ name: c.criterion_name, official: [lo, hi], max: c.criterion_max_marks ?? hi, point: Math.round(point * 100) / 100, mark,
      borderline: hi > lo && frac >= 0.3 && frac <= 0.7, band: lab(cur), bandText: cur?.text ?? null, nextBand: lab(nxt), nextText: nxt?.text ?? null, sections, moveUp });
  }
  if (!out.length) return null;
  const mark = out.reduce((a, c) => a + c.mark, 0);
  const officialLo = out.reduce((a, c) => a + c.official[0], 0);
  const officialHi = out.reduce((a, c) => a + c.official[1], 0);
  const upside = out.some((c) => c.mark < c.official[1] && c.borderline) ? 1 : 0;
  return { mark, boundary: [mark, Math.min(officialHi, mark + (upside || (mark < officialHi && out.some((c) => c.point > c.mark) ? 1 : 0)))], official: [officialLo, officialHi], maximum: out.reduce((a, c) => a + c.max, 0), criteria: out };
}
