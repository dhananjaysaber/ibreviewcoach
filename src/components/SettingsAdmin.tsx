import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { driveEmbedUrl, toExemplar, type Exemplar } from '../lib/exemplars';
import { subjectLabel, useSubjects } from '../lib/subjects';

type Draft = { id: string; title: string; subject: string; fix_url: string; annotated_url: string; sort_order: number; is_active: boolean; fix_file: File | null; annotated_file: File | null; fix_path: string | null; annotated_path: string | null; isNew: boolean };
const blank = (subject: string): Draft => ({ id: crypto.randomUUID(), title: '', subject, fix_url: '', annotated_url: '', sort_order: 100, is_active: true, fix_file: null, annotated_file: null, fix_path: null, annotated_path: null, isNew: true });

export function SettingsAdmin() {
  const { subjects, reload } = useSubjects(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [items, setItems] = useState<Exemplar[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const loadItems = useCallback(async () => {
    const { data } = await supabase.from('ia_exemplars').select('*').order('sort_order').order('created_at');
    setItems((data ?? []).map(toExemplar).filter((x): x is Exemplar => Boolean(x)));
  }, []);
  useEffect(() => { void loadItems(); }, [loadItems]);

  const say = (ok: boolean, text: string) => setMsg({ ok, text });

  async function addSubject() {
    const label = newLabel.trim(), name = (newName.trim() || label.replace(/\s+IA$/i, '')).trim();
    if (!name || !label) return say(false, 'Enter a subject name and the label shown on the pill, for example Biology and Biology IA.');
    const { error } = await supabase.from('ia_subjects').insert({ name, label, sort_order: (subjects.at(-1)?.sort_order ?? 0) + 10 });
    if (error) return say(false, error.code === '23505' ? 'That subject already exists.' : 'Could not add the subject.');
    setNewName(''); setNewLabel(''); say(true, 'Subject added.'); void reload();
  }
  async function patchSubject(name: string, patch: { is_active?: boolean; label?: string }) {
    const { error } = await supabase.from('ia_subjects').update(patch).eq('name', name);
    say(!error, error ? 'Could not update the subject.' : 'Subject updated.'); void reload();
  }

  async function upload(id: string, kind: 'fix' | 'annotated', file: File) {
    if (file.type !== 'application/pdf') throw new Error('Exemplar files must be PDFs.');
    if (file.size > 30 * 1024 * 1024) throw new Error('A PDF must be under 30 MB.');
    const path = `${id}/${kind}-${Date.now()}.pdf`;
    const { error } = await supabase.storage.from('ia-exemplars').upload(path, file, { contentType: 'application/pdf' });
    if (error) throw new Error('Upload failed. Please try again.');
    return path;
  }

  async function save() {
    if (!draft) return;
    if (!draft.title.trim() || !draft.subject) return say(false, 'Add a title and choose a subject.');
    for (const k of ['fix_url', 'annotated_url'] as const) if (draft[k].trim() && !driveEmbedUrl(draft[k])) return say(false, 'A link must be a Google Drive file link starting with https://.');
    setBusy(true);
    try {
      const fix_path = draft.fix_file ? await upload(draft.id, 'fix', draft.fix_file) : draft.fix_path;
      const annotated_path = draft.annotated_file ? await upload(draft.id, 'annotated', draft.annotated_file) : draft.annotated_path;
      const row = { id: draft.id, title: draft.title.trim(), subject: draft.subject, sort_order: draft.sort_order, is_active: draft.is_active, fix_path, annotated_path, fix_url: draft.fix_url.trim() || null, annotated_url: draft.annotated_url.trim() || null };
      const { error } = await supabase.from('ia_exemplars').upsert(row);
      if (error) throw new Error('Could not save the exemplar.');
      say(true, 'Exemplar saved.'); setDraft(null); void loadItems();
    } catch (e) { say(false, e instanceof Error ? e.message : 'Could not save.'); }
    setBusy(false);
  }
  async function remove(e: Exemplar) {
    if (!window.confirm(`Delete “${e.title}”? This cannot be undone.`)) return;
    const paths = [e.fix_path, e.annotated_path].filter((p): p is string => Boolean(p));
    if (paths.length) await supabase.storage.from('ia-exemplars').remove(paths);
    const { error } = await supabase.from('ia_exemplars').delete().eq('id', e.id);
    say(!error, error ? 'Could not delete.' : 'Exemplar deleted.'); void loadItems();
  }
  const edit = (e: Exemplar) => setDraft({ id: e.id, title: e.title, subject: e.subject, fix_url: e.fix_url ?? '', annotated_url: e.annotated_url ?? '', sort_order: e.sort_order, is_active: e.is_active, fix_file: null, annotated_file: null, fix_path: e.fix_path, annotated_path: e.annotated_path, isNew: false });
  const up = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d));

  return (
    <div className="set-wrap">
      {msg && <p className={`set-msg ${msg.ok ? 'ok' : 'bad'}`} role="status">{msg.text}</p>}

      <section className="set-card">
        <h3>Subjects</h3>
        <p>Subjects appear in the upload dropdown and as the pill on each report. Switching one off hides it from the dropdown; old reports keep their label.</p>
        <ul className="set-list">
          {subjects.map((s) => (
            <li key={s.name}>
              <em className="premium-subject-pill">{s.label}</em>
              <span>{s.name}</span>
              <button type="button" onClick={() => { const l = window.prompt('Label shown on the pill', s.label)?.trim(); if (l) void patchSubject(s.name, { label: l }); }}><Pencil aria-hidden="true" /> Rename label</button>
              <button type="button" onClick={() => void patchSubject(s.name, { is_active: !s.is_active })}>{s.is_active ? 'Switch off' : 'Switch on'}</button>
            </li>
          ))}
        </ul>
        <div className="set-row">
          <input placeholder="Subject, e.g. Biology" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={40} />
          <input placeholder="Pill label, e.g. Biology IA" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} maxLength={60} />
          <button type="button" className="set-primary" onClick={() => void addSubject()}><Plus aria-hidden="true" /> Add subject</button>
        </div>
      </section>

      <section className="set-card">
        <h3>Exemplars</h3>
        <p>Full review examples students can open from the Exemplar menu. For each, upload a PDF or paste a Google Drive link (shared as “Anyone with the link can view”).</p>
        <ul className="set-list">
          {items.map((e) => (
            <li key={e.id}>
              <em className="premium-subject-pill">{subjectLabel(subjects, e.subject)}</em>
              <span><strong>{e.title}</strong>{!e.is_active && ' (hidden)'}</span>
              <button type="button" onClick={() => edit(e)}><Pencil aria-hidden="true" /> Edit</button>
              <button type="button" onClick={() => void remove(e)}><Trash2 aria-hidden="true" /> Delete</button>
            </li>
          ))}
          {items.length === 0 && <li className="set-empty">No exemplars yet.</li>}
        </ul>
        {!draft && <button type="button" className="set-primary" onClick={() => setDraft(blank(subjects.find((s) => s.is_active)?.name ?? ''))}><Plus aria-hidden="true" /> Add exemplar</button>}

        {draft && (
          <div className="set-form">
            <label>Title<input value={draft.title} maxLength={120} onChange={(e) => up({ title: e.target.value })} /></label>
            <label>Subject<select value={draft.subject} onChange={(e) => up({ subject: e.target.value })}>{subjects.map((s) => <option key={s.name} value={s.name}>{s.label}</option>)}</select></label>
            {(['fix', 'annotated'] as const).map((k) => (
              <fieldset key={k}>
                <legend>{k === 'fix' ? 'Fix your IA' : 'Annotated IA with marks'}</legend>
                <label className="set-file"><Upload aria-hidden="true" /> {draft[`${k}_file`]?.name ?? (draft[`${k}_path`] ? 'Replace uploaded PDF' : 'Upload PDF')}
                  <input type="file" accept="application/pdf" onChange={(e) => up({ [`${k}_file`]: e.target.files?.[0] ?? null } as Partial<Draft>)} /></label>
                <input placeholder="or paste a Google Drive link" value={draft[`${k}_url`]} onChange={(e) => up({ [`${k}_url`]: e.target.value } as Partial<Draft>)} />
              </fieldset>
            ))}
            <div className="set-row">
              <label>Order<input type="number" value={draft.sort_order} onChange={(e) => up({ sort_order: Number(e.target.value) || 0 })} /></label>
              <label className="set-check"><input type="checkbox" checked={draft.is_active} onChange={(e) => up({ is_active: e.target.checked })} /> Visible to students</label>
            </div>
            <div className="set-row">
              <button type="button" className="set-primary" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save exemplar'}</button>
              <button type="button" disabled={busy} onClick={() => setDraft(null)}>Cancel</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
