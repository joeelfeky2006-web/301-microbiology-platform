'use client';

import { useMemo, useState } from 'react';
import { supabase, generateUUID } from '@/lib/supabase';
import { authenticatedHeaders } from '@/lib/authHeaders';
import { MATERIAL_TYPE_LABELS, MODULE_NAMES, MODULE_TITLES, type Material, type MaterialCategory, type MaterialFormat, type ModuleName } from '@/types';
import { inputClass, labelClass } from '@/lib/ui';
import { parseBank } from '@/lib/ai/parseQuizBank';

const categories: Array<[MaterialCategory, string]> = [
  ['lec_pdf', '📄 Lecture PDF'], ['mindmap', '🧠 Mind map'], ['audio_recording', '🎧 Audio recording'],
  ['reference', '📚 Reference'], ['external_link', '🔗 External link'], ['qbank', '❓ Question bank'],
  ['record_g1', '🎧 Record G1'], ['record_g2', '🎧 Record G2'], ['practical_pdf', '🧪 Practical PDF'],
  ['practical_record', '🎙️ Practical recording'], ['midterm_study', '📝 Midterm study'], ['midterm_qs', '❔ Midterm questions'],
  ['final_study', '📘 Final study'], ['final_qs', '❔ Final questions'], ['ospe_simulation', '🔬 OSPE simulation'],
];
const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
const initialFormat = (type: MaterialCategory): MaterialFormat => type.includes('record') || type === 'audio_recording' ? 'audio' : type === 'external_link' ? 'external_link' : 'pdf';

