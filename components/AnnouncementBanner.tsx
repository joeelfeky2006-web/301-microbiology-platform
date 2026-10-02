'use client';
import { useEffect, useState } from 'react';
import { useSettings } from '@/lib/useSettings';

function hash(value: string) { let h = 2166136261; for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619); return (h >>> 0).toString(16); }
export default function AnnouncementBanner() {
  const { settings } = useSettings();
  const [dismissed, setDismissed] = useState(false);
  const key = `announcement-dismissed:${hash(settings.announcement_text)}`;
  useEffect(() => { try { setDismissed(localStorage.getItem(key) === '1'); } catch { setDismissed(false); } }, [key]);
  if (!settings.announcement_active || !settings.announcement_text || dismissed) return null;
  return <aside className="relative bg-blue-700 px-12 py-2 text-center text-sm text-white"><span>{settings.announcement_text}</span><button type="button" aria-label="Dismiss announcement" onClick={() => { try { localStorage.setItem(key, '1'); } catch {} setDismissed(true); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded px-2 py-1 hover:bg-blue-600">×</button></aside>;
}
