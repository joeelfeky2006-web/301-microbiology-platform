'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AdminPage() {
  const [title, setTitle] = useState('');
  const [moduleName, setModuleName] = useState('CNS');
  const [type, setType] = useState('lec_pdf');
  const [format, setFormat] = useState('external_link');
  const [externalUrl, setExternalUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState({ loading: false, message: '', type: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ loading: true, message: 'Processing...', type: 'info' });

    try {
      let finalFileUrl = externalUrl;

      // 1. Handle Direct File Uploads to Supabase Storage
      if (format !== 'external_link' && file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${moduleName.toLowerCase()}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('materials')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get the public URL to save in the database
        const { data: { publicUrl } } = supabase.storage
          .from('materials')
          .getPublicUrl(filePath);
          
        finalFileUrl = publicUrl;
      }

      if (!finalFileUrl) throw new Error("Please provide a file or a link.");

      // 2. Save the metadata to the Supabase Database
      const { error: dbError } = await supabase
        .from('materials')
        .insert([{
          title,
          module: moduleName,
          type,
          format,
          file_url: finalFileUrl
        }]);

      if (dbError) throw dbError;

      setStatus({ loading: false, message: 'Material uploaded successfully!', type: 'success' });
      
      // Reset form
      setTitle('');
      setExternalUrl('');
      setFile(null);
      
    } catch (error: any) {
      console.error(error);
      setStatus({ loading: false, message: error.message || 'An error occurred', type: 'error' });
    }
  };

  return (
    <main className="min-h-screen bg-[#070b14] p-6 md:p-12 text-[#e6ecf5]">
      <div className="max-w-3xl mx-auto bg-[#0b1329] border border-slate-800 rounded-2xl shadow-xl p-8">
        
        <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Dr. Youssef&apos;s Upload Center</h1>
            <p className="text-slate-400 mt-1">Publish MUST 301 Microbiology materials</p>
          </div>
          <Link href="/" className="text-blue-400 font-medium hover:underline">
            View Portal &rarr;
          </Link>
        </div>
        
        {/* Form elements with explicit text-white / bg-slate-900 classes */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Title</label>
            <input 
              type="text" required
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g., CNS Lec 1: Meningitis"
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-blue-500"
            />
          </div>
          <div>
  <label className="block text-sm font-bold text-slate-300 mb-2">Category</label>
  <select 
    value={type} onChange={e => setType(e.target.value)}
    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white outline-none focus:border-blue-500"
  >
    {/* Theory Group */}
    <optgroup label="--- Theory & Lectures ---" className="bg-slate-900 text-slate-400">
      <option value="lec_pdf" className="bg-slate-900 text-white">Lecture PDF (lec_pdf)</option>
      <option value="record_g1" className="bg-slate-900 text-white">Record G1 (record_g1)</option>
      <option value="record_g2" className="bg-slate-900 text-white">Record G2 (record_g2)</option>
    </optgroup>

    {/* Practicals Group */}
    <optgroup label="--- Practicals & OSPE ---" className="bg-slate-900 text-slate-400">
      <option value="practical_pdf" className="bg-slate-900 text-white">Practical PDF (practical_pdf)</option>
      <option value="practical_record" className="bg-slate-900 text-white">Practical Record (practical_record)</option>
      <option value="ospe_simulation" className="bg-slate-900 text-white">OSPE Simulation (ospe_simulation)</option>
    </optgroup>

    {/* Exams Vault Group */}
    <optgroup label="--- Exam Vault ---" className="bg-slate-900 text-slate-400">
      <option value="midterm_study" className="bg-slate-900 text-white">Midterm Study Guide (midterm_study)</option>
      <option value="midterm_qs" className="bg-slate-900 text-white">Midterm Questions (midterm_qs)</option>
      <option value="final_study" className="bg-slate-900 text-white">Final Study Guide (final_study)</option>
      <option value="final_qs" className="bg-slate-900 text-white">Final Questions (final_qs)</option>
    </optgroup>
  </select>
</div>
          {/* Module Selector */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Module</label>
            <select 
              value={moduleName} onChange={e => setModuleName(e.target.value)}
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white outline-none focus:border-blue-500"
            >
              <option value="CNS" className="bg-slate-900 text-white">CNS</option>
              <option value="URS" className="bg-slate-900 text-white">URS</option>
              <option value="REP" className="bg-slate-900 text-white">REP</option>
            </select>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Category</label>
            <select 
              value={type} onChange={e => setType(e.target.value)}
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white outline-none focus:border-blue-500"
            >
              <option value="lec_pdf" className="bg-slate-900 text-white">Lecture PDF</option>
              <option value="record_g1" className="bg-slate-900 text-white">Record G1</option>
              <option value="record_g2" className="bg-slate-900 text-white">Record G2</option>
              <option value="practical_pdf" className="bg-slate-900 text-white">Practical PDF</option>
              <option value="ospe_simulation" className="bg-slate-900 text-white">OSPE Simulation</option>
            </select>
          </div>
          
          {/* Format Engine Selector */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Format Engine</label>
            <select 
              value={format} onChange={e => setFormat(e.target.value)}
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white outline-none focus:border-blue-500"
            >
              <option value="external_link" className="bg-slate-900 text-white">Telegram / Google Drive Link</option>
              <option value="pdf" className="bg-slate-900 text-white">Direct Upload (Built-in PDF Viewer)</option>
              <option value="audio" className="bg-slate-900 text-white">Direct Upload (Built-in Audio Player)</option>
            </select>
          </div>

          {/* Dynamic Link/File Input */}
          {format === 'external_link' ? (
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">URL Link</label>
              <input 
                type="url" required
                value={externalUrl} onChange={e => setExternalUrl(e.target.value)}
                placeholder="https://t.me/..."
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-blue-500"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Upload File</label>
              <input 
                type="file" required
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={status.loading}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-slate-700"
          >
            {status.loading ? 'Publishing...' : 'Publish Material'}
          </button>
        </form>

      </div>
    </main>
  );
} 