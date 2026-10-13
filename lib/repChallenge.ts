/** REP 301 Microbiology Midterm Challenge. Times are Cairo time (UTC+3 until Egypt's DST ends on 29 Oct 2026). */
export const REP_CHALLENGE = {
  title: 'REP 301 Microbiology Midterm Challenge',
  titleAr: 'تحدّي ميدترم ميكرو REP 301',
  questions: 30,
  minutes: 40,
  opensAt: '2026-10-15T21:00:00+03:00',
  lastEntryAt: '2026-10-15T21:15:00+03:00',
  closesAt: '2026-10-15T22:00:00+03:00',
  resultsAt: '2026-10-16T20:00:00+03:00',
  instagram: 'https://instagram.com/medatlas_eg',
  whatsappChannel: 'https://whatsapp.com/channel/0029Vb8pcwu7oQhgGeoAhp2M',
} as const;

export type ChallengePhase = 'upcoming' | 'open' | 'entry-closed' | 'ended';

export function challengePhase(now = Date.now()): ChallengePhase {
  if (now < Date.parse(REP_CHALLENGE.opensAt)) return 'upcoming';
  if (now < Date.parse(REP_CHALLENGE.lastEntryAt)) return 'open';
  if (now < Date.parse(REP_CHALLENGE.closesAt)) return 'entry-closed';
  return 'ended';
}

/** Microsoft Forms only renders inside an iframe with embed=true on the long ResponsePage link. */
export function embeddableFormUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const isMsForms = /^forms\.((office|microsoft)\.com|cloud\.microsoft)$/i.test(parsed.hostname);
    if (isMsForms && /responsepage\.aspx/i.test(parsed.pathname)) {
      parsed.searchParams.delete('route');
      parsed.searchParams.set('embed', 'true');
    }
    return parsed.toString();
  } catch {
    return url;
  }
}
