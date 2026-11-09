/**
 * Pure logic for the teacher mark map. Marks come ONLY from the official IB SEHS descriptors judged
 * against evidence in the submitted IA. The Ideal IA template is never an input to a mark.
 */
export type Block = { block_index: number; page_number: number | null; section_title: string | null; text: string };
export type Rubric = { code: string; name: string; max: number; clarifications: string; bands: readonly { min: number; max: number; text: string }[] };

export const MARK_SYSTEM = `You are an experienced IB Sports, Exercise and Health Science (SEHS) IA moderator. You mark ONE criterion of an Internal Assessment strictly against the official band descriptors, using ONLY evidence found in the IA text supplied.
Do not use any checklist, template or word-count target when marking. Do not reward effort, length or formatting. Do not be lenient or harsh for its own sake, and do not default to a mid-band mark.
Method:
1. Split each official band descriptor into its separate statements.
2. For the band that fits best and the band directly above it, judge every statement as "met", "partly" or "not_met". For "met" and "partly" give one or two verbatim quotes from the IA (each at most 35 words) with the block_index they came from. For "not_met" say what you searched for across the whole document.
3. Choose the mark: the best-fit band first, then the lower or upper mark of that band according to how fully its statements are met. If the evidence honestly supports two adjacent marks, set mark_high to mark+1, otherwise mark_high equals mark.
4. next_gaps: for every statement of the band above that is "partly" or "not_met", give the descriptor phrase (copied from the descriptor), where in the IA it applies (block_index and section if known), and what_to_do as plain advice to the student. Say what the descriptor needs and what to check or add. Never write sentences, numbers or wording the student could paste into the IA.
Never invent evidence. Never mention marks for other criteria.
Return ONLY JSON: {"mark":0,"mark_high":0,"band":"3-4","why_mark":"2 to 4 sentences","statements":[{"statement":"...","band":"3-4","status":"met|partly|not_met","evidence":[{"quote":"...","block_index":0}],"reason":"..."}],"next_gaps":[{"descriptor_phrase":"...","block_index":null,"section":"...","what_to_do":"..."}],"confidence":"high|medium|low"}`;

export function buildDocument(blocks: Block[], maxChars: number): { text: string; complete: boolean } {
  let out = '', complete = true;
  for (const b of blocks) {
    const line = `[b${b.block_index} p${b.page_number ?? '?'} ${b.section_title ?? ''}] ${b.text}\n`;
    if (out.length + line.length > maxChars) { complete = false; break; }
    out += line;
  }
  return { text: out, complete };
}

export function buildUserPrompt(r: Rubric, doc: string): string {
  return `Criterion: ${r.name} (out of ${r.max})\nOfficial clarifications: ${r.clarifications}\nOfficial band descriptors:\n` +
    r.bands.map((b) => `- ${b.min === b.max ? b.min : b.min + '-' + b.max}: ${b.text}`).join('\n') +
    `\n\nIA text (each line starts with [b<block_index> p<page> <section>]):\n${doc}`;
}

const squash = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
const int = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);
const STATUS = new Set(['met', 'partly', 'not_met']);
const PASTE = /["“”][^"“”]{120,}["“”]/;

export type Statement = { statement: string; band: string; status: string; reason: string; evidence: { quote: string; block_index: number; page: number | null; section: string | null }[] };
export type Gap = { descriptor_phrase: string; section: string | null; page: number | null; block_index: number | null; what_to_do: string };
export type CriterionMark = { criterion: string; max: number; mark: number; mark_high: number; band: string; why_mark: string; statements: Statement[]; next_gaps: Gap[]; confidence: string; dropped_quotes: number };

export function assembleCriterion(r: Rubric, raw: Record<string, unknown>, blocks: Block[]): CriterionMark | null {
  const byIndex = new Map(blocks.map((b) => [b.block_index, b]));
  const mark = int(raw.mark);
  if (mark === null || mark < 0 || mark > r.max) return null;
  let high = int(raw.mark_high) ?? mark;
  high = Math.min(r.max, Math.max(mark, Math.min(high, mark + 1)));
  const band = r.bands.find((b) => mark >= b.min && mark <= b.max);
  if (!band) return null;
  let dropped = 0;
  const statements: Statement[] = (Array.isArray(raw.statements) ? raw.statements : []).slice(0, 24).flatMap((s: unknown) => {
    if (!s || typeof s !== 'object') return [];
    const o = s as Record<string, unknown>;
    const statement = clean(o.statement), reason = clean(o.reason);
    let status = clean(o.status);
    if (!statement || !STATUS.has(status)) return [];
    const evidence = (Array.isArray(o.evidence) ? o.evidence : []).slice(0, 3).flatMap((e: unknown) => {
      const eo = (e ?? {}) as Record<string, unknown>;
      const quote = clean(eo.quote), idx = int(eo.block_index);
      const blk = idx === null ? undefined : byIndex.get(idx);
      if (!quote || !blk || quote.split(' ').length > 45 || !squash(blk.text).includes(squash(quote).replace(/[….]+$/, ''))) { if (quote) dropped++; return []; }
      return [{ quote, block_index: blk.block_index, page: blk.page_number, section: blk.section_title }];
    });
    if (status !== 'not_met' && !evidence.length) status = 'partly';
    return [{ statement, band: clean(o.band), status, reason, evidence }];
  });
  const next_gaps: Gap[] = (Array.isArray(raw.next_gaps) ? raw.next_gaps : []).slice(0, 8).flatMap((g: unknown) => {
    const o = (g ?? {}) as Record<string, unknown>;
    const phrase = clean(o.descriptor_phrase), todo = clean(o.what_to_do);
    if (!phrase || !todo || PASTE.test(todo)) return [];
    const idx = int(o.block_index), blk = idx === null ? undefined : byIndex.get(idx);
    return [{ descriptor_phrase: phrase, section: blk?.section_title ?? (clean(o.section) || null), page: blk?.page_number ?? null, block_index: blk ? blk.block_index : null, what_to_do: todo }];
  });
  const why = clean(raw.why_mark);
  if (!why || !statements.length) return null;
  const confidence = ['high', 'medium', 'low'].includes(clean(raw.confidence)) ? clean(raw.confidence) : 'medium';
  return { criterion: r.name, max: r.max, mark, mark_high: high, band: band.min === band.max ? String(band.min) : `${band.min}-${band.max}`, why_mark: why, statements, next_gaps, confidence, dropped_quotes: dropped };
}

export function totals(list: CriterionMark[]) {
  return { mark: list.reduce((a, c) => a + c.mark, 0), mark_high: list.reduce((a, c) => a + c.mark_high, 0), maximum: list.reduce((a, c) => a + c.max, 0) };
}
