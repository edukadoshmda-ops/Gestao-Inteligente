import { Member, Coordinator } from '../types';
import { supabase, supabaseAdmin } from './supabase';

const LOCAL_STORAGE_KEY = 'forja_members_data';
const COORD_STORAGE_KEY = 'forja_coordinators_data';
const DELETED_MEMBERS_KEY = '@AppGestao:deletedMemberIds';
const DELETED_COORDS_KEY = '@AppGestao:deletedCoordinatorIds';

// Helper para obter o cliente mais privilegiado disponível
const getClient = () => (supabaseAdmin && !supabaseAdmin.isMock) ? supabaseAdmin : supabase;

// --- GERENCIAMENTO DE TOMBSTONES (IDs EXCLUÍDOS PERMANENTEMENTE) ---
export function getDeletedMemberIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_MEMBERS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function addDeletedMemberIds(ids: (string | number)[]): void {
  try {
    const current = getDeletedMemberIds();
    ids.forEach(id => {
      if (id !== undefined && id !== null) current.add(String(id).trim());
    });
    localStorage.setItem(DELETED_MEMBERS_KEY, JSON.stringify(Array.from(current)));
  } catch {}
}

export function getDeletedCoordinatorIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_COORDS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function addDeletedCoordinatorIds(ids: (string | number)[]): void {
  try {
    const current = getDeletedCoordinatorIds();
    ids.forEach(id => {
      if (id !== undefined && id !== null) current.add(String(id).trim());
    });
    localStorage.setItem(DELETED_COORDS_KEY, JSON.stringify(Array.from(current)));
  } catch {}
}