export default function PublishMaterial({ materials, onPublished }: { materials: Material[]; onPublished: () => Promise<void> }) {
  const [attach, setAttach] = useState(false);
  const [module, setModule] = useState<ModuleName>('URS');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MaterialCategory>('lec_pdf');
  const [format, setFormat] = useState<MaterialFormat>('pdf');
  const [subtitle, setSubtitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [url, setUrl] = useState('');
  const [search, setSearch] = useState('');
  const [editingAi, setEditingAi] = useState(false);
  const [aiContext, setAiContext] = useState('');
  const [quizText, setQuizText] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [isError, setIsError] = useState(false);
  const [saved, setSaved] = useState(false);

  const titleGroups = useMemo(() => Array.from(new Set(materials.filter((m) => (m.module || '').trim().toUpperCase() === module).map((m) => m.title))).sort(), [materials, module]);
  const filteredTitles = titleGroups.filter((item) => normalize(item).includes(normalize(search)));
  const selectedRows = materials.filter((m) => (m.module || '').trim().toUpperCase() === module && normalize(m.title) === normalize(title));
  const aiSource = selectedRows.find((m) => m.ai_context || m.raw_quiz_text || m.custom_system_prompt);
  const duplicate = !attach && !!title.trim() && materials.some((m) => (m.module || '').trim().toUpperCase() === module && normalize(m.title) === normalize(title));
  const parsedQuizCount = useMemo(() => (quizText.trim() ? parseBank(quizText).length : 0), [quizText]);

  const resetResource = () => { setSubtitle(''); setFile(null); setUrl(''); setFileInputKey((k) => k + 1); setSaved(true); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setNotice(''); setIsError(false);
    const cleanTitle = (attach ? title : title.trim().replace(/\s+/g, ' '));
    if (!cleanTitle) { setNotice('Enter or choose a lecture title.'); setIsError(true); return; }
    if (duplicate) { setNotice('This title already exists in this module. Switch to “Attach existing” to add another resource.'); setIsError(true); return; }
    let uploadedPath: string | null = null;
    setBusy(true);
    try {
      let fileUrl = url.trim(); let sourceType: string | null = null;
      if (format === 'external_link') {
        const parsed = new URL(fileUrl);
        if (parsed.protocol !== 'https:') throw new Error('External links must use HTTPS.');
        sourceType = parsed.hostname.includes('drive.google.com') ? 'drive' : parsed.hostname.includes('t.me') ? 'telegram' : null;
      } else {
        if (!file) throw new Error('Choose a file to upload.');
        const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
        uploadedPath = `${module.toLowerCase()}/${generateUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('materials').upload(uploadedPath, file, { contentType: file.type || undefined, upsert: false });
        if (uploadError) throw uploadError;
        fileUrl = supabase.storage.from('materials').getPublicUrl(uploadedPath).data.publicUrl;
        sourceType = 'supabase';
      }
      const payload = {
        module,
        title: cleanTitle,
        subtitle: subtitle.trim() || null,
        type,
        format,
        source_type: sourceType,
        file_url: fileUrl,
        ai_context: aiContext.trim() || null,
        raw_quiz_text: quizText.trim() || null,
        custom_system_prompt: systemPrompt.trim() || null,
        sync_ai_to_lecture: Boolean(editingAi && attach),
      };

      let apiSuccess = false;
      try {
        const response = await fetch('/api/admin/materials', {
          method: 'POST',
          headers: await authenticatedHeaders(),
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          apiSuccess = true;
        } else {
          const errData = await response.json().catch(() => ({}));
          console.warn('POST /api/admin/materials returned error, attempting direct client fallback:', errData.error);
        }
      } catch (apiErr) {
        console.warn('POST /api/admin/materials network error, attempting direct client fallback:', apiErr);
      }

      if (!apiSuccess) {
        const common = { module, title: cleanTitle, subtitle: subtitle.trim() || null, type, format, source_type: sourceType, file_url: fileUrl };
        if (editingAi && attach) {
          const { error: aiError } = await supabase.from('materials').update({ ai_context: aiContext.trim() || null, raw_quiz_text: quizText.trim() || null, custom_system_prompt: systemPrompt.trim() || null }).eq('module', module).eq('title', cleanTitle);
          if (aiError) throw aiError;
        }
        const { error: insertError } = await supabase.from('materials').insert([{ ...common, ...(attach ? {} : { ai_context: aiContext.trim() || null, raw_quiz_text: quizText.trim() || null, custom_system_prompt: systemPrompt.trim() || null }) }]);
        if (insertError) throw insertError;
      }

      await onPublished(); resetResource(); setAttach(true);
      setNotice(`Resource added to “${cleanTitle}”. Add another file when ready.`);
    } catch (err: any) {
      if (uploadedPath) await supabase.storage.from('materials').remove([uploadedPath]);
      setNotice(`Could not save this resource: ${err?.message || 'Check the file or URL and your editor permissions, then try again.'}`); setIsError(true);
    } finally { setBusy(false); }
  };

  const switchMode = (next: boolean) => { setAttach(next); setTitle(''); setSearch(''); setEditingAi(false); setAiContext(''); setQuizText(''); setSystemPrompt(''); setSaved(false); };
  const pickTitle = (value: string) => {
    setTitle(value);
    const found = materials.find((m) => m.module === module && m.title === value && (m.ai_context || m.raw_quiz_text || m.custom_system_prompt));
    setAiContext(found?.ai_context || ''); setQuizText(found?.raw_quiz_text || ''); setSystemPrompt(found?.custom_system_prompt || ''); setEditingAi(false);
  };

  return <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-slate-900 sm:p-8">
    <h2 className="text-xl font-bold">Publish Course Material</h2><p className="mb-5 mt-1 text-xs text-slate-500">Add a new lecture or attach a resource to an existing lecture.</p>
    <div className="mb-5 flex gap-2"><button type="button" onClick={() => switchMode(false)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${!attach ? 'bg-blue-600 text-white' : 'border'}`}>＋ Create new</button><button type="button" onClick={() => switchMode(true)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${attach ? 'bg-blue-600 text-white' : 'border'}`}>🔗 Attach existing</button></div>
    {notice && <p role="status" className={`mb-4 rounded-lg p-3 text-sm ${isError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>{notice}</p>}
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2"><div><label className={labelClass}>Module</label><select disabled={attach && !!title} value={module} onChange={(e) => { setModule(e.target.value as ModuleName); setTitle(''); }} className={inputClass}>{MODULE_NAMES.map((m) => <option key={m} value={m}>{m} — {MODULE_TITLES[m]}</option>)}</select></div>
      <div><label className={labelClass}>Lecture title</label>{attach ? <><input disabled={!!title} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search existing titles…" className={inputClass}/><select required disabled={!!title} value={title} onChange={(e) => pickTitle(e.target.value)} className={`${inputClass} mt-2`}><option value="">Choose an existing title</option>{filteredTitles.map((item) => <option key={item} value={item}>{item}</option>)}</select>{title && <button type="button" onClick={() => pickTitle('')} className="mt-1 text-xs text-blue-600">Choose a different lecture</button>}</> : <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. URS Lec 1: Acute Pyelonephritis" className={inputClass}/>}</div></div>
      {duplicate && <p className="text-xs text-amber-700">This lecture title exists. Switch to “Attach existing” to add another resource.</p>}
      <div className="grid gap-4 sm:grid-cols-2"><div><label className={labelClass}>Category</label><select value={type} onChange={(e) => { const next = e.target.value as MaterialCategory; setType(next); setFormat(initialFormat(next)); }} className={inputClass}><optgroup label="New categories">{categories.slice(0, 6).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</optgroup><optgroup label="Legacy categories">{categories.slice(6).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</optgroup></select></div><div><label className={labelClass}>Format</label><select value={format} onChange={(e) => setFormat(e.target.value as MaterialFormat)} className={inputClass}><option value="pdf">PDF</option><option value="audio">Audio</option><option value="external_link">External link</option></select></div></div>
      <div><label className={labelClass}>Subtitle (optional)</label><input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={240} className={inputClass} placeholder="Short description shown to students" /></div>
      {format === 'external_link' ? <div><label className={labelClass}>HTTPS resource URL</label><input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className={inputClass}/></div> : <div><label className={labelClass}>Upload {format === 'audio' ? 'audio' : 'PDF'} file</label><input key={fileInputKey} type="file" required accept={format === 'audio' ? 'audio/*' : '.pdf,application/pdf'} onChange={(e) => setFile(e.target.files?.[0] || null)} className={inputClass}/></div>}
      {!attach ? <section className="space-y-3 rounded-xl border border-indigo-200 p-4"><h3 className="font-bold">AI Knowledge Card</h3><p className="text-xs text-slate-500">Each field can contain up to 30,000 characters. Leave blank if it is not needed.</p><textarea maxLength={30000} rows={4} value={aiContext} onChange={(e) => setAiContext(e.target.value)} placeholder="AI context / source notes" className={inputClass}/><div><textarea maxLength={30000} rows={4} value={quizText} onChange={(e) => setQuizText(e.target.value)} placeholder={"Q: Stem?\nA) option\nB) option\nC) option\nD) option\nANSWER: B\nEXPLANATION: optional"} className={inputClass}/><p className="mt-1 text-xs text-slate-500">Accepted format: <code className="font-mono">Q:</code> stem, options <code className="font-mono">A)</code>–<code className="font-mono">D)</code> or <code className="font-mono">A.</code>–<code className="font-mono">D.</code>, then <code className="font-mono">ANSWER: A–D</code>. <code className="font-mono">EXPLANATION:</code> is optional. Incomplete blocks are skipped.</p><p className={`mt-1 text-xs font-semibold ${quizText.trim() && parsedQuizCount === 0 ? 'text-amber-700' : 'text-emerald-700'}`}>Preview {parsedQuizCount} parsed question{parsedQuizCount === 1 ? '' : 's'}</p></div><textarea maxLength={30000} rows={3} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder="Optional custom system prompt" className={inputClass}/><p className="text-right text-xs text-slate-500">{Math.max(aiContext.length, quizText.length, systemPrompt.length)} / 30,000 max per field</p></section> : <section className="rounded-xl border p-4"><p className="text-sm">{aiSource ? 'AI text already stored for this lecture.' : 'No AI text is stored for this lecture yet.'}</p><button type="button" onClick={() => { setEditingAi((v) => !v); if (!editingAi && aiSource) { setAiContext(aiSource.ai_context || ''); setQuizText(aiSource.raw_quiz_text || ''); setSystemPrompt(aiSource.custom_system_prompt || ''); } }} className="mt-2 text-sm font-semibold text-blue-600">{editingAi ? 'Cancel AI text edit' : 'Edit AI text'}</button>{editingAi && <div className="mt-3 space-y-3"><textarea maxLength={30000} rows={4} value={aiContext} onChange={(e) => setAiContext(e.target.value)} placeholder="AI context" className={inputClass}/><div><textarea maxLength={30000} rows={4} value={quizText} onChange={(e) => setQuizText(e.target.value)} placeholder="Raw quiz text" className={inputClass}/><p className="mt-1 text-xs text-slate-500">Use <code className="font-mono">A)</code> or <code className="font-mono">A.</code> options; four choices required.</p><p className={`mt-1 text-xs font-semibold ${quizText.trim() && parsedQuizCount === 0 ? 'text-amber-700' : 'text-emerald-700'}`}>Preview {parsedQuizCount} parsed question{parsedQuizCount === 1 ? '' : 's'}</p></div><textarea maxLength={30000} rows={3} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder="Custom system prompt" className={inputClass}/></div>}</section>}
      {saved && <p className="text-sm font-medium text-emerald-700">Add another file to this lecture?</p>}
      <button type="submit" disabled={busy || duplicate || !title.trim()} className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white disabled:opacity-50">{busy ? 'Saving resource…' : 'Add resource'}</button>
    </form>
  </div>;
}
