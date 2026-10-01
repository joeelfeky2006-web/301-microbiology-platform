'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { isAdminEmail } from '@/lib/admin';
import { cardClass, inputClass, labelClass } from '@/lib/ui';
import {
  EXAM_TYPES,
  MATERIAL_TYPE_LABELS,
  MODULE_NAMES,
  PRACTICAL_TYPES,
  THEORY_TYPES,
  type MaterialCategory,
  type MaterialFormat,
  type MaterialSource,
  type ModuleName,
} from '@/types';

type Status = { loading: boolean; message: string; type: 'info' | 'success' | 'error' | '' };

// Only values allowed by the CHECK constraint on materials.source_type (or null).
function detectSource(url: string): MaterialSource | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host === 't.me' || host === 'telegram.me') return 'telegram';
    if (host === 'drive.google.com' || host === 'docs.google.com') return 'drive';
  } catch {
    /* ignore invalid URL */
  }
  return null;
}

function categoryOptions(types: MaterialCategory[]) {
  return types.map((t) => (
    <option key={t} value={t}>
      {MATERIAL_TYPE_LABELS[t]}
    </option>
  ));
}

export default function AdminPage() {
  const session = useSession();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [moduleName, setModuleName] = useState<ModuleName>('CNS');
  const [type, setType] = useState<MaterialCategory>('lec_pdf');
  const [format, setFormat] = useState<MaterialFormat>('external_link');
  const [externalUrl, setExternalUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [status, setStatus] = useState<Status>({ loading: false, message: '', type: '' });

  useEffect(() => {
    if (session === null) router.replace('/sign-in?redirect=%2Fadmin');
  }, [session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ loading: true, message: 'Processing...', type: 'info' });

    let uploadedPath: string | null = null;

    try {
      let finalFileUrl = externalUrl.trim();
      let source: MaterialSource | null = detectSource(finalFileUrl);

      if (format !== 'external_link') {
        if (!file) throw new Error('Please choose a file to upload.');

        const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
        const filePath = `${moduleName.toLowerCase()}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('materials')
          .upload(filePath, file, { contentType: file.type || undefined, upsert: false });
        if (uploadError) throw uploadError;
        uploadedPath = filePath;

        const { data } = supabase.storage.from('materials').getPublicUrl(filePath);
        finalFileUrl = data.publicUrl;
        source = 'supabase';
      }

      if (!finalFileUrl) throw new Error('Please provide a file or a link.');

      const { error: dbError } = await supabase.from('materials').insert([
        {
          title: title.trim(),
          module: moduleName,
          type,
          format,
          source_type: source,
          file_url: finalFileUrl,
        },
      ]);
      if (dbError) throw dbError;

      setStatus({ loading: false, message: 'Material uploaded successfully!', type: 'success' });
      setTitle('');
      setExternalUrl('');
      setFile(null);
      setFileInputKey((k) => k + 1);
    } catch (err: unknown) {
      if (uploadedPath) await supabase.storage.from('materials').remove([uploadedPath]);
      console.error(err);
      const message = err instanceof Error ? err.message : 'An error occurred';
      setStatus({ loading: false, message, type: 'error' });
    }
  };

  const shell = (children: React.ReactNode) => (
    <main className="p-6 md:p-12">
      <div className={`${cardClass} mx-auto max-w-3xl p-8`}>{children}</div>
    </main>
  );

  if (!session) {
    return shell(
      <p className="text-slate-500 dark:text-slate-300">
        {session === null ? 'Redirecting to sign in…' : 'Checking your session…'}
      </p>
    );
  }

  if (!isAdminEmail(session.user.email)) {
    return shell(
      <>
        <h1 className="mb-2 text-2xl font-extrabold text-slate-900 dark:text-white">Not authorized</h1>
        <p className="mb-4 text-slate-600 dark:text-slate-300">
          Your account ({session.user.email}) is not allowed to publish materials.
        </p>
        <Link href="/" className="font-semibold text-blue-600 hover:underline dark:text-cyan-300">
          ← Back to Dashboard
        </Link>
      </>
    );
  }

  const statusStyles: Record<Exclude<Status['type'], ''>, string> = {
    info: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
    success: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300',
    error: 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300',
  };

  return shell(
    <>
      <div className="mb-8 flex items-center justify-between border-b border-slate-200 pb-6 dark:border-white/10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Dr. Youssef&apos;s Upload Center</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-300">Publish MUST 301 Microbiology materials</p>
        </div>
        <Link href="/" className="text-sm font-medium text-blue-600 hover:underline dark:text-cyan-300">
          View Portal &rarr;
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className={labelClass}>Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., CNS Lec 1: Meningitis"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Files with the exact same title are grouped into one card (e.g. PDF + G1 + G2 record).
          </p>
        </div>

        <div>
          <label className={labelClass}>Module</label>
          <select value={moduleName} onChange={(e) => setModuleName(e.target.value as ModuleName)} className={inputClass}>
            {MODULE_NAMES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Category</label>
          <select value={type} onChange={(e) => setType(e.target.value as MaterialCategory)} className={inputClass}>
            <optgroup label="Theory & Lectures">{categoryOptions(THEORY_TYPES)}</optgroup>
            <optgroup label="Practicals & OSPE">{categoryOptions(PRACTICAL_TYPES)}</optgroup>
            <optgroup label="Exam Vault">{categoryOptions(EXAM_TYPES)}</optgroup>
          </select>
        </div>

        <div>
          <label className={labelClass}>Format</label>
          <select
            value={format}
            onChange={(e) => {
              setFormat(e.target.value as MaterialFormat);
              setFile(null);
              setFileInputKey((k) => k + 1);
            }}
            className={inputClass}
          >
            <option value="external_link">Telegram / Google Drive Link</option>
            <option value="pdf">Direct Upload (PDF)</option>
            <option value="audio">Direct Upload (Audio player)</option>
          </select>
        </div>

        {format === 'external_link' ? (
          <div>
            <label className={labelClass}>URL Link</label>
            <input
              type="url"
              required
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://t.me/..."
              className={inputClass}
            />
          </div>
        ) : (
          <div>
            <label className={labelClass}>Upload File</label>
            <input
              key={fileInputKey}
              type="file"
              required
              accept={format === 'pdf' ? '.pdf,application/pdf' : 'audio/*'}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className={`${inputClass} file:mr-4 file:rounded-full file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-blue-700`}
            />
          </div>
        )}

        {status.message && (
          <div role="status" className={`rounded-xl border p-3 text-sm ${statusStyles[status.type || 'info']}`}>
            {status.message}
          </div>
        )}

        <button
          type="submit"
          disabled={status.loading}
          className="w-full rounded-xl bg-blue-600 py-4 font-bold text-white transition-colors hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-700"
        >
          {status.loading ? 'Publishing...' : 'Publish Material'}
        </button>
      </form>
    </>
  );
}