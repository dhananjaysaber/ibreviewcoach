import { sectionFor, type WorkshopFinding } from './sectionMap.ts';
import { SEHS_WORKSHOP_SECTIONS } from './workshopGuide.ts';
const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
export type Advice = { section: string; title: string; priority: string; action: string };
/** Ideal IA template suggestions for one criterion. Advice only. They are never used to set a mark. */
export function templateAdvice(criterionName: string, findings: WorkshopFinding[]): Advice[] {
  const w: Record<string, number> = { high: 3, medium: 2, low: 1 };
  return findings.filter((f) => f.finding_type !== 'strength').map(sectionFor).flatMap((e) => {
    const s = SEHS_WORKSHOP_SECTIONS.find((x) => x.id === e.sectionId);
    if (!s || norm(s.criterion) !== norm(criterionName)) return [];
    return [{ section: s.name.replace(/^\d+\s*[·.\-]\s*/, ''), title: e.check?.title ?? e.finding.issue.slice(0, 90), priority: e.finding.priority, action: e.finding.specific_action }];
  }).sort((a, b) => (w[b.priority] ?? 2) - (w[a.priority] ?? 2)).slice(0, 5);
}
