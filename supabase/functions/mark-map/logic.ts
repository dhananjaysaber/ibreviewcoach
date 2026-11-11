/**
 * Pure logic for the strand-based mark map (mark-map-v2).
 * Call 1 marks the IA against the teacher strand sheet (11 strands under the 4 IB SEHS criteria).
 * Call 2 turns the result into a plain-language, IA-specific fix plan for the student.
 * The Ideal IA template is never an input to a mark.
 */
import { CHECKS, CRITERIA, LEVEL0, LEVELS, OFFICIAL_TERMS, STRANDS, TEMPLATE_CHECKS, type Strand } from './rubric.ts';

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

const strandSheet = (only?: readonly string[]) => CRITERIA.filter((c) => !only || only.includes(c.code)).map((c) =>
  `CRITERION ${c.code}: ${c.name} (0-6)\n` + STRANDS.filter((s) => s.criterion === c.code).map((s) =>
    `  ${s.id} ${s.name}\n    0: ${LEVEL0[c.code]}\n` +
    LEVELS.slice(1).map((l) => `    ${l}: ${s.levels[l]}`).join('\n') +
    `\n    IB checks for this strand: ${(CHECKS[s.id] ?? []).join(' | ')}` +
    `\n    Moderator template checks (mandatory): ${TEMPLATE_CHECKS.filter((t) => t.strand === s.id).map((t) => `${t.id} = ${t.text}`).join(' | ') || 'none'}`).join('\n')).join('\n\n');

export const MARK_SYSTEM = `You are an experienced IB Sports, Exercise and Health Science (SEHS) IA moderator marking an Internal Assessment with the teacher strand sheet, which breaks the official IB criteria into strands.
Rules from the IB marking guidance you must follow:
- Mark by BEST FIT. For each strand pick the level (0, 1-2, 3-4, 5-6) whose descriptor fits best. Then give each criterion ONE whole-number mark from 0 to 6 that best fits all its strands together. Not every strand must be at the same level.
- Whole numbers only. Mark POSITIVELY: credit what is there; do not penalise a missing extra.
- Use ONLY evidence in the report text supplied. Appendices are not read and not marked. Raw data tables and graphs in the report body ARE evidence (they do not count towards the word limit). Do not reward length, effort or formatting. Do not default to a mid mark.
- Do NOT propagate uncertainties: if an earlier error (a wrong value, a wrong method) is carried into later work consistently, penalise it once where it was made, not again later.
- Do not require uncertainty decimals to match; judge whether uncertainty is considered appropriately for the data.
- EVIDENCE RULE: a strand may be given a level above 0 ONLY if you can quote verbatim text from the report that meets the wording of that level's descriptor. No quotation means level 0 for that strand. Statements of intent, text that only names a topic, text in appendices and text you would have to infer do not count. A criterion with no evidenced strand scores 0.
- IB CHECKS: each strand lists what IB teachers check for (from the IB SEHS teacher support material). Judge the evidence against those checks. A missed check can lower or confirm a level; it never raises one. Apply them strictly: a generic limitation or generic improvement does not reach 3-4 on EV1 or EV2 unless tied to a specific weakness of this method; switching air conditioning off is not control of temperature; a non-significant result presented as support limits CO1.
- CONSISTENCY: if the report contradicts itself (the same quantity with different values in different places, text that differs from a table or graph, a conclusion that differs from the analysis), list it under "inconsistencies" with two verbatim quotes, one from each place. Mark it as 'significant' if it affects a processed value or the conclusion, or 'minor' if it is a small slip in presentation. Do not invent inconsistencies and do not list differences that are only rounding.
- OFFICIAL TERMS (IB assessment criteria, these fix what the descriptor words mean):
${OFFICIAL_TERMS}
- TEMPLATE CHECKS: each strand lists mandatory checks from the IB moderator's SEHS IA template. In "failed_checks" list the id of every check the report text does NOT meet (an empty list if all are met). A check is met only if the report text shows it explicitly; nothing is assumed. A strand with any failed check cannot be above 3-4. Never invent a failed check id.
- Data must be sufficient to support a conclusion; if the data set is too thin for the processing and the conclusion, that limits Data analysis and Conclusion.
Method: for each strand give the level, one or two VERBATIM quotes from the IA (each 8 to 35 words, copied character for character from ONE line of the report, never joining separate sentences or lines with an ellipsis, never paraphrased) with the block_index they came from, and a reason. The reason is an analytical moderator justification of 2 to 3 sentences in the third person ("The candidate...", never "you"): (1) name the specific words of the awarded level's descriptor that the quoted evidence meets and where it appears, (2) say precisely which words of the next level's descriptor are not met and what is absent or inaccurate. Cite section names and numbers or terms from the report, so a moderator can check each claim. If nothing supports a level, quote nothing and say what you searched for. For the level above the one awarded, say in "missing" exactly what the descriptor needs that is not yet shown (plain advice; never write wording for the student to paste). Never invent evidence.
Also judge each appendix item supplied: is it relevant to the investigation (raw data, protocol, consent form, calculations) or irrelevant padding? The output must be valid JSON: inside any string value use single quotes for your own quotation marks, and write any double quote that is part of a copied report quote as \\\"; never leave a raw double quote inside a string. Return JSON ONLY:
{"criteria":[{"code":"RD","mark":0,"why_mark":"3-5 analytical third-person sentences: which strands fixed the mark, the best-fit reasoning across them, and the single decisive gap to the next mark","strands":[{"id":"RD1","level":"0|1-2|3-4|5-6","reason":"...","evidence":[{"quote":"...","block_index":0}],"missing":"...","failed_checks":["check_id"]}],"confidence":"high|medium|low"}],"appendix_check":[{"label":"...","relevant":true,"reason":"..."}],"data_sufficiency":"one sentence","inconsistencies":[{"strand":"DA1","severity":"significant|minor","what":"which quantity or statement disagrees, in one sentence","quote_a":"...","quote_b":"..."}]}`;

