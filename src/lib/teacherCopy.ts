/**
 * Builds the self-contained teacher annotated copy (HTML, print-to-PDF ready).
 * Pure and dependency-free. Voice rules: docs/TEACHER-ANNOTATION-VOICE.md.
 * Bands are shown exactly as stored by the marking; nothing here computes a mark.
 */
export type TeacherNote = {
  finding_id: string;
  criterion_code: string;
  criterion_short: string;
  kind: 'met' | 'limit' | 'gap' | 'compliance';
  note: string;
  evidence_quote: string | null;
  page_number: number | null;
  section_title: string | null;
};
export type CriterionSummary = {
  criterion_code: string;
  label: string;
  indicative_band: string;
  limiting_clause: string | null;
};
export type TeacherCopyInput = {
  notes: TeacherNote[];
  summaries: CriterionSummary[];
  generatedOn: string;
  candidateLabel?: string;
};

const ORDER = ['ResearchDesign', 'DataAnalysis', 'Conclusion', 'Evaluation'];
const KIND_LABEL: Record<TeacherNote['kind'], string> = {
  met: 'Met', limit: 'Limit', gap: 'Gap', compliance: 'Compliance',
};

export const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function buildTeacherCopyHtml(input: TeacherCopyInput): string {
  const summaries = [...input.summaries].sort((a, b) => ORDER.indexOf(a.criterion_code) - ORDER.indexOf(b.criterion_code));
  const sections = summaries.map((s) => {
    const mine = input.notes.filter((n) => n.criterion_code === s.criterion_code);
    const rows = mine.map((n) => `
      <li class="note ${n.kind}">
        <div class="meta"><span class="tag">${escapeHtml(n.criterion_short)} · ${KIND_LABEL[n.kind]}</span>${
          n.page_number ? `<span class="loc">p.${n.page_number}</span>` : ''}${
          n.section_title ? `<span class="loc">${escapeHtml(n.section_title)}</span>` : ''}</div>
        ${n.evidence_quote ? `<blockquote>“${escapeHtml(n.evidence_quote)}”</blockquote>` : ''}
        <p>${escapeHtml(n.note)}</p>
      </li>`).join('');
    return `
    <section>
      <h2>${escapeHtml(s.label)} <span class="band">Indicative band ${escapeHtml(s.indicative_band || 'n/a')}</span></h2>
      <ul>${rows || '<li class="note"><p>No annotations recorded.</p></li>'}</ul>
      ${s.limiting_clause ? `<p class="limit-line"><strong>Limiting the next band:</strong> ${escapeHtml(s.limiting_clause)}</p>` : ''}
    </section>`;
  }).join('');
  const compliance = input.notes.filter((n) => n.kind === 'compliance' && !summaries.some((s) => s.criterion_code === n.criterion_code));
  const extra = compliance.length ? `<section><h2>Compliance observations</h2><ul>${compliance.map((n) =>
    `<li class="note compliance"><p>${escapeHtml(n.note)}</p></li>`).join('')}</ul></section>` : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>SEHS IA – annotated script (teacher copy)</title>
<style>
body{font:14px/1.5 Georgia,serif;color:#1a1a1a;max-width:780px;margin:32px auto;padding:0 20px}
h1{font-size:20px;margin:0 0 4px} .sub{color:#555;margin:0 0 24px;font-size:12px}
h2{font-size:16px;border-bottom:2px solid #1a1a1a;padding-bottom:4px;margin:28px 0 10px}
.band{float:right;font:600 12px/1.8 system-ui,sans-serif;color:#333}
ul{list-style:none;padding:0;margin:0}
.note{border-left:3px solid #888;padding:6px 12px;margin:0 0 10px;break-inside:avoid}
.note.met{border-color:#2f7d5f}.note.limit{border-color:#b7791f}.note.gap{border-color:#b03a12}.note.compliance{border-color:#4b2be8}
.meta{font:600 11px system-ui,sans-serif;color:#555;margin-bottom:2px}.tag{margin-right:8px}.loc{margin-right:8px;font-weight:400}
blockquote{margin:2px 0;color:#444;font-style:italic}.note p{margin:2px 0}
.limit-line{font-size:13px;margin-top:6px}
.foot{margin-top:32px;font-size:11px;color:#666;border-top:1px solid #ccc;padding-top:8px}
@media print{body{margin:0}}
</style></head><body>
<h1>SEHS Internal Assessment – annotated script (teacher copy)</h1>
<p class="sub">${input.candidateLabel ? `${escapeHtml(input.candidateLabel)} · ` : ''}Generated ${escapeHtml(input.generatedOn)}. Bands are indicative and non-binding; they are not an official IB mark.</p>
${sections}${extra}
<p class="foot">Annotations are tied to quoted evidence from the candidate's report. Indicative bands are decided only by the four IB SEHS criteria.</p>
</body></html>`;
}
