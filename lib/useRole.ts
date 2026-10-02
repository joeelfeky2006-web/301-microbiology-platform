'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types';
import { useSession } from '@/lib/useSession';

const roleCache = new Map<string, UserRole>();
const roleRequests = new Map<string, Promise<UserRole>>();

export function clearRoleCache(userId?: string) {
  if (userId) roleCache.delete(userId);
  else roleCache.clear();
}

export function useRole() {
  const session = useSession();
  const userId = session?.user?.id as string | undefined;
  const [role, setRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    if (!userId) { setRole('student'); setLoading(session === undefined); return () => { active = false; }; }
    setLoading(true);
    const load = async () => {
      if (roleCache.has(userId)) return roleCache.get(userId)!;
      let request = roleRequests.get(userId);
      if (!request) {
        request = supabase.rpc('get_current_user_role').then(({ data, error }) => {
          const value: UserRole = !error && ['super_admin', 'editor', 'student'].includes(data) ? data : 'student';
          roleCache.set(userId, value);
          return value;
        }).finally(() => roleRequests.delete(userId));
        roleRequests.set(userId, request);
      }
      return request;
    };
    load().then((value) => { if (active) { setRole(value); setLoading(false); } });
    return () => { active = false; };
  }, [userId, session]);
  return { role, loading, isSuperAdmin: role === 'super_admin', isEditor: role === 'editor' };
}
