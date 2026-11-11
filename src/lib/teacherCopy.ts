/**
 * Builds the self-contained teacher annotated copy (HTML, print-to-PDF ready).
 * Pure and dependency-free. Voice rules: docs/TEACHER-ANNOTATION-VOICE.md.
 * Bands are shown exactly as stored by the marking; nothing here computes a mark.
 */
import { NOT_REACHED, STRAND_DESCRIPTORS } from './strandSheet.ts';

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
      ${s.limiting_clause && !s.limiting_clause.includes("[object Object]") ? `<p class="limit-line"><strong>Limiting the next band:</strong> ${escapeHtml(s.limiting_clause)}</p>` : ''}
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


/* ---------------- Teacher copy built from the strand-based mark map ---------------- */
export type MarkCopyStrand = {
  id: string; name: string; level: string; reason: string; missing: string; no_evidence?: boolean;
  evidence: { quote: string; page: number | null; section: string | null }[];
};
export type MarkCopyCriterion = { code: string; criterion: string; max: number; mark: number; why_mark: string; confidence: string; strands: MarkCopyStrand[] };
export type MarkCopyLimit = { kind: string; criterion: string; strand: string | null; detail: string; action: string };
export type MarkCopyMap = {
  mark: number; maximum: number; criteria: MarkCopyCriterion[]; data_sufficiency: string; limits?: MarkCopyLimit[];
  appendix_check: { label: string; relevant: boolean; reason: string }[];
  word_count: { counted: number; limit: number; over_by: number; cut_at: { heading: string; page: number | null } | null };
};
const LEVEL_NEXT: Record<string, string> = { '0': '1-2', '1-2': '3-4', '3-4': '5-6' };
const where = (page: number | null, section: string | null) => [section, page ? 'p.' + page : ''].filter(Boolean).join(', ');

