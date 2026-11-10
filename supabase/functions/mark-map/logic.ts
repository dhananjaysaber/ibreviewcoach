/**
 * Pure logic for the strand-based mark map (mark-map-v2).
 * Call 1 marks the IA against the teacher strand sheet (11 strands under the 4 IB SEHS criteria).
 * Call 2 turns the result into a plain-language, IA-specific fix plan for the student.
 * The Ideal IA template is never an input to a mark.
 */
import { CRITERIA, LEVELS, STRANDS, type Strand } from './rubric.ts';

export type Block = { block_index: number; page_number: number | null; section_title: string | null; text: string };
export const WORD_LIMIT = 3200;

const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const APPENDIX = /^\s*(appendix|appendices)\b/i;
const REFS = /^\s*(references?|bibliography|works cited|sources)\b/i;

/** Splits the IA into what an examiner reads (body up to the word limit) and appendices (not read). */
export function splitDocument(blocks: Block[]) {
  const body: Block[] = [], appendix: Block[] = [];
  let inAppendix = false, counted = 0, stopped = false, overLimit = false;
  for (const b of blocks) {
    const head = (b.section_title ?? '') || (b.text.length < 80 ? b.text : '');
    if (APPENDIX.test(head)) inAppendix = true;
    if (inAppendix) { appendix.push(b); continue; }
    if (stopped) continue;
    const isRef = REFS.test(b.section_title ?? '');
    const w = isRef ? 0 : words(b.text);
    if (counted + w > WORD_LIMIT) { overLimit = true; stopped = true; continue; }
    counted += w;
    body.push(b);
  }
  const totalBodyWords = blocks.filter((b) => !appendix.includes(b) && !REFS.test(b.section_title ?? '')).reduce((a, b) => a + words(b.text), 0);
  return { body, appendix, wordsMarked: counted, totalBodyWords, overLimit };
}

export function buildDocument(blocks: Block[], maxChars: number): { text: string; complete: boolean } {
  let out = '', complete = true;
  for (const b of blocks) {
    const line = `[b${b.block_index} p${b.page_number ?? '?'} ${b.section_title ?? ''}] ${b.text}\n`;
    if (out.length + line.length > maxChars) { complete = false; break; }
    out += line;
  }
  return { text: out, complete };
}

export function appendixDigest(appendix: Block[], max = 14): string {
  return appendix.filter((b) => b.text.trim().length > 20).slice(0, max)
    .map((b) => `[b${b.block_index} ${b.section_title ?? ''}] ${b.text.replace(/\s+/g, ' ').slice(0, 240)}`).join('\n');
}

const strandSheet = () => CRITERIA.map((c) =>
  `CRITERION ${c.code}: ${c.name} (0-6)\n` + STRANDS.filter((s) => s.criterion === c.code).map((s) =>
    `  ${s.id} ${s.name}\n    0: The report does not reach the standard described by the descriptors below.\n` +
    LEVELS.slice(1).map((l) => `    ${l}: ${s.levels[l]}`).join('\n')).join('\n')).join('\n\n');

export const MARK_SYSTEM = `You are an experienced IB Sports, Exercise and Health Science (SEHS) IA moderator marking an Internal Assessment with the teacher strand sheet, which breaks the official IB criteria into strands.
Rules from the IB marking guidance you must follow:
- Mark by BEST FIT. For each strand pick the level (0, 1-2, 3-4, 5-6) whose descriptor fits best. Then give each criterion ONE whole-number mark from 0 to 6 that best fits all its strands together. Not every strand must be at the same level.
- Whole numbers only. Mark POSITIVELY: credit what is there; do not penalise a missing extra.
- Use ONLY evidence in the report text supplied. Appendices are not read and not marked. Do not reward length, effort or formatting. Do not default to a mid mark.
- Do NOT propagate uncertainties: if an earlier error (a wrong value, a wrong method) is carried into later work consistently, penalise it once where it was made, not again later.
- Do not require uncertainty decimals to match; judge whether uncertainty is considered appropriately for the data.
- Data must be sufficient to support a conclusion; if the data set is too thin for the processing and the conclusion, that limits Data analysis and Conclusion.
Method: for each strand give the level, one or two VERBATIM quotes from the IA (each at most 35 words) with the block_index they came from, and a short reason. If nothing supports a level, quote nothing and say what you searched for. For the level above the one awarded, say in "missing" exactly what the descriptor needs that is not yet shown (plain advice; never write wording for the student to paste). Never invent evidence.
Also judge each appendix item supplied: is it relevant to the investigation (raw data, protocol, consent form, calculations) or irrelevant padding? Return JSON ONLY:
{"criteria":[{"code":"A","mark":0,"why_mark":"2-4 plain sentences naming what fixed the mark","strands":[{"id":"A1","level":"0|1-2|3-4|5-6","reason":"...","evidence":[{"quote":"...","block_index":0}],"missing":"..."}],"confidence":"high|medium|low"}],"appendix_check":[{"label":"...","relevant":true,"reason":"..."}],"data_sufficiency":"one sentence"}`;

