import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

export type IaSubject = { name: string; label: string; is_active: boolean; sort_order: number };

const clean = (v: unknown): IaSubject[] =>
  (Array.isArray(v) ? v : []).flatMap((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    return typeof o.name === 'string' && typeof o.label === 'string'
      ? [{ name: o.name, label: o.label, is_active: o.is_active !== false, sort_order: typeof o.sort_order === 'number' ? o.sort_order : 100 }]
      : [];
  });

/** Subjects from the database. activeOnly hides the ones an admin has switched off. */
export function useSubjects(activeOnly = true) {
  const [subjects, setSubjects] = useState<IaSubject[]>([]);
  const [loaded, setLoaded] = useState(false);
  const reload = useCallback(async () => {
    let q = supabase.from('ia_subjects').select('name,label,is_active,sort_order').order('sort_order').order('label');
    if (activeOnly) q = q.eq('is_active', true);
    const { data } = await q;
    setSubjects(clean(data));
    setLoaded(true);
  }, [activeOnly]);
  useEffect(() => { void reload(); }, [reload]);
  return { subjects, loaded, reload };
}

/** Pill text for a stored subject code, for example SEHS becomes "SEHS IA". */
export const subjectLabel = (subjects: IaSubject[], name: string | null | undefined) =>
  subjects.find((s) => s.name === name)?.label ?? (name ? `${name} IA` : '');
