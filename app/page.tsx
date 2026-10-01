import Link from 'next/link';

export default function Home() {
  const modules = [
    { id: 'CNS', name: 'Central Nervous System', color: 'bg-blue-600' },
    { id: 'URS', name: 'Urogenital System', color: 'bg-emerald-600' },
    { id: 'REP', name: 'Reproductive System', color: 'bg-purple-600' },
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Section */}
        <header className="mb-12 text-center mt-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            301 Microbiology <span className="text-blue-600">Portal</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Select a module below to access lecture PDFs, G1/G2 audio records, and interactive OSPE simulators.
          </p>
        </header>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modules.map((mod) => (
            <Link key={mod.id} href={`/modules/${mod.id}`}>
              <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-8 border border-slate-100 flex flex-col items-center text-center group cursor-pointer h-full">
                <div className={`${mod.color} text-white text-2xl font-bold rounded-2xl w-20 h-20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  {mod.id}
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">{mod.name}</h2>
                <p className="text-slate-500 text-sm">
                  View Theory, Practicals & Quizzes &rarr;
                </p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </main>
  );
}