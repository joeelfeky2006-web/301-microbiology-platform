import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/apiAuth';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';
import { PRIMARY_ADMIN_EMAIL } from '@/lib/admin';
import { validateMaterialUpload, type UploadFormat } from '@/lib/uploadLimits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

async function resolveStaffRole(userClient: any, userId: string, userEmail?: string): Promise<{ isStaff: boolean; isSuperAdmin: boolean; role: string }> {
  const normalizedEmail = (userEmail || '').trim().toLowerCase();
  if (normalizedEmail && normalizedEmail === PRIMARY_ADMIN_EMAIL) {
    return { isStaff: true, isSuperAdmin: true, role: 'super_admin' };
  }

  try {
    const { data: rpcRole, error: rpcError } = await userClient.rpc('get_current_user_role');
    if (!rpcError && typeof rpcRole === 'string') {
      const isSuper = rpcRole === 'super_admin';
      const isEditor = rpcRole === 'editor';
      if (isSuper || isEditor) {
        return { isStaff: true, isSuperAdmin: isSuper, role: rpcRole };
      }
    }
  } catch (err) {
    console.warn('RPC get_current_user_role check failed:', err);
  }

  try {
    const { data: roleRow } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    const role = roleRow?.role;
    if (role === 'super_admin' || role === 'editor') {
      return { isStaff: true, isSuperAdmin: role === 'super_admin', role };
    }
  } catch {
    // ignore
  }

  return { isStaff: false, isSuperAdmin: false, role: 'student' };
}

/**
 * GET /api/admin/materials
 * Lists all course materials for admin/editor management with full pagination and fallback.
 */
