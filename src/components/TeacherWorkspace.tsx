import { useCallback, useEffect, useState } from 'react';
import { STRAND_DESCRIPTORS, NOT_REACHED, STRAND_NAMES } from '../lib/strandSheet';
import { allStrands, hasAnnotations, levelClass, planOf } from '../lib/markMap';
import { buildMarkCopyHtml, type MarkCopyMap } from '../lib/teacherCopy';
import { PolicyFlagsStrip } from './PolicyFlagsStrip';
import { CRIT_NAMES, MarkGate, WsHero, type MM } from './WorkspaceParts';
import './workspace.css';

const where = (page: number | null, section: string | null) => [section, page ? 'page ' + page : ''].filter(Boolean).join(', ');

function OwnMark({ submissionId, code, mark, max }: { submissionId: string; code: string; mark: number; max: number }) {
  const key = `ws-own-${submissionId}-${code}`;
  const [v, setV] = useState(() => { try { return localStorage.getItem(key) ?? ''; } catch { return ''; } });
  useEffect(() => { try { if (v === '') localStorage.removeItem(key); else localStorage.setItem(key, v); } catch { /* kept in memory */ } }, [v, key]);
  const own = v === '' ? null : Math.max(0, Math.min(max, Math.round(Number(v))));
  const diff = own === null || Number.isNaN(own) ? null : own - mark;
  return (
    <>
      <td className="w-own"><input type="number" min={0} max={max} step={1} value={v} placeholder="–" aria-label={`Your own mark for ${CRIT_NAMES[code] ?? code}`} onChange={(e) => setV(e.target.value)} /></td>
      <td className="w-diff" style={{ color: diff === null ? undefined : diff === 0 ? 'var(--w-green)' : 'var(--w-red)' }}>{diff === null ? '–' : (diff > 0 ? '+' : '') + diff}</td>
    </>
  );
}

