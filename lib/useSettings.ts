'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PlatformSettings } from '@/types';
import { DEFAULT_SITE_CONTENT, mergeSiteContent } from '@/lib/siteConfig';

export const DEFAULT_SUPPORT_CONTENT: PlatformSettings['support_content'] = {
  title: 'Support MedAtlas Egypt',
  subtitle: 'Micro 301 Student Hosting & AI Token Fund',
  description: 'MedAtlas Egypt is an independent student academic initiative built specifically for 3rd-year MUST medical students. Your voluntary contribution helps keep AI tools and course resources available.',
  benefit_one: 'AI Token Compute',
  benefit_two: 'High-Speed DB & CDN',
  payment_heading: 'Student Payment Channels',
  methods: [],
  copy_label: 'Copy',
  copied_label: 'Copied',
  link_label: 'Open',
  footer: 'Thank you for supporting your colleagues at MUST Medical School!',
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  id: 1,
  announcement_text: '',
  announcement_active: false,
  maintenance_mode: false,
  ai_enabled: true,
  whatsapp_number: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '201000000000',
  registration_open: true,
  support_content: DEFAULT_SUPPORT_CONTENT,
  site_content: DEFAULT_SITE_CONTENT,
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
      const resolved: PlatformSettings = row ? {
        ...DEFAULT_PLATFORM_SETTINGS,
        ...row,
        id: 1,
        ai_enabled: row.ai_enabled !== false,
        support_content: row.support_content && typeof row.support_content === 'object'
          ? { ...DEFAULT_SUPPORT_CONTENT, ...row.support_content, methods: Array.isArray(row.support_content.methods) ? row.support_content.methods : DEFAULT_SUPPORT_CONTENT.methods }
          : DEFAULT_SUPPORT_CONTENT,
        site_content: mergeSiteContent(row.site_content),
        whatsapp_number: String(row.whatsapp_number || DEFAULT_PLATFORM_SETTINGS.whatsapp_number),
      } : DEFAULT_PLATFORM_SETTINGS;
      cachedSettings = resolved;
      cacheExpiresAt = Date.now() + 60_000;
      return resolved;
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
    const update = () => { loadSettings(true).then((value) => { if (active) setSettings(value); }); };
    window.addEventListener('platform_settings_updated', update);
    return () => { active = false; window.removeEventListener('platform_settings_updated', update); };
  }, []);
  return { settings, loading, refresh };
}
