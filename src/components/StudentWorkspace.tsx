import { useEffect, useMemo, useState } from 'react';
import { SECTIONS, levelClass, sectionView } from '../lib/markMap';
import { MarkGate, WsHero, type MM } from './WorkspaceParts';
import './workspace.css';

const keyFor = (id: string) => `ws-ticks-${id}`;
export function useTicks(submissionId: string) {
  const [ticks, setTicks] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(keyFor(submissionId)) ?? '{}'); } catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem(keyFor(submissionId), JSON.stringify(ticks)); } catch { /* ticks stay in memory */ } }, [ticks, submissionId]);
  return [ticks, (k: string, v: boolean) => setTicks((t) => ({ ...t, [k]: v }))] as const;
}

/** The one working screen: sections in report order, each with what you did, what is lacking, how to fix it and when you are done. */
export function StudentWorkspace({ mm, submissionId, isFreePreview, ticks, setTick }: { mm: MM; submissionId: string; isFreePreview: boolean; ticks: Record<string, boolean>; setTick: (k: string, v: boolean) => void }) {
  const [cur, setCur] = useState('bg');
  const map = mm.map;
  const views = useMemo(() => (map ? SECTIONS.map((s) => sectionView(map, s.id)) : []), [map]);
  if (isFreePreview) return <section className="ws"><p className="w-note">Marks and the fix plan need the full review.</p></section>;
  if (!map) return mm.checked ? <MarkGate mm={mm} /> : <section className="ws"><p className="w-note">Loading your saved marks…</p></section>;
  const i = Math.max(0, SECTIONS.findIndex((s) => s.id === cur));
  const v = views[i];
  const doneIn = (k: string[]) => k.filter((x) => ticks[x]).length;
  const hasPlan = !!map.plan;
  return (
    <section className="ws" aria-label="Your IA, section by section" data-submission={submissionId}>
      <WsHero map={map} />
      {!hasPlan && (
        <p className="w-note">{mm.busy === 'plan' ? 'Building your fix plan… about a minute.' : 'Your step-by-step fix plan is not ready yet. The list below shows what the marking found.'}
          {mm.busy !== 'plan' && <> <button className="w-btn cobalt" type="button" onClick={() => void mm.run('plan')}>Build my fix plan</button></>}</p>)}
      {mm.error && <p role="alert" className="w-error">{mm.error}</p>}
      <div className="w-work">
        <nav className="w-card w-rail" aria-label="Sections">
          <h3>Your report, in order</h3>
          {views.map((x) => {
            const d = doneIn(x.fixes.map((f) => f.key));
            const dot = x.fixes.length > 0 && d === x.fixes.length ? 'green' : x.status;
            return (
              <button key={x.sec.id} type="button" aria-current={x.sec.id === cur ? 'true' : undefined} onClick={() => setCur(x.sec.id)}>
                <span className={'w-dot ' + dot} /><span>{x.sec.name}</span><span className="tags">{x.sec.strands.join(' ')}</span>
              </button>
            );
          })}
        </nav>
        <article className="w-card w-sec">
          <header>
            <h2>{v.sec.name}</h2>
            {v.strands.map((s) => <span key={s.id} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span className="w-code">{s.id}</span><span className={'w-pill ' + levelClass(s.level)}>{s.level}</span></span>)}
            <div className="w-prog"><span className="w-cost">{doneIn(v.fixes.map((f) => f.key))} of {v.fixes.length} fixes</span>
              <div className="w-meter"><div style={{ width: (v.fixes.length ? (100 * doneIn(v.fixes.map((f) => f.key))) / v.fixes.length : 100) + '%' }} /></div></div>
          </header>
          {v.limits.length > 0
            ? <div className="w-limit" role="note"><h4>What is limiting your mark</h4><ul>{v.limits.map((l, k) => <li key={k}>{l.detail}<br /><em>What to do:</em> {l.action}</li>)}</ul></div>
            : <div className="w-limit ok"><h4>Nothing is holding this section down</h4>Keep what you have and check it against the list below.</div>}
          {v.checks.length > 0 && <div className="w-checks" aria-label="Moderator template checks">{v.checks.map((c) => <span key={c.id} className={'w-chk ' + (c.met ? 'y' : 'n')}>{c.met ? 'Met: ' : 'Missing: '}{c.text}</span>)}</div>}
          <div className="w-blocks">
            <div className="w-blk"><h3><b>1</b>What you did</h3>
              {v.did.length ? v.did.map((d, k) => <blockquote key={k}><span className="w-code">{d.id}</span> {d.quote}{d.where && <small>{d.where}</small>}</blockquote>) : <p style={{ margin: 0 }}>The marking found no text in the report body that shows this yet.</p>}</div>
            <div className="w-blk"><h3><b>2</b>What is lacking</h3>
              {v.lacking.length ? <ul>{v.lacking.map((l, k) => <li key={k}><span className="w-code">{l.id}</span> {l.text}</li>)}</ul> : <p style={{ margin: 0 }}>Nothing is missing here.</p>}</div>
            <div className="w-blk"><h3><b>3</b>How to fix it</h3>
              {v.fixes.length ? v.fixes.map((f) => (
                <div className="w-fix" key={f.key}>
                  <input type="checkbox" id={'fx-' + f.key + v.sec.id} checked={!!ticks[f.key]} onChange={(e) => setTick(f.key, e.target.checked)} />
                  <label htmlFor={'fx-' + f.key + v.sec.id}><span className="w-code">{f.id}</span>{f.text}</label>
                </div>)) : <p style={{ margin: 0 }}>No fixes needed for this section.</p>}</div>
            <div className="w-blk"><h3><b>4</b>You are done when</h3>
              {v.done.length ? <ul>{v.done.map((d, k) => <li key={k}>{d}</li>)}</ul> : <p style={{ margin: 0 }}>Every item above is met and every fix is ticked.</p>}</div>
          </div>
          <div className="w-nav">
            <button className="w-btn ghost" type="button" disabled={i === 0} onClick={() => setCur(SECTIONS[i - 1].id)}>Previous section</button>
            <button className="w-btn cobalt" type="button" disabled={i === SECTIONS.length - 1} onClick={() => setCur(SECTIONS[i + 1].id)}>Next section</button>
          </div>
        </article>
      </div>
    </section>
  );
}