/** The marking is split in two parallel calls (RD+DA and CO+EV) so each finishes well inside the function time limit. */
export const MARK_PARTS: { codes: readonly string[]; first: boolean }[] = [{ codes: ['RD', 'DA'], first: true }, { codes: ['CO', 'EV'], first: false }];
export function mergeMarkParts(parts: (Record<string, unknown> | null)[]): Record<string, unknown> | null {
  if (parts.some((p) => !p)) return null;
  const ps = parts as Record<string, unknown>[];
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  return { criteria: ps.flatMap((p) => arr(p.criteria)), appendix_check: arr(ps[0].appendix_check), data_sufficiency: ps[0].data_sufficiency ?? '', inconsistencies: ps.flatMap((p) => arr(p.inconsistencies)) };
}

export function buildMarkPrompt(doc: string, appendix: string, meta: { overLimit: boolean; totalCounted: number }, part: { codes: readonly string[]; first: boolean } = { codes: ['RD', 'DA', 'CO', 'EV'], first: true }): string {
  const all = part.codes.length === CRITERIA.length;
  return `Strand sheet:\n${strandSheet(part.codes)}\n\n` +
    (all ? '' : `IN THIS RESPONSE mark ONLY criteria ${part.codes.join(' and ')}: the "criteria" array must contain exactly those criteria. Still read the WHOLE report, and list any inconsistency you find that touches your strands. ${part.first ? '' : 'Return "appendix_check":[] and "data_sufficiency":"" because they are handled elsewhere. '}\n\n`) +
    (meta.overLimit ? `NOTE: the report is about ${meta.totalCounted} words, over the ${WORD_LIMIT}-word limit. The WHOLE report is supplied. Mark all of it on its merits; do not penalise length here, because a separate guide handles word count. Lines marked table_text are data tables.\n\n` : '') +
    `IA text (each line starts with [b<block_index> p<page> <section>]):\n${doc}\n\n` +
    (part.first ? `Appendix items (not marked, check relevance only):\n${appendix || '(none)'}` : 'Appendix items are not needed for this part.');
}