// --- HELPERS DE NORMALIZAÇÃO E LIMPEZA ---
export function normalizeName(n?: string | null): string {
  if (!n) return '';
  return n
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function cleanPhone(p?: string | null): string {
  if (!p) return '';
  return p.replace(/\D/g, '');
}

/**
 * Deduplica lista de membros mantendo o registro mais completo / mais recente
 */
export function deduplicateMemberList(members: Member[]): { deduplicated: Member[]; removedIds: string[] } {
  const sorted = [...members].sort((a, b) => {
    const scoreA =
      (a.phone ? 5 : 0) +
      (a.voterId ? 5 : 0) +
      (a.email ? 3 : 0) +
      (a.birthDate ? 2 : 0) +
      (a.coordinatorId ? 2 : 0);
    const scoreB =
      (b.phone ? 5 : 0) +
      (b.voterId ? 5 : 0) +
      (b.email ? 3 : 0) +
      (b.birthDate ? 2 : 0) +
      (b.coordinatorId ? 2 : 0);
    if (scoreA !== scoreB) return scoreB - scoreA;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const seenPhone = new Map<string, string>();
  const seenName = new Map<string, string>();
  const seenVoter = new Map<string, string>();
  const deduplicated: Member[] = [];
  const removedIds: string[] = [];

  for (const m of sorted) {
    if (!m || !m.id) continue;
    const phone = cleanPhone(m.phone);
    const name = normalizeName(m.name);
    const voter = (m.voterId || '').trim();

    let isDup = false;

    if (phone && phone.length >= 8) {
      if (seenPhone.has(phone)) isDup = true;
    }

    if (!isDup && name && name.length >= 2) {
      if (seenName.has(name)) isDup = true;
    }

    if (!isDup && voter && voter.length >= 5) {
      if (seenVoter.has(voter)) isDup = true;
    }

    if (isDup) {
      removedIds.push(String(m.id));
    } else {
      deduplicated.push(m);
      if (phone && phone.length >= 8) seenPhone.set(phone, String(m.id));
      if (name && name.length >= 2) seenName.set(name, String(m.id));
      if (voter && voter.length >= 5) seenVoter.set(voter, String(m.id));
    }
  }

  return { deduplicated, removedIds };
}

/**
 * Deduplica coordenadores por e-mail e nome normalizado
 */
export function deduplicateCoordinatorList(coords: Coordinator[]): { deduplicated: Coordinator[]; removedIds: string[] } {
  const seenEmail = new Map<string, string>();
  const seenName = new Map<string, string>();
  const deduplicated: Coordinator[] = [];
  const removedIds: string[] = [];

  for (const c of coords) {
    if (!c || !c.id) continue;
    const email = (c.email || '').trim().toLowerCase();
    const name = normalizeName(c.name);

    let isDup = false;
    if (email && email.length > 3) {
      if (seenEmail.has(email)) isDup = true;
    }
    if (!isDup && name && name.length > 3) {
      if (seenName.has(name)) isDup = true;
    }

    if (isDup) {
      removedIds.push(String(c.id));
    } else {
      deduplicated.push(c);
      if (email && email.length > 3) seenEmail.set(email, String(c.id));
      if (name && name.length > 3) seenName.set(name, String(c.id));
    }
  }

  return { deduplicated, removedIds };
}

// Colunas seguras que existem na tabela members do Supabase
const SUPABASE_MEMBER_COLS = new Set([
  'id', 'name', 'email', 'phone', 'age', 'voterId', 'voterSection',
  'voterZone', 'gender', 'createdAt', 'org_id', 'network_id',
  'coordinatorId', 'birthDate', 'region', 'referral', 'mainInterest', 'supportLevel'
]);

// Helper para abstrair a persistência resiliente (Supabase + LocalStorage)
export const db = {
  async getMembers(orgId?: string): Promise<Member[]> {
    const deletedIds = getDeletedMemberIds();
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
          supabaseMembers = allFetched.filter(m => !deletedIds.has(String(m.id)));
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
        parsed.forEach(m => {
          if (m?.id && !deletedIds.has(String(m.id))) {
            localMap.set(String(m.id), m);
          }
        });
      }
      if (orgId && orgId !== 'undefined' && orgId !== 'demo-org') {
        const orgSpecific = localStorage.getItem(`@AppGestao:members_${orgId}`);
        if (orgSpecific) {
          const parsed: Member[] = JSON.parse(orgSpecific);
          parsed.forEach(m => {
            if (m?.id && !deletedIds.has(String(m.id))) {
              localMap.set(String(m.id), m);
            }
          });
        }
      }
    } catch (e) {
      console.warn("Erro ao ler dados locais:", e);
    }

    // 2. Mesclagem resiliente
    const mergedMap = new Map<string, Member>();

    if (supabaseMembers && supabaseMembers.length > 0) {
      supabaseMembers.forEach(m => {
        if (m?.id && !deletedIds.has(String(m.id))) {
          mergedMap.set(String(m.id), m);
        }
      });
    }

    // Adiciona os membros locais que ainda não constam no Supabase
    localMap.forEach((m, id) => {
      if (!deletedIds.has(id)) {
        if (!orgId || orgId === 'demo-org' || !m.org_id || m.org_id === orgId) {
          if (!mergedMap.has(id)) {
            mergedMap.set(id, m);
          }
        }
      }
    });

    const rawList = Array.from(mergedMap.values());

    // 3. Aplica deduplicação automática estrita para NUNCA exibir duplicados!
    const { deduplicated, removedIds } = deduplicateMemberList(rawList);

    if (removedIds.length > 0) {
      addDeletedMemberIds(removedIds);
      if (client) {
        client.from('members').delete().in('id', removedIds).then(() => {}).catch(() => {});
      }
      try {
        fetch('http://localhost:3500/api/delete-members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: removedIds })
        }).catch(() => {});
      } catch {}
    }

    const finalMembers = deduplicated.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    // 4. Atualizar LocalStorage com a base limpa e sem duplicatas
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(finalMembers));
      if (orgId && orgId !== 'undefined' && orgId !== 'demo-org') {
        localStorage.setItem(`@AppGestao:members_${orgId}`, JSON.stringify(finalMembers));
      }
    } catch {}

    return finalMembers;
  },

  async saveMembers(members: Member[], orgId?: string): Promise<void> {
    const deletedIds = getDeletedMemberIds();
    // Filtra IDs excluídos e deduplica antes de salvar
    const cleanList = members.filter(m => m?.id && !deletedIds.has(String(m.id)));
    const { deduplicated, removedIds } = deduplicateMemberList(cleanList);
    if (removedIds.length > 0) {
      addDeletedMemberIds(removedIds);
    }

    // 1. Salvar no LocalStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(deduplicated));
      if (orgId) {
        localStorage.setItem(`@AppGestao:members_${orgId}`, JSON.stringify(deduplicated));
      }
    } catch (e) {
      console.warn("Erro ao salvar membros no storage local:", e);
    }

    const client = getClient();
    if (!client || deduplicated.length === 0) return;

    const toSupabaseRow = (m: any) => {
      const row: any = {};
      for (const key of SUPABASE_MEMBER_COLS) {
        if (m[key] !== undefined && m[key] !== null && m[key] !== '') {
          row[key] = m[key];
        }
      }
      if (orgId && !row.org_id) row.org_id = orgId;
      return row;
    };

    // 2. Sincroniza no Supabase em lotes
    try {
      const BATCH_SIZE = 500;
      for (let i = 0; i < deduplicated.length; i += BATCH_SIZE) {
        const batch = deduplicated.slice(i, i + BATCH_SIZE).map(toSupabaseRow);
        const { error } = await client
          .from('members')
          .upsert(batch, { onConflict: 'id' });

        if (error) {
          console.warn("Aviso ao salvar membros no Supabase:", error.message || error);
        }
      }
    } catch (error: any) {
      console.warn("Sincronização remota pendente:", error?.message || error);
    }
  },

  async deleteMember(memberId: string, orgId?: string): Promise<void> {
    await this.deleteMembers([memberId], orgId);
  },

  async deleteMembers(memberIds: (string | number)[], orgId?: string): Promise<void> {
    if (!memberIds || memberIds.length === 0) return;
    const cleanIds = memberIds.map(id => String(id).trim()).filter(Boolean);
    const idSet = new Set(cleanIds);

    // 1. Gravar nos Tombstones permanentemente para JAMAIS ressuscitar
    addDeletedMemberIds(cleanIds);

    // 2. Remover de todas as chaves do LocalStorage
    try {
      const globalRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (globalRaw) {
        const list: Member[] = JSON.parse(globalRaw);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list.filter(m => !idSet.has(String(m.id)))));
      }
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('@AppGestao:members_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list: Member[] = JSON.parse(raw);
            localStorage.setItem(key, JSON.stringify(list.filter(m => !idSet.has(String(m.id)))));
          }
        }
      }
    } catch (e) {
      console.warn("Erro ao excluir do storage local:", e);
    }

    // 3. Excluir no Supabase
    const client = getClient();
    if (client) {
      try {
        await client.from('members').delete().in('id', cleanIds);
      } catch (err) {
        console.warn("Aviso ao excluir membros no Supabase:", err);
      }
    }

    // 4. Garantia absoluta via backend (se o backend estiver rodando)
    try {
      await fetch('http://localhost:3500/api/delete-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: cleanIds })
      });
    } catch {}
  },

  async getCoordinators(orgId?: string): Promise<Coordinator[]> {
    const deletedIds = getDeletedCoordinatorIds();
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
          supabaseCoords = allCoordsFetched.filter(c => !deletedIds.has(String(c.id)));
        }
      } catch {}
    }

    // 1. Carregar dados locais
    const localCoordMap = new Map<string, Coordinator>();
    try {
      const globalRaw = localStorage.getItem(COORD_STORAGE_KEY);
      if (globalRaw) {
        const parsed: Coordinator[] = JSON.parse(globalRaw);
        parsed.forEach(c => {
          if (c?.id && !deletedIds.has(String(c.id))) {
            localCoordMap.set(String(c.id), c);
          }
        });
      }
      if (orgId && orgId !== 'undefined' && orgId !== 'demo-org') {
        const orgSpecific = localStorage.getItem(`@AppGestao:coordinators_${orgId}`);
        if (orgSpecific) {
          const parsed: Coordinator[] = JSON.parse(orgSpecific);
          parsed.forEach(c => {
            if (c?.id && !deletedIds.has(String(c.id))) {
              localCoordMap.set(String(c.id), c);
            }
          });
        }
      }
    } catch {}

    // 2. Mesclagem resiliente
    const mergedCoordMap = new Map<string, Coordinator>();
    if (supabaseCoords && supabaseCoords.length > 0) {
      supabaseCoords.forEach(c => {
        if (c?.id && !deletedIds.has(String(c.id))) {
          mergedCoordMap.set(String(c.id), c);
        }
      });
    }

    localCoordMap.forEach((c, id) => {
      if (!deletedIds.has(id)) {
        if (!orgId || orgId === 'demo-org' || !c.org_id || c.org_id === orgId) {
          if (!mergedCoordMap.has(id)) {
            mergedCoordMap.set(id, c);
          }
        }
      }
    });

    const rawCoords = Array.from(mergedCoordMap.values());
    const { deduplicated, removedIds } = deduplicateCoordinatorList(rawCoords);

    if (removedIds.length > 0) {
      addDeletedCoordinatorIds(removedIds);
      if (client) {
        client.from('members').update({ coordinatorId: null }).in('coordinatorId', removedIds).then(() => {
          client.from('coordinators').delete().in('id', removedIds).then(() => {}).catch(() => {});
        }).catch(() => {});
      }
    }

    try {
      localStorage.setItem(COORD_STORAGE_KEY, JSON.stringify(deduplicated));
      if (orgId && orgId !== 'undefined' && orgId !== 'demo-org') {
        localStorage.setItem(`@AppGestao:coordinators_${orgId}`, JSON.stringify(deduplicated));
      }
    } catch {}

    return deduplicated;
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
    const deletedIds = getDeletedCoordinatorIds();
    const cleanList = coordinators.filter(c => c?.id && !deletedIds.has(String(c.id)));
    const { deduplicated, removedIds } = deduplicateCoordinatorList(cleanList);
    if (removedIds.length > 0) addDeletedCoordinatorIds(removedIds);

    try {
      localStorage.setItem(COORD_STORAGE_KEY, JSON.stringify(deduplicated));
      if (orgId) {
        localStorage.setItem(`@AppGestao:coordinators_${orgId}`, JSON.stringify(deduplicated));
      }
    } catch {}

    const client = getClient();
    if (client && deduplicated.length > 0) {
      try {
        const validCoords = deduplicated.filter(c => c && c.id && !c.id.startsWith('demo-'));
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
        await client.from('coordinators').upsert(batch, { onConflict: 'id' });
      } catch (e) {
        console.warn("Aviso ao salvar coordenadores:", e);
      }
    }
  },

  async deleteCoordinator(coordinatorId: string, orgId?: string): Promise<void> {
    await this.deleteCoordinators([coordinatorId], orgId);
  },

  async deleteCoordinators(coordinatorIds: (string | number)[], orgId?: string): Promise<void> {
    if (!coordinatorIds || coordinatorIds.length === 0) return;
    const cleanIds = coordinatorIds.map(id => String(id).trim()).filter(Boolean);
    const idSet = new Set(cleanIds);

    addDeletedCoordinatorIds(cleanIds);

    try {
      const globalRaw = localStorage.getItem(COORD_STORAGE_KEY);
      if (globalRaw) {
        const list: Coordinator[] = JSON.parse(globalRaw);
        localStorage.setItem(COORD_STORAGE_KEY, JSON.stringify(list.filter(c => !idSet.has(String(c.id)))));
      }
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('@AppGestao:coordinators_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list: Coordinator[] = JSON.parse(raw);
            localStorage.setItem(key, JSON.stringify(list.filter(c => !idSet.has(String(c.id)))));
          }
        }
      }
    } catch (e) {
      console.warn("Erro ao excluir coordenador do storage local:", e);
    }

    const client = getClient();
    if (client) {
      try {
        await client.from('members').update({ coordinatorId: null }).in('coordinatorId', cleanIds);
        await client.from('coordinators').update({ network_id: null }).in('network_id', cleanIds);
        await client.from('coordinators').delete().in('id', cleanIds);
      } catch (err) {
        console.warn("Aviso ao excluir coordenador no Supabase:", err);
      }
    }

    try {
      await fetch('http://localhost:3500/api/delete-coordinators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: cleanIds })
      });
    } catch {}
  },

  async cleanAllDuplicates(orgId?: string): Promise<{ deletedCount: number; remainingCount: number }> {
    let backendDeleted = 0;
    try {
      const res = await fetch('http://localhost:3500/api/deduplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.deletedIds && json.deletedIds.length > 0) {
          addDeletedMemberIds(json.deletedIds);
          backendDeleted = json.deletedCount || json.deletedIds.length;
        }
      }
    } catch {}

    // Deduplica membros
    const currentMembers = await this.getMembers(orgId);
    const { deduplicated, removedIds } = deduplicateMemberList(currentMembers);

    if (removedIds.length > 0) {
      await this.deleteMembers(removedIds, orgId);
    }

    await this.saveMembers(deduplicated, orgId);

    // Deduplica coordenadores
    try {
      const resCoord = await fetch('http://localhost:3500/api/deduplicate-coordinators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId })
      });
      if (resCoord.ok) {
        const jsonCoord = await resCoord.json();
        if (jsonCoord.deletedIds && jsonCoord.deletedIds.length > 0) {
          addDeletedCoordinatorIds(jsonCoord.deletedIds);
        }
      }
    } catch {}

    const totalRemoved = Math.max(backendDeleted, removedIds.length);
    return {
      deletedCount: totalRemoved,
      remainingCount: deduplicated.length
    };
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
