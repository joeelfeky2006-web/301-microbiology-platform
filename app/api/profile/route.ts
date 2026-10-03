import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Returns only the signed-in user's profile, one balance row, and the newest 20 ledger events. */
export async function GET(request: NextRequest) {
  const identity = await authenticate(request);
  if ('response' in identity) return identity.response;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!url || !anonKey || !token) return NextResponse.json({ error: 'Profile service is not configured.' }, { status: 503 });

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const [{ data: userData, error: userError }, { data: credits, error: creditsError }, { data: history, error: historyError }] = await Promise.all([
    client.auth.getUser(token),
    client.from('user_credits').select('daily_remaining,daily_limit,monthly_remaining,monthly_limit,created_at,updated_at').eq('user_id', identity.userId).maybeSingle(),
    client.from('user_credit_history').select('id,event_type,action,amount,daily_remaining,monthly_remaining,created_at').eq('user_id', identity.userId).order('created_at', { ascending: false }).limit(20),
  ]);
  if (userError || !userData.user) return NextResponse.json({ error: 'Could not load your account profile.' }, { status: 401 });
  if (creditsError || historyError) console.error('Some profile data is unavailable:', creditsError?.message || historyError?.message);

  const user = userData.user;
  return NextResponse.json({
    profile: {
      id: user.id,
      name: String(user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student'),
      university_id: String(user.user_metadata?.university_id || ''),
      email: user.email || '',
      email_confirmed: Boolean(user.email_confirmed_at),
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    },
    credits: credits || { daily_remaining: 0, daily_limit: 8, monthly_remaining: 0, monthly_limit: 80 },
    credits_available: !creditsError && Boolean(credits),
    history: history || [],
    history_available: !historyError,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Updates only the authenticated user's Auth metadata and email. Email changes follow Supabase's confirmation flow. */
export async function PATCH(request: NextRequest) {
  const identity = await authenticate(request);
  if ('response' in identity) return identity.response;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!url || !anonKey || !token) return NextResponse.json({ error: 'Profile service is not configured.' }, { status: 503 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Enter valid profile details.' }, { status: 400 }); }
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const universityId = typeof body?.university_id === 'string' ? body.university_id.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (name.length < 2 || name.length > 100) return NextResponse.json({ error: 'Name must be between 2 and 100 characters.' }, { status: 400 });
  if (!universityId || universityId.length > 64) return NextResponse.json({ error: 'University ID is required and must be 64 characters or fewer.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: currentData, error: currentError } = await client.auth.getUser(token);
  if (currentError || !currentData.user || currentData.user.id !== identity.userId) {
    return NextResponse.json({ error: 'Your session expired. Sign in again.' }, { status: 401 });
  }

  const emailChangePending = email !== currentData.user.email?.toLowerCase();
  const admin = createSupabaseAdmin();
  let updatedUser: any = null;

  // Primary Path: Use Supabase Service Role Admin client (bypasses GoTrue session constraints & RLS issues)
  if (admin) {
    try {
      const updatePayload: Record<string, any> = {
        user_metadata: {
          ...currentData.user.user_metadata,
          name,
          full_name: name,
          university_id: universityId,
        },
      };
      if (emailChangePending) {
        updatePayload.email = email;
      }
      const { data: adminUpdateData, error: adminUpdateErr } = await admin.auth.admin.updateUserById(
        identity.userId,
        updatePayload
      );
      if (!adminUpdateErr && adminUpdateData?.user) {
        updatedUser = adminUpdateData.user;
      } else if (adminUpdateErr) {
        console.warn('Admin updateUserById encountered error, trying user client fallback:', adminUpdateErr.message);
      }
    } catch (adminEx) {
      console.warn('Admin update threw error, trying user client fallback:', adminEx);
    }
  }

  // Secondary Path: User client with session initialization
  if (!updatedUser) {
    try {
      await client.auth.setSession({ access_token: token, refresh_token: '' });
      const { data, error } = await client.auth.updateUser({
        ...(emailChangePending ? { email } : {}),
        data: {
          ...currentData.user.user_metadata,
          name,
          full_name: name,
          university_id: universityId,
        },
      });

      if (error || !data.user) {
        const message = error?.message?.toLowerCase() || '';
        const friendly = message.includes('already') || message.includes('registered')
          ? 'That email is already associated with another account.'
          : (error?.message ? `Failed to save profile: ${error.message}` : 'We could not save your profile. Check the details and try again.');
        return NextResponse.json({ error: friendly }, { status: 400 });
      }
      updatedUser = data.user;
    } catch (clientEx: any) {
      console.error('User client update threw exception:', clientEx);
      return NextResponse.json({
        error: clientEx?.message || 'We could not save your profile. Check the details and try again.',
      }, { status: 400 });
    }
  }

  // Keep public.students in sync even if the auth trigger is delayed/unavailable.
  if (admin) {
    const { error: studentError } = await admin.from('students').upsert({
      id: identity.userId,
      email: updatedUser.email || (emailChangePending ? currentData.user.email : email) || '',
      name,
      university_id: universityId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (studentError) console.warn('students upsert failed:', studentError.message);
  }

  return NextResponse.json({
    email_change_pending: emailChangePending,
    profile: {
      id: updatedUser.id,
      name,
      university_id: universityId,
      email: updatedUser.email || (emailChangePending ? currentData.user.email : email),
      email_confirmed: Boolean(updatedUser.email_confirmed_at),
      created_at: updatedUser.created_at,
      last_sign_in_at: updatedUser.last_sign_in_at,
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
