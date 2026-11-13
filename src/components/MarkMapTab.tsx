import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { NOT_REACHED, STRAND_DESCRIPTORS } from '../lib/strandSheet';
import type { WorkshopFinding } from '../lib/sectionMap';
import './mark-map.css';

type Evidence = { quote: string; page: number | null; section: string | null };
type StrandMark = { id: string; name: string; level: string; reason: string; missing: string; evidence: Evidence[] };
type CriterionMark = { code: string; criterion: string; max: number; mark: number; why_mark: string; strands: StrandMark[]; confidence: string };
type StrandPlan = { id: string; plain_ask: string; where_you_are: string; steps: string[]; example: string; extend_prompts: string[]; done_when: string };
type CriterionPlan = { code: string; summary: string; quick_wins: string[]; strands: StrandPlan[] };
type Budget = { label: string; min?: number; max: number } | null;
type SectionWords = { heading: string; words: number; table_words: number; budget: Budget };
type TrimItem = {
  block_index: number; section: string | null; page: number | null; preview: string; words: number; action: 'remove' | 'shorten'; reason: string; why: string;
  serves: string[]; repeated_at: { block_index: number; section: string | null } | null; keep_point: string; words_saved: number; running_total: number;
};
type Trim = { over_by: number; items: TrimItem[]; enough: boolean; total_saved: number };
type WordCount = { counted: number; limit: number; over_by: number; cut_at: { heading: string; page: number | null } | null; sections: SectionWords[] };
type Limit = { kind: string; criterion: string; strand: string | null; detail: string; action: string };
type MarkMapResult = {
  limits?: Limit[];
  mark: number; maximum: number; source_complete: boolean; over_word_limit: boolean; word_count: WordCount; trim: Trim | null;
  criteria: CriterionMark[]; appendix_check: { label: string; relevant: boolean; reason: string }[]; data_sufficiency: string; plan: CriterionPlan[] | null;
};

const where = (page: number | null, section: string | null) => [section, page ? 'page ' + page : ''].filter(Boolean).join(' · ') || 'whole document';
const status = (level: string) => (level === '5-6' ? { k: 'strong', t: 'Strong' } : level === '3-4' ? { k: 'mid', t: 'Getting there' } : { k: 'low', t: 'Needs work' });