const squash = (s: string) => s.normalize('NFKC').replace(/[‘’‛]/g, "'").replace(/[“”]/g, '"').replace(/[‐-―−]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
/** A quote is verified when every non-trivial segment (split at an ellipsis) appears verbatim in the block, ignoring quote-mark, dash and spacing variants. */
const quoteIn = (text: string, quote: string): boolean => {
  const t = squash(text);
  const segs = quote.split(/…|\.{3}/).map((x) => squash(x).replace(/^[\s.,;:'"]+|[\s.,;:'"]+$/g, '')).filter((x) => x.length >= 12);
  return segs.length > 0 && segs.every((x) => t.includes(x));
};
const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
const int = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);
const levelRange = (l: string) => (l === '0' ? [0, 0] : l.split('-').map(Number));

export type StrandMark = { id: string; name: string; criterion: string; level: string; reason: string; missing: string; evidence: { quote: string; block_index: number; page: number | null; section: string | null }[]; no_evidence?: boolean; failed_checks: string[] };
export type CriterionMark = { code: string; criterion: string; max: number; mark: number; why_mark: string; strands: StrandMark[]; confidence: string };
export type Inconsistency = { strand: string; severity: 'significant' | 'minor'; what: string; quote_a: string; quote_b: string; page_a: number | null; page_b: number | null };
export type Limit = { kind: 'no_evidence' | 'inconsistency' | 'inconsistency_minor' | 'average' | 'template' | 'words'; criterion: string; strand: string | null; detail: string; action: string };
export type Marking = { criteria: CriterionMark[]; appendix_check: { label: string; relevant: boolean; reason: string }[]; data_sufficiency: string; dropped_quotes: number; ungrounded_strands: number; inconsistencies: Inconsistency[]; limits: Limit[] };

/** Author-year and numbered citations found in a stretch of text. Used to estimate how many sources a section cites. */
export function citationKeys(text: string): Set<string> {
  const keys = new Set<string>();
  const ay = /([A-Z][A-Za-z'\u2019-]{2,})(?: et al\.?)?(?:,? (?:and|&) [A-Z][A-Za-z'\u2019-]+)?,? *\(?((?:19|20)\d{2})[a-z]?\)?/g;
  for (const m of text.matchAll(ay)) keys.add(`${m[1].toLowerCase()}-${m[2]}`);
  for (const m of text.matchAll(/\[(\d{1,3}(?:\s*[,\u2013-]\s*\d{1,3})*)\]/g)) for (const n of m[1].split(/\s*[,\u2013-]\s*/)) keys.add(`n${n}`);
  return keys;
}
const sectionText = (blocks: Block[], re: RegExp) => {
  const hit = blocks.filter((b) => b.block_type !== 'table_text' && re.test(b.section_title ?? ''));
  return hit.length ? hit.map((b) => b.text).join('\n') : null;
};
/** Template word budgets that the report goes over (the minimum is only advice). */
export function wordLimits(sections: SectionWords[]): Limit[] {
  return sections.filter((x) => x.budget && x.words > x.budget.max).map((x) => ({
    kind: 'words' as const, criterion: 'RD', strand: 'RD1',
    detail: `${x.budget!.label} is ${x.words} words and the template budget is ${x.budget!.max}.`,
    action: 'Cut text that earns no marks first (definitions, repeated points, long descriptions of a table).',
  }));
}

export function assembleMarking(raw: Record<string, unknown>, blocks: Block[]): Marking | null {
  const byIndex = new Map(blocks.map((b) => [b.block_index, b]));
  let dropped = 0, ungrounded = 0;
  const rawCriteria = Array.isArray(raw.criteria) ? raw.criteria as Record<string, unknown>[] : [];
  const criteria: CriterionMark[] = [];
  const limits: Limit[] = [];
  // Contradictions inside the report. Both quotes must be found in the report text, otherwise the item is dropped.
  const inconsistencies: Inconsistency[] = (Array.isArray(raw.inconsistencies) ? raw.inconsistencies : []).slice(0, 8).flatMap((x: unknown) => {
    const o = (x ?? {}) as Record<string, unknown>;
    const qa = clean(o.quote_a), qb = clean(o.quote_b), what = clean(o.what), strand = clean(o.strand).toUpperCase();
    if (!qa || !qb || !what || qa.split(' ').length > 45 || qb.split(' ').length > 45) return [];
    const ba = blocks.find((b) => quoteIn(b.text, qa)), bb = blocks.find((b) => quoteIn(b.text, qb));
    if (!ba || !bb || (ba.block_index === bb.block_index && squash(qa) === squash(qb))) return [];
    return [{ strand: ['DA1', 'DA2', 'DA3', 'CO1'].includes(strand) ? strand : 'DA1', severity: clean(o.severity) === 'significant' ? 'significant' as const : 'minor' as const, what, quote_a: qa, quote_b: qb, page_a: ba.page_number, page_b: bb.page_number }];
  });
  const bgText = sectionText(blocks, /background|introduction/i), coText = sectionText(blocks, /conclusion/i);
  const bgKeys = bgText ? citationKeys(bgText) : null;
  const newKeys = coText ? [...citationKeys(coText)].filter((k) => !(bgKeys ?? new Set()).has(k)) : null;
  const FIX_INCONSISTENCY = 'Check the correct value against your raw data and table, then use that same value everywhere (text, table, graph and conclusion). Re-check any calculation that used the wrong value.';
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
        const quote = clean(eo.quote), idx = int(eo.block_index);
        if (!quote || quote.split(' ').length > 45) { if (quote) dropped++; return []; }
        // Trust the cited block if it contains the quote; otherwise find the one block that does (the model may mis-number a block).
        let blk = idx === null ? undefined : byIndex.get(idx);
        if (!blk || !quoteIn(blk.text, quote)) blk = blocks.find((b) => quoteIn(b.text, quote));
        if (!blk) { dropped++; return []; }
        return [{ quote, block_index: blk.block_index, page: blk.page_number, section: blk.section_title }];
      });
      // No verified evidence in the report text, no credit: a level above 0 must be backed by at least one verbatim quote.
      if (level !== '0' && evidence.length === 0) {
        ungrounded++;
        limits.push({ kind: 'no_evidence', criterion: c.code, strand: s.id, detail: `${s.id} ${s.name}: no text in the report body shows this, so it earns no credit.`, action: clean(rs.missing) || `Show ${s.name.toLowerCase()} in the body of the report, not only in an appendix.` });
        strands.push({ id: s.id, name: s.name, criterion: c.code, level: '0', reason: 'No verified quotation from the report supports this strand, so no credit is given. ' + clean(rs.reason), missing: clean(rs.missing), evidence, no_evidence: true, failed_checks: [] });
        continue;
      }
      // Mandatory moderator-template checks. The model lists the ones not met; two are counted in code. Any miss holds the strand at 3-4.
      const mine = TEMPLATE_CHECKS.filter((t) => t.strand === s.id);
      const failed = new Set((Array.isArray(rs.failed_checks) ? rs.failed_checks : []).map((x) => clean(x)).filter((x) => mine.some((t) => t.id === x)));
      if (bgKeys && s.id === 'RD1') { if (bgKeys.size < 4) failed.add('bg_sources'); else failed.delete('bg_sources'); }
      if (newKeys && s.id === 'CO2') { if (newKeys.length < 2) failed.add('lit_new'); else failed.delete('lit_new'); }
      let lv = level, why = clean(rs.reason);
      if (level !== '0') for (const t of mine.filter((x) => failed.has(x.id))) {
        const extra = t.id === 'bg_sources' && bgKeys ? ` About ${bgKeys.size} cited source${bgKeys.size === 1 ? '' : 's'} found in the background (an estimate from the citations).` : t.id === 'lit_new' && newKeys ? ` About ${newKeys.length} new cited source${newKeys.length === 1 ? '' : 's'} found in the conclusion.` : '';
        limits.push({ kind: 'template', criterion: c.code, strand: s.id, detail: `Moderator template: ${t.text}.${extra}`, action: t.fix });
      }
      if (level === '5-6' && failed.size) { lv = '3-4'; why = `Held at 3-4 because moderator template checks are missing (${mine.filter((t) => failed.has(t.id)).map((t) => t.id).join(', ')}). ` + why; }
      strands.push({ id: s.id, name: s.name, criterion: c.code, level: lv, reason: why, missing: clean(rs.missing), evidence, failed_checks: level === '0' ? [] : [...failed] });
    }
    for (const inc of inconsistencies.filter((i) => i.severity === 'significant' && i.strand.startsWith(c.code))) {
      const st = strands.find((x) => x.id === inc.strand);
      if (st && st.level === '5-6') {
        st.level = '3-4';
        st.reason = `Capped at 3-4 because the report contradicts itself: ${inc.what} ` + st.reason;
      }
      limits.push({ kind: 'inconsistency', criterion: c.code, strand: inc.strand, detail: `${inc.what} Found at: "${inc.quote_a}" and "${inc.quote_b}".`, action: FIX_INCONSISTENCY });
    }
    for (const inc of inconsistencies.filter((i) => i.severity === 'minor' && i.strand.startsWith(c.code))) {
      limits.push({ kind: 'inconsistency_minor', criterion: c.code, strand: inc.strand, detail: `${inc.what} Found at: "${inc.quote_a}" and "${inc.quote_b}".`, action: FIX_INCONSISTENCY + ' This is a small slip and is not lowering the mark now, but a moderator will notice it.' });
    }
    let mark = int(rc.mark);
    if (mark === null) return null;
    const lo = Math.min(...strands.map((s) => levelRange(s.level)[0])), hi = Math.max(...strands.map((s) => levelRange(s.level).slice(-1)[0]));
    mark = Math.max(lo, Math.min(hi, Math.max(0, Math.min(c.max, mark))));
    // The criterion mark cannot round up from the strand levels: it is held at the average of the strand midpoints, rounded half down.
    // If every strand sits at the same level the top of that level is allowed.
    {
      const mid = (l: string) => (l === '0' ? 0 : (levelRange(l)[0] + levelRange(l)[1]) / 2);
      const avg = strands.reduce((a, x) => a + mid(x.level), 0) / strands.length;
      const same = strands.every((x) => x.level === strands[0].level);
      const cap = Math.max(lo, same ? levelRange(strands[0].level).slice(-1)[0] : Math.ceil(avg - 0.5));
      if (mark > cap) {
        const weak = strands.filter((x) => mid(x.level) < avg).map((x) => x.id);
        limits.push({ kind: 'average', criterion: c.code, strand: null, detail: `${c.criterion} is held at ${cap}/${c.max} because its strands average about ${avg.toFixed(1)}; the weaker strands (${weak.join(', ') || 'none'}) limit it.`, action: `Raise ${weak.join(', ') || 'the weaker strands'} first: ${strands.filter((x) => weak.includes(x.id)).map((x) => x.missing).filter(Boolean).join(' ')}`.trim() });
        mark = cap;
      }
    }
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
  return { criteria, appendix_check, data_sufficiency: clean(raw.data_sufficiency), dropped_quotes: dropped, ungrounded_strands: ungrounded, inconsistencies, limits };
}

