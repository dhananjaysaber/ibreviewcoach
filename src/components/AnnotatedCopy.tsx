import { Fragment, useEffect, useMemo, useState } from 'react';
import { allStrands, levelClass, type MarkMap, type ReportBlock } from '../lib/markMap';
import { MarkGate, type MM } from './WorkspaceParts';
import './workspace.css';

type Comment = { code: string; level: string; text: string; kind: 'strand' | 'limit' };
const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
const firstSentence = (s: string) => (s.match(/^.*?[.!?](\s|$)/)?.[0] ?? s).trim();

/** Short comment for a strand: the prepared one if the teacher made it, otherwise the first sentence of the justification. */
function strandText(map: MarkMap, id: string, level: string, reason: string) {
  return map.annotations?.[id] ?? `${id} ${level}: ${firstSentence(reason)}`;
}

export function buildComments(map: MarkMap, blocks: ReportBlock[], mode: 'teacher' | 'student') {
  const at = new Map<number, Comment[]>();
  const unplaced: Comment[] = [];
  const put = (idx: number | undefined, c: Comment) => {
    if (idx === undefined || !blocks.some((b) => b.block_index === idx)) { unplaced.push(c); return; }
    at.set(idx, [...(at.get(idx) ?? []), c]);
  };
  for (const s of allStrands(map)) {
    const base = strandText(map, s.id, s.level, s.reason);
    const fix = mode === 'student' && s.level !== '5-6' && s.missing ? ` To move up: ${s.missing}` : '';
    put(s.evidence[0]?.block_index, { code: s.id, level: s.level, text: base + fix, kind: 'strand' });
  }
  for (const l of map.limits ?? []) {
    if (!['inconsistency', 'inconsistency_minor'].includes(l.kind)) continue;
    const quotes = [...l.detail.matchAll(/"([^"]{12,})"/g)].map((m) => norm(m[1]));
    const code = l.strand ?? l.criterion;
    quotes.slice(0, 2).forEach((q) => {
      const b = blocks.find((x) => norm(x.text).includes(q.slice(0, 60)));
      put(b?.block_index, { code, level: l.kind === 'inconsistency' ? '3-4' : '5-6', kind: 'limit', text: `${code}: value differs from another place in the report.` + (mode === 'student' ? ` ${l.action}` : '') });
    });
  }
  return { at, unplaced };
}

function Highlighted({ text, quotes }: { text: string; quotes: string[] }) {
  const q = quotes.find((x) => x.length > 12 && text.includes(x));
  if (!q) return <>{text}</>;
  const i = text.indexOf(q);
  return <>{text.slice(0, i)}<mark>{q}</mark>{text.slice(i + q.length)}</>;
}


const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const COLOURS: Record<string, string> = { l12: '#C62828', l34: '#E3A008', l56: '#1B8A4B' };