export function buildMarkPrompt(doc: string, appendix: string, meta: { overLimit: boolean; wordsMarked: number }): string {
  return `Strand sheet:\n${strandSheet()}\n\n` +
    (meta.overLimit ? `NOTE: the report exceeds the ${WORD_LIMIT}-word limit; only the first ${meta.wordsMarked} words are supplied, as examiners stop reading at the limit.\n\n` : '') +
    `IA text (each line starts with [b<block_index> p<page> <section>]):\n${doc}\n\n` +
    `Appendix items (not marked, check relevance only):\n${appendix || '(none)'}`;
}

const squash = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
const int = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);
const levelRange = (l: string) => (l === '0' ? [0, 0] : l.split('-').map(Number));

export type StrandMark = { id: string; name: string; criterion: string; level: string; reason: string; missing: string; evidence: { quote: string; block_index: number; page: number | null; section: string | null }[] };
export type CriterionMark = { code: string; criterion: string; max: number; mark: number; why_mark: string; strands: StrandMark[]; confidence: string };
export type Marking = { criteria: CriterionMark[]; appendix_check: { label: string; relevant: boolean; reason: string }[]; data_sufficiency: string; dropped_quotes: number };

export function assembleMarking(raw: Record<string, unknown>, blocks: Block[]): Marking | null {
  const byIndex = new Map(blocks.map((b) => [b.block_index, b]));
  let dropped = 0;
  const rawCriteria = Array.isArray(raw.criteria) ? raw.criteria as Record<string, unknown>[] : [];
  const criteria: CriterionMark[] = [];
  for (const c of CRITERIA) {
    const rc = rawCriteria.find((x) => clean(x?.code).toUpperCase() === c.code);
    if (!rc) return null;
    const rawStrands = Array.isArray(rc.strands) ? rc.strands as Record<string, unknown>[] : [];
    const strands: StrandMark[] = [];
    for (const s of STRANDS.filter((x) => x.criterion === c.code)) {
      const rs = rawStrands.find((x) => clean(x?.id).toUpperCase() === s.id);
      const level = clean(rs?.level);
      if (!rs || !(LEVELS as readonly string[]).includes(level)) return null;
      const evidence = (Array.isArray(rs.evidence) ? rs.evidence : []).slice(0, 3).flatMap((e: unknown) => {
        const eo = (e ?? {}) as Record<string, unknown>;
        const quote = clean(eo.quote), idx = int(eo.block_index), blk = idx === null ? undefined : byIndex.get(idx);
        if (!quote || !blk || quote.split(' ').length > 45 || !squash(blk.text).includes(squash(quote).replace(/[….]+$/, ''))) { if (quote) dropped++; return []; }
        return [{ quote, block_index: blk.block_index, page: blk.page_number, section: blk.section_title }];
      });
      strands.push({ id: s.id, name: s.name, criterion: c.code, level, reason: clean(rs.reason), missing: clean(rs.missing), evidence });
    }
    let mark = int(rc.mark);
    if (mark === null) return null;
    const lo = Math.min(...strands.map((s) => levelRange(s.level)[0])), hi = Math.max(...strands.map((s) => levelRange(s.level).slice(-1)[0]));
    mark = Math.max(lo, Math.min(hi, Math.max(0, Math.min(c.max, mark))));
    const why = clean(rc.why_mark);
    if (!why) return null;
    const conf = clean(rc.confidence);
    criteria.push({ code: c.code, criterion: c.name, max: c.max, mark, why_mark: why, strands, confidence: ['high', 'medium', 'low'].includes(conf) ? conf : 'medium' });
  }
  const appendix_check = (Array.isArray(raw.appendix_check) ? raw.appendix_check : []).slice(0, 14).flatMap((a: unknown) => {
    const o = (a ?? {}) as Record<string, unknown>;
    const label = clean(o.label);
    return label ? [{ label, relevant: o.relevant === true, reason: clean(o.reason) }] : [];
  });
  return { criteria, appendix_check, data_sufficiency: clean(raw.data_sufficiency), dropped_quotes: dropped };
}

