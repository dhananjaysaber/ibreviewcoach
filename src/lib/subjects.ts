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

export type IaYear = { label: string; is_active: boolean; sort_order: number };

/** Academic years from the database, newest first. */
export function useAcademicYears(activeOnly = true) {
  const [years, setYears] = useState<IaYear[]>([]);
  const reload = useCallback(async () => {
    let q = supabase.from('ia_academic_years').select('label,is_active,sort_order').order('sort_order', { ascending: false });
    if (activeOnly) q = q.eq('is_active', true);
    const { data } = await q;
    setYears((Array.isArray(data) ? data : []).flatMap((r) => (typeof r?.label === 'string' ? [{ label: r.label, is_active: r.is_active !== false, sort_order: typeof r.sort_order === 'number' ? r.sort_order : 100 }] : [])));
  }, [activeOnly]);
  useEffect(() => { void reload(); }, [reload]);
  return { years, reload };
}

/** Academic year of each of the signed-in student's reports, keyed by submission id. */
export async function loadReportYears(): Promise<Record<string, string>> {
  const { data, error } = await supabase.rpc('get_my_ia_years');
  const out: Record<string, string> = {};
  if (!error && Array.isArray(data)) for (const r of data as Record<string, unknown>[]) if (typeof r.submission_id === 'string' && typeof r.academic_year === 'string' && r.academic_year) out[r.submission_id] = r.academic_year;
  return out;
}