/** A self-contained, print-ready page (report on the left, comments in a right margin, like a ManageBac annotated file). It does not depend on the app's screen layout. */
function printableHtml(map: MarkMap, rows: { key: number; block: ReportBlock; extra?: string[] }[], built: ReturnType<typeof buildComments>, mode: 'teacher' | 'student', quotes: string[]) {
  const hl = (t: string) => { const q = quotes.find((x) => x.length > 12 && t.includes(x)); if (!q) return esc(t); const i = t.indexOf(q); return `${esc(t.slice(0, i))}<mark>${esc(q)}</mark>${esc(t.slice(i + q.length))}`; };
  const cmHtml = (c: Comment) => { const col = COLOURS[levelClass(c.level)] ?? '#2347F5'; const k = c.text.indexOf(':'); return `<div class="cm" style="border-color:${col}"><b>${esc(c.text.slice(0, k))}:</b>${esc(c.text.slice(k + 1))}</div>`; };
  const body = rows.map(({ block, extra }) => {
    const cm = (built.at.get(block.block_index) ?? []).map(cmHtml).join('');
    const head = block.block_type === 'heading' && block.text.length <= 120;
    const tab = block.block_type === 'table_text';
    const txt = head ? `<h3>${esc(block.text)}</h3>` : tab ? `<p class="tab">${esc([block.text, ...(extra ?? [])].join('  ·  '))}</p>` : `<p>${hl(block.text)}</p>`;
    return `<tr><td class="t">${txt}</td><td class="c">${cm}</td></tr>`;
  }).join('');
  const un = built.unplaced.length ? `<tr><td class="t"><h3>Strands with no quoted evidence</h3><p>No text in the report body supports these strands.</p></td><td class="c">${built.unplaced.map(cmHtml).join('')}</td></tr>` : '';
  const marks = map.criteria.map((c) => `<span><b>${c.code}</b> ${c.mark}/${c.max}</span>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Annotated copy</title><style>
@page{size:A4 landscape;margin:12mm 12mm 14mm}
*{box-sizing:border-box}body{margin:0;font-family:Georgia,'Times New Roman',serif;color:#0E1726;font-size:10pt;line-height:1.5}
header{border-bottom:2px solid #0E1726;padding-bottom:6px;margin-bottom:8px}
header .k{font:600 7.5pt/1 Menlo,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;color:#5B6678}
header h1{font:800 17pt/1.2 Helvetica,Arial,sans-serif;margin:4px 0}
.marks{display:flex;gap:18px;font:9pt Menlo,Consolas,monospace}.marks .tot{background:#FFE45C;padding:1px 8px;border-radius:3px;font-weight:700}
table{width:100%;border-collapse:collapse;table-layout:fixed}
td{vertical-align:top;padding:3px 0}td.t{width:63%;padding-right:16px}td.c{width:37%;border-left:1px solid #D5DAE3;padding-left:12px}
tr{break-inside:avoid;page-break-inside:avoid}
p{margin:0 0 4px}h3{font:800 11.5pt Helvetica,Arial,sans-serif;margin:10px 0 2px}.tab{font:7.5pt Menlo,Consolas,monospace;color:#5B6678}
mark{background:#FFE45C;padding:0 1px}
.cm{border-left:3px solid #2347F5;background:#F6F8FF;padding:4px 8px;margin:0 0 5px;font:8.5pt/1.4 Helvetica,Arial,sans-serif;border-radius:0 5px 5px 0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.cm b{font-family:Menlo,Consolas,monospace;font-size:7.5pt}
mark,.marks .tot{-webkit-print-color-adjust:exact;print-color-adjust:exact}
</style></head><body><header><div class="k">SEHS IA · ${mode === 'teacher' ? 'Internal assessor comments' : 'Comments for the student'}</div><h1>Annotated copy</h1>
<div class="marks"><span class="tot">${map.mark} / ${map.maximum}</span>${marks}</div></header>
<table><tbody>${body}${un}</tbody></table><script>window.onload=function(){setTimeout(function(){window.print()},300)}</script></body></html>`;
}

export function AnnotatedCopy({ mm, canToggle, teacher }: { mm: MM; canToggle?: boolean; teacher?: boolean }) {
  const [mode, setMode] = useState<'teacher' | 'student'>(teacher ? 'teacher' : 'student');
  const [blocks, setBlocks] = useState<ReportBlock[] | null>(null);
  const [err, setErr] = useState('');
  const map = mm.map;
  const { loadText } = mm;
  useEffect(() => {
    if (!map || blocks) return;
    let live = true;
    loadText().then((b) => { if (live) setBlocks(b); }).catch(() => { if (live) setErr('The report text is not available for this copy.'); });
    return () => { live = false; };
  }, [map, blocks, loadText]);
  const built = useMemo(() => (map && blocks ? buildComments(map, blocks, mode) : null), [map, blocks, mode]);
  if (!map) return mm.checked ? <MarkGate mm={mm} teacher={teacher} /> : <section className="ws"><p className="w-note">Loading…</p></section>;
  const quotes = allStrands(map).flatMap((s) => s.evidence.map((e) => e.quote));
  const needsPrep = teacher && mode === 'teacher' && !map.annotations;
  // join consecutive table rows so a data table reads as one block
  const rows: { key: number; block: ReportBlock; extra?: string[] }[] = [];
  for (const b of blocks ?? []) {
    const last = rows[rows.length - 1];
    if (b.block_type === 'table_text' && last?.block.block_type === 'table_text') { (last.extra ??= []).push(b.text); continue; }
    rows.push({ key: b.block_index, block: b });
  }
  return (
    <section className="ws" aria-label="Annotated copy">
      <div className="w-annhead">
        <h2 style={{ fontSize: '1.4rem', marginRight: 'auto' }}>Annotated copy</h2>
        {canToggle && <div className="w-seg" role="group" aria-label="Comment style">
          <button type="button" aria-pressed={mode === 'teacher'} onClick={() => setMode('teacher')}>Teacher comments (for the IB)</button>
          <button type="button" aria-pressed={mode === 'student'} onClick={() => setMode('student')}>Student comments (detailed)</button>
        </div>}
        {teacher && <button className="w-btn yellow" type="button" disabled={!!mm.busy || !!map.annotations} onClick={() => void mm.run('annotate')}>{mm.busy === 'annotate' ? 'Preparing…' : map.annotations ? 'Annotated copy prepared' : 'Prepare annotated copy'}</button>}
        <button className="w-btn ghost" type="button" disabled={!built} onClick={() => { if (!built || !map) return; const w = window.open('', '_blank'); if (!w) { alert('Allow pop-ups for this site, then press the button again.'); return; } w.document.write(printableHtml(map, rows, built, mode, quotes)); w.document.close(); }}>Save as PDF (clean layout)</button>
      </div>
      {needsPrep && <p className="w-note">These comments use the first sentence of each justification. Press Prepare annotated copy to shorten every comment to what was found and why the level is justified. It makes one extra call, only when you press it.</p>}
      {mm.error && <p role="alert" className="w-error">{mm.error}</p>}
      {err && <p className="w-note">{err}</p>}
      {!blocks && !err && <p className="w-note">Loading the report text…</p>}
      {blocks && built && (
        <div className="w-sheet ws-print">
          <div className="title"><div className="w-mono">SEHS IA · {mode === 'teacher' ? 'Internal assessor comments' : 'Comments for the student'}</div>
            <h2 style={{ fontSize: '1.5rem' }}>Annotated copy</h2>
            <div className="w-mono" style={{ marginTop: 6 }}>Recommended {map.mark} / {map.maximum} · {map.criteria.map((c) => `${c.code} ${c.mark}`).join(' · ')}</div></div>
          {rows.map(({ key, block, extra }) => {
            const cm = built.at.get(block.block_index) ?? [];
            const isHead = block.block_type === 'heading' && block.text.length <= 120;
            const tab = block.block_type === 'table_text';
            return (
              <div className="w-arow" key={key}>
                <div className={'txt' + (tab ? ' tab' : '')}>
                  {isHead ? <div className="hd">{block.text}</div> : <p>{tab ? [block.text, ...(extra ?? [])].join('  ·  ') : <Highlighted text={block.text} quotes={quotes} />}</p>}
                </div>
                <div>{cm.map((c, i) => <div key={i} className={'w-cm ' + levelClass(c.level)}><span className="tl">{mode === 'teacher' ? 'Assessor' : 'Fix'}</span><b>{c.text.split(':')[0]}:</b>{c.text.slice(c.text.indexOf(':') + 1)}</div>)}</div>
              </div>
            );
          })}
          {built.unplaced.length > 0 && (
            <Fragment>
              <div className="w-arow"><div className="txt"><div className="hd">Strands with no quoted evidence</div><p>No text in the report body supports these strands, so there is nowhere to attach the comment.</p></div>
                <div>{built.unplaced.map((c, i) => <div key={i} className={'w-cm ' + levelClass(c.level)}><span className="tl">{mode === 'teacher' ? 'Assessor' : 'Fix'}</span>{c.text}</div>)}</div></div>
            </Fragment>
          )}
        </div>
      )}
      <p className="w-printnote">The PDF opens in a new tab in a print layout of its own: report text on the left, comments in the right margin beside each paragraph, A4 landscape. In the print window choose Save as PDF.</p>
    </section>
  );
}
