import { TEMPLATE_CHECKS, STRAND_NAMES, type TemplateCheck } from './strandSheet';

export type Evidence = { quote: string; block_index?: number; page: number | null; section: string | null };
export type Strand = { id: string; name: string; level: string; reason: string; missing: string; evidence: Evidence[]; no_evidence?: boolean; failed_checks?: string[] };
export type Criterion = { code: string; criterion: string; max: number; mark: number; why_mark: string; strands: Strand[]; confidence: string };
export type Coach = { need: string; miss: string; ask: string[]; strong: string; direction: string };
export type StrandPlan = { id: string; plain_ask: string; where_you_are: string; steps: string[]; done_when: string; coach?: Coach | null };
export type CriterionPlan = { code: string; summary: string; quick_wins: string[]; strands: StrandPlan[] };
export type Limit = { kind: string; criterion: string; strand: string | null; detail: string; action: string };
export type Budget = { label: string; min?: number; max: number } | null;
export type SectionWords = { heading: string; words: number; table_words: number; budget: Budget };
export type TrimItem = { block_index: number; section: string | null; page: number | null; preview: string; words: number; action: 'remove' | 'shorten'; reason: string; why: string; words_saved: number; running_total: number };
export type Trim = { over_by: number; items: TrimItem[]; enough: boolean; total_saved: number };
export type Inconsistency = { strand: string; severity: string; what: string; quote_a: string; quote_b: string };
export type MarkMap = {
  mark: number; maximum: number; source_complete: boolean; over_word_limit: boolean;
  word_count: { counted: number; limit: number; over_by: number; sections: SectionWords[] };
  trim: Trim | null; criteria: Criterion[]; limits?: Limit[]; inconsistencies?: Inconsistency[];
  appendix_check: { label: string; relevant: boolean; reason: string }[]; data_sufficiency: string;
  plan: CriterionPlan[] | null; annotations?: Record<string, string[] | string>;
};
export type ReportBlock = { block_index: number; block_type?: string | null; page_number: number | null; section_title: string | null; text: string };

export const levelClass = (l: string) => (l === '5-6' ? 'l56' : l === '3-4' ? 'l34' : 'l12');

/** The nine sections of the IA in report order, and the strands each one is marked under. */
export const SECTIONS: { id: string; name: string; strands: string[]; match: RegExp }[] = [
  { id: 'rq', name: 'Research question', strands: ['RD1'], match: /research question/i },
  { id: 'bg', name: 'Background information', strands: ['RD1'], match: /background|introduction/i },
  { id: 'hy', name: 'Hypothesis', strands: ['RD1'], match: /hypothes/i },
  { id: 'va', name: 'Variables', strands: ['RD2'], match: /variable/i },
  { id: 'se', name: 'Safety and ethics', strands: ['RD2'], match: /safety|ethic/i },
  { id: 'me', name: 'Method', strands: ['RD2', 'RD3'], match: /method|procedure|protocol/i },
  { id: 'da', name: 'Data analysis', strands: ['DA1', 'DA2', 'DA3'], match: /data|analysis|result/i },
  { id: 'co', name: 'Conclusion', strands: ['CO1', 'CO2', 'CO3'], match: /conclusion|implication/i },
  { id: 'ev', name: 'Evaluation', strands: ['EV1', 'EV2'], match: /evaluat|limitation|improv/i },
];

export const allStrands = (m: MarkMap) => m.criteria.flatMap((c) => c.strands);
export const strandOf = (m: MarkMap, id: string) => allStrands(m).find((s) => s.id === id);
export const planOf = (m: MarkMap, id: string) => m.plan?.flatMap((p) => p.strands).find((s) => s.id === id);

/** Everything the student sees for one section, built from the single saved marking. */
export function sectionView(m: MarkMap, secId: string) {
  const sec = SECTIONS.find((s) => s.id === secId)!;
  const strands = sec.strands.map((id) => strandOf(m, id)).filter(Boolean) as Strand[];
  const checks: (TemplateCheck & { met: boolean })[] = TEMPLATE_CHECKS.filter((t) => t.section === secId).map((t) => ({ ...t, met: !(strandOf(m, t.strand)?.failed_checks ?? []).includes(t.id) }));
  const limits = (m.limits ?? []).filter((l) => l.strand && sec.strands.includes(l.strand) && (l.kind !== 'template' || TEMPLATE_CHECKS.some((t) => t.section === secId && l.detail.includes(t.text))) && (l.kind !== 'words' || secId === 'bg'));
  const avg = (m.limits ?? []).filter((l) => l.kind === 'average' && l.criterion && sec.strands.some((id) => id.startsWith(l.criterion)) && secId === criterionHome(l.criterion));
  // A strand can span several sections (RD1 covers the question, background and hypothesis). Its evidence and rubric steps are shown where they belong, not repeated in each.
  const home = (id: string) => STRAND_HOME[id] === secId;
  const did = strands.flatMap((s) => {
    const here = s.evidence.filter((e) => !!e.section && sec.match.test(e.section));
    return (here.length ? here : home(s.id) ? s.evidence : []).slice(0, 2).map((e) => ({ id: s.id, quote: e.quote, where: [e.section, e.page ? 'page ' + e.page : ''].filter(Boolean).join(', ') }));
  });
  const lacking = [...strands.filter((s) => home(s.id) && s.level !== '5-6' && s.missing).map((s) => ({ id: s.id, text: s.missing })), ...checks.filter((c) => !c.met).map((c) => ({ id: c.strand, text: c.text }))];
  const tplFixes = checks.filter((c) => !c.met).map((c) => ({ key: `tpl-${c.id}`, id: c.strand, text: c.fix, tpl: true }));
  const ruleFixes = strands.filter((s) => home(s.id)).flatMap((s) => {
    const p = planOf(m, s.id);
    return (p?.steps ?? (s.level === '5-6' ? [] : [s.missing])).filter(Boolean).map((t, i) => ({ key: `${s.id}-${i}`, id: s.id, text: t, tpl: false }));
  });
  const fixes = [...tplFixes, ...ruleFixes];
  const done = strands.filter((s) => home(s.id)).map((s) => planOf(m, s.id)?.done_when).filter(Boolean) as string[];
  const worst = strands.some((s) => s.level === '0' || s.level === '1-2') || checks.filter((c) => !c.met).length >= 2;
  const status: 'red' | 'amber' | 'green' = worst ? 'red' : strands.every((s) => s.level === '5-6') && checks.every((c) => c.met) ? 'green' : 'amber';
  return { sec, strands, checks, limits: [...limits, ...avg], did, lacking, fixes, done, status };
}
/** The section where each strand's rubric steps are shown. */
const STRAND_HOME: Record<string, string> = { RD1: 'bg', RD2: 'va', RD3: 'me', DA1: 'da', DA2: 'da', DA3: 'da', CO1: 'co', CO2: 'co', CO3: 'co', EV1: 'ev', EV2: 'ev' };
const criterionHome = (code: string) => ({ RD: 'bg', DA: 'da', CO: 'co', EV: 'ev' } as Record<string, string>)[code];

export { STRAND_NAMES };

/** True once the passage-specific comments exist (older maps stored one text per strand and need preparing again). */
export const hasAnnotations = (m: { annotations?: Record<string, string[] | string> }) => Object.values(m.annotations ?? {}).some(Array.isArray);