export function MarkMapTab({ submissionId, isFreePreview, mode, onScore }: { onScore?: (s: { mark: number; maximum: number } | null) => void; findings?: WorkshopFinding[]; submissionId: string; isFreePreview: boolean; mode: 'student' | 'teacher' }) {
  const [map, setMap] = useState<MarkMapResult | null>(null);
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [step, setStep] = useState<'' | 'marking' | 'plan'>('');
  const [error, setError] = useState('');

  const call = useCallback(async (action: 'get' | 'generate' | 'plan' | 'trim') => {
    const { data, error: e } = await supabase.functions.invoke('mark-map', { body: { submission_id: submissionId, action } });
    if (e) throw e;
    if (data?.error) throw new Error(String(data.error));
    return data as { map: MarkMapResult | null };
  }, [submissionId]);

  const [trimBusy, setTrimBusy] = useState(false);
  const makeTrim = useCallback(async () => {
    setTrimBusy(true); setError('');
    try { const d = await call('trim'); if (d.map) setMap(d.map); }
    catch (e) { setError(e instanceof Error ? e.message : 'The list of what to cut could not be prepared. Try again.'); }
    finally { setTrimBusy(false); }
  }, [call]);

  const makePlan = useCallback(async () => {
    setStep('plan'); setError('');
    try { const d = await call('plan'); if (d.map) setMap(d.map); }
    catch (e) { setError(e instanceof Error ? e.message : 'The fix plan could not be prepared. Try again.'); }
    finally { setStep(''); }
  }, [call]);

  useEffect(() => {
    if (isFreePreview || !submissionId) return;
    let live = true;
    call('get').then((d) => { if (!live) return; setChecked(true); setReady(true); if (d.map?.criteria) setMap(d.map); }).catch(() => { if (live) { setChecked(true); setReady(false); } });
    return () => { live = false; };
  }, [submissionId, isFreePreview, call]);

  async function generate() {
    if (step) return;
    setStep('marking'); setError('');
    try {
      const d = await call('generate');
      if (d.map) { setMap(d.map); if (!d.map.plan) void makePlan(); else setStep(''); } else setStep('');
    } catch (e) { setError(e instanceof Error ? e.message : 'The marking could not be prepared. Try again.'); setStep(''); }
  }

  useEffect(() => { onScore?.(map ? { mark: map.mark, maximum: map.maximum } : null); }, [map, onScore]);

  const planBy = useMemo(() => new Map((map?.plan ?? []).map((p) => [p.code, p])), [map]);

  if (isFreePreview) return <section className="mm-root"><p className="mm-note">Marks and the fix plan need the full review.</p></section>;
  if (!map && !checked) return <section className="mm-root"><p className="mm-note">Loading your saved marks…</p></section>;
  if (!map) return (
    <section className="mm-root">
      <header className="mm-hero"><div><span>{mode === 'teacher' ? 'Recommended mark' : 'Your marks and fix plan'}</span><strong>{mode === 'teacher' ? 'Strand by strand' : 'See where you stand'}</strong></div>
        <p>Your IA is marked against the IB SEHS criteria, one strand at a time, using only what your report shows. You then get a step-by-step plan for every strand, with examples and prompts, to reach the next band.</p></header>
      {ready
        ? <button className="sx-btn" type="button" onClick={() => void generate()} disabled={!!step}>{step === 'marking' ? 'Marking your IA… about a minute' : 'Mark my IA and build my fix plan'}</button>
        : <p className="mm-note">The marking service is not available yet. Try again shortly.</p>}
      {error && <p role="alert" className="sx-error">{error}</p>}
    </section>
  );

  const notices = (
    <>
      <WordGuide map={map} mode={mode} onTrim={() => void makeTrim()} trimBusy={trimBusy} planBusy={step === 'plan'} />
      {!map.source_complete && <p className="mm-note">The IA was long, so only part of it could be read. Treat the marks as provisional.</p>}
      {map.appendix_check.length > 0 && (
        <details className="mm-note"><summary>Appendices: {map.appendix_check.filter((a) => a.relevant).length} relevant, {map.appendix_check.filter((a) => !a.relevant).length} not relevant (appendices are not marked)</summary>
          <ul>{map.appendix_check.map((a, i) => <li key={i}><b>{a.label}</b>: {a.relevant ? 'relevant' : 'not relevant'}. {a.reason}</li>)}</ul></details>)}
    </>
  );

  const limitsBox = (code: string) => {
    const l = (map.limits ?? []).filter((x) => x.criterion === code);
    if (!l.length) return null;
    return (
      <div className="mm-next mm-limits"><span>What is limiting this mark, and what to do</span>
        <ul>{l.map((x, i) => <li key={i}><b>{x.strand ? x.strand + ': ' : ''}</b>{x.detail}<br /><em>What to do:</em> {x.action}</li>)}</ul></div>
    );
  };
  const hero = (
    <header className="mm-hero">
      <div><span>{mode === 'teacher' ? 'Recommended mark' : 'Your IA mark'}</span><strong>{map.mark} / {map.maximum}</strong></div>
      <div className="mm-hero-crit">{map.criteria.map((c) => <div key={c.code}><b>{c.mark}/{c.max}</b><small>{c.code} · {c.criterion}</small></div>)}</div>
    </header>
  );

  if (mode === 'teacher') return (
    <section className="mm-root" aria-label="Teacher recommended mark">
      {hero}
      <p className="mm-note">Best-fit marking against the teacher strand sheet, using only evidence in the report body. Whole marks only. Marks are indicative and non-binding.{map.data_sufficiency ? ' Data sufficiency: ' + map.data_sufficiency : ''}</p>
      {notices}
      {map.criteria.map((c) => {
        return (
          <article className="mm-card" key={c.code}>
            <div className="mm-head"><h3>{c.code} · {c.criterion}</h3><div className="mm-mark"><strong>{c.mark} / {c.max}</strong><small>{c.confidence} confidence</small></div></div>
            <div className="mm-band"><span>Why this mark</span><p>{c.why_mark}</p></div>
            {limitsBox(c.code)}
            <table className="mm-table"><thead><tr><th>Strand</th><th>Level</th><th>Descriptor that fits</th><th>Evidence in the IA</th><th>Needed for the next level</th></tr></thead>
              <tbody>{c.strands.map((s) => (
                <tr key={s.id}><td><b>{s.id}</b> {s.name}</td>
                  <td><b className={'mm-lv mm-lv-' + status(s.level).k}>{s.level}</b></td>
                  <td>{STRAND_DESCRIPTORS[s.id]?.[s.level] ?? NOT_REACHED}</td>
                  <td>{s.evidence.length ? s.evidence.map((e, j) => <blockquote key={j}>{e.quote}<small>{where(e.page, e.section)}</small></blockquote>) : <span className="mm-sub">{s.reason}</span>}</td>
                  <td>{s.level === '5-6' ? <span className="mm-sub">Top level reached</span> : s.missing}</td></tr>
              ))}</tbody></table>
          </article>
        );
      })}
    </section>
  );

  return (
    <section className="mm-root" aria-label="Your marks and fix plan">
      {hero}
      <p className="mm-note">These are indicative marks from the evidence in your report. Open each strand below for what to do, an example and prompts to help you improve.</p>
      {notices}
      {!map.plan && (
        <p className="mm-note">{step === 'plan' ? 'Building your step-by-step fix plan… about a minute.' : 'Your fix plan is not ready yet.'}
          {step !== 'plan' && <button className="sx-btn mm-retry" type="button" onClick={() => void makePlan()}>Build my fix plan</button>}</p>)}
      {error && <p role="alert" className="sx-error">{error}</p>}
      {map.criteria.map((c) => {
        const cp = planBy.get(c.code);
        return (
          <article className="mm-card" key={c.code}>
            <div className="mm-head"><h3>{c.code} · {c.criterion}</h3><div className="mm-mark"><strong>{c.mark} / {c.max}</strong></div></div>
            <div className="mm-band"><span>Why this mark</span><p>{cp?.summary ?? c.why_mark}</p></div>
            {limitsBox(c.code)}
            {cp && cp.quick_wins.length > 0 && <div className="mm-next"><span>Quick wins</span><ul>{cp.quick_wins.map((q, i) => <li key={i}>{q}</li>)}</ul></div>}
            {c.strands.map((s) => {
              const p = cp?.strands.find((x) => x.id === s.id);
              const st = status(s.level);
              return (
                <details className={'mm-strand mm-strand-' + st.k} key={s.id} open={st.k === 'low'}>
                  <summary><span className={'mm-chip mm-chip-' + st.k}>{st.t}</span><b>{s.name}</b></summary>
                  {p ? (
                    <div className="mm-strand-body">
                      <p className="mm-ask"><b>What this asks for:</b> {p.plain_ask}</p>
                      <p><b>Where you are:</b> {p.where_you_are}</p>
                      <div><b>What to do, step by step</b><ol>{p.steps.map((x, i) => <li key={i}>{x}</li>)}</ol></div>
                      <div className="mm-example"><span>Example to help you understand. It is not text for your IA.</span><p>{p.example}</p></div>
                      <div className="mm-prompts"><b>Prompts to help you improve</b>
                        {p.extend_prompts.map((x, i) => (
                          <div className="mm-prompt" key={i}><p>{x}</p><button type="button" className="mm-copy" onClick={() => void navigator.clipboard?.writeText(x)}>Copy</button></div>))}</div>
                      {p.done_when && <p className="mm-done"><b>You are done when:</b> {p.done_when}</p>}
                    </div>
                  ) : <p className="mm-sub">{step === 'plan' ? 'Building the steps for this strand…' : s.missing}</p>}
                </details>
              );
            })}
          </article>
        );
      })}
    </section>
  );
}

