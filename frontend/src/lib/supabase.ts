import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase: Variáveis de ambiente não encontradas. Verifique o arquivo .env');
}

// Apenas inicializa o cliente se as variáveis estiverem presentes (para evitar quebrar em dev sem o .env)
const mockSupabase = {
  isMock: true,
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: (callback: any) => {
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    },
    signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: "Supabase não configurado" } }),
    signUp: () => Promise.resolve({ data: { user: null, session: null }, error: { message: "Supabase não configurado" } }),
    signOut: () => Promise.resolve({ data: {}, error: null }),
  },
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: { message: 'Supabase não configurado' } }),
      list: () => Promise.resolve({ data: [], error: { message: 'Supabase não configurado' } }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    })
  },
  channel: () => ({
    on: () => ({
      subscribe: () => ({})
    }),
    subscribe: () => ({})
  }),
  removeChannel: () => {},
  from: () => {
    const chain: any = {
      select: () => chain,
      insert: () => chain,
      update: () => chain,
      delete: () => chain,
      upsert: () => chain,
      eq: () => chain,
      neq: () => chain,
      single: () => chain,
      order: () => chain,
      limit: () => chain,
      then: (resolve: any) => resolve({ data: null, error: { message: 'Supabase não configurado' } }),
      catch: (reject: any) => reject({ message: 'Supabase não configurado' })
    };
    return chain;
  }
};

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (mockSupabase as any);

// Cliente admin com service_role key para operações que contornam RLS
export const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : (mockSupabase as any);

