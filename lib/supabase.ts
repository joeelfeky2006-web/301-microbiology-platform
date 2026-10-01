import { createClient } from '@supabase/supabase-js';
import type { Material } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isConfigured =
  typeof supabaseUrl === 'string' &&
  supabaseUrl.startsWith('http') &&
  typeof supabaseAnonKey === 'string' &&
  supabaseAnonKey.trim().length > 10;

// High-yield seed data for MUST 301 Microbiology
const INITIAL_MATERIALS: Material[] = [
  // CNS Module
  {
    id: 'cns-mat-1',
    module: 'CNS',
    type: 'lec_pdf',
    title: 'CNS Lec 1: Acute Bacterial & Viral Meningitis',
    file_url: 'https://drive.google.com/file/d/demo-cns-lec1/view',
    format: 'pdf',
    source_type: 'drive',
    created_at: '2026-09-10T10:00:00Z',
  },
  {
    id: 'cns-mat-2',
    module: 'CNS',
    type: 'record_g1',
    title: 'CNS Lec 1: Acute Bacterial & Viral Meningitis',
    file_url: 'https://example.com/audio/cns_lec1_g1.mp3',
    format: 'audio',
    source_type: 'drive',
    created_at: '2026-09-10T12:00:00Z',
  },
  {
    id: 'cns-mat-3',
    module: 'CNS',
    type: 'record_g2',
    title: 'CNS Lec 1: Acute Bacterial & Viral Meningitis',
    file_url: 'https://example.com/audio/cns_lec1_g2.mp3',
    format: 'audio',
    source_type: 'drive',
    created_at: '2026-09-10T14:00:00Z',
  },
  {
    id: 'cns-mat-4',
    module: 'CNS',
    type: 'lec_pdf',
    title: 'CNS Lec 2: Chronic Meningitis & Brain Abscess',
    file_url: 'https://drive.google.com/file/d/demo-cns-lec2/view',
    format: 'pdf',
    source_type: 'drive',
    created_at: '2026-09-14T10:00:00Z',
  },
  {
    id: 'cns-mat-5',
    module: 'CNS',
    type: 'practical_pdf',
    title: 'CNS Practical: CSF Examination, Gram Stain & OSPE Slides',
    file_url: 'https://drive.google.com/file/d/demo-cns-prac/view',
    format: 'pdf',
    source_type: 'drive',
    created_at: '2026-09-18T09:00:00Z',
  },
  {
    id: 'cns-mat-6',
    module: 'CNS',
    type: 'ospe_simulation',
    title: 'CNS Practical: CSF Examination, Gram Stain & OSPE Slides',
    file_url: 'https://t.me/micro301_must',
    format: 'external_link',
    source_type: 'telegram',
    created_at: '2026-09-18T11:00:00Z',
  },
  {
    id: 'cns-mat-7',
    module: 'CNS',
    type: 'midterm_qs',
    title: 'CNS Midterm Vault: High-Yield Questions & Case Vignettes',
    file_url: 'https://drive.google.com/file/d/demo-cns-midterm/view',
    format: 'pdf',
    source_type: 'drive',
    created_at: '2026-09-22T15:00:00Z',
  },

  // Urinary System (URS) Module
  {
    id: 'urs-mat-1',
    module: 'URS',
    type: 'lec_pdf',
    title: 'Urinary System Lec 1: Urinary Tract Infections (UTI & Pyelonephritis)',
    file_url: 'https://drive.google.com/file/d/demo-urs-lec1/view',
    format: 'pdf',
    source_type: 'drive',
    created_at: '2026-09-12T10:00:00Z',
  },
  {
    id: 'urs-mat-2',
    module: 'URS',
    type: 'record_g1',
    title: 'Urinary System Lec 1: Urinary Tract Infections (UTI & Pyelonephritis)',
    file_url: 'https://example.com/audio/urs_lec1_g1.mp3',
    format: 'audio',
    source_type: 'drive',
    created_at: '2026-09-12T12:00:00Z',
  },
  {
    id: 'urs-mat-3',
    module: 'URS',
    type: 'lec_pdf',
    title: 'Urinary System Lec 2: Glomerulonephritis & Post-Streptococcal Sequelae',
    file_url: 'https://drive.google.com/file/d/demo-urs-lec2/view',
    format: 'pdf',
    source_type: 'drive',
    created_at: '2026-09-16T10:00:00Z',
  },
  {
    id: 'urs-mat-4',
    module: 'URS',
    type: 'practical_pdf',
    title: 'Urinary System Practical: Urine Culture & Antibiotic Sensitivity (AST)',
    file_url: 'https://drive.google.com/file/d/demo-urs-prac/view',
    format: 'pdf',
    source_type: 'drive',
    created_at: '2026-09-20T09:00:00Z',
  },
  {
    id: 'urs-mat-5',
    module: 'URS',
    type: 'final_study',
    title: 'Urinary System Final Vault: High-Yield Nephropathogen Summary',
    file_url: 'https://drive.google.com/file/d/demo-urs-final/view',
    format: 'pdf',
    source_type: 'drive',
    created_at: '2026-09-24T15:00:00Z',
  },

  // REP Module
  {
    id: 'rep-mat-1',
    module: 'REP',
    type: 'lec_pdf',
    title: 'REP Lec 1: Sexually Transmitted Infections (Syphilis & Gonorrhea)',
    file_url: 'https://drive.google.com/file/d/demo-rep-lec1/view',
    format: 'pdf',
    source_type: 'drive',
    created_at: '2026-09-15T10:00:00Z',
  },
  {
    id: 'rep-mat-2',
    module: 'REP',
    type: 'record_g1',
    title: 'REP Lec 1: Sexually Transmitted Infections (Syphilis & Gonorrhea)',
    file_url: 'https://example.com/audio/rep_lec1_g1.mp3',
    format: 'audio',
    source_type: 'drive',
    created_at: '2026-09-15T12:00:00Z',
  },
  {
    id: 'rep-mat-3',
    module: 'REP',
    type: 'practical_pdf',
    title: 'REP Practical: Genital Swab Microscopy & Wet Mounts',
    file_url: 'https://drive.google.com/file/d/demo-rep-prac/view',
    format: 'pdf',
    source_type: 'drive',
    created_at: '2026-09-21T09:00:00Z',
  },
  {
    id: 'rep-mat-4',
    module: 'REP',
    type: 'midterm_study',
    title: 'REP Midterm Vault: High-Yield Topics & Flash Review',
    file_url: 'https://drive.google.com/file/d/demo-rep-midterm/view',
    format: 'pdf',
    source_type: 'drive',
    created_at: '2026-09-25T15:00:00Z',
  },
];

