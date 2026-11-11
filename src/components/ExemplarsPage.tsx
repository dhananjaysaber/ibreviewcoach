import { useEffect, useState } from 'react';
import { BookOpenCheck, FileText, ListChecks, Eye, X, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { exemplarViewerUrl, hasView, toExemplar, type Exemplar, type ExemplarKind } from '../lib/exemplars';
import { subjectLabel, useSubjects } from '../lib/subjects';

const KINDS: { kind: ExemplarKind; title: string; text: string; icon: typeof ListChecks }[] = [
  { kind: 'fix', title: 'Fix your IA', text: 'See the section-by-section fixes a full review gives.', icon: ListChecks },
  { kind: 'annotated', title: 'Annotated IA with marks', text: 'See the marked report with comments beside the text.', icon: Eye },
];

export function ExemplarsPage({ onOpenPricing }: { onOpenPricing?: () => void }) {
  const { subjects } = useSubjects(false);
  const [items, setItems] = useState<Exemplar[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [picked, setPicked] = useState<Exemplar | null>(null);
  const [viewer, setViewer] = useState<{ title: string; url: string | null; busy: boolean } | null>(null);

  useEffect(() => {
    let live = true;
    void supabase.from('ia_exemplars').select('*').eq('is_active', true).order('sort_order').order('created_at').then(({ data, error }) => {
      if (!live) return;
      if (error) { setState('error'); return; }
      setItems((data ?? []).map(toExemplar).filter((x): x is Exemplar => Boolean(x)));
      setState('ready');
    });
    return () => { live = false; };
  }, []);

  async function open(e: Exemplar, kind: ExemplarKind) {
    const label = KINDS.find((k) => k.kind === kind)!.title;
    setViewer({ title: `${e.title} · ${label}`, url: null, busy: true });
    const url = await exemplarViewerUrl(e, kind);
    setViewer({ title: `${e.title} · ${label}`, url, busy: false });
  }

  return (
    <div className="exm-page">
      <header className="exm-hero">
        <span>Exemplars</span>
        <h2>See a full review before you buy</h2>
        <p>Not sure a review credit is worth it? Open a worked example of what you get: the Fix your IA plan and the annotated IA with marks.</p>
      </header>

      {state === 'loading' && <p className="exm-note">Loading exemplars…</p>}
      {state === 'error' && <p className="exm-note">Exemplars could not be loaded. Please refresh and try again.</p>}
      {state === 'ready' && items.length === 0 && <p className="exm-note">No exemplars have been added yet. Please check back soon.</p>}

      <div className="exm-grid">
        {items.map((e) => (
          <button key={e.id} type="button" className={`exm-card${picked?.id === e.id ? ' exm-on' : ''}`} onClick={() => setPicked(e)}>
            <span className="exm-icon"><BookOpenCheck aria-hidden="true" /></span>
            <em className="premium-subject-pill">{subjectLabel(subjects, e.subject)}</em>
            <strong>{e.title}</strong>
            <span className="exm-go">View example <ChevronRight aria-hidden="true" /></span>
          </button>
        ))}
      </div>

      {picked && (
        <div className="exm-slide-wrap" onClick={() => setPicked(null)}>
          <aside className="exm-slide" role="dialog" aria-label={picked.title} onClick={(ev) => ev.stopPropagation()}>
            <button type="button" className="exm-x" aria-label="Close" onClick={() => setPicked(null)}><X aria-hidden="true" /></button>
            <em className="premium-subject-pill">{subjectLabel(subjects, picked.subject)}</em>
            <h3>{picked.title}</h3>
            <p>Choose what you would like to see.</p>
            {KINDS.map((k) => {
              const Icon = k.icon;
              const ok = hasView(picked, k.kind);
              return (
                <button key={k.kind} type="button" className="exm-opt" disabled={!ok} onClick={() => void open(picked, k.kind)}>
                  <span><Icon aria-hidden="true" /></span>
                  <div><strong>{k.title}</strong><small>{ok ? k.text : 'Not added yet'}</small></div>
                  <ChevronRight aria-hidden="true" />
                </button>
              );
            })}
            {onOpenPricing && <button type="button" className="exm-buy" onClick={onOpenPricing}>Ready for your own review? See pricing</button>}
          </aside>
        </div>
      )}

      {viewer && (
        <div className="exm-modal" role="dialog" aria-label={viewer.title}>
          <div className="exm-modal-box">
            <header>
              <strong><FileText aria-hidden="true" /> {viewer.title}</strong>
              <button type="button" aria-label="Close viewer" onClick={() => setViewer(null)}><X aria-hidden="true" /></button>
            </header>
            {viewer.busy ? <p className="exm-note">Opening…</p>
              : viewer.url ? <iframe title={viewer.title} src={viewer.url} />
              : <p className="exm-note">This file could not be opened. If it is a Google Drive file, it must be shared as “Anyone with the link can view”.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
