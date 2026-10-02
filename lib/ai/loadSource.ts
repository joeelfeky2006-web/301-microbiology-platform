import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

type SourceRow = { id: string; module: string; title: string | null; ai_context: string | null; raw_quiz_text: string | null; custom_system_prompt: string | null };

/** Resolve empty lecture-level AI fields from another material row in the same lecture group. */
export async function loadLectureSource(admin: SupabaseClient, requested: SourceRow): Promise<SourceRow> {
  const fields = ['ai_context', 'raw_quiz_text', 'custom_system_prompt'] as const;
  if (fields.every((field) => requested[field]?.trim())) return requested;
  const { data } = await admin.from('materials').select('id,module,title,ai_context,raw_quiz_text,custom_system_prompt')
    .eq('module', requested.module).eq('title', requested.title || '');
  const siblings = (data || []) as SourceRow[];
  const resolved = { ...requested };
  for (const field of fields) {
    if (!resolved[field]?.trim()) resolved[field] = siblings.find((row) => row.id !== requested.id && row[field]?.trim())?.[field] || null;
  }
  return resolved;
}