export interface QueryBuilder<T = any> {
  eq: (col: string, val: any) => QueryBuilder<T>;
  order: (col: string, opts?: { ascending?: boolean }) => QueryBuilder<T>;
  returns: <R = T>() => Promise<{ data: R | null; error: any }>;
  then: <TResult1 = { data: T | null; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: T | null; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ) => Promise<TResult1 | TResult2>;
}

export interface MutationBuilder<T = any> {
  eq: (col: string, val: any) => MutationBuilder<T>;
  then: <TResult1 = { data: T | null; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: T | null; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ) => Promise<TResult1 | TResult2>;
}

export interface AppSupabaseClient {
  auth: {
    getSession: () => Promise<{ data: { session: any }; error: any }>;
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      data: { subscription: { unsubscribe: () => void } };
    };
    signUp: (args: {
      email: string;
      password: string;
      options?: { data?: Record<string, any>; emailRedirectTo?: string };
    }) => Promise<{ data: { user: any; session: any }; error: any }>;
    signInWithPassword: (args: {
      email: string;
      password: string;
    }) => Promise<{ data: { user: any; session: any }; error: any }>;
    signOut: () => Promise<{ error: any }>;
  };
  from: (table: string) => {
    select: (cols?: string) => QueryBuilder;
    insert: (rows: any[]) => Promise<{ data: any; error: any }>;
    update: (updates: any) => MutationBuilder;
    delete: () => MutationBuilder;
  };
  storage: {
    from: (bucket: string) => {
      upload: (
        filePath: string,
        file: File,
        options?: any
      ) => Promise<{ data: { path: string } | null; error: any }>;
      getPublicUrl: (filePath: string) => { data: { publicUrl: string } };
      remove: (paths: string[]) => Promise<{ data: any; error: any }>;
    };
  };
}

