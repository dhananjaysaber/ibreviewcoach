/**
 * Teacher annotated copy: pure logic (no Deno / network imports) so it can be
 * unit tested with plain Node. Voice rules: docs/TEACHER-ANNOTATION-VOICE.md.
 */
export type CriterionCode = 'ResearchDesign' | 'DataAnalysis' | 'Conclusion' | 'Evaluation';
export type NoteKind = 'met' | 'limit' | 'gap' | 'compliance';

export const CRITERION_LABEL: Record<CriterionCode, { short: string; long: string }> = {
  ResearchDesign: { short: 'RD', long: 'Research Design' },
  DataAnalysis: { short: 'DA', long: 'Data Analysis' },
  Conclusion: { short: 'CON', long: 'Conclusion' },
  Evaluation: { short: 'EVAL', long: 'Evaluation' },
};

export const MAX_NOTE_WORDS = 25;
export const MAX_QUOTE_WORDS = 15;

export type FindingInput = {
  id: string;
  criterion_code: string;
  finding_type: string;
  priority: string | null;
  rubric_requirement: string | null;
  issue: string | null;
  evidence_excerpt: string | null;
  block_id: string | null;
  page_number: number | null;
  section_title: string | null;
};

export type ModelNote = { finding_id: string; kind: string; note: string };

export type TeacherNote = {
  finding_id: string;
  criterion_code: CriterionCode;
  criterion_short: string;
  kind: NoteKind;
  note: string;
  evidence_quote: string | null;
  page_number: number | null;
  section_title: string | null;
};

export const countWords = (s: string): number => (s.trim().match(/\S+/g) ?? []).length;
const squash = (s: string) => s.replace(/\s+/g, ' ').trim();
const fold = (s: string) => squash(s).toLocaleLowerCase();

export const isCriterionCode = (c: string): c is CriterionCode => c in CRITERION_LABEL;

/** Take at most MAX_QUOTE_WORDS words and prove the result is verbatim in the source. */
export function verifiedQuote(excerpt: string | null, blockText: string | null): string | null {
  if (!excerpt || !blockText) return null;
  const words = squash(excerpt).split(' ');
  if (words.length === 0 || !words[0]) return null;
  const clipped = words.slice(0, MAX_QUOTE_WORDS).join(' ');
  return fold(blockText).includes(fold(clipped)) ? clipped : null;
}