export function totals(list: CriterionMark[]) {
  return { mark: list.reduce((a, c) => a + c.mark, 0), maximum: list.reduce((a, c) => a + c.max, 0) };
}

/* ---------------- Call 2: student fix plan ---------------- */

export const PLAN_SYSTEM = `You are a patient IB SEHS coach writing a fix plan for a student who may find writing and science hard. You are given the marking of their IA and the IA text.
Write for a 16-year-old with low confidence: short sentences, everyday words, no jargon without a one-line meaning in brackets. Be kind and specific. Always refer to THEIR topic, variables and sections by name.
This is coaching, not authoring: never write sentences, numbers or wording the student could paste into their IA.
For EVERY strand return:
- plain_ask: what this strand is asking for, in one simple sentence.
- where_you_are: 2 sentences on what they already do (point to the section) and what is missing.
- steps: 3 to 6 numbered, concrete actions, each starting with a verb, saying where in the IA to do it and what to look at or check. Aim at the next level up.
- example: a short worked example on a DIFFERENT, unrelated sports-science topic that shows what a stronger version looks like (never their topic). It is explanation only.
- extend_prompts: 2 or 3 prompts the student can type into an AI chat to learn how to improve it. Each prompt must ask the AI to ask questions, explain or give feedback and must say "do not write my IA for me".
- done_when: one line they can use to check the strand is finished.
Rules: do not tell students to match decimals or to carry uncertainties forward; mark positively; the report body counts, not appendices; stay within the 3,200-word limit by saying what to shorten when relevant.
Also per criterion: summary (2 sentences on why they got this mark and the single biggest thing to fix) and quick_wins (up to 3 small fixes).
Return JSON ONLY: {"criteria":[{"code":"A","summary":"...","quick_wins":["..."],"strands":[{"id":"A1","plain_ask":"...","where_you_are":"...","steps":["..."],"example":"...","extend_prompts":["..."],"done_when":"..."}]}]}`;

export function buildPlanPrompt(m: Marking, doc: string): string {
  const lines = m.criteria.map((c) => `Criterion ${c.code} ${c.criterion}: ${c.mark}/${c.max}. ${c.why_mark}\n` + c.strands.map((s) =>
    `  ${s.id} ${s.name}: level ${s.level}. ${s.reason} Missing for next level: ${s.missing}`).join('\n')).join('\n');
  return `Marking result:\n${lines}\n\nIA text:\n${doc}`;
}

export type StrandPlan = { id: string; plain_ask: string; where_you_are: string; steps: string[]; example: string; extend_prompts: string[]; done_when: string };
export type CriterionPlan = { code: string; summary: string; quick_wins: string[]; strands: StrandPlan[] };
const list = (v: unknown, max: number) => (Array.isArray(v) ? v.map(clean).filter(Boolean).slice(0, max) : []);

export function assemblePlan(raw: Record<string, unknown>): CriterionPlan[] | null {
  const rc = Array.isArray(raw.criteria) ? raw.criteria as Record<string, unknown>[] : [];
  const out: CriterionPlan[] = [];
  for (const c of CRITERIA) {
    const x = rc.find((y) => clean(y?.code).toUpperCase() === c.code);
    if (!x) return null;
    const rs = Array.isArray(x.strands) ? x.strands as Record<string, unknown>[] : [];
    const strands: StrandPlan[] = [];
    for (const s of STRANDS.filter((t: Strand) => t.criterion === c.code)) {
      const y = rs.find((z) => clean(z?.id).toUpperCase() === s.id);
      if (!y) return null;
      const steps = list(y.steps, 7), prompts = list(y.extend_prompts, 4);
      const plain_ask = clean(y.plain_ask), where_you_are = clean(y.where_you_are), example = clean(y.example), done_when = clean(y.done_when);
      if (!plain_ask || steps.length < 2 || !example || !prompts.length || !where_you_are) return null;
      strands.push({ id: s.id, plain_ask, where_you_are, steps, example, extend_prompts: prompts, done_when });
    }
    const summary = clean(x.summary);
    if (!summary) return null;
    out.push({ code: c.code, summary, quick_wins: list(x.quick_wins, 3), strands });
  }
  return out;
}
