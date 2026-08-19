import { Member, Coordinator } from '../types';
import { supabase, supabaseAdmin } from './supabase';

const LOCAL_STORAGE_KEY = 'forja_members_data';
const COORD_STORAGE_KEY = 'forja_coordinators_data';

// Helper para obter o cliente mais privilegiado disponível
const getClient = () => (supabaseAdmin && !supabaseAdmin.isMock) ? supabaseAdmin : supabase;

// Helper para abstrair a persistência resiliente (Supabase + LocalStorage)
export const db = {
  async getMembers(orgId?: string): Promise<Member[]> {
    const client = getClient();
    let supabaseMembers: Member[] | null = null;

    if (client) {
      try {
        let query = client.from('members').select('*').order('createdAt', { ascending: false });
        if (orgId) {
          query = query.eq('org_id', orgId);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          supabaseMembers = data as unknown as Member[];
        } else if (error) {
          console.warn("Aviso ao buscar membros no Supabase:", error);
        }
      } catch (err) {
        console.warn("Exceção ao buscar membros:", err);
      }
    }

    // Se encontramos dados no Supabase, atualizamos o LocalStorage e retornamos
    if (supabaseMembers && supabaseMembers.length > 0) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(supabaseMembers));
        if (orgId) {
          localStorage.setItem(`@AppGestao:members_${orgId}`, JSON.stringify(supabaseMembers));
        }
      } catch {}
      return supabaseMembers;
    }

    // Fallback inteligente para LocalStorage (caso Supabase esteja offline ou vazio na sessão)
    let localData: Member[] = [];
    try {
      if (orgId) {
        const orgSpecific = localStorage.getItem(`@AppGestao:members_${orgId}`);
        if (orgSpecific) localData = JSON.parse(orgSpecific);
      }
      if (localData.length === 0) {
        const globalData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (globalData) localData = JSON.parse(globalData);
      }
    } catch (e) {
      console.warn("Erro ao ler dados locais:", e);
    }

    // Se temos dados no LocalStorage mas o Supabase estava vazio, sincroniza em segundo plano
    if (localData.length > 0 && client) {
      setTimeout(() => {
        db.saveMembers(localData, orgId).catch(() => {});
      }, 1000);
    }

    return localData;
  },

  async saveMembers(members: Member[], orgId?: string): Promise<void> {
    // 1. Sempre salva no LocalStorage primeiro para persistência offline imediata
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(members));
      if (orgId) {
        localStorage.setItem(`@AppGestao:members_${orgId}`, JSON.stringify(members));
      }
    } catch (e) {
      console.warn("Erro ao salvar membros no storage local:", e);
    }

    const client = getClient();
    if (!client) return;

    // 2. Sincroniza no Supabase em lotes
    try {
      const BATCH_SIZE = 100;
      for (let i = 0; i < members.length; i += BATCH_SIZE) {
        const batch = members.slice(i, i + BATCH_SIZE).map(m => {
          const clean: any = { ...m };
          if (m.birthDate === "") delete clean.birthDate;
          if (m.email === "") delete clean.email;
          if (orgId && !clean.org_id) clean.org_id = orgId;
          return clean;
        });

        const { error } = await client
          .from('members')
          .upsert(batch, { onConflict: 'id' });

        if (error) {
          if (error.message?.includes('column') || error.code === '42703') {
            console.warn("⚠️ Aviso: Algumas colunas não existem no Supabase. Tentando sincronização de fallback.");
            
            const fallbackBatch = batch.map(m => {
              const { coordinatorId, birthDate, observations, latitude, longitude, ...rest } = m;
              return rest;
            });

            const { error: fallbackError } = await client
              .from('members')
              .upsert(fallbackBatch, { onConflict: 'id' });
              
            if (fallbackError) {
               console.error("❌ Erro no fallback de sincronização:", fallbackError);
            }
            continue; 
          }
          console.warn("Aviso ao salvar membros no Supabase:", error);
        }
      }
      console.log(`✅ Base de ${members.length} membros sincronizada com sucesso!`);
    } catch (error: any) {
      console.warn("Sincronização remota pendente:", error?.message || error);
    }
  },

  async getCoordinators(orgId?: string): Promise<Coordinator[]> {
    const client = getClient();
    let supabaseCoords: Coordinator[] | null = null;

    if (client) {
      try {
        let query = client.from('coordinators').select('*').order('name');
        if (orgId) {
          query = query.eq('org_id', orgId);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          supabaseCoords = data as unknown as Coordinator[];
        }
      } catch {}
    }

    if (supabaseCoords && supabaseCoords.length > 0) {
      try {
        localStorage.setItem(COORD_STORAGE_KEY, JSON.stringify(supabaseCoords));
        if (orgId) {
          localStorage.setItem(`@AppGestao:coordinators_${orgId}`, JSON.stringify(supabaseCoords));
        }
      } catch {}
      return supabaseCoords;
    }

    let localCoords: Coordinator[] = [];
    try {
      if (orgId) {
        const orgSpecific = localStorage.getItem(`@AppGestao:coordinators_${orgId}`);
        if (orgSpecific) localCoords = JSON.parse(orgSpecific);
      }
      if (localCoords.length === 0) {
        const globalCoords = localStorage.getItem(COORD_STORAGE_KEY);
        if (globalCoords) localCoords = JSON.parse(globalCoords);
      }
    } catch {}

    if (localCoords.length > 0 && client) {
      setTimeout(() => {
        db.saveCoordinators(localCoords, orgId).catch(() => {});
      }, 1000);
    }

    return localCoords;
  },

  async saveCoordinators(coordinators: Coordinator[], orgId?: string): Promise<void> {
    try {
      localStorage.setItem(COORD_STORAGE_KEY, JSON.stringify(coordinators));
      if (orgId) {
        localStorage.setItem(`@AppGestao:coordinators_${orgId}`, JSON.stringify(coordinators));
      }
    } catch {}

    const client = getClient();
    if (client && coordinators.length > 0) {
      try {
        const batch = coordinators.map(c => ({
          ...c,
          org_id: c.org_id || orgId || undefined
        }));
        await client.from('coordinators').upsert(batch, { onConflict: 'id' });
      } catch (e) {
        console.warn("Aviso ao salvar coordenadores:", e);
      }
    }
  },

  async saveOrganizationSettings(orgId: string, settings: any): Promise<void> {
    const key = `org_settings_${orgId}`;
    try {
      localStorage.setItem(key, JSON.stringify(settings));
    } catch {}
    
    const client = getClient();
    if (client) {
      try {
        await client.from('organizations').update(settings).eq('id', orgId);
      } catch (e) {
        console.warn("Aviso ao salvar configurações:", e);
      }
    }
  }
};