export function totals(list: CriterionMark[]) {
  return { mark: list.reduce((a, c) => a + c.mark, 0), maximum: list.reduce((a, c) => a + c.max, 0) };
}

/* ---------------- Call 2: student fix plan ---------------- */

export const PLAN_SYSTEM = `You are a patient IB SEHS coach writing the fix plan for a student who may find writing and science hard, and the matching guidance for their teacher. You are given the marking of their IA, what is holding the mark down, and the IA text.
Write for a 16-year-old with low confidence: short sentences, everyday words, no jargon without a one-line meaning in brackets. Be kind and specific. Always use THEIR topic: their own variables, sample, tools, tables, graphs and section names. Never use examples from other topics.
The STUDENT part is coaching, not authoring: never write sentences, numbers or wording the student could paste into their IA. Say what to add, where, and what to check.
For EVERY strand return:
- plain_ask: what this strand is asking for, in one simple sentence.
- where_you_are: 2 sentences on what they already do (point to the section) and what is missing.
- steps: 3 to 6 concrete actions, each starting with a verb, saying where in the IA to do it, using their own variables and sample. Cover every item listed as holding the mark down, except the 'Moderator template' items, which are shown to the student separately with their own fix: do not repeat those. Aim your steps at the words of the next level's descriptor and at the quality of what is already written. Aim at the next level up.
- done_when: one line they can use to check the strand is finished.
- coach: for the TEACHER only, and only if the strand is below 5-6 (otherwise null): {"need":"what the descriptor needs, in plain words so it cannot be misread","miss":"what is missing in this report, quoting the weak passage in single quotes","ask":["2 or 3 questions or directions the teacher can use in conversation"],"strong":"what a stronger version contains, described by its features","direction":"2 or 3 sentences on this student's own topic that show the teacher what to steer the student towards, spoken or as prompts, written so the teacher guides and does not hand over wording"}.
Rules: do not tell students to match decimals or to carry uncertainties forward; mark positively; the report body counts, not appendices; stay within the 3,200-word limit by saying what to shorten when relevant; the moderator template checks are required, not optional.
Also per criterion: summary (2 sentences on why they got this mark and the single biggest thing to fix) and quick_wins (up to 3 small fixes).
Use single quotes inside strings. Return JSON ONLY for the ONE criterion you are asked about: {"code":"RD","summary":"...","quick_wins":["..."],"strands":[{"id":"RD1","plain_ask":"...","where_you_are":"...","steps":["..."],"done_when":"...","coach":{"need":"...","miss":"...","ask":["..."],"strong":"...","direction":"..."}}]}`;

