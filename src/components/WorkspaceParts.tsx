import type { MarkMap } from '../lib/markMap';
import type { useMarkMap } from '../lib/useMarkMap';
import './workspace.css';

export type MM = ReturnType<typeof useMarkMap>;
export const CRIT_NAMES: Record<string, string> = { RD: 'Research design', DA: 'Data analysis', CO: 'Conclusion', EV: 'Evaluation' };

export function WsHero({ map, teacher }: { map: MarkMap; teacher?: boolean }) {
  const over = map.word_count.over_by;
  const pct = Math.min(100, Math.round((100 * map.word_count.counted) / map.word_count.limit));
  return (
    <div className="w-card w-hero">
      <div><div className="w-mono">{teacher ? 'Recommended mark' : 'Your mark'}</div><div className="w-total">{map.mark}<small> / {map.maximum}</small></div></div>
      <div className="w-tiles">
        {map.criteria.map((c) => (
          <div className="w-tile" key={c.code}><span className="w-mono">{c.code}</span><b>{c.mark}</b><small className="n"> / {c.max}</small><span style={{ fontSize: '.78rem', color: 'var(--w-muted)' }}>{CRIT_NAMES[c.code] ?? c.criterion}</span></div>
        ))}
      </div>
      <div style={{ minWidth: 190 }}>
        <div className="w-mono">Word count</div>
        <b>{map.word_count.counted.toLocaleString()}</b> of {map.word_count.limit.toLocaleString()}
        <div className={'w-meter' + (over > 0 ? ' over' : '')}><div style={{ width: pct + '%' }} /></div>
        <span className="w-cost">{over > 0 ? `${over} words over the limit` : 'Within the limit'}</span>
      </div>
    </div>
  );
}

/** Shown before the IA has been marked. Marking is only started when the person presses the button. */
export function MarkGate({ mm, teacher }: { mm: MM; teacher?: boolean }) {
  return (
    <section className="ws">
      <div className="w-card w-sec">
        <h2>{teacher ? 'Mark this IA' : 'See where you stand'}</h2>
        <p style={{ maxWidth: 640 }}>The IA is marked once against the IB SEHS criteria, strand by strand, using only what the report shows. One saved marking then feeds the fix plan, the annotated copy and the teacher copy, so they always agree.</p>
        {mm.ready
          ? <button className="w-btn cobalt" type="button" onClick={() => void mm.generate()} disabled={!!mm.busy}>{mm.busy === 'marking' ? 'Marking the IA… about a minute' : mm.busy === 'plan' ? 'Building the fix plan… about a minute' : 'Mark my IA and build my fix plan'}</button>
          : <p className="w-note">{mm.checked ? 'The marking service is not available yet. Try again shortly.' : 'Loading the saved marks…'}</p>}
        {mm.error && <p role="alert" className="w-error">{mm.error}</p>}
      </div>
    </section>
  );
}