// Wording that gives advice to the student or rewrites their text is not marking language.
const ADVICE = /\b(you should|you could|you need to|try to|consider adding|i suggest|we suggest|should add|should include|must add|add a|rewrite|replace with|for example you)\b/i;
const FIRST_PERSON = /\b(you|your|yours|i|we|let's)\b/i;
const OFFICIAL_MARK = /\b(\d{1,2}\s*\/\s*(6|24)|scores?\s+\d|awarded?\s+\d|final mark|official mark)\b/i;

export type NoteProblem = 'empty' | 'too_long' | 'advice' | 'second_person' | 'official_mark' | 'exclamation' | 'bad_kind';

export function checkNote(raw: string, kind: string): NoteProblem[] {
  const out: NoteProblem[] = [];
  const t = squash(raw);
  if (!t) out.push('empty');
  if (countWords(t) > MAX_NOTE_WORDS) out.push('too_long');
  if (ADVICE.test(t)) out.push('advice');
  if (FIRST_PERSON.test(t)) out.push('second_person');
  if (OFFICIAL_MARK.test(t)) out.push('official_mark');
  if (t.includes('!')) out.push('exclamation');
  if (!['met', 'limit', 'gap', 'compliance'].includes(kind)) out.push('bad_kind');
  return out;
}

/** Fallback kind when the model returns an invalid one. */
export function kindFromFinding(findingType: string): NoteKind {
  if (findingType === 'strength') return 'met';
  if (findingType === 'structural_gap' || findingType === 'missing_detail') return 'gap';
  return 'limit';
}

/**
 * Accept only notes that pass every check and whose finding exists. Rejected
 * findings are returned so the caller can retry or omit them; text is never
 * silently altered.
 */
export function assembleNotes(
  findings: FindingInput[],
  blockTextById: Map<string, string>,
  modelNotes: ModelNote[],
): { notes: TeacherNote[]; rejected: { finding_id: string; problems: NoteProblem[] | ['no_note' | 'unknown_criterion'] }[] } {
  const byId = new Map(findings.map((f) => [f.id, f] as const));
  const seen = new Set<string>();
  const notes: TeacherNote[] = [];
  const rejected: { finding_id: string; problems: NoteProblem[] | ['no_note' | 'unknown_criterion'] }[] = [];
  for (const m of modelNotes) {
    const f = byId.get(m.finding_id);
    if (!f || seen.has(m.finding_id)) continue;
    seen.add(m.finding_id);
    if (!isCriterionCode(f.criterion_code)) {
      rejected.push({ finding_id: f.id, problems: ['unknown_criterion'] });
      continue;
    }
    const problems = checkNote(m.note ?? '', m.kind);
    if (problems.length) {
      rejected.push({ finding_id: f.id, problems });
      continue;
    }
    notes.push({
      finding_id: f.id,
      criterion_code: f.criterion_code,
      criterion_short: CRITERION_LABEL[f.criterion_code].short,
      kind: m.kind as NoteKind,
      note: squash(m.note),
      evidence_quote: verifiedQuote(f.evidence_excerpt, f.block_id ? blockTextById.get(f.block_id) ?? null : null),
      page_number: f.page_number,
      section_title: f.section_title,
    });
  }
  for (const f of findings) if (!seen.has(f.id)) rejected.push({ finding_id: f.id, problems: ['no_note'] });
  return { notes, rejected };
}

export type CriterionSummary = {
  criterion_code: CriterionCode;
  label: string;
  indicative_band: string;
  limiting_clause: string | null;
};

/** Per-criterion closing line. Bands come from the stored marking only, never from this module. */
export function summariseCriteria(
  criterionScores: unknown,
): CriterionSummary[] {
  const arr = Array.isArray(criterionScores) ? criterionScores : [];
  const out: CriterionSummary[] = [];
  for (const row of arr as Record<string, unknown>[]) {
    const code = String(row?.criterion ?? '');
    if (!isCriterionCode(code)) continue;
    const gap = row.next_band_gap as { unmet_clauses?: unknown } | undefined;
    const c0 = Array.isArray(gap?.unmet_clauses) ? (gap!.unmet_clauses as unknown[])[0] : undefined;
    const first = typeof c0 === 'string' ? c0 : c0 && typeof c0 === 'object'
      ? String((c0 as Record<string, unknown>).text ?? (c0 as Record<string, unknown>).clause ?? (c0 as Record<string, unknown>).descriptor ?? (c0 as Record<string, unknown>).requirement ?? '')
      : '';
    out.push({
      criterion_code: code,
      label: CRITERION_LABEL[code].long,
      indicative_band: String(row.indicative_band ?? ''),
      limiting_clause: first || null,
    });
  }
  return out;
}

export const MODERATOR_SYSTEM = `You write short marginal annotations as an IB SEHS moderator would on a candidate's Internal Assessment script.

Voice rules:
- One note per finding, at most ${MAX_NOTE_WORDS} words, one idea.
- Impersonal or third person ("The candidate...", "Uncertainty not carried into the mean"). Never use "you", "your", "I" or "we".
- Neutral and evidence-led. Use IB command-term language: stated, identified, outlined, described, explained, justified.
- A "met" note names the requirement achieved. A "limit" or "gap" note names the requirement not yet reached. A "compliance" note states a policy observation.
- No praise padding, no advice or instructions to the candidate, no suggested wording, no exclamation marks.
- Never state a mark or score, and never write numbers such as "4/6".
- Use only the facts in the finding supplied. Do not invent evidence.

Return ONLY JSON: {"notes":[{"finding_id":"<id>","kind":"met|limit|gap|compliance","note":"<text>"}]}`;

export function buildUserPrompt(findings: FindingInput[]): string {
  const rows = findings.map((f) => ({
    finding_id: f.id,
    criterion: f.criterion_code,
    finding_type: f.finding_type,
    rubric_requirement: f.rubric_requirement,
    issue: f.issue,
    evidence_excerpt: f.evidence_excerpt ? squash(f.evidence_excerpt).split(' ').slice(0, 40).join(' ') : null,
  }));
  return `Write one annotation for each finding.\n${JSON.stringify(rows)}`;
}
