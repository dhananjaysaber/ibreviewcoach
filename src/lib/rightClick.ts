import { useEffect } from 'react';
import { supabase } from './supabase';

export async function loadAppSettings(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('get_ia_app_settings');
  return !error && data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
}

export async function saveAppSetting(key: string, value: unknown): Promise<boolean> {
  const { error } = await supabase.rpc('set_ia_app_setting', { p_key: key, p_value: value });
  return !error;
}

/**
 * Blocks the browser right-click menu for signed-in students while the admin setting is on.
 * Text fields keep their menu so people can still paste. Admins are never blocked.
 */
export function useRightClickGuard(signedIn: boolean, isAdmin: boolean) {
  useEffect(() => {
    if (!signedIn || isAdmin) return;
    let block = false;
    let alive = true;
    void loadAppSettings().then((s) => {
      if (alive) block = s.block_right_click !== false;
    });
    const onMenu = (e: MouseEvent) => {
      if (!block) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, [contenteditable="true"]')) return;
      e.preventDefault();
    };
    document.addEventListener('contextmenu', onMenu);
    return () => {
      alive = false;
      document.removeEventListener('contextmenu', onMenu);
    };
  }, [signedIn, isAdmin]);
}