function createFallbackClient(): AppSupabaseClient {
  const authListeners = new Set<(event: string, session: any) => void>();
  const uploadedFiles = new Map<string, string>();

  function getStoredSession() {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('micro_atlas_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  function setStoredSession(session: any) {
    if (typeof window === 'undefined') return;
    try {
      if (session) {
        localStorage.setItem('micro_atlas_session', JSON.stringify(session));
      } else {
        localStorage.removeItem('micro_atlas_session');
      }
    } catch {
      // storage unavailable
    }
    authListeners.forEach((fn) => {
      try {
        fn(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
      } catch (err) {
        console.error(err);
      }
    });
  }

  function getStoredMaterials(): Material[] {
    if (typeof window === 'undefined') return INITIAL_MATERIALS;
    try {
      const saved = localStorage.getItem('micro_atlas_materials');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      localStorage.setItem('micro_atlas_materials', JSON.stringify(INITIAL_MATERIALS));
      return INITIAL_MATERIALS;
    } catch {
      return INITIAL_MATERIALS;
    }
  }

  function saveStoredMaterials(materials: Material[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('micro_atlas_materials', JSON.stringify(materials));
      window.dispatchEvent(new Event('materials_updated'));
    } catch {
      // storage unavailable
    }
  }

  return {
    auth: {
      getSession: async () => {
        return { data: { session: getStoredSession() }, error: null };
      },
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        authListeners.add(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                authListeners.delete(callback);
              },
            },
          },
        };
      },
      signUp: async ({
        email,
        password,
        options,
      }: {
        email: string;
        password: string;
        options?: { data?: Record<string, any>; emailRedirectTo?: string };
      }) => {
        const user = {
          id: 'user_' + Math.random().toString(36).slice(2, 10),
          email,
          user_metadata: options?.data || { name: email.split('@')[0], group_section: 'G1' },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          identities: [{ id: email }],
        };
        const session = {
          access_token: 'mock_token_' + Date.now(),
          refresh_token: 'mock_refresh_' + Date.now(),
          expires_in: 3600,
          token_type: 'bearer',
          user,
        };
        setStoredSession(session);
        return { data: { user, session }, error: null };
      },
      signInWithPassword: async ({ email }: { email: string; password: string }) => {
        const user = {
          id: 'user_' + (email.replace(/[^a-zA-Z0-9]/g, '_') || 'demo'),
          email,
          user_metadata: { name: email.split('@')[0], group_section: 'G1' },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          identities: [{ id: email }],
        };
        const session = {
          access_token: 'mock_token_' + Date.now(),
          refresh_token: 'mock_refresh_' + Date.now(),
          expires_in: 3600,
          token_type: 'bearer',
          user,
        };
        setStoredSession(session);
        return { data: { user, session }, error: null };
      },
      signOut: async () => {
        setStoredSession(null);
        return { error: null };
      },
    },
    from: (_table: string) => {
      return {
        select: (_cols = '*') => {
          let targetModule: string | null = null;
          let ascending = true;

          const queryBuilder: QueryBuilder = {
            eq: (col: string, val: string) => {
              if (col === 'module') targetModule = val;
              return queryBuilder;
            },
            order: (_col: string, opts?: { ascending?: boolean }) => {
              if (opts && typeof opts.ascending === 'boolean') {
                ascending = opts.ascending;
              }
              return queryBuilder;
            },
            returns: async <T>() => {
              let items = getStoredMaterials();
              if (targetModule) {
                items = items.filter((m) => m.module === targetModule);
              }
              items = [...items].sort((a, b) => {
                const cmp = a.title.localeCompare(b.title);
                return ascending ? cmp : -cmp;
              });
              return { data: items as unknown as T, error: null };
            },
            then: (resolve: any, reject: any) => {
              return queryBuilder.returns().then(resolve, reject);
            },
          };

          return queryBuilder;
        },
        insert: async (rows: any[]) => {
          const items = getStoredMaterials();
          const newEntries: Material[] = rows.map((r, idx) => ({
            id: 'mat_' + Date.now() + '_' + idx,
            created_at: new Date().toISOString(),
            ...r,
          }));
          const updated = [...items, ...newEntries];
          saveStoredMaterials(updated);
          return { data: newEntries, error: null };
        },
        update: (updates: any) => {
          let filterCol: string = 'id';
          let filterVal: any = null;

          const mutationBuilder: MutationBuilder = {
            eq: (col: string, val: any) => {
              filterCol = col;
              filterVal = val;
              return mutationBuilder;
            },
            then: async (resolve: any, reject: any) => {
              try {
                const items = getStoredMaterials();
                const idx = items.findIndex((m: any) => m[filterCol] === filterVal);
                if (idx !== -1) {
                  items[idx] = {
                    ...items[idx],
                    ...updates,
                    updated_at: new Date().toISOString(),
                  };
                  saveStoredMaterials(items);
                  return resolve({ data: items[idx], error: null });
                }
                return resolve({ data: null, error: new Error('Record not found') });
              } catch (err) {
                if (reject) reject(err);
                else resolve({ data: null, error: err });
              }
            },
          };

          return mutationBuilder;
        },
        delete: () => {
          let filterCol: string = 'id';
          let filterVal: any = null;

          const mutationBuilder: MutationBuilder = {
            eq: (col: string, val: any) => {
              filterCol = col;
              filterVal = val;
              return mutationBuilder;
            },
            then: async (resolve: any, reject: any) => {
              try {
                let items = getStoredMaterials();
                const countBefore = items.length;
                items = items.filter((m: any) => m[filterCol] !== filterVal);
                saveStoredMaterials(items);
                return resolve({
                  data: { count: countBefore - items.length },
                  error: null,
                });
              } catch (err) {
                if (reject) reject(err);
                else resolve({ data: null, error: err });
              }
            },
          };

          return mutationBuilder;
        },
      };
    },
    storage: {
      from: (bucket: string) => ({
        upload: async (filePath: string, file: File, _options?: any) => {
          let url = `https://storage.microatlas.must.edu.eg/${bucket}/${filePath}`;
          if (typeof window !== 'undefined' && window.URL && window.URL.createObjectURL) {
            try {
              url = window.URL.createObjectURL(file);
            } catch {
              // fallback url
            }
          }
          uploadedFiles.set(filePath, url);
          return { data: { path: filePath }, error: null };
        },
        getPublicUrl: (filePath: string) => {
          const url =
            uploadedFiles.get(filePath) ||
            `https://storage.microatlas.must.edu.eg/${bucket}/${filePath}`;
          return { data: { publicUrl: url } };
        },
        remove: async (paths: string[]) => {
          paths.forEach((p) => uploadedFiles.delete(p));
          return { data: paths, error: null };
        },
      }),
    },
  };
}

export const supabase: AppSupabaseClient = isConfigured
  ? (createClient(supabaseUrl!, supabaseAnonKey!) as unknown as AppSupabaseClient)
  : createFallbackClient();