export async function GET(request: NextRequest) {
  const identity = await authenticate(request);
  if ('response' in identity) return identity.response;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!url || !anonKey || !token) {
    return NextResponse.json({ error: 'Supabase configuration or session token is missing.' }, { status: 503 });
  }

  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { isStaff } = await resolveStaffRole(userClient, identity.userId, identity.email);
  if (!isStaff) {
    return NextResponse.json({ error: 'Staff access is required.' }, { status: 403 });
  }

  const admin = createSupabaseAdmin();
  const clientToQuery = admin || userClient;

  const materials: Record<string, unknown>[] = [];
  const pageSize = 500;

  // Attempt 1: Fetch comprehensive columns
  const preferredColumns = admin
    ? '*'
    : 'id,module,type,title,subtitle,file_url,format,source_type,ai_context,raw_quiz_text,raw_flashcard_text,custom_system_prompt';

  let fetchError: any = null;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await (clientToQuery.from('materials') as any)
      .select(preferredColumns)
      .order('title', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      fetchError = error;
      break;
    }
    if (data && Array.isArray(data) && data.length > 0) {
      materials.push(...(data as Record<string, unknown>[]));
    }
    if (!data || data.length < pageSize) break;
  }

  // Attempt 2: Fallback to baseline columns if column-level permissions blocked Attempt 1
  if (fetchError) {
    console.warn('Preferred columns query failed, retrying with baseline columns:', fetchError.message);
    materials.length = 0;
    const baselineColumns = 'id,module,type,title,file_url,format,source_type';
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await (clientToQuery.from('materials') as any)
        .select(baselineColumns)
        .order('title', { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error(JSON.stringify({ action: 'admin-materials', material_id: null, kind: 'glitch', error: error.message, latency_ms: 0 }));
        return NextResponse.json({ error: `Could not load course materials: ${error.message}` }, { status: 500 });
      }
      if (data && Array.isArray(data) && data.length > 0) {
        materials.push(...(data as Record<string, unknown>[]));
      }
      if (!data || data.length < pageSize) break;
    }
  }

  return NextResponse.json({ materials, count: materials.length }, { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * POST /api/admin/materials
 * Create a new material or attach a file to an existing lecture.
 */
export async function POST(request: NextRequest) {
  const identity = await authenticate(request);
  if ('response' in identity) return identity.response;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!url || !anonKey || !token) {
    return NextResponse.json({ error: 'Supabase configuration or session token is missing.' }, { status: 503 });
  }

  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { isStaff } = await resolveStaffRole(userClient, identity.userId, identity.email);
  if (!isStaff) {
    return NextResponse.json({ error: 'Staff access is required to publish materials.' }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim().replace(/\s+/g, ' ') : '';
  const moduleName = typeof body.module === 'string' ? body.module.trim().toUpperCase() : '';
  const type = typeof body.type === 'string' ? body.type.trim() : 'lec_pdf';
  const format = ['pdf', 'audio', 'external_link'].includes(body.format) ? body.format : 'pdf';
  const fileUrl = typeof body.file_url === 'string' ? body.file_url.trim() : '';
  const subtitle = typeof body.subtitle === 'string' ? body.subtitle.trim() : null;
  const sourceType = typeof body.source_type === 'string' ? body.source_type.trim() : null;
  const aiContext = typeof body.ai_context === 'string' ? body.ai_context.trim() : null;
  const rawQuizText = typeof body.raw_quiz_text === 'string' ? body.raw_quiz_text.trim() : null;
  const rawFlashcardText = typeof body.raw_flashcard_text === 'string' ? body.raw_flashcard_text.trim() : null;
  const customSystemPrompt = typeof body.custom_system_prompt === 'string' ? body.custom_system_prompt.trim() : null;
  const syncAiToLecture = Boolean(body.sync_ai_to_lecture);

  if (!title) return NextResponse.json({ error: 'Lecture title is required.' }, { status: 400 });
  if (!moduleName) return NextResponse.json({ error: 'Module code is required.' }, { status: 400 });
  if (!fileUrl) return NextResponse.json({ error: 'File URL or external link is required.' }, { status: 400 });

  const uploadFormat = format as UploadFormat;
  if (uploadFormat !== 'external_link') {
    const limitError = validateMaterialUpload({
      format: uploadFormat,
      fileName: typeof body.file_name === 'string' ? body.file_name : fileUrl,
      contentType: typeof body.content_type === 'string' ? body.content_type : null,
      size: typeof body.file_size === 'number' ? body.file_size : null,
    });
    if (limitError) return NextResponse.json({ error: limitError }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const db = admin || userClient;

  // Sync AI / bank fields to all materials in this lecture if requested
  if (syncAiToLecture && (aiContext || rawQuizText || rawFlashcardText || customSystemPrompt)) {
    try {
      await db
        .from('materials')
        .update({
          ai_context: aiContext || null,
          raw_quiz_text: rawQuizText || null,
          raw_flashcard_text: rawFlashcardText || null,
          custom_system_prompt: customSystemPrompt || null,
        })
        .eq('module', moduleName)
        .eq('title', title);
    } catch (e) {
      console.warn('Failed to sync AI fields across lecture siblings:', e);
    }
  }

  const recordToInsert: Record<string, unknown> = {
    title,
    module: moduleName,
    type,
    format,
    file_url: fileUrl,
    source_type: sourceType,
    subtitle: subtitle || null,
    author_email: identity.email || null,
    ai_context: aiContext || null,
    raw_quiz_text: rawQuizText || null,
    raw_flashcard_text: rawFlashcardText || null,
    custom_system_prompt: customSystemPrompt || null,
  };

  const { data, error } = await db
    .from('materials')
    .insert([recordToInsert])
    .select()
    .maybeSingle();

  if (error) {
    // If error is column missing (e.g. subtitle or ai_context), try fallback insert with minimal schema
    console.warn('Full insert failed, trying minimal columns insert:', error.message);
    const minimalRecord = {
      title,
      module: moduleName,
      type,
      format,
      file_url: fileUrl,
      source_type: sourceType,
    };
    const { data: fallbackData, error: fallbackError } = await db
      .from('materials')
      .insert([minimalRecord])
      .select()
      .maybeSingle();

    if (fallbackError) {
      return NextResponse.json({ error: `Could not publish material: ${fallbackError.message}` }, { status: 500 });
    }
    return NextResponse.json({ ok: true, material: fallbackData }, { status: 201 });
  }

  return NextResponse.json({ ok: true, material: data }, { status: 201 });
}

/**
 * PATCH /api/admin/materials
 * Update material details, subtitle, or AI context.
 */
export async function PATCH(request: NextRequest) {
  const identity = await authenticate(request);
  if ('response' in identity) return identity.response;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!url || !anonKey || !token) {
    return NextResponse.json({ error: 'Supabase configuration or session token is missing.' }, { status: 503 });
  }

  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { isStaff } = await resolveStaffRole(userClient, identity.userId, identity.email);
  if (!isStaff) {
    return NextResponse.json({ error: 'Staff access is required to edit materials.' }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return NextResponse.json({ error: 'Material ID is required.' }, { status: 400 });

  const admin = createSupabaseAdmin();
  const db = admin || userClient;

  // Retrieve current material
  const { data: current } = await db.from('materials').select('*').eq('id', id).maybeSingle();
  if (!current) return NextResponse.json({ error: 'Material not found.' }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (typeof body.title === 'string' && body.title.trim()) updates.title = body.title.trim().replace(/\s+/g, ' ');
  if (typeof body.module === 'string' && body.module.trim()) updates.module = body.module.trim().toUpperCase();
  if (typeof body.type === 'string' && body.type.trim()) updates.type = body.type.trim();
  if (['pdf', 'audio', 'external_link'].includes(body.format)) updates.format = body.format;
  if (typeof body.file_url === 'string' && body.file_url.trim()) updates.file_url = body.file_url.trim();
  if (body.subtitle !== undefined) updates.subtitle = typeof body.subtitle === 'string' ? body.subtitle.trim() || null : null;
  if (body.source_type !== undefined) updates.source_type = typeof body.source_type === 'string' ? body.source_type.trim() || null : null;
  if (body.ai_context !== undefined) updates.ai_context = typeof body.ai_context === 'string' ? body.ai_context.trim() || null : null;
  if (body.raw_quiz_text !== undefined) updates.raw_quiz_text = typeof body.raw_quiz_text === 'string' ? body.raw_quiz_text.trim() || null : null;
  if (body.raw_flashcard_text !== undefined) updates.raw_flashcard_text = typeof body.raw_flashcard_text === 'string' ? body.raw_flashcard_text.trim() || null : null;
  if (body.custom_system_prompt !== undefined) updates.custom_system_prompt = typeof body.custom_system_prompt === 'string' ? body.custom_system_prompt.trim() || null : null;

  // Rename all attachments for this lecture title if requested or if title changed
  if (body.rename_all_matching && updates.title && updates.title !== current.title) {
    try {
      await db
        .from('materials')
        .update({ title: updates.title, module: (updates.module as string) || current.module })
        .eq('module', current.module)
        .eq('title', current.title);
    } catch (e) {
      console.warn('Failed to cascade rename to sibling items:', e);
    }
  }

  const { data: updated, error } = await db
    .from('materials')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: `Could not update material: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, material: updated });
}

/**
 * DELETE /api/admin/materials
 * Delete a course material row and cleans up the stored file if applicable (Super Admin only).
 */
export async function DELETE(request: NextRequest) {
  const identity = await authenticate(request);
  if ('response' in identity) return identity.response;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!url || !anonKey || !token) {
    return NextResponse.json({ error: 'Supabase configuration or session token is missing.' }, { status: 503 });
  }

  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { isSuperAdmin } = await resolveStaffRole(userClient, identity.userId, identity.email);
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Destructive deletion requires Super Admin privileges.' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  let id = searchParams.get('id');
  if (!id) {
    try {
      const body = await request.json();
      id = body?.id;
    } catch {
      // ignore
    }
  }

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Material ID is required.' }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const db = admin || userClient;

  // Retrieve material to check storage file URL
  const { data: target } = await db.from('materials').select('id,file_url').eq('id', id).maybeSingle();

  // If storage file, attempt cleanup
  if (target?.file_url) {
    const marker = '/storage/v1/object/public/materials/';
    const idx = target.file_url.indexOf(marker);
    if (idx !== -1) {
      const storagePath = decodeURIComponent(target.file_url.slice(idx + marker.length).split('?')[0]);
      try {
        await db.storage.from('materials').remove([storagePath]);
      } catch (err) {
        console.warn('Storage file deletion note:', err);
      }
    }
  }

  const { error } = await db.from('materials').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: `Could not delete material: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted_id: id });
}