const REASON: Record<string, string> = { irrelevant: 'Not relevant', repeated: 'Repeated', redundant: 'Redundant', low_value: 'Earns no marks', too_detailed: 'Too detailed' };

function WordGuide({ map, mode, onTrim, trimBusy, planBusy }: { map: MarkMapResult; mode: 'student' | 'teacher'; onTrim: () => void; trimBusy: boolean; planBusy: boolean }) {
  const wc = map.word_count;
  if (!wc) return null;
  const trim = map.trim;
  const pct = Math.min(100, Math.round((wc.counted / wc.limit) * 100));
  const budgetText = (b: Budget) => (b ? (b.min ? b.min + '–' : 'max ') + b.max : '');
  return (
    <details className={'mm-words' + (wc.over_by > 0 ? ' mm-words-over' : '')} open={wc.over_by > 0}>
      <summary><b>Word count: {wc.counted.toLocaleString()} of {wc.limit.toLocaleString()}</b>
        <span>{wc.over_by > 0 ? wc.over_by.toLocaleString() + ' words over' : 'within the limit'}</span></summary>
      <div className="mm-words-body">
        <div className="mm-bar" aria-hidden="true"><i style={{ width: pct + '%' }} /></div>
        <p className="mm-sub">Counted the way the IB workshop guidance describes: data tables, graphs, references and appendices are not counted. This is an estimate from your uploaded text.</p>
        {wc.cut_at && <p className="mm-alert mm-note">An examiner stops reading at {wc.limit.toLocaleString()} words, which falls in <b>{wc.cut_at.heading}</b>{wc.cut_at.page ? ' (page ' + wc.cut_at.page + ')' : ''}. Anything after that point will not be read, so it cannot earn marks. The whole report was marked here so you can see everything, but it needs cutting to fit.</p>}
        <div className="mm-tablewrap"><table className="mm-table"><thead><tr><th>Section</th><th>Words</th><th>IB template guide</th></tr></thead>
          <tbody>{wc.sections.filter((x) => x.words > 0).map((x, i) => (
            <tr key={i}><td><b>{x.heading}</b></td><td>{x.words}</td>
              <td>{x.budget ? <span className={x.words > x.budget.max ? 'mm-warn' : 'mm-ok'}>{budgetText(x.budget)}{x.words > x.budget.max ? ' · ' + (x.words - x.budget.max) + ' over' : ''}</span> : <span className="mm-sub">no set budget</span>}</td></tr>))}</tbody></table></div>
        {wc.over_by > 0 && !trim && (planBusy || !map.plan
          ? <p className="mm-sub">Your list of what to remove appears once the fix plan is ready.</p>
          : <p className="mm-sub">The fix plan is ready but the list of what to cut is not. <button className="sx-btn mm-retry" type="button" onClick={onTrim} disabled={trimBusy}>{trimBusy ? 'Finding what to cut…' : 'Find what to cut'}</button></p>)}
        {trim && (
          <div className="mm-trim">
            <h4>What to remove or shorten, in this order</h4>
            <p className="mm-sub">Each suggestion is chosen because the text is not relevant, is repeated, is redundant or earns no marks. It is never chosen just to reach a number. Text that is the only evidence for a mark is protected.</p>
            <ol>{trim.items.map((t) => (
              <li key={t.block_index} className={'mm-trim-item mm-trim-' + t.action}>
                <div className="mm-trim-head"><span className={'mm-chip ' + (t.action === 'remove' ? 'mm-chip-low' : 'mm-chip-mid')}>{t.action === 'remove' ? 'Remove' : 'Shorten'}</span>
                  <span className="mm-chip mm-chip-reason">{REASON[t.reason] ?? t.reason}</span>
                  <small>{[t.section, t.page ? 'page ' + t.page : ''].filter(Boolean).join(' · ')} · saves about {t.words_saved} words</small></div>
                <blockquote>{t.preview}</blockquote>
                <p>{t.why}</p>
                {t.repeated_at && <p className="mm-sub">Already said in: {t.repeated_at.section ?? 'another part of your report'}.</p>}
                {t.action === 'shorten' && t.keep_point && <p className="mm-sub">Keep only: {t.keep_point}.</p>}
                {t.serves.length > 0 && <p className="mm-sub">Helps with strand {t.serves.join(', ')}, so keep what supports it.</p>}
              </li>))}</ol>
            <p className="mm-done">Doing all of these saves about <b>{trim.total_saved.toLocaleString()}</b> words. {trim.enough ? 'That is enough to get inside the limit.' : 'You need about ' + trim.over_by.toLocaleString() + ', so you will need to tighten a little more yourself, starting with the longest sections.'}</p>
          </div>)}
        {mode === 'teacher' && <p className="mm-sub">Template word budgets (IB moderator workshop template): Background 750, Alternate hypothesis 120 max, Practical implications 200–250. Other sections have no set budget.</p>}
      </div>
    </details>
  );
}
