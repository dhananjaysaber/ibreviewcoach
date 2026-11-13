import { useEffect, useMemo, useState } from 'react';
import { SEHS_WORKSHOP_SECTIONS } from '../lib/workshopGuide';
import { sectionFor, type WorkshopFinding } from '../lib/sectionMap';
import type { ReportBlock } from '../lib/markMap';
import './workspace.css';

/**
 * The student's three working tabs for a report a moderator has marked and approved.
 * Everything here comes from the moderator-approved report (marks, comments, fixes), never from a separate automated marking.
 */
export type ModFinding = WorkshopFinding & { priority: string; finding_type: string };
export type ModCriterion = {
  criterion: string; criterion_name: string; criterion_max_marks: number | null;
  indicative_mark_range: [number, number] | null; why_this_range: string | null;
};

const CODE: Record<string, string> = { 'Research Design': 'RD', 'Data Analysis': 'DA', Conclusion: 'CO', Evaluation: 'EV' };
const codeOf = (name: string) => CODE[name] ?? name.slice(0, 2).toUpperCase();
const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
const cleanName = (n: string) => n.replace(/^\d+\s*[·.-]\s*/, '');
const isStrength = (f: ModFinding) => f.finding_type === 'strength';
const levelOf = (p: string) => (p === 'high' ? 'l12' : p === 'medium' ? 'l34' : 'l56');
const range = (r: [number, number] | null) => (r ? (r[0] === r[1] ? String(r[0]) : `${r[0]}–${r[1]}`) : '–');

export const keyOf = (f: ModFinding) => `mod-${f.id}`;

function buildSections(findings: ModFinding[], criteria: ModCriterion[]) {
  const placed = findings.map((f) => sectionFor(f));
  return SEHS_WORKSHOP_SECTIONS.map((s) => {
    const mine = placed.filter((p) => p.sectionId === s.id).map((p) => p.finding as ModFinding);
    const strengths = mine.filter(isStrength);
    const gaps = mine.filter((f) => !isStrength(f));
    const crit = criteria.find((c) => c.criterion_name === s.criterion);
    const status: 'red' | 'amber' | 'green' = gaps.some((f) => f.priority === 'high') ? 'red' : gaps.length ? 'amber' : 'green';
    return { id: s.id, name: cleanName(s.name), criterion: s.criterion, code: codeOf(s.criterion), crit, strengths, gaps, status };
  });
}

