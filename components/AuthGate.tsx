'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/lib/useSession';

/** Sends signed-out visitors to /sign-in and brings them back afterwards. */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname() ?? '/';

  useEffect(() => {
    if (session === null) {
      router.replace(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [session, router, pathname]);

  if (!session) {
    return (
      <p className="p-12 text-center text-slate-500 dark:text-slate-400">
        {session === null ? 'Redirecting to sign in…' : 'Checking your session…'}
      </p>
    );
  }

  return <>{children}</>;
}