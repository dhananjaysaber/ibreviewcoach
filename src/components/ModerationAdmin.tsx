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

function when(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function dueLabel(r: Pick<QueueRow, 'due_at' | 'moderation_status' | 'published_at'>): string {
  if (r.moderation_status === 'published') return `Published ${when(r.published_at)}`;
  if (!r.due_at) return 'No deadline';
  const diff = new Date(r.due_at).getTime() - Date.now();
  const hrs = Math.round(Math.abs(diff) / 3_600_000);
  const span = hrs >= 48 ? `${Math.round(hrs / 24)} days` : hrs >= 1 ? `${hrs}h` : 'under an hour';
  return diff < 0 ? `Overdue by ${span}` : `Due in ${span}`;
}

function Switch({ checked, label, onChange }: { checked: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <label className="admin-switch">
      <input type="checkbox" role="switch" aria-label={label} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="admin-switch-track" aria-hidden="true" />
    </label>
  );
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
  const soon = waiting.filter((r) => r.is_due_soon).length;

  return (
    <div className="admin-tab-content">
      {note && <div className="mod-note" role="status">{note}</div>}
      <div className="mod-layout">
        <section className="admin-panel mod-queue">
          <div className="mod-queue-head">
            <div>
              <h3>Reports to review</h3>
              <p>Most urgent first. Each student is promised 24 hours.</p>
            </div>
            <div className="mod-seg" role="tablist" aria-label="Which reports to show">
              <button type="button" role="tab" aria-selected={!showPublished} className={!showPublished ? 'on' : ''} onClick={() => setShowPublished(false)}>Waiting</button>
              <button type="button" role="tab" aria-selected={showPublished} className={showPublished ? 'on' : ''} onClick={() => setShowPublished(true)}>Plus last 14 days</button>
            </div>
          </div>

          <div className="mod-counts">
            <div><b>{waiting.length}</b><span>Waiting</span></div>
            <div className={overdue ? 'mod-bad' : ''}><b>{overdue}</b><span>Overdue</span></div>
            <div className={soon ? 'mod-warn' : ''}><b>{soon}</b><span>Due soon</span></div>
          </div>

          {loading ? (
            <p className="mod-empty">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="mod-empty">
              <strong>The queue is clear</strong>
              <span>New paid reports appear here as soon as the review is finished.</span>
            </div>
          ) : (
            <ul className="mod-list">
              {rows.map((r) => {
                const tone = r.moderation_status === 'published' ? 'done' : r.is_overdue ? 'bad' : r.is_due_soon ? 'warn' : 'ok';
                return (
                  <li key={r.submission_id} className={`mod-item mod-${tone}`}>
                    <div className="mod-item-main">
                      <strong>{r.original_filename ?? 'IA report'}</strong>
                      <span>
                        {r.student_email ?? 'Unknown student'}
                        {r.subject ? ` · ${r.subject}` : ''}
                        {r.word_count ? ` · ${r.word_count.toLocaleString()} words` : ''}
                      </span>
                    </div>
                    <span className={`mod-pill mod-pill-${tone}`}>{dueLabel(r)}</span>
                    <button type="button" className={r.moderation_status === 'published' ? 'admin-secondary-button' : 'admin-primary-button'} onClick={() => { setNote(''); setOpenId(r.submission_id); }}>
                      {r.moderation_status === 'published' ? 'View' : 'Review'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <ModerationControls />
      </div>
    </div>
  );
}

function ModerationControls() {
  const [paused, setPaused] = useState(false);
  const [resume, setResume] = useState('');
  const [limit, setLimit] = useState('10');
  const [avail, setAvail] = useState<Availability | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

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
    setBusy(true); setMsg(null);
    const n = Number(limit);
    if (!Number.isInteger(n) || n < 1 || n > 200) { setMsg({ ok: false, text: 'Daily limit must be a whole number from 1 to 200.' }); setBusy(false); return; }
    if (paused && resume && !/^\d{4}-\d{2}-\d{2}$/.test(resume)) { setMsg({ ok: false, text: 'Resume date is not valid.' }); setBusy(false); return; }
    const results = await Promise.all([
      saveAppSetting('moderation_paused', paused),
      saveAppSetting('moderation_resume_date', paused && resume ? resume : null),
      saveAppSetting('moderation_daily_limit', n),
    ]);
    setMsg(results.every(Boolean) ? { ok: true, text: 'Saved. The upload page updates straight away.' } : { ok: false, text: 'Something did not save. Try again.' });
    await refresh();
    setBusy(false);
  }

  const used = avail?.taken_today ?? 0;
  const cap = avail?.daily_limit ?? Number(limit) ?? 10;
  const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;

  return (
    <section className="admin-panel mod-avail">
      <h3>Availability</h3>
      <div className="mod-slots">
        <div className="mod-slots-num"><b>{avail ? used : '–'}</b><span>of {avail ? cap : '–'} slots used today</span></div>
        <div className="mod-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} className={pct >= 100 ? 'full' : ''} /></div>
        {avail?.paused && <span className="mod-pill mod-pill-warn">Paid reviews are paused</span>}
      </div>

      <div className="admin-setting mod-set">
        <div className="admin-setting-main">
          <div className="admin-setting-text">
            <strong>Pause new paid reviews</strong>
            <span>Students see a message and can still upload; their reports start when you reopen.</span>
          </div>
          <div className="admin-setting-control"><Switch label="Pause new paid reviews" checked={paused} onChange={setPaused} /></div>
        </div>
        {paused && (
          <label className="mod-field">
            <span>Reopens on</span>
            <input type="date" value={resume} onChange={(e) => setResume(e.target.value)} />
            <small>Shown to students. The pause ends by itself on this date.</small>
          </label>
        )}
      </div>

      <label className="mod-field mod-limit">
        <span>Reports taken per day</span>
        <input type="number" min={1} max={200} value={limit} onChange={(e) => setLimit(e.target.value)} />
      </label>

      <div className="mod-save">
        <button type="button" className="admin-primary-button" disabled={busy} onClick={() => void save()}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        {msg && <span className={msg.ok ? 'mod-msg-ok' : 'mod-msg-bad'}>{msg.text}</span>}
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
  const [confirming, setConfirming] = useState(false);
  const [saved, setSaved] = useState('');

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
    setBusy(true); setError(''); setSaved('');
    if (await persist()) setSaved('Changes saved.');
    setBusy(false);
  }

  async function onPublish() {
    if (!data) return;
    setConfirming(false);
    setBusy(true); setError(''); setSaved('');
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

  if (error && !data) return <section className="admin-panel"><p className="mod-msg-bad">{error}</p><button type="button" className="admin-secondary-button" onClick={onClose}>Back</button></section>;
  if (!data) return <section className="admin-panel"><p className="mod-empty">Loading…</p></section>;
  const awaiting = data.submission.moderation_status === 'awaiting';
  const setMark = (code: string, patch: Partial<{ low: string; high: string; band: string; rationale: string }>) =>
    setMarks({ ...marks, [code]: { ...marks[code], ...patch } });
  const setFinding = (id: string, patch: Partial<{ issue: string; specific_action: string; why: string }>) =>
    setFindings({ ...findings, [id]: { ...findings[id], ...patch } });
  const byCriterion = new Map<string, Finding[]>();
  for (const f of data.findings) byCriterion.set(f.criterion_code, [...(byCriterion.get(f.criterion_code) ?? []), f]);
  const total = data.criteria.reduce(
    (a, c) => [a[0] + (Number(marks[c.criterion]?.low) || 0), a[1] + (Number(marks[c.criterion]?.high) || 0), a[2] + (c.criterion_max_marks ?? 6)],
    [0, 0, 0],
  );

  return (
    <div className="mod-editor">
      <header className="mod-editor-head">
        <button type="button" className="admin-secondary-button" onClick={onClose}>← Back to queue</button>
        <div className="mod-editor-title">
          <h3>{data.submission.original_filename ?? 'IA report'}</h3>
          <p>
            {data.submission.student_email}
            {data.submission.subject ? ` · ${data.submission.subject}` : ''}
            {data.submission.word_count ? ` · ${data.submission.word_count.toLocaleString()} words` : ''}
          </p>
        </div>
        <div className="mod-editor-total">
          <b>{total[0]}–{total[1]}</b>
          <span>of {total[2]} marks</span>
        </div>
      </header>

      {!awaiting && <div className="mod-note">This report is already published and can no longer be edited.</div>}
      {error && <div className="mod-note mod-note-bad" role="alert">{error}</div>}
      {saved && <div className="mod-note" role="status">{saved}</div>}

      <div className="mod-crit-grid">
        {data.criteria.map((c) => (
          <section key={c.criterion} className="admin-panel mod-crit">
            <div className="mod-crit-head">
              <h3>{c.criterion_name ?? c.criterion}</h3>
              <span>out of {c.criterion_max_marks ?? 6}</span>
            </div>
            <div className="mod-marks">
              <label><span>Low</span><input inputMode="numeric" disabled={!awaiting} value={marks[c.criterion]?.low ?? ''} onChange={(e) => setMark(c.criterion, { low: e.target.value })} /></label>
              <i>to</i>
              <label><span>High</span><input inputMode="numeric" disabled={!awaiting} value={marks[c.criterion]?.high ?? ''} onChange={(e) => setMark(c.criterion, { high: e.target.value })} /></label>
              <label className="mod-band"><span>Band</span><input disabled={!awaiting} value={marks[c.criterion]?.band ?? ''} onChange={(e) => setMark(c.criterion, { band: e.target.value })} /></label>
            </div>
            <label className="mod-field">
              <span>Why this mark</span>
              <textarea disabled={!awaiting} rows={3} value={marks[c.criterion]?.rationale ?? ''} onChange={(e) => setMark(c.criterion, { rationale: e.target.value })} />
            </label>

            {(byCriterion.get(c.criterion) ?? []).length > 0 && (
              <details className="mod-findings">
                <summary>{(byCriterion.get(c.criterion) ?? []).length} comments for this criterion</summary>
                {(byCriterion.get(c.criterion) ?? []).map((f) => (
                  <div key={f.id} className="mod-finding">
                    <strong>{f.section_title ?? 'Comment'}</strong>
                    {f.evidence_excerpt && <blockquote>{f.evidence_excerpt}</blockquote>}
                    <label className="mod-field"><span>Issue</span><textarea rows={2} disabled={!awaiting} value={findings[f.id]?.issue ?? ''} onChange={(e) => setFinding(f.id, { issue: e.target.value })} /></label>
                    <label className="mod-field"><span>What to do</span><textarea rows={2} disabled={!awaiting} value={findings[f.id]?.specific_action ?? ''} onChange={(e) => setFinding(f.id, { specific_action: e.target.value })} /></label>
                    <label className="mod-field"><span>Why</span><textarea rows={2} disabled={!awaiting} value={findings[f.id]?.why ?? ''} onChange={(e) => setFinding(f.id, { why: e.target.value })} /></label>
                  </div>
                ))}
              </details>
            )}
          </section>
        ))}
      </div>

      <details className="admin-panel mod-text" open={showText} onToggle={(e) => setShowText((e.target as HTMLDetailsElement).open)}>
        <summary>The student’s text</summary>
        <pre>{data.extracted_text ?? ''}</pre>
      </details>

      {awaiting && (
        <div className="mod-actionbar">
          {confirming ? (
            <>
              <span><strong>Publish this report now?</strong> The student’s credit is used and they are emailed. This cannot be undone.</span>
              <button type="button" className="admin-secondary-button" disabled={busy} onClick={() => setConfirming(false)}>Cancel</button>
              <button type="button" className="admin-primary-button" disabled={busy} onClick={() => void onPublish()}>Yes, publish</button>
            </>
          ) : (
            <>
              <span>Publishing uses the student’s credit and emails them.</span>
              <button type="button" className="admin-secondary-button" disabled={busy} onClick={() => void onSave()}>{busy ? 'Working…' : 'Save changes'}</button>
              <button type="button" className="admin-primary-button" disabled={busy} onClick={() => setConfirming(true)}>Save and publish</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
