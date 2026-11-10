import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Flag = { id: string; title: string; message: string; evidence: string[] };

/** IB policy observations from the IB SEHS deck. Separate from template advice; never affects a band. */
export function PolicyFlagsStrip({ submissionId }: { submissionId: string }) {
  const [flags, setFlags] = useState<Flag[]>([]);
  useEffect(() => {
    let live = true;
    supabase.functions
      .invoke('policy-flags', { body: { submission_id: submissionId } })
      .then(({ data }) => { if (live && Array.isArray(data?.flags)) setFlags((data.flags as Flag[]).filter((f) => f.id !== 'word_count')); })
      .catch(() => undefined);
    return () => { live = false; };
  }, [submissionId]);
  if (!flags.length) return null;
  return (
    <aside className="pf-strip" aria-label="IB policy checks">
      <header>
        <strong>IB policy checks</strong>
        <small>Things to check against IB rules. These do not change your band and are separate from template advice.</small>
      </header>
      <ul>
        {flags.map((f) => (
          <li key={f.id}>
            <b>{f.title}</b>
            <p>{f.message}</p>
            {f.evidence.length > 0 && <p className="pf-ev">{f.evidence.map((e, i) => <span key={i}>“{e}”</span>)}</p>}
          </li>
        ))}
      </ul>
    </aside>
  );
}