function Hero({ criteria }: { criteria: ModCriterion[] }) {
  const lo = criteria.reduce((a, c) => a + (c.indicative_mark_range?.[0] ?? 0), 0);
  const hi = criteria.reduce((a, c) => a + (c.indicative_mark_range?.[1] ?? 0), 0);
  const max = criteria.reduce((a, c) => a + (c.criterion_max_marks ?? 6), 0) || 24;
  return (
    <div className="w-card w-hero" style={{ gridTemplateColumns: 'auto 1fr' }}>
      <div><div className="w-mono">Your mark</div><div className="w-total">{lo === hi ? lo : `${lo}–${hi}`}<small> / {max}</small></div></div>
      <div className="w-tiles">
        {criteria.map((c) => (
          <div className="w-tile" key={c.criterion}>
            <span className="w-mono">{codeOf(c.criterion_name)}</span>
            <b>{range(c.indicative_mark_range)}</b><small className="n"> / {c.criterion_max_marks ?? 6}</small>
            <span style={{ fontSize: '.78rem', color: 'var(--w-muted)' }}>{c.criterion_name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ModeratedFixTab({ findings, criteria, submissionId, ticks, setTick }: {
  findings: ModFinding[]; criteria: ModCriterion[]; submissionId: string;
  ticks: Record<string, boolean>; setTick: (k: string, v: boolean) => void;
}) {
  const sections = useMemo(() => buildSections(findings, criteria), [findings, criteria]);
  const [cur, setCur] = useState(() => sections.find((s) => s.gaps.length)?.id ?? sections[0]?.id ?? 'rq');
  const i = Math.max(0, sections.findIndex((s) => s.id === cur));
  const v = sections[i];
  const done = (fs: ModFinding[]) => fs.filter((f) => ticks[keyOf(f)]).length;
  if (!v) return null;
  return (
    <section className="ws" aria-label="Your IA, section by section" data-submission={submissionId}>
      <Hero criteria={criteria} />
      <div className="w-work">
        <nav className="w-card w-rail" aria-label="Sections">
          <h3>Your report, in order</h3>
          {sections.map((x) => {
            const dot = x.gaps.length > 0 && done(x.gaps) === x.gaps.length ? 'green' : x.status;
            return (
              <button key={x.id} type="button" aria-current={x.id === cur ? 'true' : undefined} onClick={() => setCur(x.id)}>
                <span className={'w-dot ' + dot} /><span>{x.name}</span><span className="tags">{x.code}</span>
              </button>
            );
          })}
        </nav>
        <article className="w-card w-sec">
          <header>
            <h2>{v.name}</h2>
            <span className="w-code">{v.code}</span>
            {v.crit && <span className="w-pill l34">{range(v.crit.indicative_mark_range)} / {v.crit.criterion_max_marks ?? 6}</span>}
            <div className="w-prog">
              <span className="w-cost">{done(v.gaps)} of {v.gaps.length} fixes</span>
              <div className="w-meter"><div style={{ width: (v.gaps.length ? (100 * done(v.gaps)) / v.gaps.length : 100) + '%' }} /></div>
            </div>
          </header>

          {v.gaps.some((f) => f.priority === 'high')
            ? <div className="w-limit" role="note"><h4>What is limiting your mark</h4><ul>{v.gaps.filter((f) => f.priority === 'high').map((f) => <li key={f.id}>{f.issue}<br /><em>What to do:</em> {f.specific_action}</li>)}</ul></div>
            : <div className="w-limit ok"><h4>Nothing here is holding your mark down</h4>Keep what you have and check it against the list below.</div>}

          <div className="w-blocks">
            <div className="w-blk"><h3><b>1</b>What you did</h3>
              {v.strengths.length
                ? v.strengths.map((f) => <blockquote key={f.id}>{f.issue}{f.evidence_excerpt && <small>{f.evidence_excerpt}</small>}</blockquote>)
                : <p style={{ margin: 0 }}>The moderator did not single out a strength in this section.</p>}</div>
            <div className="w-blk"><h3><b>2</b>What is lacking</h3>
              {v.gaps.length
                ? <ul>{v.gaps.map((f) => <li key={f.id}><span className="w-code">{v.code}</span> {f.issue}{f.why && <><br /><small style={{ color: 'var(--w-muted)' }}>Why it matters: {f.why}</small></>}</li>)}</ul>
                : <p style={{ margin: 0 }}>Nothing is missing here.</p>}</div>
            <div className="w-blk"><h3><b>3</b>How to fix it</h3>
              {v.gaps.length ? v.gaps.map((f) => (
                <div className="w-fix" key={f.id}>
                  <input type="checkbox" id={'fx-' + f.id} checked={!!ticks[keyOf(f)]} onChange={(e) => setTick(keyOf(f), e.target.checked)} />
                  <label htmlFor={'fx-' + f.id}><span className="w-code">{v.code}</span>{f.specific_action}</label>
                </div>)) : <p style={{ margin: 0 }}>No fixes needed for this section.</p>}</div>
            <div className="w-blk"><h3><b>4</b>You are done when</h3>
              {v.gaps.some((f) => f.completion_check)
                ? <ul>{v.gaps.filter((f) => f.completion_check).map((f) => <li key={f.id}>{f.completion_check}</li>)}</ul>
                : <p style={{ margin: 0 }}>Every item above is met and every fix is ticked.</p>}</div>
          </div>
          <div className="w-nav">
            <button className="w-btn ghost" type="button" disabled={i === 0} onClick={() => setCur(sections[i - 1].id)}>Previous section</button>
            <button className="w-btn cobalt" type="button" disabled={i === sections.length - 1} onClick={() => setCur(sections[i + 1].id)}>Next section</button>
          </div>
        </article>
      </div>
    </section>
  );
}

export function ModeratedProgressTab({ findings, criteria, ticks }: { findings: ModFinding[]; criteria: ModCriterion[]; ticks: Record<string, boolean> }) {
  const sections = useMemo(() => buildSections(findings, criteria), [findings, criteria]);
  const rows = sections.map((s) => ({ s, d: s.gaps.filter((f) => ticks[keyOf(f)]).length, n: s.gaps.length }));
  const t = rows.reduce((a, r) => a + r.d, 0), n = rows.reduce((a, r) => a + r.n, 0);
  return (
    <section className="ws" aria-label="Progress">
      <Hero criteria={criteria} />
      <div className="w-card">
        <div className="w-prow" style={{ background: 'var(--w-cobalt-soft)', borderRadius: '14px 14px 0 0' }}><b>All fixes</b><div className="w-meter"><div style={{ width: (n ? (100 * t) / n : 0) + '%' }} /></div><b>{t} / {n}</b></div>
        {rows.map((r) => (
          <div className="w-prow" key={r.s.id}><span>{r.s.name} <span className="w-code">{r.s.code}</span></span>
            <div className="w-meter"><div style={{ width: (r.n ? (100 * r.d) / r.n : 100) + '%' }} /></div><span className="w-mono">{r.d} / {r.n}</span></div>
        ))}
      </div>
      <p className="w-cost" style={{ marginTop: 10 }}>Ticks are saved in this browser. Re-upload your IA after you fix it to see your new marks.</p>
    </section>
  );
}

function Highlighted({ text, quote }: { text: string; quote?: string | null }) {
  if (!quote || quote.length < 12) return <>{text}</>;
  const i = text.indexOf(quote);
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark>{quote}</mark>{text.slice(i + quote.length)}</>;
}

type Row = { key: number; block: ReportBlock; extra?: string[]; indices: number[] };

export function ModeratedAnnotatedTab({ findings, criteria, loadText }: {
  findings: ModFinding[]; criteria: ModCriterion[]; loadText: () => Promise<ReportBlock[]>;
}) {
  const [blocks, setBlocks] = useState<ReportBlock[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let live = true;
    loadText().then((b) => { if (live) setBlocks(b); }).catch(() => { if (live) setErr('The report text is not available for this copy.'); });
    return () => { live = false; };
  }, [loadText]);

  const built = useMemo(() => {
    const at = new Map<number, ModFinding[]>();
    const unplaced: ModFinding[] = [];
    if (!blocks) return { at, unplaced };
    for (const f of findings) {
      let hit: ReportBlock | undefined;
      const q = f.evidence_excerpt ? norm(f.evidence_excerpt).slice(0, 60) : '';
      if (q.length >= 12) hit = blocks.find((b) => norm(b.text).includes(q));
      if (!hit && f.section_title) {
        const t = norm(f.section_title);
        hit = blocks.find((b) => b.block_type === 'heading' && norm(b.text) === t) ?? blocks.find((b) => b.section_title && norm(b.section_title) === t);
      }
      if (hit) at.set(hit.block_index, [...(at.get(hit.block_index) ?? []), f]);
      else unplaced.push(f);
    }
    return { at, unplaced };
  }, [blocks, findings]);

  const rows: Row[] = [];
  for (const b of blocks ?? []) {
    const last = rows[rows.length - 1];
    if (b.block_type === 'table_text' && last?.block.block_type === 'table_text') { (last.extra ??= []).push(b.text); last.indices.push(b.block_index); continue; }
    rows.push({ key: b.block_index, block: b, indices: [b.block_index] });
  }
  const lo = criteria.reduce((a, c) => a + (c.indicative_mark_range?.[0] ?? 0), 0);
  const hi = criteria.reduce((a, c) => a + (c.indicative_mark_range?.[1] ?? 0), 0);
  const max = criteria.reduce((a, c) => a + (c.criterion_max_marks ?? 6), 0) || 24;
  const comment = (f: ModFinding, i: number) => (
    <div key={f.id + i} className={'w-cm ' + levelOf(isStrength(f) ? 'low' : f.priority)}>
      <span className="tl">{isStrength(f) ? 'Strength' : 'Fix'}</span>
      <b>{codeOf(criteria.find((c) => c.criterion === f.criterion_code)?.criterion_name ?? f.criterion_code)}:</b> {f.issue}
      {!isStrength(f) && f.specific_action && <> <em style={{ fontStyle: 'normal', fontWeight: 600 }}>To move up:</em> {f.specific_action}</>}
    </div>
  );
  return (
    <section className="ws" aria-label="Annotated copy">
      <div className="w-annhead"><h2 style={{ fontSize: '1.4rem', marginRight: 'auto' }}>Annotated copy</h2></div>
      {err && <p className="w-note">{err}</p>}
      {!blocks && !err && <p className="w-note">Loading the report text…</p>}
      {blocks && (
        <div className="w-sheet ws-print">
          <div className="title"><div className="w-mono">SEHS IA · Comments for the student</div>
            <h2 style={{ fontSize: '1.5rem' }}>Annotated copy</h2>
            <div className="w-mono" style={{ marginTop: 6 }}>Marked {lo === hi ? lo : `${lo}–${hi}`} / {max} · {criteria.map((c) => `${codeOf(c.criterion_name)} ${range(c.indicative_mark_range)}`).join(' · ')}</div></div>
          {rows.map((row) => {
            const { key, block, extra } = row;
            const cm = row.indices.flatMap((i) => built.at.get(i) ?? []);
            const isHead = block.block_type === 'heading' && block.text.length <= 120;
            const tab = block.block_type === 'table_text';
            return (
              <div className="w-arow" key={key}>
                <div className={'txt' + (tab ? ' tab' : '')}>
                  {isHead ? <div className="hd">{block.text}</div>
                    : <p>{tab ? [block.text, ...(extra ?? [])].join('  ·  ') : <Highlighted text={block.text} quote={cm.find((f) => f.evidence_excerpt)?.evidence_excerpt} />}</p>}
                </div>
                <div>{cm.map(comment)}</div>
              </div>
            );
          })}
          {built.unplaced.length > 0 && (
            <div className="w-arow"><div className="txt"><div className="hd">Comments on the report as a whole</div><p>These comments are not tied to one passage.</p></div>
              <div>{built.unplaced.map(comment)}</div></div>
          )}
        </div>
      )}
    </section>
  );
}
