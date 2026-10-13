import type { NextRequest } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { PRIMARY_ADMIN_EMAIL } from '@/lib/admin';
import { challengePhase, embeddableFormUrl } from '@/lib/repChallenge';

export const dynamic = 'force-dynamic';

/** The form link is only handed out to signed-in students while entry is open (the admin can always preview it). */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if ('response' in auth) return auth.response;
  const phase = challengePhase();
  const preview = auth.email === PRIMARY_ADMIN_EMAIL;
  const formUrl = (process.env.REP_CHALLENGE_FORM_URL || '').trim();
  const share = Boolean(formUrl) && (phase === 'open' || preview);
  return Response.json(
    {
      phase,
      preview,
      formConfigured: Boolean(formUrl),
      formUrl: share ? formUrl : null,
      embedUrl: share ? embeddableFormUrl(formUrl) : null,
      serverTime: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
