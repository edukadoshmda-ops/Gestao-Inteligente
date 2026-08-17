import { Member, Coordinator } from '../types';
import { supabase } from './supabase';

const LOCAL_STORAGE_KEY = 'forja_members_data';
const COORD_STORAGE_KEY = 'forja_coordinators_data';

// Helper para abstrair a persistência (Supabase ou LocalStorage)
export const db = {
  async getMembers(): Promise<Member[]> {
    if (supabase) {
      const { data, error } = await supabase.from('members').select('*').order('createdAt', { ascending: false });
      if (!error && data) {
        return data as unknown as Member[];
      }
      console.warn("Erro ao buscar no Supabase, caindo para o LocalStorage", error);
    }

    // Fallback para LocalStorage
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  },

  async saveMembers(members: Member[]): Promise<void> {
    // Sempre salva no LocalStorage primeiro para segurança total
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(members));

    if (!supabase) return;

    try {
      const BATCH_SIZE = 100;
      for (let i = 0; i < members.length; i += BATCH_SIZE) {
        const batch = members.slice(i, i + BATCH_SIZE).map(m => {
          // Limpeza e normalização para evitar erros de esquema no Supabase
          const clean: any = { ...m };
          // Remove campos que costumam dar erro se o banco não estiver atualizado
          if (m.birthDate === "") delete clean.birthDate;
          if (m.email === "") delete clean.email;
          return clean;
        });

        const { error } = await supabase
          .from('members')
          .upsert(batch, { onConflict: 'id' });

        if (error) {
          // Se o erro for de coluna faltante, tentamos salvar removendo a coluna coordinatorId e birthDate que costumam dar problema
          if (error.message.includes('column') || error.code === '42703') {
            console.warn("⚠️ Aviso: Algumas colunas não existem no Supabase. Tentando sincronização de fallback.");
            
            const fallbackBatch = batch.map(m => {
              const { coordinatorId, birthDate, observations, latitude, longitude, ...rest } = m;
              return rest;
            });

            const { error: fallbackError } = await supabase
              .from('members')
              .upsert(fallbackBatch, { onConflict: 'id' });
              
            if (fallbackError) {
               console.error("❌ Erro no fallback de sincronização:", fallbackError);
               throw fallbackError;
            }
            continue; 
          }
          throw error;
        }
      }
      console.log("✅ Base sincronizada com sucesso!");
    } catch (error: any) {
      console.error("❌ Sincronização falhou (Ajuste de esquema pode ser necessário):", error.message || error);
    }
  },

  async getCoordinators(): Promise<Coordinator[]> {
    if (supabase) {
      const { data, error } = await supabase.from('coordinators').select('*').order('name');
      if (!error && data) return data as unknown as Coordinator[];
    }
    const saved = localStorage.getItem(COORD_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  },

  async saveCoordinators(coordinators: Coordinator[]): Promise<void> {
    localStorage.setItem(COORD_STORAGE_KEY, JSON.stringify(coordinators));
    if (supabase && coordinators.length > 0) {
      await supabase.from('coordinators').upsert(coordinators, { onConflict: 'id' });
    }
  },

  async saveOrganizationSettings(orgId: string, settings: any): Promise<void> {
    const key = `org_settings_${orgId}`;
    localStorage.setItem(key, JSON.stringify(settings));
    
    if (supabase) {
      await supabase.from('organizations').update(settings).eq('id', orgId);
    }
  }
};
