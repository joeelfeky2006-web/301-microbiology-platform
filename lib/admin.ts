// UI-level admin check. Real enforcement is the RLS policies in supabase/secure-admin.sql.
export function isAdminEmail(email?: string | null): boolean {
  const admin = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'joeelfeky2006@gmail.com').trim().toLowerCase();
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  return cleanEmail === admin || cleanEmail.startsWith('admin@') || cleanEmail.includes('admin');
}
