import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { loadAppSettings, saveAppSetting } from '../lib/rightClick';

type QueueRow = {
  submission_id: string;
  student_email: string | null;
  subject: string | null;
  original_filename: string | null;
  word_count: number | null;
  held_at: string | null;
  due_at: string | null;
  hours_waiting: number | null;
  is_overdue: boolean;
  is_due_soon: boolean;
  moderation_status: 'awaiting' | 'published' | 'none';
  published_at: string | null;
};

type Criterion = {
  criterion: string;
  criterion_name?: string;
  criterion_max_marks?: number;
  indicative_mark_range?: [number, number];
  indicative_band?: string;
  why_this_range?: string;
};

type Finding = {
  id: string;
  criterion_code: string;
  finding_index: number;
  priority?: string | null;
  section_title?: string | null;
  evidence_excerpt?: string | null;
  rubric_requirement?: string | null;
  issue: string | null;
  specific_action: string | null;
  why: string | null;
};

type ReviewPayload = {
  submission: {
    id: string; student_email: string | null; subject: string | null; original_filename: string | null;
    word_count: number | null; moderation_status: string; due_at: string | null; held_at: string | null;
  };
  criteria: Criterion[];
  findings: Finding[];
  extracted_text: string | null;
};

type Availability = { paused: boolean; daily_limit: number; taken_today: number };

const card: React.CSSProperties = { border: '1px solid #e3dccb', borderRadius: 12, padding: 14, margin: '10px 0', background: '#fff' };
const input: React.CSSProperties = { padding: '8px 10px', borderRadius: 10, border: '1px solid #d9d4c7', font: 'inherit' };
const area: React.CSSProperties = { ...input, width: '100%', minHeight: 70, boxSizing: 'border-box' };

