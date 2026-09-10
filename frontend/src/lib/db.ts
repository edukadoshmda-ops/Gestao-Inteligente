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
        const allFetched: Member[] = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          let query = client
            .from('members')
            .select('*')
            .range(from, from + pageSize - 1)
            .order('createdAt', { ascending: false });

          if (orgId && orgId !== 'undefined' && orgId !== 'demo-org') {
            query = query.eq('org_id', orgId);
          }

          const { data, error } = await query;
          if (error) {
            console.warn("Aviso ao buscar membros no Supabase:", error);
            break;
          }
          if (data && data.length > 0) {
            allFetched.push(...(data as unknown as Member[]));
            if (data.length < pageSize) {
              hasMore = false;
            } else {
              from += pageSize;
            }
          } else {
            hasMore = false;
          }
        }

        if (allFetched.length > 0) {
          supabaseMembers = allFetched;
        }
      } catch (err) {
        console.warn("Exceção ao buscar membros:", err);
      }
    }

    // 1. Carregar dados locais (tanto da org quanto global para nunca perder registros offline ou desvinculados)
    const localMap = new Map<string, Member>();
    try {
      const globalRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (globalRaw) {
        const parsed: Member[] = JSON.parse(globalRaw);
        parsed.forEach(m => { if (m?.id) localMap.set(String(m.id), m); });
      }
      if (orgId && orgId !== 'undefined' && orgId !== 'demo-org') {
        const orgSpecific = localStorage.getItem(`@AppGestao:members_${orgId}`);
        if (orgSpecific) {
          const parsed: Member[] = JSON.parse(orgSpecific);
          parsed.forEach(m => { if (m?.id) localMap.set(String(m.id), m); });
        }
      }
    } catch (e) {
      console.warn("Erro ao ler dados locais:", e);
    }

    // 2. Mesclagem resiliente (Preserva sempre os dados locais e une com os remotos)
    const mergedMap = new Map<string, Member>();

    if (supabaseMembers && supabaseMembers.length > 0) {
      supabaseMembers.forEach(m => {
        if (m?.id) mergedMap.set(String(m.id), m);
      });
    }

    // Adiciona os membros locais que ainda não constam no Supabase (evita que sumam se o Supabase vier vazio ou incompleto)
    localMap.forEach((m, id) => {
      if (!orgId || orgId === 'demo-org' || !m.org_id || m.org_id === orgId) {
        if (!mergedMap.has(id)) {
          mergedMap.set(id, m);
        }
      }
    });

    const finalMembers = Array.from(mergedMap.values()).sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    // 3. Atualizar LocalStorage com a base completa (sem nunca zerar acidentalmente)
    try {
      if (finalMembers.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(finalMembers));
        if (orgId && orgId !== 'undefined' && orgId !== 'demo-org') {
          localStorage.setItem(`@AppGestao:members_${orgId}`, JSON.stringify(finalMembers));
        }
      }
    } catch {}

    return finalMembers;
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

    // Colunas seguras que existem na tabela members do Supabase
    const SUPABASE_COLS = new Set([
      'id', 'name', 'email', 'phone', 'age', 'voterId', 'voterSection',
      'voterZone', 'gender', 'createdAt', 'org_id', 'network_id',
      'coordinatorId', 'birthDate', 'region', 'referral', 'mainInterest', 'supportLevel'
    ]);

    // Mapeia Member para apenas os campos que existem no Supabase
    const toSupabaseRow = (m: any) => {
      const row: any = {};
      for (const key of SUPABASE_COLS) {
        if (m[key] !== undefined && m[key] !== null && m[key] !== '') {
          row[key] = m[key];
        }
      }
      if (orgId && !row.org_id) row.org_id = orgId;
      return row;
    };

    // 2. Sincroniza no Supabase em lotes
    try {
      const BATCH_SIZE = 1000;
      for (let i = 0; i < members.length; i += BATCH_SIZE) {
        const batch = members.slice(i, i + BATCH_SIZE).map(toSupabaseRow);

        const { error } = await client
          .from('members')
          .upsert(batch, { onConflict: 'id' });

        if (error) {
          console.warn("Aviso ao salvar membros no Supabase:", error.message || error);
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
        const allCoordsFetched: Coordinator[] = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          let query = client
            .from('coordinators')
            .select('*')
            .range(from, from + pageSize - 1)
            .order('name');

          if (orgId && orgId !== 'undefined' && orgId !== 'demo-org') {
            query = query.eq('org_id', orgId);
          }

          const { data, error } = await query;
          if (error) {
            console.warn("Aviso ao buscar coordenadores no Supabase:", error);
            break;
          }
          if (data && data.length > 0) {
            allCoordsFetched.push(...(data as unknown as Coordinator[]));
            if (data.length < pageSize) {
              hasMore = false;
            } else {
              from += pageSize;
            }
          } else {
            hasMore = false;
          }
        }

        if (allCoordsFetched.length > 0) {
          supabaseCoords = allCoordsFetched;
        }
      } catch {}
    }

    // 1. Carregar dados locais (global + org)
    const localCoordMap = new Map<string, Coordinator>();
    try {
      const globalRaw = localStorage.getItem(COORD_STORAGE_KEY);
      if (globalRaw) {
        const parsed: Coordinator[] = JSON.parse(globalRaw);
        parsed.forEach(c => { if (c?.id) localCoordMap.set(String(c.id), c); });
      }
      if (orgId && orgId !== 'undefined' && orgId !== 'demo-org') {
        const orgSpecific = localStorage.getItem(`@AppGestao:coordinators_${orgId}`);
        if (orgSpecific) {
          const parsed: Coordinator[] = JSON.parse(orgSpecific);
          parsed.forEach(c => { if (c?.id) localCoordMap.set(String(c.id), c); });
        }
      }
    } catch {}

    // 2. Mesclagem resiliente
    const mergedCoordMap = new Map<string, Coordinator>();
    if (supabaseCoords && supabaseCoords.length > 0) {
      supabaseCoords.forEach(c => {
        if (c?.id) mergedCoordMap.set(String(c.id), c);
      });
    }

    localCoordMap.forEach((c, id) => {
      if (!orgId || orgId === 'demo-org' || !c.org_id || c.org_id === orgId) {
        if (!mergedCoordMap.has(id)) {
          mergedCoordMap.set(id, c);
        }
      }
    });

    const finalCoords = Array.from(mergedCoordMap.values());

    try {
      if (finalCoords.length > 0) {
        localStorage.setItem(COORD_STORAGE_KEY, JSON.stringify(finalCoords));
        if (orgId && orgId !== 'undefined' && orgId !== 'demo-org') {
          localStorage.setItem(`@AppGestao:coordinators_${orgId}`, JSON.stringify(finalCoords));
        }
      }
    } catch {}

    return finalCoords;
  },

  async addCoordinator(coordinator: Omit<Coordinator, 'id' | 'createdAt'>): Promise<Coordinator | null> {
    const client = getClient();
    if (!client) return null;

    try {
      const newCoordinator: any = {
        ...coordinator,
        id: 'coord-' + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString()
      };

      const { data, error } = await client
        .from('coordinators')
        .insert([newCoordinator])
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Coordinator;
    } catch (error) {
      console.error('Erro ao adicionar coordenador:', error);
      return null;
    }
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
        const validCoords = coordinators.filter(c => c && c.id && !c.id.startsWith('demo-'));
        if (validCoords.length === 0) return;

        const batch = validCoords.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email || null,
          neighborhood: c.neighborhood || null,
          city: c.city || null,
          voterId: c.voterId || null,
          voterSection: c.voterSection || null,
          voterZone: c.voterZone || null,
          photo: c.photo || null,
          network_id: c.network_id || null,
          role: (c as any).role || 'coordinator',
          org_id: c.org_id || orgId || undefined
        }));
        const { error } = await client.from('coordinators').upsert(batch, { onConflict: 'id' });
        if (error && error.code !== '42703') {
          console.warn("Aviso ao sincronizar coordenadores no Supabase:", error.message);
        }
      } catch (e) {
        console.warn("Aviso ao salvar coordenadores:", e);
      }
    }
  },

  async deleteMember(memberId: string, orgId?: string): Promise<void> {
    try {
      const globalRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (globalRaw) {
        const list: Member[] = JSON.parse(globalRaw);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list.filter(m => m.id !== memberId)));
      }
      if (orgId && orgId !== 'undefined') {
        const orgRaw = localStorage.getItem(`@AppGestao:members_${orgId}`);
        if (orgRaw) {
          const list: Member[] = JSON.parse(orgRaw);
          localStorage.setItem(`@AppGestao:members_${orgId}`, JSON.stringify(list.filter(m => m.id !== memberId)));
        }
      }
    } catch (e) {
      console.warn("Erro ao excluir membro do storage local:", e);
    }

    const client = getClient();
    if (client) {
      try {
        await client.from('members').delete().eq('id', memberId);
      } catch (err) {
        console.warn("Aviso ao excluir membro no Supabase:", err);
      }
    }
  },

  async deleteCoordinator(coordinatorId: string, orgId?: string): Promise<void> {
    try {
      const globalRaw = localStorage.getItem(COORD_STORAGE_KEY);
      if (globalRaw) {
        const list: Coordinator[] = JSON.parse(globalRaw);
        localStorage.setItem(COORD_STORAGE_KEY, JSON.stringify(list.filter(c => c.id !== coordinatorId)));
      }
      if (orgId && orgId !== 'undefined') {
        const orgRaw = localStorage.getItem(`@AppGestao:coordinators_${orgId}`);
        if (orgRaw) {
          const list: Coordinator[] = JSON.parse(orgRaw);
          localStorage.setItem(`@AppGestao:coordinators_${orgId}`, JSON.stringify(list.filter(c => c.id !== coordinatorId)));
        }
      }
    } catch (e) {
      console.warn("Erro ao excluir coordenador do storage local:", e);
    }

    const client = getClient();
    if (client) {
      try {
        await client.from('coordinators').delete().eq('id', coordinatorId);
      } catch (err) {
        console.warn("Aviso ao excluir coordenador no Supabase:", err);
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
