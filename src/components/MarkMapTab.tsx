import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { templateAdvice } from '../lib/templateAdvice';
import type { WorkshopCriterion, WorkshopFinding } from '../lib/sectionMap';
import './mark-map.css';

type Statement = { statement: string; band: string; status: string; reason: string; evidence: { quote: string; page: number | null; section: string | null }[] };
type Gap = { descriptor_phrase: string; section: string | null; page: number | null; what_to_do: string };
type CriterionMark = { criterion: string; max: number; mark: number; mark_high: number; band: string; why_mark: string; statements: Statement[]; next_gaps: Gap[]; confidence: string };
type MarkMapResult = { mark: number; mark_high: number; maximum: number; source_complete: boolean; criteria: CriterionMark[] };

const LABEL: Record<string, string> = { met: 'Met', partly: 'Partly', not_met: 'Not met' };
const where = (page: number | null, section: string | null) => [section, page ? 'page ' + page : ''].filter(Boolean).join(' · ') || 'whole document';

export function MarkMapTab({ submissionId, criteria, findings, isFreePreview }: { submissionId: string; criteria: WorkshopCriterion[]; findings: WorkshopFinding[]; isFreePreview: boolean }) {
  const [map, setMap] = useState<MarkMapResult | null>(null);
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (isFreePreview || !submissionId) return;
    let live = true;
    supabase.functions.invoke('mark-map', { body: { submission_id: submissionId, action: 'get' } }).then(({ data, error: e }) => {
      if (!live) return;
      setChecked(true);
      if (e || data?.error) { setReady(false); return; }
      setReady(true);
      if (data?.map?.criteria) setMap(data.map as MarkMapResult);
    });
    return () => { live = false; };
  }, [submissionId, isFreePreview]);
  const range = useMemo(() => new Map(criteria.map((c) => [c.criterion_name, c.indicative_mark_range])), [criteria]);

  async function generate() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const { data, error: e } = await supabase.functions.invoke('mark-map', { body: { submission_id: submissionId, action: 'generate' } });
      if (e) throw e;
      if (data?.error) throw new Error(String(data.error));
      setMap(data.map as MarkMapResult);
    } catch (e) { setError(e instanceof Error ? e.message : 'The mark map could not be prepared. Try again.'); }
    finally { setBusy(false); }
  }

  if (isFreePreview) return <section className="mm-root"><p className="mm-note">The mark map needs the full review.</p></section>;
  if (!map && !checked) return <section className="mm-root"><p className="mm-note">Loading your saved marks…</p></section>;
  if (!map) return (
    <section className="mm-root">
      <header className="mm-hero"><div><span>Teacher recommended mark</span><strong>Evidence-based</strong></div>
        <p>This marks each of the four criteria against the official IB SEHS descriptors, using only what the IA itself shows, with quoted evidence. The Ideal IA template is never used to set a mark.</p></header>
      {ready
        ? <button className="sx-btn" type="button" onClick={() => void generate()} disabled={busy}>{busy ? 'Marking against the rubric…' : 'Mark this IA against the IB rubric'}</button>
        : <p className="mm-note">The marking service is not available yet. Try again shortly.</p>}
      {error && <p role="alert" className="sx-error">{error}</p>}
    </section>
  );
  return (
    <section className="mm-root" aria-label="Teacher recommended mark">
      <header className="mm-hero">
        <div><span>Teacher recommended mark</span><strong>{map.mark} / {map.maximum}</strong>
          <em>{map.mark_high > map.mark ? 'Boundary ' + map.mark + '–' + map.mark_high + ' · evidence could support the higher mark' : 'Evidence supports this mark'}</em></div>
        <p>Marked against the official IB SEHS descriptors using quoted evidence from the IA. Bands are indicative and non-binding. The Ideal IA template only suggests how to score up and never sets a mark.</p>
      </header>
      {!map.source_complete && <p className="mm-note">The IA was long, so only part of it could be read. Treat the marks as provisional.</p>}
      {map.criteria.map((c) => {
        const r = range.get(c.criterion);
        const advice = templateAdvice(c.criterion, findings);
        return (
          <article className="mm-card" key={c.criterion}>
            <div className="mm-head">
              <h3>{c.criterion}</h3>
              <div className="mm-mark"><strong>{c.mark_high > c.mark ? c.mark + '–' + c.mark_high : c.mark} / {c.max}</strong>
                <small>Band {c.band}{r ? ' · review range ' + r[0] + '–' + r[1] : ''} · {c.confidence} confidence</small></div>
            </div>
            <div className="mm-band"><span>Why this mark</span><p>{c.why_mark}</p></div>
            <table className="mm-table"><thead><tr><th>Official descriptor statement</th><th>Result</th><th>Evidence in the IA</th></tr></thead>
              <tbody>{c.statements.map((s, i) => (
                <tr key={i}><td>{s.statement}<small className="mm-sub">Band {s.band}</small></td>
                  <td><b className={s.status === 'met' ? 'mm-ok' : 'mm-warn'}>{LABEL[s.status] ?? s.status}</b></td>
                  <td>{s.evidence.length ? s.evidence.map((e, j) => <blockquote key={j}>{e.quote}<small>{where(e.page, e.section)}</small></blockquote>) : <span className="mm-sub">{s.reason}</span>}</td></tr>
              ))}</tbody></table>
            {c.next_gaps.length > 0 && (
              <div className="mm-next"><span>To score up: from the rubric and your IA</span>
                <ul>{c.next_gaps.map((g, i) => <li key={i}><b>{g.descriptor_phrase}</b> <em>({where(g.page, g.section)})</em><br />{g.what_to_do}</li>)}</ul></div>)}
            {advice.length > 0 && (
              <div className="mm-next mm-template"><span>Ideal IA template suggestions (advice only, not part of the mark)</span>
                <ul>{advice.map((a, i) => <li key={i}><b>{a.section}:</b> {a.title}</li>)}</ul></div>)}
          </article>
        );
      })}
    </section>
  );
}