export const ANNOTATE_SYSTEM = `You are the internal assessor writing margin comments on an IB SEHS IA for the external moderator. Each comment is attached to ONE highlighted passage of the report and must be about that passage only.
You are given, for each strand, the descriptor wording and the IB moderator's template expectations for that strand, each marked SHOWN or NOT SHOWN in the report as a whole.
For every numbered passage, write one comment of 35 to 60 words in the third person ('The candidate...'), in flowing prose, in this order:
1. TEMPLATE: briefly name which template expectations this passage answers, with specifics from it (the variables, tool, sample, value, table, source or claim). Mention only expectations this passage actually addresses.
2. RUBRIC: in positive terms, say what that achieves against the strand's descriptor ideas, so the level is justified (for example 'so the considerations are described rather than explained').
3. GAP, only if the level is below 5-6: one diplomatic clause that names a template expectation marked NOT SHOWN that belongs to this passage's section, or what would take this passage to the next level, phrased as an opportunity ('would be stronger if...', 'could go further by...'). Never invent a gap for something the passage already shows. If the passage fully meets the strand, say what makes it secure and add no gap.
Start the comment with the strand code and level, for example 'RD2 3-4:'.
Do NOT mention: word counts or word limits, the number of sources, source verification, other sections of the report, marks, or what the student 'should' do. Do not repeat the descriptor wording word for word. Use single quotes inside strings.
Return JSON ONLY: {"comments":[{"id":"RD2","n":1,"text":"RD2 3-4: ..."}]}  where n is the passage number given for that strand (use n 0 for a strand with no passage).`;