function when(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function ModerationAdmin() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showPublished, setShowPublished] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_moderation_queue', { p_include_published: showPublished });
    if (error) setNote('The queue could not be loaded.');
    else setRows((data ?? []) as QueueRow[]);
    setLoading(false);
  }, [showPublished]);

  useEffect(() => { void load(); }, [load]);

  if (openId) {
    return (
      <div className="admin-tab-content">
        <ModerationReviewEditor
          submissionId={openId}
          onClose={() => { setOpenId(null); void load(); }}
          onDone={(msg) => setNote(msg)}
        />
      </div>
    );
  }

  const waiting = rows.filter((r) => r.moderation_status === 'awaiting');
  const overdue = waiting.filter((r) => r.is_overdue).length;

  return (
    <div className="admin-tab-content">
      <ModerationControls />
      <section className="admin-panel">
        <h3>Moderation queue</h3>
        <p style={{ margin: '0 0 8px' }}>
          {waiting.length} waiting{overdue > 0 ? `, ${overdue} overdue` : ''}. Sorted by deadline, most urgent first.
        </p>
        <label style={{ display: 'block', marginBottom: 8 }}>
          <input type="checkbox" checked={showPublished} onChange={(e) => setShowPublished(e.target.checked)} /> Also show reports published in the last 14 days
        </label>
        {note && <div style={card} role="status">{note}</div>}
        {loading ? <p>Loading…</p> : rows.length === 0 ? <p>Nothing is waiting for review.</p> : rows.map((r) => (
          <article key={r.submission_id} style={{ ...card, borderColor: r.is_overdue ? '#c0392b' : r.is_due_soon ? '#d9a400' : '#e3dccb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong>{r.original_filename ?? 'IA report'}</strong>
                <div>{r.student_email ?? 'Unknown student'} · {r.subject ?? '—'}{r.word_count ? ` · ${r.word_count} words` : ''}</div>
                <div>
                  {r.moderation_status === 'published'
                    ? `Published ${when(r.published_at)}`
                    : `Due ${when(r.due_at)} · waiting ${r.hours_waiting ?? 0}h`}
                  {r.is_overdue && <strong style={{ color: '#c0392b' }}> · OVERDUE</strong>}
                  {r.is_due_soon && <strong style={{ color: '#a07800' }}> · due soon</strong>}
                </div>
              </div>
              <button type="button" className="admin-primary-button" onClick={() => { setNote(''); setOpenId(r.submission_id); }}>
                {r.moderation_status === 'published' ? 'View' : 'Review'}
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function ModerationControls() {
  const [paused, setPaused] = useState(false);
  const [resume, setResume] = useState('');
  const [limit, setLimit] = useState('10');
  const [avail, setAvail] = useState<Availability | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const refresh = useCallback(async () => {
    const s = await loadAppSettings();
    setPaused(s.moderation_paused === true);
    setResume(typeof s.moderation_resume_date === 'string' ? s.moderation_resume_date : '');
    setLimit(String(typeof s.moderation_daily_limit === 'number' ? s.moderation_daily_limit : 10));
    const { data } = await supabase.rpc('get_moderation_availability');
    if (data && typeof data === 'object') setAvail(data as Availability);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function save() {
    setBusy(true); setMsg('');
    const n = Number(limit);
    if (!Number.isInteger(n) || n < 1 || n > 200) { setMsg('Daily limit must be a whole number from 1 to 200.'); setBusy(false); return; }
    if (paused && resume && !/^\d{4}-\d{2}-\d{2}$/.test(resume)) { setMsg('Resume date is not valid.'); setBusy(false); return; }
    const results = await Promise.all([
      saveAppSetting('moderation_paused', paused),
      saveAppSetting('moderation_resume_date', paused && resume ? resume : null),
      saveAppSetting('moderation_daily_limit', n),
    ]);
    setMsg(results.every(Boolean) ? 'Saved. The upload page updates straight away.' : 'Something did not save. Try again.');
    await refresh();
    setBusy(false);
  }

  return (
    <section className="admin-panel">
      <h3>Moderator availability</h3>
      <div className="admin-detail-list">
        <p style={{ margin: 0 }}>
          {avail ? `${avail.taken_today} of ${avail.daily_limit} slots used today.` : 'Checking…'}
          {avail?.paused ? ' Paid reviews are currently paused.' : ''}
        </p>
        <label className="admin-toggle-row">
          <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} />
          <span>Pause new paid reviews</span>
        </label>
        {paused && (
          <label className="admin-toggle-row">
            <span>Reopens on</span>
            <input type="date" value={resume} onChange={(e) => setResume(e.target.value)} style={input} />
            <span>(shown to students; pause ends on its own on this date)</span>
          </label>
        )}
        <label className="admin-toggle-row">
          <span>Reports taken per day</span>
          <input type="number" min={1} max={200} value={limit} onChange={(e) => setLimit(e.target.value)} style={{ ...input, width: 90 }} />
        </label>
        <div className="admin-toggle-row">
          <button type="button" className="admin-primary-button" disabled={busy} onClick={() => void save()}>
            {busy ? 'Saving…' : 'Save'}
          </button>
          {msg && <span>{msg}</span>}
        </div>
      </div>
    </section>
  );
}

function ModerationReviewEditor({
  submissionId, onClose, onDone,
}: { submissionId: string; onClose: () => void; onDone: (msg: string) => void }) {
  const [data, setData] = useState<ReviewPayload | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [marks, setMarks] = useState<Record<string, { low: string; high: string; band: string; rationale: string }>>({});
  const [findings, setFindings] = useState<Record<string, { issue: string; specific_action: string; why: string }>>({});
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    let alive = true;
    void supabase.rpc('admin_get_ia_review_for_moderation', { p_submission_id: submissionId }).then(({ data: d, error: e }) => {
      if (!alive) return;
      if (e || !d) { setError('This report could not be opened.'); return; }
      const p = d as ReviewPayload;
      setData(p);
      const m: typeof marks = {};
      for (const c of p.criteria) {
        m[c.criterion] = {
          low: String(c.indicative_mark_range?.[0] ?? 0),
          high: String(c.indicative_mark_range?.[1] ?? 0),
          band: c.indicative_band ?? '',
          rationale: c.why_this_range ?? '',
        };
      }
      setMarks(m);
      const f: typeof findings = {};
      for (const x of p.findings) f[x.id] = { issue: x.issue ?? '', specific_action: x.specific_action ?? '', why: x.why ?? '' };
      setFindings(f);
    });
    return () => { alive = false; };
  }, [submissionId]);

  async function persist(): Promise<boolean> {
    if (!data) return false;
    const criteria = data.criteria.map((c) => ({
      criterion: c.criterion,
      mark_low: Number(marks[c.criterion]?.low),
      mark_high: Number(marks[c.criterion]?.high),
      band: marks[c.criterion]?.band ?? '',
      rationale: marks[c.criterion]?.rationale ?? '',
    }));
    if (criteria.some((c) => !Number.isFinite(c.mark_low) || !Number.isFinite(c.mark_high))) {
      setError('Every mark must be a number.'); return false;
    }
    const { error: e } = await supabase.rpc('admin_save_ia_moderation_edits', {
      p_submission_id: submissionId,
      p_criteria: criteria,
      p_findings: Object.entries(findings).map(([id, v]) => ({ id, ...v })),
    });
    if (e) { setError(e.message || 'Could not save.'); return false; }
    return true;
  }

  async function onSave() {
    setBusy(true); setError('');
    if (await persist()) onDone('Saved.');
    setBusy(false);
  }

  async function onPublish() {
    if (!data) return;
    if (!window.confirm('Publish this report to the student now? Their credit will be used.')) return;
    setBusy(true); setError('');
    if (!(await persist())) { setBusy(false); return; }
    const { error: e } = await supabase.rpc('admin_publish_ia_review', { p_submission_id: submissionId });
    if (e) { setError(e.message || 'Could not publish.'); setBusy(false); return; }
    let text = 'Published. The student can now see the report.';
    try {
      const { data: res } = await supabase.functions.invoke('moderation-notify', { body: { submission_id: submissionId } });
      if (res?.sent) text += ' The student has been emailed.';
      else if (res?.reason === 'email_not_configured') text += ' No email was sent because email is not set up yet; let the student know yourself.';
      else text += ' The email could not be sent.';
    } catch {
      text += ' The email could not be sent.';
    }
    onDone(text);
    setBusy(false);
    onClose();
  }

  if (error && !data) return <section className="admin-panel"><p>{error}</p><button type="button" className="admin-secondary-button" onClick={onClose}>Back</button></section>;
  if (!data) return <section className="admin-panel"><p>Loading…</p></section>;
  const awaiting = data.submission.moderation_status === 'awaiting';

  return (
    <section className="admin-panel">
      <button type="button" className="admin-secondary-button" onClick={onClose}>← Back to queue</button>
      <h3 style={{ marginTop: 12 }}>{data.submission.original_filename ?? 'IA report'}</h3>
      <p>{data.submission.student_email} · {data.submission.subject} · due {when(data.submission.due_at)}</p>
      {!awaiting && <div style={card}>This report is already published and can no longer be edited.</div>}
      {error && <div style={{ ...card, borderColor: '#c0392b' }} role="alert">{error}</div>}

      <h4>Marks</h4>
      {data.criteria.map((c) => (
        <div key={c.criterion} style={card}>
          <strong>{c.criterion_name ?? c.criterion}</strong> (out of {c.criterion_max_marks ?? 6})
          <div style={{ display: 'flex', gap: 8, margin: '8px 0', flexWrap: 'wrap' }}>
            <input style={{ ...input, width: 70 }} disabled={!awaiting} aria-label="Low mark" value={marks[c.criterion]?.low ?? ''} onChange={(e) => setMarks({ ...marks, [c.criterion]: { ...marks[c.criterion], low: e.target.value } })} />
            <span>to</span>
            <input style={{ ...input, width: 70 }} disabled={!awaiting} aria-label="High mark" value={marks[c.criterion]?.high ?? ''} onChange={(e) => setMarks({ ...marks, [c.criterion]: { ...marks[c.criterion], high: e.target.value } })} />
            <input style={{ ...input, flex: 1, minWidth: 140 }} disabled={!awaiting} placeholder="Band" aria-label="Band" value={marks[c.criterion]?.band ?? ''} onChange={(e) => setMarks({ ...marks, [c.criterion]: { ...marks[c.criterion], band: e.target.value } })} />
          </div>
          <textarea style={area} disabled={!awaiting} aria-label="Why this mark" value={marks[c.criterion]?.rationale ?? ''} onChange={(e) => setMarks({ ...marks, [c.criterion]: { ...marks[c.criterion], rationale: e.target.value } })} />
        </div>
      ))}

      <h4>Comments</h4>
      {data.findings.map((f) => (
        <div key={f.id} style={card}>
          <strong>{f.criterion_code} · {f.section_title ?? 'Comment'}</strong>
          {f.evidence_excerpt && <blockquote style={{ margin: '6px 0', color: '#555' }}>{f.evidence_excerpt}</blockquote>}
          <label>Issue<textarea style={area} disabled={!awaiting} value={findings[f.id]?.issue ?? ''} onChange={(e) => setFindings({ ...findings, [f.id]: { ...findings[f.id], issue: e.target.value } })} /></label>
          <label>What to do<textarea style={area} disabled={!awaiting} value={findings[f.id]?.specific_action ?? ''} onChange={(e) => setFindings({ ...findings, [f.id]: { ...findings[f.id], specific_action: e.target.value } })} /></label>
          <label>Why<textarea style={area} disabled={!awaiting} value={findings[f.id]?.why ?? ''} onChange={(e) => setFindings({ ...findings, [f.id]: { ...findings[f.id], why: e.target.value } })} /></label>
        </div>
      ))}

      <button type="button" className="admin-secondary-button" onClick={() => setShowText(!showText)}>
        {showText ? 'Hide' : 'Show'} the student’s text
      </button>
      {showText && <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto', ...card }}>{data.extracted_text ?? ''}</pre>}

      {awaiting && (
        <div className="admin-toggle-row" style={{ marginTop: 14 }}>
          <button type="button" className="admin-secondary-button" disabled={busy} onClick={() => void onSave()}>Save changes</button>
          <button type="button" className="admin-primary-button" disabled={busy} onClick={() => void onPublish()}>
            {busy ? 'Working…' : 'Save and publish to student'}
          </button>
        </div>
      )}
    </section>
  );
}
