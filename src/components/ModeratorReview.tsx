import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type ModerationAvailability = {
  paused: boolean;
  resume_date: string | null;
  daily_limit: number;
  taken_today: number;
  slots_full: boolean;
  next_opening: string | null;
  turnaround_hours: number;
};

export const MODERATED_LABEL = 'Marked and approved by an authorised IB moderator';

export function formatReadyBy(value: string | null | undefined): string {
  if (!value) return 'within 24 hours';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'within 24 hours';
  return d.toLocaleString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });
}

function formatDay(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function useModerationAvailability(): ModerationAvailability | null {
  const [value, setValue] = useState<ModerationAvailability | null>(null);
  useEffect(() => {
    let alive = true;
    void supabase.rpc('get_moderation_availability').then(({ data, error }) => {
      if (alive && !error && data && typeof data === 'object') setValue(data as ModerationAvailability);
    });
    return () => { alive = false; };
  }, []);
  return value;
}

const box: React.CSSProperties = {
  border: '1px solid #e3dccb', background: '#fbf8ef', borderRadius: 14,
  padding: '14px 16px', margin: '14px 0', lineHeight: 1.5,
};

/** Shown on the upload page. Says plainly when paid reviews are paused or today's slots are full. */
export function ModerationAvailabilityNotice({ audience = 'paid' }: { audience?: 'paid' | 'free' }) {
  const a = useModerationAvailability();
  if (!a || audience === 'free') return null;
  if (a.paused) {
    return (
      <div style={box} role="status">
        <strong>Moderator reviews are paused for now.</strong>
        <div>
          {a.resume_date
            ? `New paid reviews reopen on ${formatDay(a.resume_date)}. Your credits stay valid and nothing is used until your report is published.`
            : 'New paid reviews will reopen soon. Your credits stay valid and nothing is used until your report is published.'}
        </div>
      </div>
    );
  }
  if (a.slots_full) {
    return (
      <div style={box} role="status">
        <strong>Today’s moderator slots are full.</strong>
        <div>
          Reviews uploaded now are queued for the next opening
          {a.next_opening ? ` (${formatDay(a.next_opening)})` : ''}. Your report is ready within 24 hours of that.
        </div>
      </div>
    );
  }
  return null;
}

export function WaitingForModerator({
  dueAt, filename, onReset, onOpenReports,
}: {
  dueAt: string | null | undefined;
  filename?: string | null;
  onReset: () => void;
  onOpenReports: () => void;
}) {
  return (
    <main className="processing-main">
      <section className="processing-card">
        <div className="processing-heading">
          <div>
            <span className="processing-eyebrow">With your moderator</span>
            <h1>Your report is being marked and approved</h1>
            <p>
              An authorised IB moderator is reviewing and marking your report before it is released to you.
              It will be ready by <strong>{formatReadyBy(dueAt)}</strong>. You do not need to keep this page open.
            </p>
          </div>
        </div>
        {filename && <div className="processing-file"><div><strong>{filename}</strong></div></div>}
        <p style={{ marginTop: 12 }}>
          Your credit is only used when your report is published. If anything goes wrong on our side, you keep your credit.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          <button type="button" className="primary-button" onClick={onOpenReports}>Go to My IA Reports</button>
          <button type="button" className="secondary-button" onClick={onReset}>Back</button>
        </div>
      </section>
    </main>
  );
}

type PendingRow = {
  submission_id: string;
  original_filename: string | null;
  subject: string | null;
  held_at: string | null;
  due_at: string | null;
};

/** Small card for My Account: reports that are with the moderator. */
export function PendingModeratorReviews() {
  const [rows, setRows] = useState<PendingRow[]>([]);
  useEffect(() => {
    let alive = true;
    void supabase.rpc('get_my_pending_moderator_reviews').then(({ data, error }) => {
      if (alive && !error && Array.isArray(data)) setRows(data as PendingRow[]);
    });
    return () => { alive = false; };
  }, []);
  if (rows.length === 0) return null;
  return (
    <div style={box} role="status">
      <strong>With your moderator</strong>
      {rows.map((r) => (
        <div key={r.submission_id}>
          {r.original_filename ?? 'Your IA'} — ready by {formatReadyBy(r.due_at)}
        </div>
      ))}
    </div>
  );
}
