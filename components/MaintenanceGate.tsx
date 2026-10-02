'use client';
import { usePathname } from 'next/navigation';
import { useSettings } from '@/lib/useSettings';
import { useRole } from '@/lib/useRole';

const allowed = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password', '/admin', '/about', '/contact', '/privacy', '/terms', '/copyright'];
export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const { settings, loading: settingsLoading } = useSettings();
  const { role, loading: roleLoading } = useRole();
  if (allowed.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return <>{children}</>;
  if (settingsLoading || roleLoading) return <>{children}</>;
  if (settings.maintenance_mode && role !== 'super_admin' && role !== 'editor') return <main className="mx-auto max-w-2xl p-12 text-center"><h1 className="text-3xl font-bold">We’ll be back soon</h1><p className="mt-3 text-slate-600 dark:text-slate-300">The Micro 301 platform is temporarily under maintenance. Please check back shortly.</p></main>;
  return <>{children}</>;
}
