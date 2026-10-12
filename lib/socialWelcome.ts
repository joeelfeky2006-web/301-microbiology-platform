/** Guest forever-dismiss + signed-in 2×/Cairo-day caps for the social welcome modal. */

export const COOKIE_CONSENT_KEY = 'medatlas_cookie_consent';
export const SOCIAL_WELCOME_GUEST_KEY = 'medatlas_social_welcome_guest';
export const SOCIAL_WELCOME_USER_KEY = 'medatlas_social_welcome_v1';
export const SOCIAL_WELCOME_MAX_PER_DAY = 2;

type UserState = {
  day: string;
  showCount: number;
  forever: boolean;
};

export function cairoDayKey(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function isSocialWelcomePath(pathname: string, signedIn: boolean): boolean {
  if (pathname === '/') return true;
  if (!signedIn && pathname === '/sign-up') return true;
  if (signedIn && pathname === '/modules') return true;
  return false;
}

export function hasCookieConsentDecision(): boolean {
  try {
    return Boolean(localStorage.getItem(COOKIE_CONSENT_KEY));
  } catch {
    return true;
  }
}

export function canShowSocialWelcome(signedIn: boolean): boolean {
  try {
    if (!signedIn) {
      return localStorage.getItem(SOCIAL_WELCOME_GUEST_KEY) !== '1';
    }
    const raw = localStorage.getItem(SOCIAL_WELCOME_USER_KEY);
    if (!raw) return true;
    const parsed = JSON.parse(raw) as Partial<UserState>;
    if (parsed.forever) return false;
    const day = cairoDayKey();
    if (parsed.day !== day) return true;
    return (Number(parsed.showCount) || 0) < SOCIAL_WELCOME_MAX_PER_DAY;
  } catch {
    return false;
  }
}

/** Call when the modal is actually shown (counts toward signed-in daily cap). */
export function recordSocialWelcomeShown(signedIn: boolean): void {
  try {
    if (!signedIn) return;
    const day = cairoDayKey();
    const raw = localStorage.getItem(SOCIAL_WELCOME_USER_KEY);
    let state: UserState = { day, showCount: 0, forever: false };
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<UserState>;
        state = {
          day: typeof parsed.day === 'string' ? parsed.day : day,
          showCount: Number(parsed.showCount) || 0,
          forever: Boolean(parsed.forever),
        };
      } catch {
        /* reset */
      }
    }
    if (state.forever) return;
    if (state.day !== day) state = { day, showCount: 0, forever: false };
    state.showCount += 1;
    localStorage.setItem(SOCIAL_WELCOME_USER_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function dismissSocialWelcomeGuestForever(): void {
  try {
    localStorage.setItem(SOCIAL_WELCOME_GUEST_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function dismissSocialWelcomeUserForever(): void {
  try {
    const day = cairoDayKey();
    const raw = localStorage.getItem(SOCIAL_WELCOME_USER_KEY);
    let showCount = 0;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<UserState>;
        if (parsed.day === day) showCount = Number(parsed.showCount) || 0;
      } catch {
        /* ignore */
      }
    }
    localStorage.setItem(SOCIAL_WELCOME_USER_KEY, JSON.stringify({ day, showCount, forever: true }));
  } catch {
    /* ignore */
  }
}

export function resolveOfficialSocial(links: { label: string; url: string }[] | undefined) {
  const list = Array.isArray(links) ? links : [];
  const instagram = list.find((l) => /instagram\.com/i.test(l.url));
  const whatsapp = list.find((l) => /whatsapp\.com|wa\.me/i.test(l.url));
  return { instagram, whatsapp };
}
