/**
 * Pure logic for the strand-based mark map (mark-map-v2).
 * Call 1 marks the IA against the teacher strand sheet (11 strands under the 4 IB SEHS criteria).
 * Call 2 turns the result into a plain-language, IA-specific fix plan for the student.
 * The Ideal IA template is never an input to a mark.
 */
import { CRITERIA, LEVELS, STRANDS, type Strand } from './rubric.ts';

export type Block = { block_index: number; block_type?: string | null; page_number: number | null; section_title: string | null; text: string };
export const WORD_LIMIT = 3200;

const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const APPENDIX = /^\s*(appendix|appendices)\b/i;
const REFS = /^\s*(references?|bibliography|works cited|sources)\b/i;

/** Word budgets stated in the IB moderator's workshop template (SEHS IA template). Only sections the template budgets are listed. */
export const TEMPLATE_BUDGETS: { re: RegExp; label: string; min?: number; max: number }[] = [
  { re: /^(background( information)?|introduction)$/i, label: 'Background information', max: 750 },
  { re: /^(alternate |alternative )?hypothes[ie]s$/i, label: 'Alternate hypothesis', max: 120 },
  { re: /practical implications|real[- ]world/i, label: 'Practical implications', min: 200, max: 250 },
];
export type SectionWords = { heading: string; words: number; table_words: number; budget: { label: string; min?: number; max: number } | null };

/**
 * Splits the IA for marking and for the word-count guide. The WHOLE body is marked. Following the IB workshop guidance,
 * data tables, graphs, references and appendices do not count towards the 3,200-word limit and appendices are not assessed.
 * cutAt marks where an examiner would stop reading.
 */
export function splitDocument(blocks: Block[]) {
  const body: Block[] = [], appendix: Block[] = [];
  const sections: SectionWords[] = [];
  let inAppendix = false, inRefs = false, counted = 0, cutAt: { block_index: number; heading: string; page: number | null } | null = null;
  let cur: SectionWords = { heading: 'Start of report', words: 0, table_words: 0, budget: null };
  const push = () => { if (cur.words || cur.table_words) sections.push(cur); };
  for (const b of blocks) {
    const isHeading = b.block_type === 'heading' && b.text.length <= 120 && words(b.text) <= 14;
    const head = isHeading ? b.text : (b.section_title ?? '') || (b.text.length < 80 ? b.text : '');
    if (APPENDIX.test(head)) inAppendix = true;
    if (inAppendix) { appendix.push(b); continue; }
    if (isHeading) {
      inRefs = REFS.test(b.text);
      push();
      const h = b.text.replace(/\s+/g, ' ').trim();
      const m = TEMPLATE_BUDGETS.find((t) => t.re.test(h));
      cur = { heading: h, words: 0, table_words: 0, budget: m ? { label: m.label, min: m.min, max: m.max } : null };
    }
    body.push(b);
    const w = words(b.text);
    if (b.block_type === 'table_text') { cur.table_words += w; continue; }
    if (inRefs) continue;
    cur.words += w;
    counted += w;
    if (!cutAt && counted > WORD_LIMIT) cutAt = { block_index: b.block_index, heading: cur.heading, page: b.page_number };
  }
  push();
  return { body, appendix, sections, totalCounted: counted, overBy: Math.max(0, counted - WORD_LIMIT), overLimit: counted > WORD_LIMIT, cutAt };
}

