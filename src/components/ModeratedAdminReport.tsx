import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { ReportBlock } from '../lib/markMap';
import {
  ModeratedFixTab, ModeratedProgressTab, ModeratedAnnotatedTab,
  type ModFinding, type ModCriterion,
} from './ModeratedStudentReport';
import './workspace.css';

type Payload = {
  submission: {
    id: string; student_email: string | null; subject: string | null; original_filename: string | null;
    word_count: number | null; published_at: string | null;
  };
  criteria: ModCriterion[];
  findings: ModFinding[];
  extracted_text: string | null;
};

type Tab = 'marks' | 'anncopy' | 'progress';

/** Turns the stored report text into the paragraph blocks the annotated copy expects. */
function blocksFrom(text: string | null): ReportBlock[] {
  const lines = (text ?? '').split(/\n+/).map((l) => l.trim()).filter(Boolean);
  return lines.map((t, i) => ({
    block_index: i,
    block_type: t.length <= 80 && !/[.:;,]$/.test(t) && /^[A-Z0-9]/.test(t) ? 'heading' : 'paragraph',
    page_number: null,
    section_title: null,
    text: t,
  }));
}

const rangeOf = (r: [number, number] | null) => (r ? (r[0] === r[1] ? String(r[0]) : `${r[0]}–${r[1]}`) : '–');

/**
 * What a student sees for a moderator-approved report, opened from the admin account:
 * the three student tabs plus a Teacher report with the marks and the moderator's reasoning.
 */
export function ModeratedAdminReport({ submissionId, onBack, onOpenSheet }: {
  submissionId: string; onBack: () => void; onOpenSheet: () => void;
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState('');
  const [space, setSpace] = useState<'student' | 'teacher'>('student');
  const [tab, setTab] = useState<Tab>('marks');
  const [ticks, setTicks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    void supabase.rpc('admin_get_ia_review_for_moderation', { p_submission_id: submissionId }).then(({ data: d, error: e }) => {
      if (!alive) return;
      if (e || !d) setError('This report could not be opened.');
      else setData(d as Payload);
    });
    return () => { alive = false; };
  }, [submissionId]);

  const blocks = useMemo(() => blocksFrom(data?.extracted_text ?? null), [data]);
  const loadText = useCallback(async () => blocks, [blocks]);
  const setTick = useCallback((k: string, v: boolean) => setTicks((t) => ({ ...t, [k]: v })), []);

  if (error) return <div className="mod-note" role="alert">{error} <button type="button" className="admin-secondary-button" onClick={onBack}>Back</button></div>;
  if (!data) return <p className="mod-empty">Loading…</p>;

  const s = data.submission;
  const lo = data.criteria.reduce((a, c) => a + (c.indicative_mark_range?.[0] ?? 0), 0);
  const hi = data.criteria.reduce((a, c) => a + (c.indicative_mark_range?.[1] ?? 0), 0);
  const max = data.criteria.reduce((a, c) => a + (c.criterion_max_marks ?? 6), 0) || 24;
  const tabs: [Tab, string][] = [['marks', 'Fix your IA'], ['anncopy', 'Annotated copy'], ['progress', 'Progress']];

  return (
    <div className="mod-report">
      <div className="mod-report-head">
        <button type="button" className="admin-secondary-button" onClick={onBack}>← All reports</button>
        <div className="mod-report-title">
          <strong>{s.original_filename ?? 'IA report'}</strong>
          <span>{s.student_email ?? 'Unknown student'}{s.subject ? ` · ${s.subject}` : ''}{s.published_at ? ` · published ${new Date(s.published_at).toLocaleDateString()}` : ''}</span>
        </div>
        <button type="button" className="admin-secondary-button" onClick={onOpenSheet}>Marking sheet</button>
      </div>

      <div className="mod-seg" role="tablist" aria-label="Report view">
        <button type="button" role="tab" aria-selected={space === 'student'} className={space === 'student' ? 'on' : ''} onClick={() => setSpace('student')}>Student report</button>
        <button type="button" role="tab" aria-selected={space === 'teacher'} className={space === 'teacher' ? 'on' : ''} onClick={() => setSpace('teacher')}>Teacher report</button>
      </div>

      {space === 'student' ? (
        <>
          <nav className="mod-report-tabs" aria-label="For the student">
            {tabs.map(([id, label]) => (
              <button key={id} type="button" className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{label}</button>
            ))}
          </nav>
          {tab === 'marks' && <ModeratedFixTab findings={data.findings} criteria={data.criteria} submissionId={s.id} ticks={ticks} setTick={setTick} />}
          {tab === 'progress' && <ModeratedProgressTab findings={data.findings} criteria={data.criteria} ticks={ticks} />}
          {tab === 'anncopy' && <ModeratedAnnotatedTab findings={data.findings} criteria={data.criteria} loadText={loadText} />}
        </>
      ) : (
        <section className="ws" aria-label="Teacher report">
          <div className="w-card w-hero" style={{ gridTemplateColumns: 'auto 1fr' }}>
            <div><div className="w-mono">Moderator marks</div><div className="w-total">{lo === hi ? lo : `${lo}–${hi}`}<small> / {max}</small></div></div>
            <div className="w-tiles">
              {data.criteria.map((c) => (
                <div className="w-tile" key={c.criterion}>
                  <b>{rangeOf(c.indicative_mark_range)}</b><small className="n"> / {c.criterion_max_marks ?? 6}</small>
                  <span style={{ fontSize: '.78rem', color: 'var(--w-muted)' }}>{c.criterion_name}</span>
                </div>
              ))}
            </div>
          </div>
          {data.criteria.map((c) => {
            const fs = data.findings.filter((f) => f.criterion_code === c.criterion);
            return (
              <div className="w-card" key={c.criterion} style={{ marginTop: 14, padding: 18 }}>
                <h3 style={{ margin: 0 }}>{c.criterion_name} · {rangeOf(c.indicative_mark_range)} / {c.criterion_max_marks ?? 6}</h3>
                {c.why_this_range && <p style={{ margin: '8px 0 12px' }}>{c.why_this_range}</p>}
                {fs.map((f) => (
                  <div key={f.id} style={{ borderTop: '1px solid rgba(0,0,0,.08)', padding: '10px 0' }}>
                    <b>{f.finding_type === 'strength' ? 'Strength' : `Fix (${f.priority})`}:</b> {f.issue}
                    {f.finding_type !== 'strength' && f.specific_action && <div><em style={{ fontStyle: 'normal', fontWeight: 600 }}>What to do:</em> {f.specific_action}</div>}
                    {f.why && <div style={{ opacity: 0.8 }}>{f.why}</div>}
                    {f.evidence_excerpt && <blockquote style={{ margin: '6px 0 0', paddingLeft: 10, borderLeft: '3px solid rgba(0,0,0,.15)', fontSize: '.9em' }}>{f.evidence_excerpt}</blockquote>}
                  </div>
                ))}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
