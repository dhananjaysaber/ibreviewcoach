import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { buildTeacherCopyHtml, type CriterionSummary, type TeacherNote } from '../lib/teacherCopy';

type Stored = { notes: TeacherNote[]; criterion_summaries: CriterionSummary[]; created_at: string } | null;

export function TeacherCopyPanel({ submissionId }: { submissionId: string }) {
  const [stored, setStored] = useState<Stored>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    supabase.functions
      .invoke('teacher-notes', { body: { submission_id: submissionId, action: 'get' } })
      .then(({ data }) => { if (live) setStored(data?.teacher_notes ?? null); })
      .catch(() => undefined);
    return () => { live = false; };
  }, [submissionId]);

  const generate = useCallback(async () => {
    setBusy(true);
    setError('');
    const { data, error: err } = await supabase.functions.invoke('teacher-notes', {
      body: { submission_id: submissionId, action: 'generate' },
    });
    setBusy(false);
    if (err || !data?.teacher_notes) {
      setError(data?.error || 'The teacher copy could not be prepared. Please try again.');
      return;
    }
    setStored(data.teacher_notes);
  }, [submissionId]);

  const download = useCallback(() => {
    if (!stored) return;
    const html = buildTeacherCopyHtml({
      notes: stored.notes,
      summaries: stored.criterion_summaries,
      generatedOn: new Date(stored.created_at).toLocaleDateString('en-GB'),
    });
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SEHS-IA-teacher-copy.html';
    a.click();
    URL.revokeObjectURL(url);
  }, [stored]);

  return (
    <section className="teacher-copy-panel" aria-label="Teacher annotated copy">
      <h3>Teacher annotated copy</h3>
      <p>Short, evidence-based moderator notes against the four IB criteria, for IB submission. Open the file and use Print → Save as PDF if you need a PDF.</p>
      {error && <p role="alert">{error}</p>}
      {stored ? (
        <button type="button" onClick={download}>Download teacher copy</button>
      ) : (
        <button type="button" onClick={generate} disabled={busy}>
          {busy ? 'Preparing teacher copy…' : 'Prepare teacher copy'}
        </button>
      )}
    </section>
  );
}