export function ProgressView({ mm, ticks }: { mm: MM; ticks: Record<string, boolean> }) {
  const map = mm.map;
  if (!map) return mm.checked ? <MarkGate mm={mm} /> : <section className="ws"><p className="w-note">Loading…</p></section>;
  const rows = SECTIONS.map((s) => { const v = sectionView(map, s.id); const d = v.fixes.filter((f) => ticks[f.key]).length; return { v, d, n: v.fixes.length }; });
  const t = rows.reduce((a, r) => a + r.d, 0), n = rows.reduce((a, r) => a + r.n, 0);
  return (
    <section className="ws" aria-label="Progress">
      <WsHero map={map} />
      <div className="w-card">
        <div className="w-prow" style={{ background: 'var(--w-cobalt-soft)', borderRadius: '14px 14px 0 0' }}><b>All fixes</b><div className="w-meter"><div style={{ width: (n ? (100 * t) / n : 0) + '%' }} /></div><b>{t} / {n}</b></div>
        {rows.map((r) => (
          <div className="w-prow" key={r.v.sec.id}><span>{r.v.sec.name} <span className="w-code">{r.v.sec.strands.join(' ')}</span></span>
            <div className="w-meter"><div style={{ width: (r.n ? (100 * r.d) / r.n : 100) + '%' }} /></div><span className="w-mono">{r.d} / {r.n}</span></div>
        ))}
      </div>
      <p className="w-cost" style={{ marginTop: 10 }}>Ticks are saved in this browser. Re-upload your IA after you fix it to see your new marks.</p>
    </section>
  );
}
