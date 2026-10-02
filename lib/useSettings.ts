'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PlatformSettings } from '@/types';

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  id: 1,
  announcement_text: '',
  announcement_active: false,
  maintenance_mode: false,
  whatsapp_number: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '201000000000',
  registration_open: true,
};

let cachedSettings: PlatformSettings | null = null;
let cacheExpiresAt = 0;
let pending: Promise<PlatformSettings> | null = null;

async function loadSettings(force = false): Promise<PlatformSettings> {
  if (!force && cachedSettings && Date.now() < cacheExpiresAt) return cachedSettings;
  if (!force && pending) return pending;
  pending = (async () => {
    try {
      const { data, error } = await supabase.from('platform_settings').select('*').eq('id', 1);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      cachedSettings = row ? { ...DEFAULT_PLATFORM_SETTINGS, ...row, id: 1 } : DEFAULT_PLATFORM_SETTINGS;
      cacheExpiresAt = Date.now() + 60_000;
      return cachedSettings;
    } catch {
      return DEFAULT_PLATFORM_SETTINGS;
    } finally {
      pending = null;
    }
  })();
  return pending;
}

export function invalidateSettingsCache() {
  cachedSettings = null;
  cacheExpiresAt = 0;
}

export function useSettings() {
  const [settings, setSettings] = useState<PlatformSettings>(cachedSettings ?? DEFAULT_PLATFORM_SETTINGS);
  const [loading, setLoading] = useState(!cachedSettings);
  const refresh = useCallback(async () => {
    setSettings(await loadSettings(true));
    setLoading(false);
  }, []);
  useEffect(() => {
    let active = true;
    loadSettings().then((value) => { if (active) { setSettings(value); setLoading(false); } });
    return () => { active = false; };
  }, []);
  return { settings, loading, refresh };
}
