import { supabase } from './supabase';

export type Exemplar = {
  id: string; title: string; subject: string;
  fix_path: string | null; annotated_path: string | null; fix_url: string | null; annotated_url: string | null;
  sort_order: number; is_active: boolean;
};
export type ExemplarKind = 'fix' | 'annotated';

export const toExemplar = (r: unknown): Exemplar | null => {
  const o = (r ?? {}) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === 'string' && v ? v : null);
  if (typeof o.id !== 'string' || typeof o.title !== 'string') return null;
  return { id: o.id, title: o.title, subject: typeof o.subject === 'string' ? o.subject : '', fix_path: s(o.fix_path), annotated_path: s(o.annotated_path), fix_url: s(o.fix_url), annotated_url: s(o.annotated_url), sort_order: typeof o.sort_order === 'number' ? o.sort_order : 100, is_active: o.is_active !== false };
};

/** A Google Drive share link turned into its embeddable preview address. Other https links are used as they are. */
export function driveEmbedUrl(link: string): string | null {
  const t = link.trim();
  if (!/^https:\/\//i.test(t)) return null;
  const m = t.match(/drive\.google\.com\/file\/d\/([\w-]+)/i) ?? t.match(/[?&]id=([\w-]+)/i);
  if (/drive\.google\.com/i.test(t)) return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null;
  return t;
}

export const hasView = (e: Exemplar, k: ExemplarKind) => Boolean(k === 'fix' ? e.fix_path || e.fix_url : e.annotated_path || e.annotated_url);

/** Address to show in the viewer: a short-lived signed link for an uploaded PDF, otherwise the embedded Drive link. */
export async function exemplarViewerUrl(e: Exemplar, k: ExemplarKind): Promise<string | null> {
  const path = k === 'fix' ? e.fix_path : e.annotated_path;
  if (path) {
    const { data, error } = await supabase.storage.from('ia-exemplars').createSignedUrl(path, 600);
    return error || !data?.signedUrl ? null : data.signedUrl;
  }
  const url = k === 'fix' ? e.fix_url : e.annotated_url;
  return url ? driveEmbedUrl(url) : null;
}
