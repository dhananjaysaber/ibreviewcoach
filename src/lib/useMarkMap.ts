import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { MarkMap, ReportBlock } from './markMap';

type Action = 'get' | 'generate' | 'plan' | 'trim' | 'annotate' | 'text';
/** One saved marking per report. Nothing here runs an AI call unless the person presses a button. */
export function useMarkMap(submissionId: string, isFreePreview: boolean) {
  const [map, setMap] = useState<MarkMap | null>(null);
  const [checked, setChecked] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<'' | 'marking' | 'plan' | 'trim' | 'annotate'>('');
  const [error, setError] = useState('');

  const call = useCallback(async (action: Action) => {
    const { data, error: e } = await supabase.functions.invoke('mark-map', { body: { submission_id: submissionId, action } });
    if (e) {
      let msg = '';
      try { const body = await (e as unknown as { context?: Response }).context?.json(); msg = body?.error ?? ''; } catch { /* use the default */ }
      throw new Error(msg || 'The coach could not do this right now. Your marks are safe. Please try again in a little while.');
    }
    if (data?.error) throw new Error(String(data.error));
    return data as { map?: MarkMap | null; blocks?: ReportBlock[] };
  }, [submissionId]);

  useEffect(() => {
    if (isFreePreview || !submissionId) return;
    let live = true;
    call('get').then((d) => { if (!live) return; setChecked(true); setReady(true); if (d.map?.criteria) setMap(d.map); })
      .catch(() => { if (live) { setChecked(true); setReady(false); } });
    return () => { live = false; };
  }, [submissionId, isFreePreview, call]);

  const run = useCallback(async (kind: 'plan' | 'trim' | 'annotate') => {
    setBusy(kind); setError('');
    try { const d = await call(kind); if (d.map) setMap(d.map); return true; }
    catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); return false; }
    finally { setBusy(''); }
  }, [call]);

  const generate = useCallback(async () => {
    if (busy) return;
    setBusy('marking'); setError('');
    try {
      const d = await call('generate');
      if (d.map) { setMap(d.map); if (!d.map.plan) { setBusy('plan'); const p = await call('plan'); if (p.map) setMap(p.map); } }
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(''); }
  }, [busy, call]);

  const loadText = useCallback(async () => (await call('text')).blocks ?? [], [call]);
  return { map, checked, ready, busy, error, generate, run, loadText };
}
