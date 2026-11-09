import { useMemo } from 'react';
import { buildMarkMap } from '../lib/markMap';
import type { WorkshopCriterion, WorkshopFinding } from '../lib/sectionMap';
import './mark-map.css';

export function MarkMapTab({ criteria, findings, isFreePreview }: { criteria: WorkshopCriterion[]; findings: WorkshopFinding[]; isFreePreview: boolean }) {
  const map = useMemo(() => buildMarkMap(criteria, findings), [criteria, findings]);
  if (isFreePreview) return <section className="mm-root"><p className="mm-note">The mark map needs the full review.</p></section>;
  if (!map) return <section className="mm-root"><p className="mm-note">The mark map could not be built because this report has no criterion ranges.</p></section>;
  return (
    <section className="mm-root" aria-label="Teacher recommended mark">
      <header className="mm-hero">
        <div><span>Teacher recommended mark</span><strong>{map.mark} / {map.maximum}</strong>
          <em>Boundary {map.boundary[0]}{map.boundary[1] > map.boundary[0] ? '–' + map.boundary[1] : ''} · official rubric range {map.official[0]}–{map.official[1]}</em></div>
        <p>Each criterion is placed inside its official IB SEHS range by how many Ideal IA template checks in every section are clear of flagged findings. Bands are indicative and non-binding. Only the official IB criteria decide a band.</p>
      </header>
      {map.criteria.map((c) => (
        <article className="mm-card" key={c.name}>
          <div className="mm-head">
            <h3>{c.name}</h3>
            <div className="mm-mark"><strong>{c.mark} / {c.max}</strong><small>Official range {c.official[0]}–{c.official[1]}{c.borderline ? ' · borderline, could be ' + Math.min(c.official[1], c.mark + 1) : ''}</small></div>
          </div>
          {c.bandText && <div className="mm-band"><span>Official descriptor for band {c.band}</span><p>{c.bandText}</p></div>}
          <table className="mm-table"><thead><tr><th>Template section</th><th>Checks clear</th><th>What is holding it back</th></tr></thead>
            <tbody>{c.sections.map((s) => (
              <tr key={s.id}><td>{s.name}</td>
                <td><b className={s.gaps.length ? 'mm-warn' : 'mm-ok'}>{Math.round(s.clear * 10) / 10} of {s.checks}</b></td>
                <td>{s.gaps.length ? s.gaps.slice(0, 3).map((g) => g.title).join(' · ') : 'Nothing flagged'}</td></tr>
            ))}</tbody></table>
          {c.moveUp.length > 0 && c.nextBand && (
            <div className="mm-next"><span>To move toward band {c.nextBand}</span><ul>{c.moveUp.map((m, i) => <li key={i}><b>{m.section}:</b> {m.title}</li>)}</ul>
              {c.nextText && <p>{c.nextText}</p>}</div>)}
        </article>
      ))}
    </section>
  );
}