export function buildMarkCopyHtml(input: { map: MarkCopyMap; generatedOn: string; candidateLabel?: string }): string {
  const m = input.map;
  const rows = (c: MarkCopyCriterion) => c.strands.map((s) => {
    const met = s.level === '0' ? NOT_REACHED : (STRAND_DESCRIPTORS[s.id]?.[s.level] ?? '');
    const next = LEVEL_NEXT[s.level];
    const nextText = next ? (STRAND_DESCRIPTORS[s.id]?.[next] ?? '') : '';
    const ev = s.evidence.length
      ? s.evidence.map((e) => `<blockquote>“${escapeHtml(e.quote)}”<small>${escapeHtml(where(e.page, e.section))}</small></blockquote>`).join('')
      : `<p class="none">No quotation in the report meets this strand.</p>`;
    return `<tr>
      <td class="id"><b>${escapeHtml(s.id)}</b><br>${escapeHtml(s.name)}</td>
      <td class="lv"><span class="lvl l${escapeHtml(s.level.replace(/\W/g, ''))}">${escapeHtml(s.level)}</span></td>
      <td>${escapeHtml(met)}</td>
      <td>${ev}</td>
      <td>${escapeHtml(s.reason)}${next ? `<p class="next"><b>Not yet at ${escapeHtml(next)}:</b> ${escapeHtml(s.missing)}${nextText ? `<br><i>Descriptor: ${escapeHtml(nextText)}</i>` : ''}</p>` : ''}</td>
    </tr>`;
  }).join('');
  const limitsFor = (code: string) => {
    const l = (m.limits ?? []).filter((x) => x.criterion === code);
    return l.length ? `<div class="lim"><b>What limits this mark</b><ul>${l.map((x) => `<li>${escapeHtml(x.detail)} <i>To fix:</i> ${escapeHtml(x.action)}</li>`).join('')}</ul></div>` : '';
  };
  const crit = m.criteria.map((c) => `
    <section>
      <h2>${escapeHtml(c.code)} · ${escapeHtml(c.criterion)} <span class="band">${c.mark} / ${c.max} · ${escapeHtml(c.confidence)} confidence</span></h2>
      <p class="why"><b>Moderator justification.</b> ${escapeHtml(c.why_mark)}</p>
      <table><thead><tr><th>Strand</th><th>Level</th><th>Descriptor met</th><th>Evidence in the report</th><th>Moderator justification</th></tr></thead><tbody>${rows(c)}</tbody></table>
      ${limitsFor(c.code)}
      <p class="tmark"><b>Teacher's own mark:</b> ______ / ${c.max} &nbsp; <b>Difference from recommended (${c.mark}):</b> ______</p>
    </section>`).join('');
  const wc = m.word_count;
  const words = wc
    ? `<p>The report body contains ${wc.counted.toLocaleString('en-GB')} counted words against a limit of ${wc.limit.toLocaleString('en-GB')}${wc.over_by > 0 ? `, ${wc.over_by.toLocaleString('en-GB')} over${wc.cut_at ? `; the limit is reached in “${escapeHtml(wc.cut_at.heading)}”${wc.cut_at.page ? ` (p.${wc.cut_at.page})` : ''}` : ''}` : ', within the limit'}. Tables, graphs, references and appendices are not counted.</p>`
    : '';
  const app = m.appendix_check?.length
    ? `<ul>${m.appendix_check.map((a) => `<li><b>${escapeHtml(a.label)}</b>: ${a.relevant ? 'relevant' : 'not relevant'}. ${escapeHtml(a.reason)}</li>`).join('')}</ul>` : '<p>No appendix items were supplied.</p>';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>SEHS IA – moderator justification (teacher copy)</title>
<style>
body{font:13.5px/1.5 Georgia,serif;color:#1a1a1a;max-width:1000px;margin:28px auto;padding:0 20px}
h1{font-size:21px;margin:0 0 4px}.sub{color:#555;margin:0 0 18px;font-size:12px}
.total{border:2px solid #1a1a1a;padding:10px 14px;margin:0 0 18px;font:600 15px system-ui,sans-serif}
h2{font-size:16px;border-bottom:2px solid #1a1a1a;padding-bottom:4px;margin:26px 0 8px}
.band{float:right;font:600 12px/1.9 system-ui,sans-serif}
.why{margin:0 0 10px}
.lim{border-left:3px solid #b45309;background:#fff7ed;padding:6px 10px;margin:10px 0;font-size:12px}.lim ul{margin:4px 0 0 16px;padding:0}.tmark{margin:8px 0 0;font:12px system-ui,sans-serif;border:1px dashed #999;padding:6px 8px}
table{width:100%;border-collapse:collapse;font-size:12.5px}
th,td{border:1px solid #b9b9b9;padding:6px 8px;vertical-align:top;text-align:left}
th{background:#eee;font:600 11px system-ui,sans-serif;text-transform:uppercase;letter-spacing:.04em}
td.id{width:13%}td.lv{width:6%;text-align:center}
.lvl{display:inline-block;font:700 12px system-ui,sans-serif;padding:2px 7px;border:1px solid #333;border-radius:10px}
blockquote{margin:0 0 6px;font-style:italic;color:#333}blockquote small{display:block;font:11px system-ui,sans-serif;color:#666;font-style:normal}
.none{margin:0;color:#8a2b0b}.next{margin:6px 0 0;color:#444}
tr{break-inside:avoid}
.foot{margin-top:28px;font-size:11px;color:#666;border-top:1px solid #ccc;padding-top:8px}
@media print{body{margin:0}}
</style></head><body>
<h1>SEHS Internal Assessment – moderator justification (teacher copy)</h1>
<p class="sub">${input.candidateLabel ? `${escapeHtml(input.candidateLabel)} · ` : ''}Generated ${escapeHtml(input.generatedOn)}. Marks are indicative and non-binding; they are not an official IB mark.</p>
<div class="total">Recommended mark: ${m.mark} / ${m.maximum}</div>
<p><b>Basis of marking.</b> Each criterion is marked by best fit against the SEHS strand sheet, using only evidence quoted from the report body. A strand receives no credit where no quotation in the report meets its descriptor. Appendices are not assessed. Whole marks only.</p>
${crit}
<section><h2>Word limit</h2>${words}</section>
<section><h2>Appendix relevance</h2>${app}</section>
<section><h2>Data sufficiency</h2><p>${escapeHtml(m.data_sufficiency || 'Not stated.')}</p></section>
<p class="foot">Every quotation is verified verbatim against the candidate's report. Levels follow the teacher strand sheet; a criterion mark is a whole mark that cannot round up from the average of its strand levels. Where the report contradicts its own figures, the affected strand is held at 3-4.</p>
</body></html>`;
}
