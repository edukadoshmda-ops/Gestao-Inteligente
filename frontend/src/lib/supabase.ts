import { createClient } from '@supabase/supabase-js';

const ACTIVE_SUPABASE_URL = 'https://desfitrpkyygclndagat.supabase.co';
const ACTIVE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlc2ZpdHJwa3l5Z2NsbmRhZ2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NDk1NDQsImV4cCI6MjEwNTMyNTU0NH0.k_me7yAlQAtYY4Xrr79Yqy79fooIfthz3KqIjhalZV8';

let envUrl = import.meta.env.VITE_SUPABASE_URL || '';
let envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
let envServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

// Detecta se a URL é vazia ou se aponta para projetos anteriores bloqueados por cota (402)
const isBlockedOrEmpty = !envUrl || 
  envUrl.includes('imsvsscxiilhewyahenn') || 
  envUrl.includes('vvjlbpkknpyvtnoiccic');

const supabaseUrl = isBlockedOrEmpty ? ACTIVE_SUPABASE_URL : envUrl;
const supabaseAnonKey = isBlockedOrEmpty ? ACTIVE_SUPABASE_ANON_KEY : envAnonKey;
const supabaseServiceRoleKey = isBlockedOrEmpty ? '' : envServiceRoleKey;

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

