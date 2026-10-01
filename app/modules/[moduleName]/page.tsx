import { supabase } from '@/lib/supabase';
import { Material } from '@/types';
import ModuleViewer from './ModuleViewer';

export default async function ModulePage({ params }: { params: { moduleName: string } }) {
  const currentModule = params.moduleName.toUpperCase();

 // Fetch from Supabase without ordering by the missing column
  const { data: materials, error } = await supabase
    .from('materials')
    .select('*')
    .eq('module', currentModule);

  if (error) {
    console.error('Error fetching materials:', error);
  }
  // Categorize materials to pass to the client
  const theory = materials?.filter((m: Material) => 
    ['lec_pdf', 'record_g1', 'record_g2'].includes(m.type)
  ) || [];

  const practicals = materials?.filter((m: Material) => 
    ['practical_pdf', 'practical_record', 'ospe_simulation'].includes(m.type)
  ) || [];

  const exams = materials?.filter((m: Material) => 
    ['midterm_study', 'midterm_qs', 'final_study', 'final_qs'].includes(m.type)
  ) || [];

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <ModuleViewer 
        moduleName={currentModule} 
        theory={theory} 
        practicals={practicals} 
        exams={exams} 
      />
    </main>
  );
}