export type AnnotationSet = Record<string, string[]>;
/** One prompt line group per strand, with its numbered passages. Only what each passage shows is supplied, so comments stay specific to it. */
export function buildAnnotatePrompt(m: Marking): string {
  return m.criteria.flatMap((c) => c.strands.map((s) => {
    const def = STRANDS.find((x) => x.id === s.id);
    const tpl = TEMPLATE_CHECKS.filter((t) => t.strand === s.id && t.id !== 'bg_sources' && t.id !== 'lit_new');
    const next = s.level === '0' ? def?.levels['1-2'] : s.level === '1-2' ? def?.levels['3-4'] : s.level === '3-4' ? def?.levels['5-6'] : '';
    return `STRAND ${s.id} ${s.name}: level ${s.level}.\n` +
      (s.level !== '0' && def?.levels[s.level] ? `  Level ${s.level} descriptor: ${def.levels[s.level]}\n` : '') +
      (next ? `  Next level up: ${next}\n` : '') +
      `  Assessor's reasoning: ${s.reason}\n  Missing for the next level: ${s.missing || 'n/a'}\n` +
      (tpl.length ? `  Template expectations:\n${tpl.map((t) => `    - ${t.text} [${s.failed_checks.includes(t.id) ? 'NOT SHOWN' : 'SHOWN'}]`).join('\n')}\n` : '') +
      (s.evidence.length ? s.evidence.map((e, i) => `  PASSAGE ${i + 1} (${e.section ?? 'report'}, page ${e.page ?? '?'}): '${e.quote}'`).join('\n') : '  No passage supports this strand (use n 0).');
  })).join('\n\n');
}

