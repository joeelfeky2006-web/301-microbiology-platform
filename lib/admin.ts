import type { UserRole, UserProfile, PlatformSettings } from '@/types';

// Default Super Admin email from environment or primary owner
export const PRIMARY_ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'joeelfeky2006@gmail.com'
).trim().toLowerCase();

const ROLE_STORAGE_KEY = 'micro_atlas_user_roles';
const SETTINGS_STORAGE_KEY = 'micro_atlas_platform_settings';

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  siteName: 'MedAtlas Egypt — Micro 301',
  announcement: 'Welcome to MedAtlas Egypt: Next-Gen AI Training for Medical Students. Micro 301 modules & clinical cases are now active!',
  showAnnouncement: true,
  maintenanceMode: false,
  allowRegistrations: true,
  supportWhatsApp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '201000000000',
};

/** Get the configured user roles map from localStorage (browser) or fallback */
export function getStoredUserRoles(): Record<string, UserRole> {
  if (typeof window === 'undefined') {
    return {
      [PRIMARY_ADMIN_EMAIL]: 'super_admin',
      'editor@must.edu.eg': 'editor',
    };
  }
  try {
    const raw = localStorage.getItem(ROLE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          [PRIMARY_ADMIN_EMAIL]: 'super_admin',
          ...parsed,
        };
      }
    }
  } catch {
    // fallback
  }
  const defaults: Record<string, UserRole> = {
    [PRIMARY_ADMIN_EMAIL]: 'super_admin',
    'editor@must.edu.eg': 'editor',
  };
  try {
    localStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify(defaults));
  } catch {
    // ignore
  }
  return defaults;
}

/** Assign a role to a specific user email */
export function setUserRole(email: string, role: UserRole): void {
  if (typeof window === 'undefined') return;
  const cleanEmail = email.trim().toLowerCase();
  const current = getStoredUserRoles();
  current[cleanEmail] = role;
  try {
    localStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new Event('roles_updated'));
  } catch {
    // ignore
  }
}

/** Determine role for an email */
export function getUserRole(email?: string | null): UserRole {
  if (!email) return 'student';
  const clean = email.trim().toLowerCase();
  if (clean === PRIMARY_ADMIN_EMAIL || clean === 'admin@must.edu.eg') {
    return 'super_admin';
  }
  const roles = getStoredUserRoles();
  if (roles[clean]) return roles[clean];

  if (clean.includes('superadmin') || clean.includes('head')) return 'super_admin';
  if (clean.includes('editor') || clean.includes('staff') || clean.includes('dr.')) return 'editor';

  return 'student';
}

export function isSuperAdmin(email?: string | null): boolean {
  return getUserRole(email) === 'super_admin';
}

export function isEditor(email?: string | null): boolean {
  return getUserRole(email) === 'editor';
}

/** Allowed to enter the content portal (either Super Admin or Editor) */
export function canAccessAdmin(email?: string | null): boolean {
  const role = getUserRole(email);
  return role === 'super_admin' || role === 'editor';
}

/** Backwards-compatibility alias for legacy code */
export function isAdminEmail(email?: string | null): boolean {
  return canAccessAdmin(email);
}

/** Super Admin can delete; Editor can only publish/edit */
export function canDeleteMaterials(email?: string | null): boolean {
  return isSuperAdmin(email);
}

export function canManageSettings(email?: string | null): boolean {
  return isSuperAdmin(email);
}

export function canManageRoles(email?: string | null): boolean {
  return isSuperAdmin(email);
}

/** Platform settings management */
export function getPlatformSettings(): PlatformSettings {
  if (typeof window === 'undefined') return DEFAULT_PLATFORM_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_PLATFORM_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_PLATFORM_SETTINGS;
}

export function savePlatformSettings(settings: Partial<PlatformSettings>): PlatformSettings {
  const updated = { ...getPlatformSettings(), ...settings };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('settings_updated'));
    } catch {
      // ignore
    }
  }
  return updated;
}
