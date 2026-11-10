/**
 * IB policy observations from the May 2026 SEHS "Lessons Learned" deck.
 * Pure and deterministic. These are prompts to check, never verdicts, and they
 * never change a band. Kept separate from template (workshop) advice.
 */
export type PolicyFlag = {
  id: 'word_count' | 'experimentation' | 'school_identifying' | 'appendix_reliance';
  title: string;
  message: string;
  evidence: string[]; // short verbatim snippets (<= 12 words) from the document
};
export type PolicyBlock = { block_type: string | null; text: string | null };

export const WORD_LIMIT = 3200;
const snippet = (text: string, index: number, length: number) => {
  const start = Math.max(0, index - 30);
  const raw = text.slice(start, Math.min(text.length, index + length + 30)).replace(/\s+/g, ' ').trim();
  return raw.split(' ').slice(0, 12).join(' ');
};
const isTableLike = (t: string | null) => /^(table|figure|graph|chart|caption|image)/i.test(t ?? "");

export function countBodyWords(blocks: PolicyBlock[]): number {
  let n = 0;
  for (const b of blocks) {
    if (!b.text || isTableLike(b.block_type)) continue;
    n += (b.text.match(/\S+/g) ?? []).length;
  }
  return n;
}

const EXPERIMENT = /\b(consum(?:e|ed|ing|ption of)|ingest(?:ed|ing|ion)?|drank|drink(?:ing)?|ate|eating|supplement(?:ed|ation)?|caffeine|energy drink|blood sample|blood sampling|finger[- ]?prick|lactate (?:sample|sampling)|urine|saliva|sweat sample)\b/gi;
const SCHOOL = /\b(?:[A-Z][A-Za-z'’.-]+\s+){1,4}(?:School|College|Academy|Gymnasium)\b/g;
const CONTACT = /[\w.+-]+@[\w-]+\.[\w.-]+|(?<![\w./-])\+?\d{2,5}[\s-]?\d{3,5}[\s-]?\d{3,5}(?![\w./-])/g;
/** Citations are not identifying details: drop links, DOIs and everything from the reference list onwards before scanning. */
const scrub = (t: string) => {
  const refs = t.search(/^\s*(?:references?|bibliography|works cited)\s*$/im);
  return (refs >= 0 ? t.slice(0, refs) : t).replace(/\b(?:https?:\/\/|www\.)\S+|\bdoi:\s*\S+|\b10\.\d{4,}\/\S+/gi, ' ');
};
const APPENDIX = /\b(?:see|in|refer to|shown in|included in)\s+(?:the\s+)?appendix(?:\s+[A-Z0-9]+)?\b/gi;

export function policyFlags(blocks: PolicyBlock[]): PolicyFlag[] {
  const flags: PolicyFlag[] = [];
  const text = blocks.map((b) => b.text ?? '').join('\n');
  const body = countBodyWords(blocks);
  if (body > WORD_LIMIT) {
    flags.push({
      id: 'word_count',
      title: 'Word count may exceed the 3,200-word SEHS limit',
      message: `About ${body.toLocaleString('en-GB')} words were found outside tables, figures and captions. Check the count against the IB limit; tables and graphs are not counted.`,
      evidence: [],
    });
  }
  const exp = [...text.matchAll(EXPERIMENT)].slice(0, 3);
  if (exp.length) {
    flags.push({
      id: 'experimentation',
      title: 'Check against the IB Science Experimentation Policy',
      message: 'Participants must not be made to consume food or drink, and students must not handle bodily fluids. These words appear in the report; ignore this if they only describe published research.',
      evidence: exp.map((m) => snippet(text, m.index ?? 0, m[0].length)),
    });
  }
  const scanned = scrub(text);
  const ident = [...scanned.matchAll(SCHOOL), ...scanned.matchAll(CONTACT)].slice(0, 3);
  if (ident.length) {
    flags.push({
      id: 'school_identifying',
      title: 'Possible school-identifying or contact details',
      message: 'Reports sent to the IB should not identify the school or individuals. Check these passages and remove identifying details.',
      evidence: ident.map((m) => snippet(scanned, m.index ?? 0, m[0].length)),
    });
  }
  const app = [...text.matchAll(APPENDIX)].slice(0, 3);
  if (app.length) {
    flags.push({
      id: 'appendix_reliance',
      title: 'Appendices are not assessed',
      message: 'Key evidence referred to an appendix is not assessed. Make sure at least a sample of raw data and all evidence for the criteria sits in the body.',
      evidence: app.map((m) => snippet(text, m.index ?? 0, m[0].length)),
    });
  }
  return flags;
}
