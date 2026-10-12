'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useSession } from '@/lib/useSession';
import { useSettings } from '@/lib/useSettings';
import SocialIcon from '@/components/brand/SocialIcon';
import {
  canShowSocialWelcome,
  dismissSocialWelcomeGuestForever,
  dismissSocialWelcomeUserForever,
  hasCookieConsentDecision,
  isSocialWelcomePath,
  recordSocialWelcomeShown,
  resolveOfficialSocial,
} from '@/lib/socialWelcome';

export default function SocialWelcomeModal() {
  const session = useSession();
  const pathname = usePathname() || '/';
  const { settings } = useSettings();
  const titleId = useId();
  const laterRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const recordedRef = useRef(false);

  const enabled = settings.site_content.socialWelcome?.enabled !== false;
  const signedIn = Boolean(session);
  const { instagram, whatsapp } = resolveOfficialSocial(settings.site_content.brand.social);

  useEffect(() => {
    if (session === undefined) return;
    if (!enabled || !instagram || !whatsapp) {
      setOpen(false);
      return;
    }
    if (!isSocialWelcomePath(pathname, signedIn)) {
      setOpen(false);
      return;
    }
    if (!canShowSocialWelcome(signedIn)) {
      setOpen(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;

    const tryOpen = () => {
      if (cancelled) return;
      if (!hasCookieConsentDecision()) return;
      if (!canShowSocialWelcome(signedIn)) return;
      if (!isSocialWelcomePath(pathname, signedIn)) return;
      setOpen(true);
      if (poll) clearInterval(poll);
    };

    if (hasCookieConsentDecision()) {
      timer = setTimeout(tryOpen, 900);
    } else {
      poll = setInterval(tryOpen, 400);
      timer = setTimeout(() => {
        if (poll) clearInterval(poll);
      }, 120_000);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (poll) clearInterval(poll);
    };
  }, [session, signedIn, pathname, enabled, instagram?.url, whatsapp?.url]);

  useEffect(() => {
    if (!open || recordedRef.current) return;
    recordedRef.current = true;
    recordSocialWelcomeShown(signedIn);
    laterRef.current?.focus();
  }, [open, signedIn]);

  useEffect(() => {
    if (!open) recordedRef.current = false;
  }, [open, pathname, signedIn]);

  const closeGuestForever = () => {
    dismissSocialWelcomeGuestForever();
    setOpen(false);
  };

  const closeLater = () => {
    if (!signedIn) closeGuestForever();
    else setOpen(false);
  };

  const closeForever = () => {
    if (!signedIn) closeGuestForever();
    else {
      dismissSocialWelcomeUserForever();
      setOpen(false);
    }
  };

  const onFollow = () => {
    if (!signedIn) dismissSocialWelcomeGuestForever();
    else dismissSocialWelcomeUserForever();
    setOpen(false);
  };

  if (!open || !instagram || !whatsapp) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center" role="presentation">
      <button
        type="button"
        aria-label="Dismiss welcome"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
        onClick={closeLater}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[61] w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="bg-gradient-to-br from-brand-nile/15 via-white to-brand-indigo/10 px-5 pb-2 pt-5 dark:from-brand-nile/20 dark:via-slate-900 dark:to-brand-indigo/20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p id={titleId} className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                Stay updated
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Follow MedAtlas for lecture drops and study updates.
              </p>
              <p dir="rtl" lang="ar" className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                تابع ميد أطلس عشان يوصلك الجديد أول بأول
              </p>
            </div>
            <button
              type="button"
              onClick={closeLater}
              aria-label="Close"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2.5 px-5 py-4">
          <a
            href={instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onFollow}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-bold text-slate-800 transition hover:border-transparent hover:bg-gradient-to-tr hover:from-[#F58529] hover:via-[#DD2A7B] hover:to-[#8134AF] hover:text-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <SocialIcon network="instagram" className="h-5 w-5 shrink-0" />
            Instagram
          </a>
          <a
            href={whatsapp.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onFollow}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-bold text-slate-800 transition hover:border-transparent hover:bg-[#25D366] hover:text-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <SocialIcon network="whatsapp" className="h-5 w-5 shrink-0" />
            WhatsApp Channel
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
          <button
            ref={laterRef}
            type="button"
            onClick={closeLater}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Later
          </button>
          {signedIn && (
            <button
              type="button"
              onClick={closeForever}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Don&apos;t show again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
