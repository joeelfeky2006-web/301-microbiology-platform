// UI-level admin check. Real enforcement is the RLS policies in supabase/secure-admin.sql.
export function isAdminEmail(email?: string | null): boolean {
  const admin = (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '').trim().toLowerCase();
  return !!admin && !!email && email.trim().toLowerCase() === admin;
}