import { notFound } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { parseModuleName } from '@/types';
import ModuleViewer from './ModuleViewer';

export default function ModulePage({ params }: { params: { moduleName: string } }) {
  const moduleName = parseModuleName(params.moduleName);
  if (!moduleName) notFound();

  // Materials are fetched in the browser with the signed-in user's session,
  // so Supabase RLS can restrict reads to authenticated users.
  return (
    <AuthGate>
      <ModuleViewer moduleName={moduleName} />
    </AuthGate>
  );
}