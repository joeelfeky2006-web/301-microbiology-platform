/** Shared lecture upload limits for CMS client + admin API. */

export const PDF_MAX_BYTES = 20 * 1024 * 1024;
export const AUDIO_MAX_BYTES = 25 * 1024 * 1024;
export const AUDIO_MIME = new Set(['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/oga']);
export const AUDIO_EXT = new Set(['mp3', 'm4a', 'aac', 'ogg', 'oga']);

export type UploadFormat = 'pdf' | 'audio' | 'external_link';

export function validateMaterialUpload(input: {
  format: UploadFormat;
  fileName?: string;
  contentType?: string | null;
  size?: number | null;
}): string | null {
  if (input.format === 'external_link') return null;
  const size = typeof input.size === 'number' ? input.size : null;
  const type = (input.contentType || '').toLowerCase().split(';')[0].trim();
  const ext = (input.fileName || '').split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';

  if (input.format === 'pdf') {
    if (type && type !== 'application/pdf') return 'PDFs must use the application/pdf file type.';
    if (ext && ext !== 'pdf') return 'PDF uploads must use a .pdf file.';
    if (size != null && size > PDF_MAX_BYTES) return 'PDF files must be 20 MB or smaller.';
    if (size === 0) return 'The selected PDF looks empty. Choose another file.';
    return null;
  }

  if (input.format === 'audio') {
    const mimeOk = !type || AUDIO_MIME.has(type);
    const extOk = !ext || AUDIO_EXT.has(ext);
    if (!mimeOk || !extOk) return 'Audio must be mp3, m4a, aac, or ogg.';
    if (size != null && size > AUDIO_MAX_BYTES) return 'Audio files must be 25 MB or smaller.';
    if (size === 0) return 'The selected audio file looks empty. Choose another file.';
    return null;
  }

  return null;
}
