'use client';

import { Material } from '@/types';
import Link from 'next/link';

interface ModuleViewerProps {
  moduleName: string;
  theory: Material[];
  practicals: Material[];
  exams: Material[];
}

export default function ModuleViewer({ moduleName, theory, practicals, exams }: ModuleViewerProps) {
  const groupMaterials = (items: Material[]) => {
    const groups: { [key: string]: Material[] } = {};
    items.forEach(item => {
      const key = item.title; 
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  };

  const theoryGroups = groupMaterials(theory);
  const practicalGroups = groupMaterials(practicals);
  const examGroups = groupMaterials(exams);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Top Header */}
        <div>
          <Link href="/" className="text-blue-600 hover:underline text-sm font-medium">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-extrabold text-slate-900 mt-2">
            {moduleName} <span className="text-slate-400 font-normal">Module</span>
          </h1>
        </div>

        {/* Theory & Lectures Section */}
        <section className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-2.5 h-6 bg-blue-600 rounded-full"></div>
            <h2 className="text-2xl font-bold text-slate-900">Theory & Lectures</h2>
          </div>

          {Object.keys(theoryGroups).length === 0 ? (
            <p className="text-slate-500 italic">No theory materials uploaded yet.</p>
          ) : (
            <div className="grid gap-4">
              {Object.entries(theoryGroups).map(([title, materials], idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider font-mono-accent">
                      Lecture Folder &bull; {materials.length} file(s) available
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                    {materials.map((mat) => (
                      <div key={mat.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                        <div>
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600 font-mono-accent uppercase font-semibold">
                            {mat.type}
                          </span>
                          <p className="text-sm font-medium text-slate-800 mt-2 line-clamp-2">{mat.title}</p>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
                          <a 
                            href={mat.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1"
                          >
                            <span>Access Material →</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Practicals & OSPE Section */}
        <section className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-2.5 h-6 bg-emerald-600 rounded-full"></div>
            <h2 className="text-2xl font-bold text-slate-900">Practicals & OSPE</h2>
          </div>
          {Object.keys(practicalGroups).length === 0 ? (
            <p className="text-slate-500 italic">No practical materials uploaded yet.</p>
          ) : (
            <div className="grid gap-4">
              {Object.entries(practicalGroups).map(([title, materials], idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                    {materials.map((mat) => (
                      <div key={mat.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 font-mono-accent uppercase font-semibold">{mat.type}</span>
                        <a href={mat.file_url} target="_blank" rel="noopener noreferrer" className="mt-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-3 rounded-lg text-center">
                          Open File →
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Exam Vault Section */}
        <section className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-2.5 h-6 bg-purple-600 rounded-full"></div>
            <h2 className="text-2xl font-bold text-slate-900">Exam Vault</h2>
          </div>
          {Object.keys(examGroups).length === 0 ? (
            <p className="text-slate-500 italic">No exam materials uploaded yet.</p>
          ) : (
            <div className="grid gap-4">
              {Object.entries(examGroups).map(([title, materials], idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                    {materials.map((mat) => (
                      <div key={mat.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-600 font-mono-accent uppercase font-semibold">{mat.type}</span>
                        <a href={mat.file_url} target="_blank" rel="noopener noreferrer" className="mt-3 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1.5 px-3 rounded-lg text-center">
                          Open File →
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}