/** Comments are kept per passage in order, so comment i belongs to evidence[i]. Strands with no passage get one comment at index 0. */
export function assembleAnnotations(raw: Record<string, unknown> | null, m: Marking): AnnotationSet | null {
  if (!raw || !Array.isArray(raw.comments)) return null;
  const out: AnnotationSet = {};
  for (const c of raw.comments as Record<string, unknown>[]) {
    const id = clean(c?.id).toUpperCase(), text = clean(c?.text), n = int(c?.n) ?? 1;
    const st = m.criteria.flatMap((x) => x.strands).find((x) => x.id === id);
    if (!st || !text || text.split(' ').length > 70) continue;
    const slot = Math.max(0, Math.min(Math.max(0, st.evidence.length - 1), n - 1));
    (out[id] ??= [])[slot] = text;
  }
  for (const k of Object.keys(out)) out[k] = Array.from(out[k], (v) => v ?? '');
  return STRANDS.every((x) => out[x.id]?.some(Boolean)) || Object.keys(out).length >= STRANDS.length - 2 ? out : null;
}

export const TRIM_SYSTEM = `You are an IB SEHS moderator helping a student bring an IA under the word limit. You are given the marking of the IA, the IA text and a word-count guide.
Return a ranked list of up to 14 SPECIFIC paragraphs or lines (by block_index from the IA text) that the student can remove or shorten, best to cut first, until the words saved add up to at least the words over the limit. Choose by LOGIC, never just to hit a number. Each item: {"block_index":0,"action":"remove|shorten","reason":"irrelevant|repeated|redundant|low_value|too_detailed","why":"under 20 words, why this text can go","serves":["A1"],"repeated_at":null,"shorten_to_words":0,"keep_point":"under 8 words, or empty"}. Output compact single-line JSON with no indentation or blank lines.
Reasons: irrelevant = does not help answer the research question or any strand; repeated = says again what another place already says (give that other place's block_index in repeated_at); redundant = a table, graph or figure already shows it, or it only defines or explains common knowledge such as the variables; low_value = generic text that earns no marks; too_detailed = true and useful but longer than needed, so shorten it.
"serves" lists the strand ids (RD1 to EV2) the text helps earn marks for, or [] if none. Cut text that serves no strand first, then repeated, then redundant. Never choose the research question, text that is the only evidence for a strand at level 3-4 or 5-6, the link between the data and the conclusion, or limitations and improvements that explain impact; shorten those at most. Do not rewrite their text.
Return JSON ONLY: {"trim":[...]}`;

