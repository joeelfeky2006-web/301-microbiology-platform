import { createClient } from '@supabase/supabase-js';
import type { Material } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isConfigured =
  typeof supabaseUrl === 'string' &&
  supabaseUrl.startsWith('http') &&
  typeof supabaseAnonKey === 'string' &&
  supabaseAnonKey.trim().length > 10;

if (!isConfigured && (process.env.NODE_ENV === 'production' || process.env.VERCEL)) {
  throw new Error('Supabase environment variables are required in production. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

/** Standard RFC4122 UUID v4 generator for both browser and Node runtimes */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// High-yield seed data for MUST 301 Microbiology using valid UUIDs (Only active modules)
export const INITIAL_MATERIALS: Material[] = [
  // URS (Urinary System) Module - Active Uploaded Materials
  {
    id: '22222222-urs1-4000-8000-000000000001',
    module: 'URS',
    type: 'lec_pdf',
    title: 'URS Lec 1: Community & Hospital-Acquired UTIs',
    file_url: 'https://drive.google.com/file/d/demo-urs-lec1/view',
    format: 'pdf',
    source_type: 'drive',
    created_at: '2026-09-11T10:00:00Z',
  },
  {
    id: '22222222-urs1-4000-8000-000000000002',
    module: 'URS',
    type: 'record_g1',
    title: 'URS Lec 1: Community & Hospital-Acquired UTIs',
    file_url: 'https://example.com/audio/urs_lec1_g1.mp3',
    format: 'audio',
    source_type: 'drive',
    created_at: '2026-09-11T12:00:00Z',
  },
  {
    id: '22222222-urs1-4000-8000-000000000003',
    module: 'URS',
    type: 'record_g2',
    title: 'URS Lec 1: Community & Hospital-Acquired UTIs',
    file_url: 'https://example.com/audio/urs_lec1_g2.mp3',
    format: 'audio',
    source_type: 'drive',
    created_at: '2026-09-11T14:00:00Z',
  },
  {
    id: '22222222-urs1-4000-8000-000000000004',
    module: 'URS',
    type: 'practical_pdf',
    title: 'URS Practical: Urine Culture, Colony Count & Antibiotic Sensitivity (AST)',
    file_url: 'https://drive.google.com/file/d/demo-urs-prac/view',
    format: 'pdf',
    source_type: 'drive',
    created_at: '2026-09-19T09:00:00Z',
  },
  {
    id: '22222222-urs1-4000-8000-000000000005',
    module: 'URS',
    type: 'midterm_study',
    title: 'URS OSPE & Midterm High-Yield Flash Cards',
    file_url: 'https://drive.google.com/file/d/demo-urs-midterm/view',
    format: 'pdf',
    source_type: 'drive',
    created_at: '2026-09-24T11:00:00Z',
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
    resend: (args: { type: 'signup'; email: string }) => Promise<{ data: any; error: any }>;
    resetPasswordForEmail: (email: string, options?: { redirectTo?: string }) => Promise<{ data: any; error: any }>;
    updateUser: (attributes: { password?: string }) => Promise<{ data: any; error: any }>;
  };
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
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
  const ACCOUNTS_STORAGE_KEY = 'micro_atlas_mock_accounts';

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

  function getStoredAccounts(): Record<string, { passwordHash: string; data: any }> {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }

  function saveStoredAccount(email: string, pass: string, data: any) {
    if (typeof window === 'undefined') return;
    try {
      const accounts = getStoredAccounts();
      accounts[email.toLowerCase().trim()] = { passwordHash: pass, data };
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    } catch {
      // ignore
    }
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
        if (!password || password.length < 6) {
          return { data: { user: null, session: null }, error: new Error('Password must be at least 6 characters') };
        }
        const cleanEmail = email.trim().toLowerCase();
        const user = {
          id: generateUUID(),
          email: cleanEmail,
          user_metadata: options?.data || { name: cleanEmail.split('@')[0], group_section: 'G1' },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          identities: [{ id: cleanEmail }],
        };
        const session = {
          access_token: 'mock_token_' + Date.now(),
          refresh_token: 'mock_refresh_' + Date.now(),
          expires_in: 3600,
          token_type: 'bearer',
          user,
        };
        saveStoredAccount(cleanEmail, password, user.user_metadata);
        setStoredSession(session);
        return { data: { user, session }, error: null };
      },
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        if (!email || !password) {
          return { data: { user: null, session: null }, error: new Error('Email and password are required') };
        }
        const cleanEmail = email.trim().toLowerCase();
        const accounts = getStoredAccounts();
        const existing = accounts[cleanEmail];

        // Security check: If user registered, verify password
        if (existing) {
          if (existing.passwordHash !== password) {
            return { data: { user: null, session: null }, error: new Error('Invalid email or password') };
          }
        } else {
          // If not registered yet, require password >= 6
          if (password.length < 6) {
            return { data: { user: null, session: null }, error: new Error('Invalid password format') };
          }
          saveStoredAccount(cleanEmail, password, { name: cleanEmail.split('@')[0], group_section: 'G1' });
        }

        const user = {
          id: generateUUID(),
          email: cleanEmail,
          user_metadata: existing?.data || { name: cleanEmail.split('@')[0], group_section: 'G1' },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          identities: [{ id: cleanEmail }],
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
      resend: async () => ({ data: null, error: new Error('Email confirmation is unavailable in local mock mode.') }),
      resetPasswordForEmail: async () => ({ data: null, error: new Error('Password recovery is unavailable in local mock mode.') }),
      updateUser: async () => ({ data: null, error: new Error('Password recovery is unavailable in local mock mode.') }),
    },
    rpc: async () => ({ data: null, error: new Error('Database RPC is unavailable in local mock mode.') }),
    from: (_table: string) => {
      return {
        select: (_cols = '*') => {
          const filters: Array<{ col: string; val: any }> = [];
          let ascending = true;

          const queryBuilder: QueryBuilder = {
            eq: (col: string, val: any) => {
              filters.push({ col, val });
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
              // Support multiple filters across any column
              if (filters.length > 0) {
                items = items.filter((m) =>
                  filters.every((f) => (m as any)[f.col] === f.val)
                );
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
          const newEntries: Material[] = rows.map((r) => ({
            id: r.id || generateUUID(),
            created_at: new Date().toISOString(),
            ...r,
          }));
          const updated = [...items, ...newEntries];
          saveStoredMaterials(updated);
          return { data: newEntries, error: null };
        },
        update: (updates: any) => {
          const filters: Array<{ col: string; val: any }> = [];

          const mutationBuilder: MutationBuilder = {
            eq: (col: string, val: any) => {
              filters.push({ col, val });
              return mutationBuilder;
            },
            then: async (resolve: any, reject: any) => {
              try {
                const items = getStoredMaterials();
                let updatedCount = 0;
                const nextItems = items.map((m) => {
                  const matches = filters.every((f) => (m as any)[f.col] === f.val);
                  if (matches) {
                    updatedCount++;
                    return {
                      ...m,
                      ...updates,
                      updated_at: new Date().toISOString(),
                    };
                  }
                  return m;
                });

                if (updatedCount > 0) {
                  saveStoredMaterials(nextItems);
                  return resolve({ data: nextItems, error: null });
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
          const filters: Array<{ col: string; val: any }> = [];

          const mutationBuilder: MutationBuilder = {
            eq: (col: string, val: any) => {
              filters.push({ col, val });
              return mutationBuilder;
            },
            then: async (resolve: any, reject: any) => {
              try {
                let items = getStoredMaterials();
                const before = items.length;
                items = items.filter((m) =>
                  !filters.every((f) => (m as any)[f.col] === f.val)
                );
                saveStoredMaterials(items);
                return resolve({
                  data: { count: before - items.length },
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
      from: (_bucket: string) => {
        return {
          upload: async (filePath: string, file: File) => {
            const mockUrl = `https://storage.microatlas.must.edu.eg/${filePath}`;
            return {
              data: { path: filePath },
              error: null,
            };
          },
          getPublicUrl: (filePath: string) => {
            return {
              data: {
                publicUrl: `https://storage.microatlas.must.edu.eg/${filePath}`,
              },
            };
          },
          remove: async (_paths: string[]) => {
            return { data: true, error: null };
          },
        };
      },
    },
  };
}

export const supabase: AppSupabaseClient = isConfigured
  ? (createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }) as unknown as AppSupabaseClient)
  : createFallbackClient();
