import { Fragment, useEffect, useMemo, useState } from 'react';
import { allStrands, levelClass, type MarkMap, type ReportBlock } from '../lib/markMap';
import { MarkGate, type MM } from './WorkspaceParts';
import { openAnnotatedEditor } from '../lib/annotatedEditor';
import './workspace.css';

type Comment = { code: string; level: string; text: string; kind: 'strand' | 'limit'; quote?: string };
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
    put(s.evidence[0]?.block_index, { code: s.id, level: s.level, text: base + fix, kind: 'strand', quote: s.evidence[0]?.quote });
  }
  for (const l of map.limits ?? []) {
    if (!['inconsistency', 'inconsistency_minor'].includes(l.kind)) continue;
    const raws = [...l.detail.matchAll(/"([^"]{12,})"/g)].map((m) => m[1]);
    const code = l.strand ?? l.criterion;
    raws.slice(0, 2).forEach((raw) => {
      const q = norm(raw);
      const b = blocks.find((x) => norm(x.text).includes(q.slice(0, 60)));
      put(b?.block_index, { code, level: l.kind === 'inconsistency' ? '3-4' : '5-6', kind: 'limit', quote: raw, text: `${code}: value differs from another place in the report.` + (mode === 'student' ? ` ${l.action}` : '') });
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


function openEditor(rows: { key: number; block: ReportBlock; extra?: string[] }[], built: ReturnType<typeof buildComments>) {
  const split = (c: Comment) => { const k = c.text.indexOf(':'); return { label: k > 0 ? c.text.slice(0, k) : c.code, text: (k > 0 ? c.text.slice(k + 1) : c.text).trim(), quote: c.quote }; };
  const ok = openAnnotatedEditor({
    rows: rows.map(({ block, extra }) => ({
      kind: block.block_type === 'heading' && block.text.length <= 120 ? 'heading' as const : block.block_type === 'table_text' ? 'table' as const : 'text' as const,
      text: block.block_type === 'table_text' ? [block.text, ...(extra ?? [])].join('  ·  ') : block.text,
      comments: (built.at.get(block.block_index) ?? []).map(split),
    })),
    unplaced: built.unplaced.map(split),
  });
  if (!ok) alert('Allow pop-ups for this site, then press the button again.');
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
        <button className="w-btn yellow" type="button" disabled={!built} onClick={() => { if (built) openEditor(rows, built); }}>Open editable annotated copy</button>
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
      <p className="w-printnote">The editable copy opens in a new tab as one continuous report, with each comment in the right margin and a pointer to the statement it is about. There you can edit, add and delete comments, add a header or footer, save your edits and print to PDF (A4 portrait).</p>
    </section>
  );
}