export function TeacherWorkspace({ mm, submissionId, isFreePreview, openAnnotated }: { mm: MM; submissionId: string; isFreePreview: boolean; openAnnotated: () => void }) {
  const map = mm.map;
  const download = useCallback(() => {
    if (!map) return;
    const html = buildMarkCopyHtml({ map: map as unknown as MarkCopyMap, generatedOn: new Date().toLocaleDateString('en-GB') });
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'SEHS-IA-teacher-copy.html'; a.click();
    URL.revokeObjectURL(url);
  }, [map]);
  if (isFreePreview) return <section className="ws"><p className="w-note">The teacher view needs the full review.</p></section>;
  if (!map) return mm.checked ? <MarkGate mm={mm} teacher /> : <section className="ws"><p className="w-note">Loading the saved marks…</p></section>;
  const strands = allStrands(map);
  const lowStrands = strands.filter((s) => s.level !== '5-6');
  const heldBy = (code: string) => (map.limits ?? []).filter((l) => l.criterion === code && l.kind !== 'words' && l.kind !== 'inconsistency_minor').map((l) => (l.strand ?? code) + (l.kind === 'template' ? ' template' : l.kind === 'inconsistency' ? ' contradiction' : l.kind === 'no_evidence' ? ' no evidence' : ' average')).join(', ') || 'Nothing: the evidence supports this mark';
  return (
    <section className="ws" aria-label="Teacher view">
      <WsHero map={map} teacher />
      {map.data_sufficiency && <p className="w-note">Indicative, non-binding marks. Whole marks only, using evidence in the report body. Data sufficiency: {map.data_sufficiency}</p>}
      {mm.error && <p role="alert" className="w-error">{mm.error}</p>}
      <div className="w-tgrid">
        <div>
          <div className="w-card w-tcard"><h2>Criterion marks and your own mark</h2>
            <p className="w-cost" style={{ margin: '0 0 10px' }}>A recommended mark cannot round up from its strand average. Type your own mark to see the difference. It is saved in this browser.</p>
            <div className="w-scroll"><table><thead><tr><th>Criterion</th><th>Recommended</th><th>Your mark</th><th>Difference</th><th>Held down by</th></tr></thead>
              <tbody>{map.criteria.map((c) => (
                <tr key={c.code}><td><b>{c.code}</b> {CRIT_NAMES[c.code] ?? c.criterion}</td><td><b style={{ fontFamily: 'var(--w-head)', fontSize: '1.2rem' }}>{c.mark}</b> / {c.max}</td>
                  <OwnMark submissionId={submissionId} code={c.code} mark={c.mark} max={c.max} /><td style={{ fontSize: '.82rem' }}>{heldBy(c.code)}</td></tr>))}</tbody></table></div>
          </div>
          <div className="w-card w-tcard"><h2>Strand table</h2>
            <div className="w-scroll"><table><thead><tr><th>Strand</th><th>Level</th><th>Evidence in the report</th><th>Justification</th></tr></thead>
              <tbody>{strands.map((s) => (
                <tr key={s.id}><td><span className="w-code">{s.id}</span><br /><span style={{ fontSize: '.78rem', color: 'var(--w-muted)' }}>{STRAND_NAMES[s.id] ?? s.name}</span></td>
                  <td><span className={'w-pill ' + levelClass(s.level)}>{s.level}</span></td>
                  <td>{s.evidence.length ? s.evidence.map((e, i) => <blockquote key={i}>{e.quote}<small>{where(e.page, e.section)}</small></blockquote>) : <span style={{ color: 'var(--w-muted)' }}>No quoted evidence</span>}</td>
                  <td><div style={{ fontSize: '.78rem', color: 'var(--w-muted)', marginBottom: 4 }}>{STRAND_DESCRIPTORS[s.id]?.[s.level] ?? NOT_REACHED}</div>{s.reason}</td></tr>))}</tbody></table></div>
          </div>
          <div className="w-card w-tcard"><h2>Coaching for each strand below the top level</h2>
            <p className="w-cost" style={{ margin: '0 0 12px' }}>For the teacher. Use it to guide the student in conversation or with prompts. The student screen shows the steps only.</p>
            {!map.plan && <p className="w-note">Coaching is written with the fix plan. {mm.busy === 'plan' ? 'Building it now…' : <button className="w-btn cobalt" type="button" onClick={() => void mm.run('plan')}>Build the fix plan and coaching</button>}</p>}
            {lowStrands.map((s, i) => {
              const c = planOf(map, s.id)?.coach;
              return (
                <details className="w-coach" key={s.id} open={i === 0}>
                  <summary><span className="w-code">{s.id}</span>{STRAND_NAMES[s.id] ?? s.name}<span className={'w-pill ' + levelClass(s.level)}>{s.level}</span></summary>
                  {c ? (
                    <div className="w-cbody">
                      <div className="w-cb"><h5>What the descriptor needs</h5><p>{c.need}</p></div>
                      <div className="w-cb"><h5>What is missing in this report</h5><p>{c.miss}</p></div>
                      <div className="w-cb"><h5>What to ask or tell the student</h5><ul>{c.ask.map((a, k) => <li key={k}>{a}</li>)}</ul></div>
                      <div className="w-cb"><h5>What a stronger version contains</h5><p>{c.strong}</p></div>
                      {c.direction && <div className="w-cb model"><h5>Direction on this student’s own topic (teacher only, to say or turn into prompts)</h5><p>{c.direction}</p></div>}
                    </div>
                  ) : <div className="w-cbody"><div className="w-cb" style={{ gridColumn: '1/-1' }}><h5>What is missing</h5><p>{s.missing || s.reason}</p></div></div>}
                </details>
              );
            })}
          </div>
        </div>
        <aside>
          <div className="w-card w-tcard"><h2>Outputs</h2>
            <div className="w-actions">
              <button className="w-btn" type="button" onClick={download}>Download teacher copy</button>
              <button className="w-btn yellow" type="button" disabled={!!mm.busy} onClick={async () => { if (hasAnnotations(map) || await mm.run('annotate')) openAnnotated(); }}>{mm.busy === 'annotate' ? 'Preparing…' : hasAnnotations(map) ? 'Open annotated copy' : 'Prepare annotated copy'}</button>
            </div>
            <p className="w-cost" style={{ margin: '10px 0 0' }}>Download uses the saved marking, no extra call. Prepare annotated copy makes <b>one</b> extra call that shortens every comment to what was found and why the level is justified. It runs only when you press it.</p>
          </div>
          <div className="w-card w-tcard"><h2>Word limit</h2>
            <p style={{ margin: '0 0 6px' }}><b>{map.word_count.counted.toLocaleString()}</b> counted words, limit {map.word_count.limit.toLocaleString()}: {map.word_count.over_by > 0 ? <b style={{ color: 'var(--w-red)' }}>{map.word_count.over_by} over</b> : <b style={{ color: 'var(--w-green)' }}>within the limit</b>}.</p>
            <p className="w-cost" style={{ margin: '0 0 8px' }}>Tables, graphs, references and appendices are not counted.</p>
            {map.word_count.sections.some((x) => x.budget) && <table><thead><tr><th>Section</th><th>Words</th><th>Template</th></tr></thead>
              <tbody>{map.word_count.sections.filter((x) => x.budget).map((x, i) => { const b = x.budget!; const over = x.words > b.max; const under = b.min !== undefined && x.words < b.min;
                return <tr key={i}><td>{x.heading}</td><td>{x.words}</td><td style={{ color: over || under ? 'var(--w-red)' : 'var(--w-green)' }}>{b.min ? `${b.min} to ${b.max}` : `max ${b.max}`}</td></tr>; })}</tbody></table>}
          </div>
          {map.word_count.over_by > 0 && (
            <div className="w-card w-tcard"><h2>Cut list</h2>
              {map.trim ? <>{map.trim.items.map((t, i) => <div className="w-row" key={t.block_index}><span className="w-mono">{i + 1}</span><span>{t.preview}<br /><span className="w-cost">{t.section ?? 'Report'} · {t.action} · {t.why}</span></span><b>{t.words_saved}</b></div>)}
                <p className="w-cost" style={{ margin: '8px 0 0' }}>{map.trim.enough ? `Saves ${map.trim.total_saved} words, enough to get under the limit.` : `Saves ${map.trim.total_saved} of the ${map.trim.over_by} words needed.`} Text that is the only evidence for a strand is shortened, never removed.</p></>
                : <button className="w-btn cobalt" type="button" disabled={!!mm.busy} onClick={() => void mm.run('trim')}>{mm.busy === 'trim' ? 'Preparing…' : 'Prepare the cut list'}</button>}
            </div>)}
          <div className="w-card w-tcard"><h2>Appendix check</h2>
            {map.appendix_check.length ? map.appendix_check.map((a, i) => <div className="w-row" key={i}><span className={'w-chk ' + (a.relevant ? 'y' : 'n')}>{a.relevant ? 'OK' : 'Pad'}</span><span>{a.label}<br /><span className="w-cost">{a.reason}</span></span><span /></div>) : <p className="w-cost" style={{ margin: 0 }}>No appendix items were found.</p>}
            <p className="w-cost" style={{ margin: '8px 0 0' }}>Appendices are not marked.</p>
          </div>
          <div className="w-card w-tcard"><h2>Policy flags</h2>
            <PolicyFlagsStrip submissionId={submissionId} />
            <p className="w-cost" style={{ margin: 0 }}>IB policy observations show above when found. References are not scanned.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