export function buildDocument(blocks: Block[], maxChars: number): { text: string; complete: boolean } {
  let out = '', complete = true;
  for (const b of blocks) {
    const line = `[b${b.block_index} p${b.page_number ?? '?'} ${b.section_title ?? ''}${b.block_type === 'table_text' ? ' table_text' : ''}] ${b.text}\n`;
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
- Use ONLY evidence in the report text supplied. Appendices are not read and not marked. Raw data tables and graphs in the report body ARE evidence (they do not count towards the word limit). Do not reward length, effort or formatting. Do not default to a mid mark.
- Do NOT propagate uncertainties: if an earlier error (a wrong value, a wrong method) is carried into later work consistently, penalise it once where it was made, not again later.
- Do not require uncertainty decimals to match; judge whether uncertainty is considered appropriately for the data.
- EVIDENCE RULE: a strand may be given a level above 0 ONLY if you can quote verbatim text from the report that meets the wording of that level's descriptor. No quotation means level 0 for that strand. Statements of intent, text that only names a topic, text in appendices and text you would have to infer do not count. A criterion with no evidenced strand scores 0.
- Data must be sufficient to support a conclusion; if the data set is too thin for the processing and the conclusion, that limits Data analysis and Conclusion.
Method: for each strand give the level, one or two VERBATIM quotes from the IA (each at most 35 words) with the block_index they came from, and a reason. The reason is an analytical moderator justification of 2 to 3 sentences in the third person ("The candidate...", never "you"): (1) name the specific words of the awarded level's descriptor that the quoted evidence meets and where it appears, (2) say precisely which words of the next level's descriptor are not met and what is absent or inaccurate. Cite section names and numbers or terms from the report, so a moderator can check each claim. If nothing supports a level, quote nothing and say what you searched for. For the level above the one awarded, say in "missing" exactly what the descriptor needs that is not yet shown (plain advice; never write wording for the student to paste). Never invent evidence.
Also judge each appendix item supplied: is it relevant to the investigation (raw data, protocol, consent form, calculations) or irrelevant padding? Return JSON ONLY:
{"criteria":[{"code":"A","mark":0,"why_mark":"3-5 analytical third-person sentences: which strands fixed the mark, the best-fit reasoning across them, and the single decisive gap to the next mark","strands":[{"id":"A1","level":"0|1-2|3-4|5-6","reason":"...","evidence":[{"quote":"...","block_index":0}],"missing":"..."}],"confidence":"high|medium|low"}],"appendix_check":[{"label":"...","relevant":true,"reason":"..."}],"data_sufficiency":"one sentence"}`;

export function buildMarkPrompt(doc: string, appendix: string, meta: { overLimit: boolean; totalCounted: number }): string {
  return `Strand sheet:\n${strandSheet()}\n\n` +
    (meta.overLimit ? `NOTE: the report is about ${meta.totalCounted} words, over the ${WORD_LIMIT}-word limit. The WHOLE report is supplied. Mark all of it on its merits; do not penalise length here, because a separate guide handles word count. Lines marked table_text are data tables.\n\n` : '') +
    `IA text (each line starts with [b<block_index> p<page> <section>]):\n${doc}\n\n` +
    `Appendix items (not marked, check relevance only):\n${appendix || '(none)'}`;
}

const squash = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
const int = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);
const levelRange = (l: string) => (l === '0' ? [0, 0] : l.split('-').map(Number));

export type StrandMark = { id: string; name: string; criterion: string; level: string; reason: string; missing: string; evidence: { quote: string; block_index: number; page: number | null; section: string | null }[]; no_evidence?: boolean };
export type CriterionMark = { code: string; criterion: string; max: number; mark: number; why_mark: string; strands: StrandMark[]; confidence: string };
export type Marking = { criteria: CriterionMark[]; appendix_check: { label: string; relevant: boolean; reason: string }[]; data_sufficiency: string; dropped_quotes: number; ungrounded_strands: number };

export function assembleMarking(raw: Record<string, unknown>, blocks: Block[]): Marking | null {
  const byIndex = new Map(blocks.map((b) => [b.block_index, b]));
  let dropped = 0, ungrounded = 0;
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
      // No verified evidence in the report text, no credit: a level above 0 must be backed by at least one verbatim quote.
      if (level !== '0' && evidence.length === 0) {
        ungrounded++;
        strands.push({ id: s.id, name: s.name, criterion: c.code, level: '0', reason: 'No verified quotation from the report supports this strand, so no credit is given. ' + clean(rs.reason), missing: clean(rs.missing), evidence, no_evidence: true });
        continue;
      }
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
  return { criteria, appendix_check, data_sufficiency: clean(raw.data_sufficiency), dropped_quotes: dropped, ungrounded_strands: ungrounded };
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
Return JSON ONLY for the ONE criterion you are asked about: {"code":"A","summary":"...","quick_wins":["..."],"strands":[{"id":"A1","plain_ask":"...","where_you_are":"...","steps":["..."],"example":"...","extend_prompts":["..."],"done_when":"..."}]}`;

export const TRIM_SYSTEM = `You are an IB SEHS moderator helping a student bring an IA under the word limit. You are given the marking of the IA, the IA text and a word-count guide.
Return a ranked list of up to 14 SPECIFIC paragraphs or lines (by block_index from the IA text) that the student can remove or shorten, best to cut first, until the words saved add up to at least the words over the limit. Choose by LOGIC, never just to hit a number. Each item: {"block_index":0,"action":"remove|shorten","reason":"irrelevant|repeated|redundant|low_value|too_detailed","why":"under 20 words, why this text can go","serves":["A1"],"repeated_at":null,"shorten_to_words":0,"keep_point":"under 8 words, or empty"}. Output compact single-line JSON with no indentation or blank lines.
Reasons: irrelevant = does not help answer the research question or any strand; repeated = says again what another place already says (give that other place's block_index in repeated_at); redundant = a table, graph or figure already shows it, or it only defines or explains common knowledge such as the variables; low_value = generic text that earns no marks; too_detailed = true and useful but longer than needed, so shorten it.
"serves" lists the strand ids (A1 to D2) the text helps earn marks for, or [] if none. Cut text that serves no strand first, then repeated, then redundant. Never choose the research question, text that is the only evidence for a strand at level 3-4 or 5-6, the link between the data and the conclusion, or limitations and improvements that explain impact; shorten those at most. Do not rewrite their text.
Return JSON ONLY: {"trim":[...]}`;

export function wordGuide(sections: SectionWords[], totalCounted: number): string {
  return `\n\nWord-count guide: the limit is ${WORD_LIMIT}; the report has ${totalCounted} counted words, so about ${totalCounted - WORD_LIMIT} must go. Tables, graphs, references and appendices do not count. Sections:\n` +
    sections.map((x) => `- "${x.heading}": ${x.words} words` + (x.budget ? ` (IB workshop template budget: ${x.budget.min ? x.budget.min + '-' : 'max '}${x.budget.max} for ${x.budget.label})` : '')).join('\n');
}

export function buildPlanPrompt(m: Marking, doc: string, guide = '', only?: string): string {
  const lines = m.criteria.filter((c) => !only || c.code === only).map((c) => `Criterion ${c.code} ${c.criterion}: ${c.mark}/${c.max}. ${c.why_mark}\n` + c.strands.map((s) =>
    `  ${s.id} ${s.name}: level ${s.level}. ${s.reason} Missing for next level: ${s.missing}`).join('\n')).join('\n');
  return `${only ? `Write the plan for criterion ${only} only.\n\n` : ''}Marking result:\n${lines}\n\nIA text:\n${doc}${guide}`;
}

export type StrandPlan = { id: string; plain_ask: string; where_you_are: string; steps: string[]; example: string; extend_prompts: string[]; done_when: string };
export type CriterionPlan = { code: string; summary: string; quick_wins: string[]; strands: StrandPlan[] };
const list = (v: unknown, max: number) => (Array.isArray(v) ? v.map(clean).filter(Boolean).slice(0, max) : []);

export function assembleCriterionPlan(x: Record<string, unknown> | null, code: string): CriterionPlan | null {
  if (!x) return null;
  const rs = Array.isArray(x.strands) ? x.strands as Record<string, unknown>[] : [];
  const strands: StrandPlan[] = [];
  for (const s of STRANDS.filter((t: Strand) => t.criterion === code)) {
    const y = rs.find((z) => clean(z?.id).toUpperCase() === s.id);
    if (!y) return null;
    const steps = list(y.steps, 7), prompts = list(y.extend_prompts, 4);
    const plain_ask = clean(y.plain_ask), where_you_are = clean(y.where_you_are), example = clean(y.example), done_when = clean(y.done_when);
    if (!plain_ask || steps.length < 2 || !example || !prompts.length || !where_you_are) return null;
    strands.push({ id: s.id, plain_ask, where_you_are, steps, example, extend_prompts: prompts, done_when });
  }
  const summary = clean(x.summary);
  if (!summary) return null;
  return { code, summary, quick_wins: list(x.quick_wins, 3), strands };
}

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

const TIER: Record<string, number> = { irrelevant: 0, repeated: 1, redundant: 2, low_value: 3, too_detailed: 4 };
export type TrimItem = {
  block_index: number; section: string | null; page: number | null; preview: string; words: number; action: 'remove' | 'shorten';
  reason: string; why: string; serves: string[]; repeated_at: { block_index: number; section: string | null } | null;
  keep_point: string; words_saved: number; running_total: number;
};
export type Trim = { over_by: number; items: TrimItem[]; enough: boolean; total_saved: number };

/**
 * Validates AI removal suggestions in code. Block ids must be real counted body text (not tables, headings, references or appendix).
 * Text that is the only evidence for a strand at 3-4 or above is never removed, only shortened. Items are ordered by reason
 * (irrelevant, repeated, redundant, low value, too detailed), and words saved are computed here, never taken from the AI.
 */
export function assembleTrim(raw: Record<string, unknown>, body: Block[], marking: Marking, overBy: number): Trim | null {
  const rt = Array.isArray(raw.trim) ? raw.trim as Record<string, unknown>[] : [];
  if (!rt.length) return null;
  const byIndex = new Map(body.map((b) => [b.block_index, b]));
  const protectedBlocks = new Set<number>();
  for (const c of marking.criteria) for (const s of c.strands) if (s.level === '3-4' || s.level === '5-6') for (const e of s.evidence) protectedBlocks.add(e.block_index);
  const strandIds = new Set(STRANDS.map((x) => x.id));
  const seen = new Set<number>();
  const picked: Omit<TrimItem, 'running_total'>[] = [];
  for (const t of rt) {
    const idx = int(t?.block_index), blk = idx === null ? undefined : byIndex.get(idx);
    if (!blk || seen.has(blk.block_index) || blk.block_type === 'table_text' || blk.block_type === 'heading') continue;
    const w = words(blk.text);
    if (w < 8) continue;
    let reason = clean(t.reason);
    if (!(reason in TIER)) continue;
    let action: 'remove' | 'shorten' = clean(t.action) === 'shorten' || reason === 'too_detailed' ? 'shorten' : 'remove';
    const rep = int((t.repeated_at as unknown));
    const repBlk = rep === null ? undefined : byIndex.get(rep);
    if (reason === 'repeated' && (!repBlk || repBlk.block_index === blk.block_index)) reason = 'low_value';
    const serves = (Array.isArray(t.serves) ? t.serves : []).map((x) => clean(x).toUpperCase()).filter((x) => strandIds.has(x));
    if (protectedBlocks.has(blk.block_index)) action = 'shorten';
    const target = int(t.shorten_to_words);
    const keep = action === 'shorten' ? Math.min(w - 1, Math.max(1, target ?? Math.round(w / 2))) : 0;
    const why = clean(t.why);
    if (!why) continue;
    seen.add(blk.block_index);
    picked.push({
      block_index: blk.block_index, section: blk.section_title, page: blk.page_number,
      preview: blk.text.replace(/\s+/g, ' ').split(' ').slice(0, 14).join(' ') + (w > 14 ? '…' : ''), words: w, action, reason, why,
      serves, repeated_at: reason === 'repeated' && repBlk ? { block_index: repBlk.block_index, section: repBlk.section_title } : null,
      keep_point: clean(t.keep_point), words_saved: w - keep,
    });
  }
  if (!picked.length) return null;
  picked.sort((a, b) => (a.serves.length ? 1 : 0) - (b.serves.length ? 1 : 0) || TIER[a.reason] - TIER[b.reason]);
  let run = 0;
  const items = picked.map((p) => { run += p.words_saved; return { ...p, running_total: run }; });
  return { over_by: overBy, items, enough: run >= overBy, total_saved: run };
}
