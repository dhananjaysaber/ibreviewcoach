import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { buildMarkCopyHtml, type MarkCopyMap } from '../lib/teacherCopy';

/** Teacher copy: the strand table with each level justified by quoted evidence. Built from the saved mark map; no extra AI call. */
export function TeacherCopyPanel({ submissionId }: { submissionId: string }) {
  const [map, setMap] = useState<(MarkCopyMap & { created?: string }) | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let live = true;
    setLoaded(false);
    supabase.functions
      .invoke('mark-map', { body: { submission_id: submissionId, action: 'get' } })
      .then(({ data }) => { if (live) { setMap(data?.map ? { ...data.map, created: data.created_at } : null); setLoaded(true); } })
      .catch(() => { if (live) setLoaded(true); });
    return () => { live = false; };
  }, [submissionId]);

  const download = useCallback(() => {
    if (!map) return;
    const html = buildMarkCopyHtml({ map, generatedOn: new Date().toLocaleDateString('en-GB') });
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SEHS-IA-teacher-copy.html';
    a.click();
    URL.revokeObjectURL(url);
  }, [map]);

  return (
    <section className="teacher-copy-panel" aria-label="Teacher annotated copy">
      <h3>Teacher copy: marks justified strand by strand</h3>
      <p>A moderator-style table for IB submission. Each strand shows the level awarded, the descriptor met, the quoted evidence and an analytical justification. Open the file and use Print → Save as PDF if you need a PDF.</p>
      {loaded && !map && <p role="status">Mark the IA first on the Mark map tab, then the teacher copy will be ready.</p>}
      <button type="button" onClick={download} disabled={!map}>{map ? 'Download teacher copy' : 'Teacher copy not ready'}</button>
    </section>
  );
}
