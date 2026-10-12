import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  email?: string;
  password?: string;
  name?: string;
  university_id?: string;
  accepted_legal?: boolean;
};

/**
 * Server signup that auto-confirms email so we do not burn Supabase's built-in
 * ~2 emails/hour confirmation quota (the cause of mass "couldn't complete" errors).
 * Client still signs in with the password afterward via the anon client.
 */
export async function POST(request: NextRequest) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Sign-up service is not configured.' }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || '').trim().slice(0, 100);
  const universityId = String(body.university_id || '').trim().slice(0, 64);
  const acceptedLegal = Boolean(body.accepted_legal);

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }
  if (!universityId) {
    return NextResponse.json({ error: 'Enter your university ID.' }, { status: 400 });
  }
  if (!acceptedLegal) {
    return NextResponse.json({ error: 'Please accept the Terms of Use and Privacy Policy to create an account.' }, { status: 400 });
  }

  const { data: settingsRows, error: settingsError } = await admin
    .from('platform_settings')
    .select('registration_open')
    .eq('id', 1)
    .limit(1);

  if (settingsError) {
    console.error('signup settings read failed', settingsError.message);
    return NextResponse.json({ error: 'Could not verify registration status. Try again shortly.' }, { status: 503 });
  }
  if (settingsRows?.[0] && settingsRows[0].registration_open === false) {
    return NextResponse.json({ error: 'Registration is currently closed. Please try again later.' }, { status: 403 });
  }

  const nowIso = new Date().toISOString();
  const userMetadata = {
    name: name || email.split('@')[0],
    university_id: universityId,
    accepted_terms_at: nowIso,
    accepted_privacy_at: nowIso,
  };

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  if (!created.error && created.data.user) {
    return NextResponse.json({ ok: true, created: true }, { status: 201 });
  }

  const msg = (created.error?.message || '').toLowerCase();
  const already =
    msg.includes('already') ||
    msg.includes('registered') ||
    msg.includes('exists') ||
    created.error?.status === 422;

  if (!already) {
    console.error('signup createUser failed', created.error?.message);
    return NextResponse.json(
      { error: created.error?.message || 'We could not create your account. Please try again.' },
      { status: 400 },
    );
  }

  // Recover accounts created earlier when confirmation email rate-limit failed.
  const existing = await findUserByEmail(admin, email);
  if (!existing) {
    return NextResponse.json(
      { error: 'An account with this email already exists. Please sign in or reset your password.' },
      { status: 409 },
    );
  }

  if (existing.email_confirmed_at) {
    return NextResponse.json(
      { error: 'An account with this email already exists. Please sign in or reset your password.' },
      { status: 409 },
    );
  }

  const updated = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: {
      ...(existing.user_metadata || {}),
      ...userMetadata,
    },
  });

  if (updated.error) {
    console.error('signup recover confirm failed', updated.error.message);
    return NextResponse.json(
      { error: 'An account with this email already exists. Please sign in or reset your password.' },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, created: false, recovered: true }, { status: 200 });
}

async function findUserByEmail(
  admin: NonNullable<ReturnType<typeof createSupabaseAdmin>>,
  email: string,
) {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 25; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error('signup listUsers failed', error.message);
      return null;
    }
    const found = data.users.find((u) => (u.email || '').toLowerCase() === target);
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}