export function wordGuide(sections: SectionWords[], totalCounted: number): string {
  return `\n\nWord-count guide: the limit is ${WORD_LIMIT}; the report has ${totalCounted} counted words, so about ${totalCounted - WORD_LIMIT} must go. Tables, graphs, references and appendices do not count. Sections:\n` +
    sections.map((x) => `- "${x.heading}": ${x.words} words` + (x.budget ? ` (IB workshop template budget: ${x.budget.min ? x.budget.min + '-' : 'max '}${x.budget.max} for ${x.budget.label})` : '')).join('\n');
}

export function buildPlanPrompt(m: Marking, doc: string, guide = '', only?: string): string {
  const lines = m.criteria.filter((c) => !only || c.code === only).map((c) => `Criterion ${c.code} ${c.criterion}: ${c.mark}/${c.max}. ${c.why_mark}\n` + c.strands.map((s) =>
    `  ${s.id} ${s.name}: level ${s.level}. ${s.reason} Missing for next level: ${s.missing}`).join('\n')).join('\n');
  const lim = (m.limits ?? []).filter((x) => (!only || x.criterion === only) && x.kind !== 'template');
  const limText = lim.length ? `\n\nWhat is holding the mark down (build the steps so each of these is fixed):\n` + lim.map((x) => `- ${x.strand ?? x.criterion}: ${x.detail}`).join('\n') : '';
  return `${only ? `Write the plan for criterion ${only} only.\n\n` : ''}Marking result:\n${lines}${limText}\n\nIA text:\n${doc}${guide}`;
}

export type Coach = { need: string; miss: string; ask: string[]; strong: string; direction: string };
export type StrandPlan = { id: string; plain_ask: string; where_you_are: string; steps: string[]; done_when: string; coach: Coach | null; example?: string; extend_prompts?: string[] };
export type CriterionPlan = { code: string; summary: string; quick_wins: string[]; strands: StrandPlan[] };
const list = (v: unknown, max: number) => (Array.isArray(v) ? v.map(clean).filter(Boolean).slice(0, max) : []);

export function assembleCriterionPlan(x: Record<string, unknown> | null, code: string): CriterionPlan | null {
  if (!x) return null;
  const rs = Array.isArray(x.strands) ? x.strands as Record<string, unknown>[] : [];
  const strands: StrandPlan[] = [];
  for (const s of STRANDS.filter((t: Strand) => t.criterion === code)) {
    const y = rs.find((z) => clean(z?.id).toUpperCase() === s.id);
    if (!y) return null;
    const steps = list(y.steps, 7);
    const plain_ask = clean(y.plain_ask), where_you_are = clean(y.where_you_are), done_when = clean(y.done_when);
    if (!plain_ask || steps.length < 2 || !where_you_are) return null;
    const c = (y.coach ?? null) as Record<string, unknown> | null;
    const coach: Coach | null = c && clean(c.need) && clean(c.miss) ? { need: clean(c.need), miss: clean(c.miss), ask: list(c.ask, 4), strong: clean(c.strong), direction: clean(c.direction) } : null;
    strands.push({ id: s.id, plain_ask, where_you_are, steps, done_when, coach });
  }
  const summary = clean(x.summary);
  if (!summary) return null;
  return { code, summary, quick_wins: list(x.quick_wins, 3), strands };
}

export function assemblePlan(raw: Record<string, unknown>): CriterionPlan[] | null {
  const rc = Array.isArray(raw.criteria) ? raw.criteria as Record<string, unknown>[] : [];
  const out: CriterionPlan[] = [];
  for (const c of CRITERIA) {
    const got = assembleCriterionPlan(rc.find((y) => clean(y?.code).toUpperCase() === c.code) ?? null, c.code);
    if (!got) return null;
    out.push(got);
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
  // Keep the list usable: stop at the item that gets the report under the limit (plus a small margin), never more than 25.
  let run = 0;
  const items: TrimItem[] = [];
  for (const p of picked) {
    if (items.length >= 25 || (run >= overBy && items.length >= 5)) break;
    run += p.words_saved; items.push({ ...p, running_total: run });
  }
  return { over_by: overBy, items, enough: run >= overBy, total_saved: run };
}
