'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  Edit3,
  Trash2,
  PlusCircle,
  FolderOpen,
  Users,
  Settings,
  Search,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  FileText,
  Volume2,
  Globe,
  RefreshCw,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import {
  getUserRole,
  isSuperAdmin,
  isEditor,
  canAccessAdmin,
  canDeleteMaterials,
  getStoredUserRoles,
  setUserRole,
  getPlatformSettings,
  savePlatformSettings,
} from '@/lib/admin';
import { cardClass, inputClass, labelClass } from '@/lib/ui';
import {
  EXAM_TYPES,
  MATERIAL_TYPE_LABELS,
  MODULE_NAMES,
  MODULE_TITLES,
  PRACTICAL_TYPES,
  THEORY_TYPES,
  type Material,
  type MaterialCategory,
  type MaterialFormat,
  type MaterialSource,
  type ModuleName,
  type UserRole,
  type PlatformSettings,
} from '@/types';

type Status = { loading: boolean; message: string; type: 'info' | 'success' | 'error' | '' };

function detectSource(url: string): MaterialSource | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host === 't.me' || host === 'telegram.me') return 'telegram';
    if (host === 'drive.google.com' || host === 'docs.google.com') return 'drive';
  } catch {
    /* ignore */
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

export default function AdminDashboardPage() {
  const session = useSession();
  const router = useRouter();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'materials' | 'publish' | 'roles' | 'settings'>('materials');

  // Materials state
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [filterModule, setFilterModule] = useState<'ALL' | ModuleName>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload Form state
  const [title, setTitle] = useState('');
  const [moduleName, setModuleName] = useState<ModuleName>('URS');
  const [type, setType] = useState<MaterialCategory>('lec_pdf');
  const [format, setFormat] = useState<MaterialFormat>('external_link');
  const [externalUrl, setExternalUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [publishStatus, setPublishStatus] = useState<Status>({ loading: false, message: '', type: '' });

  // Edit Material Modal state
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editStatus, setEditStatus] = useState<Status>({ loading: false, message: '', type: '' });

  // Roles state
  const [userRolesMap, setUserRolesMap] = useState<Record<string, UserRole>>({});
  const [newRoleEmail, setNewRoleEmail] = useState('');
  const [newRoleChoice, setNewRoleChoice] = useState<UserRole>('editor');

  // Platform settings state
  const [settings, setSettings] = useState<PlatformSettings>(getPlatformSettings());
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Role simulation for admin preview
  const currentUserEmail = session?.user?.email ?? '';
  const currentRole = getUserRole(currentUserEmail);
  const userIsSuperAdmin = isSuperAdmin(currentUserEmail);

  // Redirect if not signed in or not allowed
  useEffect(() => {
    if (session === null) {
      router.replace('/sign-in?redirect=%2Fadmin');
    }
  }, [session, router]);

  // Load materials from Supabase
  const loadMaterials = async () => {
    setMaterialsLoading(true);
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('title', { ascending: true })
        .returns<Material[]>();
      if (!error && data) {
        setMaterials(data);
      }
    } catch (err) {
      console.error('Error fetching materials:', err);
    } finally {
      setMaterialsLoading(false);
    }
  };

  useEffect(() => {
    if (session && canAccessAdmin(session.user.email)) {
      loadMaterials();
      setUserRolesMap(getStoredUserRoles());
      setSettings(getPlatformSettings());
    }
  }, [session]);

  // Handle Material Upload
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishStatus({ loading: true, message: 'Processing upload...', type: 'info' });

    let uploadedPath: string | null = null;
    try {
      let finalFileUrl = externalUrl.trim();
      let source: MaterialSource | null = detectSource(finalFileUrl);

      if (format !== 'external_link') {
        if (!file) throw new Error('Please choose a file to upload.');

        const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
        const filePath = `${moduleName.toLowerCase()}/${Date.now()}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('materials')
          .upload(filePath, file, { contentType: file.type || undefined, upsert: false });
        if (uploadError) throw uploadError;
        uploadedPath = filePath;

        const { data } = supabase.storage.from('materials').getPublicUrl(filePath);
        finalFileUrl = data.publicUrl;
        source = 'supabase';
      }

      if (!finalFileUrl) throw new Error('Please provide a file or an external URL.');

      const newRecord = {
        title: title.trim(),
        module: moduleName,
        type,
        format,
        source_type: source,
        file_url: finalFileUrl,
        author_email: currentUserEmail,
      };

      const { error: dbError } = await supabase.from('materials').insert([newRecord]);
      if (dbError) throw dbError;

      setPublishStatus({
        loading: false,
        message: `"${title.trim()}" published successfully to ${MODULE_TITLES[moduleName]}!`,
        type: 'success',
      });
      setTitle('');
      setExternalUrl('');
      setFile(null);
      setFileInputKey((k) => k + 1);
      loadMaterials();
    } catch (err: unknown) {
      if (uploadedPath) await supabase.storage.from('materials').remove([uploadedPath]);
      console.error(err);
      const message = err instanceof Error ? err.message : 'An error occurred during upload.';
      setPublishStatus({ loading: false, message, type: 'error' });
    }
  };

  // Handle Material Update
  const handleUpdateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;

    setEditStatus({ loading: true, message: 'Saving changes...', type: 'info' });
    try {
      const source = detectSource(editingMaterial.file_url) || editingMaterial.source_type;
      const { error } = await supabase
        .from('materials')
        .update({
          title: editingMaterial.title.trim(),
          module: editingMaterial.module,
          type: editingMaterial.type,
          format: editingMaterial.format,
          source_type: source,
          file_url: editingMaterial.file_url.trim(),
        })
        .eq('id', editingMaterial.id);

      if (error) throw error;

      setEditStatus({ loading: false, message: 'Updated successfully!', type: 'success' });
      setTimeout(() => {
        setEditingMaterial(null);
        setEditStatus({ loading: false, message: '', type: '' });
      }, 1000);
      loadMaterials();
    } catch (err: any) {
      setEditStatus({ loading: false, message: err?.message || 'Failed to update material', type: 'error' });
    }
  };

  // Handle Material Deletion (Super Admin only)
  const handleDeleteMaterial = async (id: string, itemTitle: string) => {
    if (!canDeleteMaterials(currentUserEmail)) {
      alert('Access Restricted: Only Super Admins are authorized to delete materials.');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete "${itemTitle}"?`)) return;

    try {
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) throw error;
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      alert(`Deletion failed: ${err?.message || 'Unknown error'}`);
    }
  };

  // Handle Role Assignment
  const handleAssignRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleEmail.trim()) return;
    setUserRole(newRoleEmail.trim(), newRoleChoice);
    setUserRolesMap(getStoredUserRoles());
    setNewRoleEmail('');
  };

  // Handle Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    savePlatformSettings(settings);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchesMod = filterModule === 'ALL' || m.module === filterModule;
      const matchesSearch =
        searchQuery === '' ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        MATERIAL_TYPE_LABELS[m.type]?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesMod && matchesSearch;
    });
  }, [materials, filterModule, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: materials.length,
      cns: materials.filter((m) => m.module === 'CNS').length,
      urs: materials.filter((m) => m.module === 'URS').length,
      rep: materials.filter((m) => m.module === 'REP').length,
    };
  }, [materials]);

  if (!session) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
          <span>Verifying authentication and role permissions…</span>
        </div>
      </main>
    );
  }

  if (!canAccessAdmin(currentUserEmail)) {
    return (
      <main className="p-6 md:p-12">
        <div className={`${cardClass} mx-auto max-w-xl p-8 text-center`}>
          <ShieldAlert className="mx-auto h-12 w-12 text-rose-500" />
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">
            Access Restricted
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Your account (<strong className="text-slate-900 dark:text-white">{currentUserEmail}</strong>) does not have staff or administrator privileges. Only registered <strong>Super Admins</strong> and <strong>Editors</strong> can access the content management system.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700"
            >
              Return to Student Portal
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top Identity & RBAC Header */}
        <div className={`${cardClass} p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl`}>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500 text-slate-950 shadow-md">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="text-2xl font-black tracking-tight">
                    MedAtlas Egypt: Micro 301 Content Studio
                  </h1>
                  <p className="text-xs text-slate-300">
                    Medical Education &amp; Course Materials Management Portal
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-white/10 bg-white/10 px-3.5 py-1.5 backdrop-blur-sm">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Role: </span>
                <span className={`font-mono text-xs font-bold uppercase ${
                  userIsSuperAdmin ? 'text-amber-400' : 'text-cyan-300'
                }`}>
                  {currentRole.replace('_', ' ')}
                </span>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/10 px-3.5 py-1.5 backdrop-blur-sm">
                <span className="text-[11px] text-slate-400">User: </span>
                <span className="text-xs font-medium text-slate-200">{currentUserEmail}</span>
              </div>

              <Link
                href="/"
                className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 shadow hover:bg-cyan-400 transition"
              >
                View Portal <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-white/10 pt-4">
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-[11px] font-semibold text-slate-400">Total Materials</p>
              <p className="text-2xl font-black text-white">{stats.total}</p>
            </div>
            <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-3">
              <p className="text-[11px] font-semibold text-cyan-300">Urinary System (URS)</p>
              <p className="text-2xl font-black text-cyan-300">{stats.urs}</p>
            </div>
            <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-3">
              <p className="text-[11px] font-semibold text-violet-300">CNS Module</p>
              <p className="text-2xl font-black text-violet-300">{stats.cns}</p>
            </div>
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3">
              <p className="text-[11px] font-semibold text-rose-300">REP Module</p>
              <p className="text-2xl font-black text-rose-300">{stats.rep}</p>
            </div>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('materials')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'materials'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <Layers className="h-4 w-4" />
            Materials Management ({materials.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('publish')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'publish'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            Publish &amp; Upload
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'roles'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <Users className="h-4 w-4" />
            RBAC Roles &amp; Permissions
            {!userIsSuperAdmin && <Lock className="h-3 w-3 text-amber-500" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <Settings className="h-4 w-4" />
            Platform &amp; Marketing Settings
            {!userIsSuperAdmin && <Lock className="h-3 w-3 text-amber-500" />}
          </button>
        </div>

        {/* TAB 1: Materials Management Table / CMS */}
        {activeTab === 'materials' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Filter Module:</span>
                {(['ALL', 'URS', 'CNS', 'REP'] as const).map((mod) => (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => setFilterModule(mod)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      filterModule === mod
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {mod === 'ALL' ? 'All Modules' : `${mod} (${MODULE_TITLES[mod]})`}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search materials by title or category..."
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-64"
                  />
                </div>
                <button
                  type="button"
                  onClick={loadMaterials}
                  title="Refresh materials list"
                  className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <RefreshCw className={`h-4 w-4 ${materialsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Materials Table */}
            <div className={`${cardClass} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-slate-900">
                    <tr>
                      <th className="px-5 py-3.5">Title &amp; Resource</th>
                      <th className="px-4 py-3.5">Module</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5">Format / Source</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                    {filteredMaterials.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                          {materialsLoading ? 'Loading materials...' : 'No course materials match your filter.'}
                        </td>
                      </tr>
                    ) : (
                      filteredMaterials.map((mat) => (
                        <tr key={mat.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {mat.title}
                            </div>
                            <span className="font-mono text-[10px] text-slate-400 truncate max-w-xs block">
                              {mat.file_url}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                mat.module === 'URS'
                                  ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                                  : mat.module === 'CNS'
                                  ? 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {mat.module} · {MODULE_TITLES[mat.module]}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {MATERIAL_TYPE_LABELS[mat.type] ?? mat.type}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {mat.format === 'audio' ? (
                                <Volume2 className="h-3.5 w-3.5 text-indigo-500" />
                              ) : mat.format === 'pdf' ? (
                                <FileText className="h-3.5 w-3.5 text-rose-500" />
                              ) : (
                                <Globe className="h-3.5 w-3.5 text-blue-500" />
                              )}
                              <span className="capitalize">{mat.format ?? 'link'}</span>
                              {mat.source_type && (
                                <span className="text-[10px] text-slate-400">({mat.source_type})</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href={mat.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open resource"
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>

                              {/* Edit Button (Available to Super Admin and Editor) */}
                              <button
                                type="button"
                                onClick={() => setEditingMaterial(mat)}
                                title="Edit material details"
                                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                Edit
                              </button>

                              {/* Delete Button (Enforced: Super Admin only) */}
                              {userIsSuperAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMaterial(mat.id, mat.title)}
                                  title="Delete material"
                                  className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/60"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              ) : (
                                <span
                                  title="Destructive deletion requires Super Admin privileges"
                                  className="flex cursor-not-allowed items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-400 dark:border-white/5 dark:bg-slate-800/50"
                                >
                                  <Lock className="h-3 w-3" />
                                  Delete
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Publish & Upload Center */}
        {activeTab === 'publish' && (
          <div className={`${cardClass} max-w-3xl mx-auto p-8`}>
            <div className="mb-6 border-b border-slate-200 pb-4 dark:border-white/10">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Publish Course Material
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Authorized for Super Admins and Editors. Resources will instantly appear in the corresponding student module portal.
              </p>
            </div>

            {publishStatus.message && (
              <div
                className={`mb-6 rounded-xl border p-4 text-xs font-semibold ${
                  publishStatus.type === 'success'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : publishStatus.type === 'error'
                    ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-300'
                    : 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-300'
                }`}
              >
                {publishStatus.message}
              </div>
            )}

            <form onSubmit={handlePublish} className="space-y-5">
              <div>
                <label className={labelClass}>Material Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Urinary System Lec 1: Acute Pyelonephritis"
                  className={inputClass}
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Tip: Multiple records with the same title (e.g. PDF + G1 Audio + G2 Audio) automatically group on the module cards.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Target Module</label>
                  <select
                    value={moduleName}
                    onChange={(e) => setModuleName(e.target.value as ModuleName)}
                    className={inputClass}
                  >
                    {MODULE_NAMES.map((m) => (
                      <option key={m} value={m}>
                        {m} — {MODULE_TITLES[m]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Category</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as MaterialCategory)}
                    className={inputClass}
                  >
                    <optgroup label="Theory & Lectures">{categoryOptions(THEORY_TYPES)}</optgroup>
                    <optgroup label="Practicals & OSPE">{categoryOptions(PRACTICAL_TYPES)}</optgroup>
                    <optgroup label="Exam Vault">{categoryOptions(EXAM_TYPES)}</optgroup>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Material Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as MaterialFormat)}
                  className={inputClass}
                >
                  <option value="external_link">External Link (Google Drive / Telegram / Web)</option>
                  <option value="pdf">Direct PDF File Upload</option>
                  <option value="audio">Direct Audio Recording (.mp3 / .m4a)</option>
                </select>
              </div>

              {format === 'external_link' ? (
                <div>
                  <label className={labelClass}>External URL</label>
                  <input
                    type="url"
                    required
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://drive.google.com/... or https://t.me/..."
                    className={inputClass}
                  />
                </div>
              ) : (
                <div>
                  <label className={labelClass}>Upload File to Storage</label>
                  <input
                    key={fileInputKey}
                    type="file"
                    required
                    accept={format === 'audio' ? 'audio/*' : '.pdf'}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2.5 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-700"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={publishStatus.loading}
                className="w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 disabled:opacity-50"
              >
                {publishStatus.loading ? 'Uploading & Registering...' : 'Publish Course Material'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: RBAC Roles & Permissions (Super Admin only) */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            {!userIsSuperAdmin ? (
              <div className={`${cardClass} p-8 text-center`}>
                <Lock className="mx-auto h-12 w-12 text-amber-500" />
                <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
                  Super Admin Permission Required
                </h3>
                <p className="mt-1 max-w-md mx-auto text-xs text-slate-500 dark:text-slate-400">
                  You are signed in as an <strong>Editor</strong>. Role assignment and user privilege management are restricted to Super Administrators.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                {/* Left: Assign New Role */}
                <div className={`${cardClass} p-6 md:col-span-1`}>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Assign User Role
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Grant administrative or editor credentials to department doctors and teaching staff.
                  </p>

                  <form onSubmit={handleAssignRole} className="mt-4 space-y-4">
                    <div>
                      <label className={labelClass}>User Email</label>
                      <input
                        type="email"
                        required
                        value={newRoleEmail}
                        onChange={(e) => setNewRoleEmail(e.target.value)}
                        placeholder="doctor@must.edu.eg"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Assigned Role</label>
                      <select
                        value={newRoleChoice}
                        onChange={(e) => setNewRoleChoice(e.target.value as UserRole)}
                        className={inputClass}
                      >
                        <option value="super_admin">Super Admin (Full Platform Control)</option>
                        <option value="editor">Editor (Upload &amp; Content Management)</option>
                        <option value="student">Student (Standard Learner Access)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700"
                    >
                      Save Role Assignment
                    </button>
                  </form>
                </div>

                {/* Right: Active Roles & Matrix */}
                <div className={`${cardClass} p-6 md:col-span-2 space-y-5`}>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Current Configured Roles
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:border-white/10 dark:bg-slate-900">
                        <tr>
                          <th className="px-4 py-2.5">User Account</th>
                          <th className="px-4 py-2.5">Role</th>
                          <th className="px-4 py-2.5">Permissions</th>
                          <th className="px-4 py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                        {Object.entries(userRolesMap).map(([email, role]) => (
                          <tr key={email} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                              {email}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  role === 'super_admin'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : role === 'editor'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-cyan-300'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                {role.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[11px] text-slate-500">
                              {role === 'super_admin'
                                ? 'Full control, delete, settings, roles'
                                : role === 'editor'
                                ? 'Publish & edit content'
                                : 'Read portal access'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {email !== currentUserEmail && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next: UserRole =
                                      role === 'super_admin' ? 'editor' : role === 'editor' ? 'student' : 'editor';
                                    setUserRole(email, next);
                                    setUserRolesMap(getStoredUserRoles());
                                  }}
                                  className="text-[11px] text-blue-600 hover:underline dark:text-cyan-300"
                                >
                                  Cycle Role
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Permissions Explainer */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-white/10 dark:bg-slate-800/40">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                      Role Privileges Matrix:
                    </h4>
                    <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                      <li>
                        <strong className="text-amber-600 dark:text-amber-400">Super Admin:</strong>{' '}
                        Publish materials, edit materials, permanently delete materials, assign user roles, manage platform settings.
                      </li>
                      <li>
                        <strong className="text-blue-600 dark:text-cyan-400">Editor:</strong>{' '}
                        Publish new lectures/practicals/exams and edit material titles/links. Destructive deletion is blocked.
                      </li>
                      <li>
                        <strong className="text-slate-600 dark:text-slate-400">Student:</strong>{' '}
                        Authenticated access to view lectures, download PDFs, listen to G1/G2 audio records, and practice with AI case studies.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Platform & Marketing Settings (Super Admin only) */}
        {activeTab === 'settings' && (
          <div className={`${cardClass} max-w-2xl mx-auto p-8`}>
            {!userIsSuperAdmin ? (
              <div className="text-center py-6">
                <Lock className="mx-auto h-12 w-12 text-amber-500" />
                <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
                  Super Admin Permission Required
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Settings modification is restricted to Super Administrators.
                </p>
              </div>
            ) : (
              <div>
                <div className="border-b border-slate-200 pb-4 dark:border-white/10 mb-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Platform &amp; Marketing Settings
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Control global announcements, WhatsApp support link, and partnership campaigns.
                  </p>
                </div>

                {settingsSaved && (
                  <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Platform settings updated successfully!
                  </div>
                )}

                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div>
                    <label className={labelClass}>Site Platform Title</label>
                    <input
                      type="text"
                      value={settings.siteName}
                      onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Student Announcement Banner Text</label>
                    <textarea
                      rows={2}
                      value={settings.announcement}
                      onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="showAnnouncement"
                      checked={settings.showAnnouncement}
                      onChange={(e) => setSettings({ ...settings, showAnnouncement: e.target.checked })}
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="showAnnouncement" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Display announcement banner on top of portal
                    </label>
                  </div>

                  <div>
                    <label className={labelClass}>Official WhatsApp Support Number (Digits with Country Code)</label>
                    <input
                      type="text"
                      value={settings.supportWhatsApp}
                      onChange={(e) => setSettings({ ...settings, supportWhatsApp: e.target.value })}
                      placeholder="201000000000"
                      className={inputClass}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="allowRegistrations"
                      checked={settings.allowRegistrations}
                      onChange={(e) => setSettings({ ...settings, allowRegistrations: e.target.checked })}
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="allowRegistrations" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Allow open student registrations via Sign-up page
                    </label>
                  </div>

                  <div className="border-t border-slate-200 pt-4 dark:border-white/10">
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow hover:bg-blue-700"
                    >
                      Save Settings
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Edit Modal (if editing a material) */}
        {editingMaterial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className={`${cardClass} max-w-lg w-full p-6 shadow-2xl`}>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/10">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Edit Course Material
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingMaterial(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              {editStatus.message && (
                <div
                  className={`mt-4 rounded-lg p-2.5 text-xs font-semibold ${
                    editStatus.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800'
                      : editStatus.type === 'error'
                      ? 'bg-red-50 text-red-800'
                      : 'bg-blue-50 text-blue-800'
                  }`}
                >
                  {editStatus.message}
                </div>
              )}

              <form onSubmit={handleUpdateMaterial} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className={labelClass}>Title</label>
                  <input
                    type="text"
                    required
                    value={editingMaterial.title}
                    onChange={(e) =>
                      setEditingMaterial({ ...editingMaterial, title: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Module</label>
                    <select
                      value={editingMaterial.module}
                      onChange={(e) =>
                        setEditingMaterial({ ...editingMaterial, module: e.target.value as ModuleName })
                      }
                      className={inputClass}
                    >
                      {MODULE_NAMES.map((m) => (
                        <option key={m} value={m}>
                          {m} — {MODULE_TITLES[m]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Category</label>
                    <select
                      value={editingMaterial.type}
                      onChange={(e) =>
                        setEditingMaterial({
                          ...editingMaterial,
                          type: e.target.value as MaterialCategory,
                        })
                      }
                      className={inputClass}
                    >
                      <optgroup label="Theory & Lectures">{categoryOptions(THEORY_TYPES)}</optgroup>
                      <optgroup label="Practicals & OSPE">{categoryOptions(PRACTICAL_TYPES)}</optgroup>
                      <optgroup label="Exam Vault">{categoryOptions(EXAM_TYPES)}</optgroup>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Format</label>
                  <select
                    value={editingMaterial.format ?? 'external_link'}
                    onChange={(e) =>
                      setEditingMaterial({
                        ...editingMaterial,
                        format: e.target.value as MaterialFormat,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="external_link">External Link</option>
                    <option value="pdf">PDF File</option>
                    <option value="audio">Audio Recording</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Resource File URL</label>
                  <input
                    type="text"
                    required
                    value={editingMaterial.file_url}
                    onChange={(e) =>
                      setEditingMaterial({ ...editingMaterial, file_url: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingMaterial(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editStatus.loading}
                    className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50"
                  >
                    {editStatus.loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
