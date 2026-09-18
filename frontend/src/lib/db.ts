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

export function checkCloudRestricted(error: any) {
  if (!error) return;
  const msg = String(error.message || error.details || '').toLowerCase();
  const code = String(error.code || (error as any).status || '');
  if (code === '402' || msg.includes('restricted') || msg.includes('spend cap') || msg.includes('payment required')) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supabase_cloud_restricted'));
    }
  }
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

    // Nota: O número de telefone agora pode ser repetido (ex: familiares ou contatos compartilhados).
    // Deduplicação é feita por Título de Eleitor ou Nome Normalizado idêntico.
    if (voter && voter.length >= 5) {
      if (seenVoter.has(voter)) isDup = true;
    }

    if (!isDup && name && name.length >= 2) {
      if (seenName.has(name)) isDup = true;
    }

    if (isDup) {
      removedIds.push(String(m.id));
    } else {
      deduplicated.push(m);
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

// TTL de Cache em milissegundos (5 minutos) para evitar requisições repetidas ao Supabase
const MEMBERS_CACHE_TTL = 5 * 60 * 1000;
const COORDS_CACHE_TTL = 5 * 60 * 1000;

interface CacheEntry<T> {
  data: T[];
  timestamp: number;
}

const memoryMembersCache = new Map<string, CacheEntry<Member>>();
const memoryCoordsCache = new Map<string, CacheEntry<Coordinator>>();

// Colunas seguras que existem na tabela members do Supabase
const SUPABASE_MEMBER_COLS = new Set([
  'id', 'name', 'email', 'phone', 'age', 'voterId', 'voterSection',
  'voterZone', 'gender', 'createdAt', 'org_id', 'network_id',
  'coordinatorId', 'birthDate', 'region', 'referral', 'mainInterest', 'supportLevel'
]);

const SUPABASE_MEMBER_COLS_STR = 'id,name,email,phone,age,voterId,voterSection,voterZone,gender,createdAt,org_id,network_id,coordinatorId,birthDate,region,referral,mainInterest,supportLevel';
const SUPABASE_COORD_COLS_STR = 'id,name,email,neighborhood,city,voterId,voterSection,voterZone,photo,whatsapp,network_id,role,org_id,createdAt';

export const toSupabaseMemberRow = (m: any, orgId?: string) => {
  const row: any = {};
  for (const key of SUPABASE_MEMBER_COLS) {
    if (m[key] !== undefined && m[key] !== null && m[key] !== '') {
      row[key] = m[key];
    }
  }
  if (orgId && !row.org_id) row.org_id = orgId;
  return row;
};

// Helper para abstrair a persistência resiliente (Supabase + LocalStorage)
export const db = {
  /**
   * Invalida o cache de membros para forçar uma nova sincronização na próxima chamada
   */
  invalidateMembersCache(orgId?: string): void {
    if (orgId) {
      memoryMembersCache.delete(orgId);
      try { localStorage.removeItem(`@AppGestao:members_ts_${orgId}`); } catch {}
    } else {
      memoryMembersCache.clear();
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith('@AppGestao:members_ts_')) localStorage.removeItem(k);
        }
      } catch {}
    }
  },

  /**
   * Invalida o cache de coordenadores
   */
  invalidateCoordinatorsCache(orgId?: string): void {
    if (orgId) {
      memoryCoordsCache.delete(orgId);
      try { localStorage.removeItem(`@AppGestao:coordinators_ts_${orgId}`); } catch {}
    } else {
      memoryCoordsCache.clear();
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith('@AppGestao:coordinators_ts_')) localStorage.removeItem(k);
        }
      } catch {}
    }
  },

  /**
   * Verifica de forma leve se um eleitor já existe (menos de 1KB de dados)
   */
  async checkMemberExists(voterId?: string, name?: string, orgId?: string): Promise<{ exists: boolean; member?: Partial<Member> }> {
    const client = getClient();
    if (!client || client.isMock) return { exists: false };

    try {
      if (voterId && voterId.trim().length >= 5) {
        let q = client.from('members').select('id, name, voterId').eq('voterId', voterId.trim());
        if (orgId && orgId !== 'demo-org' && orgId !== 'undefined') q = q.eq('org_id', orgId);
        const { data } = await q.limit(1).maybeSingle();
        if (data) return { exists: true, member: data as Partial<Member> };
      }
      if (name && name.trim().length >= 3) {
        let q = client.from('members').select('id, name, voterId').ilike('name', name.trim());
        if (orgId && orgId !== 'demo-org' && orgId !== 'undefined') q = q.eq('org_id', orgId);
        const { data } = await q.limit(1).maybeSingle();
        if (data) return { exists: true, member: data as Partial<Member> };
      }
      return { exists: false };
    } catch {
      return { exists: false };
    }
  },

  /**
   * Salva ou atualiza APENAS UM eleitor no Supabase e no Cache local.
   * Evita enviar ou baixar toda a tabela de membros (~1KB de rede em vez de dezenas de MB!).
   */
  async addMember(member: Member, orgId?: string): Promise<Member> {
    const targetOrg = orgId || member.org_id;
    const orgKey = targetOrg || 'global';
    const cleanMember: Member = {
      ...member,
      id: member.id || crypto.randomUUID().split('-')[0],
      createdAt: member.createdAt || new Date().toISOString(),
      ...(targetOrg ? { org_id: targetOrg } : {})
    };

    // 1. Atualizar Cache em memória
    const currentMemory = memoryMembersCache.get(orgKey);
    let currentList = currentMemory?.data;
    if (!currentList) {
      try {
        const raw = localStorage.getItem(targetOrg && targetOrg !== 'demo-org' ? `@AppGestao:members_${targetOrg}` : LOCAL_STORAGE_KEY);
        currentList = raw ? JSON.parse(raw) : [];
      } catch {
        currentList = [];
      }
    }

    const existingIdx = currentList.findIndex(m => m.id === cleanMember.id || (cleanMember.voterId && m.voterId && m.voterId.trim() === cleanMember.voterId.trim()));
    let updatedList: Member[];
    if (existingIdx >= 0) {
      const existing = currentList[existingIdx];
      cleanMember.id = existing.id;
      updatedList = currentList.map((m, i) => i === existingIdx ? { ...existing, ...cleanMember } : m);
    } else {
      updatedList = [cleanMember, ...currentList];
    }

    memoryMembersCache.set(orgKey, { data: updatedList, timestamp: Date.now() });

    // 2. Atualizar LocalStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
      if (targetOrg && targetOrg !== 'undefined' && targetOrg !== 'demo-org') {
        localStorage.setItem(`@AppGestao:members_${targetOrg}`, JSON.stringify(updatedList));
      }
      localStorage.setItem(`@AppGestao:members_ts_${orgKey}`, String(Date.now()));
    } catch {}

    // 3. Salvar APENAS esse registro individual no Supabase (consumo ínfimo de banda)
    const client = getClient();
    if (client && !client.isMock) {
      try {
        const row = toSupabaseMemberRow(cleanMember, targetOrg);
        const { error } = await client.from('members').upsert([row], { onConflict: 'id' });
        if (error) checkCloudRestricted(error);
      } catch (err) {
        console.warn("Aviso ao salvar membro individual:", err);
      }
    }

    return cleanMember;
  },

  async updateMember(member: Member, orgId?: string): Promise<Member> {
    return this.addMember(member, orgId);
  },

  async getMembers(orgId?: string, forceRefresh = false): Promise<Member[]> {
    const orgKey = orgId || 'global';
    const now = Date.now();

    // 0. Retornar Cache se ainda estiver válido (Zero Egress / Zero tráfego de rede)
    if (!forceRefresh) {
      const memory = memoryMembersCache.get(orgKey);
      if (memory && (now - memory.timestamp < MEMBERS_CACHE_TTL) && memory.data.length > 0) {
        return memory.data;
      }

      try {
        const cachedTs = localStorage.getItem(`@AppGestao:members_ts_${orgKey}`);
        if (cachedTs && (now - Number(cachedTs) < MEMBERS_CACHE_TTL)) {
          const raw = localStorage.getItem(orgId && orgId !== 'demo-org' ? `@AppGestao:members_${orgId}` : LOCAL_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              memoryMembersCache.set(orgKey, { data: parsed, timestamp: Number(cachedTs) });
              return parsed;
            }
          }
        }
      } catch {}
    }

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
            .select(SUPABASE_MEMBER_COLS_STR)
            .range(from, from + pageSize - 1)
            .order('createdAt', { ascending: false });

          if (orgId && orgId !== 'undefined' && orgId !== 'demo-org') {
            query = query.eq('org_id', orgId);
          }

          const { data, error } = await query;
          if (error) {
            checkCloudRestricted(error);
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

    // 4. Atualizar Cache em memória e LocalStorage com a base limpa
    memoryMembersCache.set(orgKey, { data: finalMembers, timestamp: now });
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(finalMembers));
      if (orgId && orgId !== 'undefined' && orgId !== 'demo-org') {
        localStorage.setItem(`@AppGestao:members_${orgId}`, JSON.stringify(finalMembers));
      }
      localStorage.setItem(`@AppGestao:members_ts_${orgKey}`, String(now));
    } catch {}

    return finalMembers;
  },

  async saveMembers(members: Member[], orgId?: string): Promise<void> {
    const orgKey = orgId || 'global';
    const deletedIds = getDeletedMemberIds();
    // Filtra IDs excluídos e deduplica antes de salvar
    const cleanList = members.filter(m => m?.id && !deletedIds.has(String(m.id)));
    const { deduplicated, removedIds } = deduplicateMemberList(cleanList);
    if (removedIds.length > 0) {
      addDeletedMemberIds(removedIds);
    }

    // Atualiza Cache
    memoryMembersCache.set(orgKey, { data: deduplicated, timestamp: Date.now() });

    // 1. Salvar no LocalStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(deduplicated));
      if (orgId) {
        localStorage.setItem(`@AppGestao:members_${orgId}`, JSON.stringify(deduplicated));
      }
      localStorage.setItem(`@AppGestao:members_ts_${orgKey}`, String(Date.now()));
    } catch (e) {
      console.warn("Erro ao salvar membros no storage local:", e);
    }

    const client = getClient();
    if (!client || deduplicated.length === 0) return;

    // 2. Sincroniza no Supabase em lotes
    try {
      const BATCH_SIZE = 500;
      for (let i = 0; i < deduplicated.length; i += BATCH_SIZE) {
        const batch = deduplicated.slice(i, i + BATCH_SIZE).map(m => toSupabaseMemberRow(m, orgId));
        const { error } = await client
          .from('members')
          .upsert(batch, { onConflict: 'id' });

        if (error) {
          checkCloudRestricted(error);
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

    // Atualizar Cache de Memória
    const memEntry = memoryMembersCache.get(orgId || 'global');
    if (memEntry) {
      memEntry.data = memEntry.data.filter(m => !idSet.has(String(m.id)));
    }

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

  async getCoordinators(orgId?: string, forceRefresh = false): Promise<Coordinator[]> {
    const orgKey = orgId || 'global';
    const now = Date.now();

    // 0. Retornar Cache se ainda estiver válido (Zero Egress)
    if (!forceRefresh) {
      const memory = memoryCoordsCache.get(orgKey);
      if (memory && (now - memory.timestamp < COORDS_CACHE_TTL) && memory.data.length > 0) {
        return memory.data;
      }

      try {
        const cachedTs = localStorage.getItem(`@AppGestao:coordinators_ts_${orgKey}`);
        if (cachedTs && (now - Number(cachedTs) < COORDS_CACHE_TTL)) {
          const raw = localStorage.getItem(orgId && orgId !== 'demo-org' ? `@AppGestao:coordinators_${orgId}` : COORD_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              memoryCoordsCache.set(orgKey, { data: parsed, timestamp: Number(cachedTs) });
              return parsed;
            }
          }
        }
      } catch {}
    }

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
            .select(SUPABASE_COORD_COLS_STR)
            .range(from, from + pageSize - 1)
            .order('name');

          if (orgId && orgId !== 'undefined' && orgId !== 'demo-org') {
            query = query.eq('org_id', orgId);
          }

          const { data, error } = await query;
          if (error) {
            checkCloudRestricted(error);
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

    // Atualizar Cache
    memoryCoordsCache.set(orgKey, { data: deduplicated, timestamp: now });
    try {
      localStorage.setItem(COORD_STORAGE_KEY, JSON.stringify(deduplicated));
      if (orgId && orgId !== 'undefined' && orgId !== 'demo-org') {
        localStorage.setItem(`@AppGestao:coordinators_${orgId}`, JSON.stringify(deduplicated));
      }
      localStorage.setItem(`@AppGestao:coordinators_ts_${orgKey}`, String(now));
    } catch {}

    return deduplicated;
  },

  /**
   * Verifica se coordenador já existe por e-mail (consulta ultraleve)
   */
  async checkCoordinatorExists(email: string, orgId?: string): Promise<boolean> {
    const client = getClient();
    if (!client || client.isMock || !email) return false;
    try {
      let q = client.from('coordinators').select('id').eq('email', email.trim().toLowerCase());
      if (orgId && orgId !== 'demo-org' && orgId !== 'undefined') q = q.eq('org_id', orgId);
      const { data } = await q.limit(1).maybeSingle();
      return !!data;
    } catch {
      return false;
    }
  },

  /**
   * Adiciona ou atualiza APENAS UM coordenador de forma unitária (~1KB de rede)
   */
  async addCoordinator(coordinator: Coordinator | Omit<Coordinator, 'id' | 'createdAt'>, orgId?: string): Promise<Coordinator | null> {
    const client = getClient();
    const targetOrg = orgId || (coordinator as any).org_id;
    const orgKey = targetOrg || 'global';

    const cleanCoord: Coordinator = {
      ...coordinator,
      id: (coordinator as any).id || ('coord-' + Math.random().toString(36).substr(2, 9)),
      createdAt: (coordinator as any).createdAt || new Date().toISOString(),
      ...(targetOrg ? { org_id: targetOrg } : {})
    };

    // 1. Atualizar Cache em memória
    const currentMemory = memoryCoordsCache.get(orgKey);
    let currentList = currentMemory?.data;
    if (!currentList) {
      try {
        const raw = localStorage.getItem(targetOrg && targetOrg !== 'demo-org' ? `@AppGestao:coordinators_${targetOrg}` : COORD_STORAGE_KEY);
        currentList = raw ? JSON.parse(raw) : [];
      } catch {
        currentList = [];
      }
    }

    const existingIdx = currentList.findIndex(c => c.id === cleanCoord.id || (cleanCoord.email && c.email && c.email.trim().toLowerCase() === cleanCoord.email.trim().toLowerCase()));
    let updatedList: Coordinator[];
    if (existingIdx >= 0) {
      const existing = currentList[existingIdx];
      cleanCoord.id = existing.id;
      updatedList = currentList.map((c, i) => i === existingIdx ? { ...existing, ...cleanCoord } : c);
    } else {
      updatedList = [cleanCoord, ...currentList];
    }

    memoryCoordsCache.set(orgKey, { data: updatedList, timestamp: Date.now() });

    try {
      localStorage.setItem(COORD_STORAGE_KEY, JSON.stringify(updatedList));
      if (targetOrg && targetOrg !== 'undefined' && targetOrg !== 'demo-org') {
        localStorage.setItem(`@AppGestao:coordinators_${targetOrg}`, JSON.stringify(updatedList));
      }
      localStorage.setItem(`@AppGestao:coordinators_ts_${orgKey}`, String(Date.now()));
    } catch {}

    // 2. Salvar APENAS esse coordenador no Supabase
    if (client && !client.isMock) {
      try {
        const batchRow = {
          id: cleanCoord.id,
          name: cleanCoord.name,
          email: cleanCoord.email || null,
          neighborhood: cleanCoord.neighborhood || null,
          city: cleanCoord.city || null,
          voterId: cleanCoord.voterId || null,
          voterSection: cleanCoord.voterSection || null,
          voterZone: cleanCoord.voterZone || null,
          photo: cleanCoord.photo || null,
          network_id: cleanCoord.network_id || null,
          role: (cleanCoord as any).role || 'coordinator',
          org_id: cleanCoord.org_id || targetOrg || undefined
        };
        const { error } = await client.from('coordinators').upsert([batchRow], { onConflict: 'id' });
        if (error) checkCloudRestricted(error);
      } catch (err) {
        console.warn("Erro ao salvar coordenador unitário no Supabase:", err);
      }
    }

    return cleanCoord;
  },

  async updateCoordinator(coordinator: Coordinator, orgId?: string): Promise<Coordinator | null> {
    return this.addCoordinator(coordinator, orgId);
  },

  async saveCoordinators(coordinators: Coordinator[], orgId?: string): Promise<void> {
    const orgKey = orgId || 'global';
    const deletedIds = getDeletedCoordinatorIds();
    const cleanList = coordinators.filter(c => c?.id && !deletedIds.has(String(c.id)));
    const { deduplicated, removedIds } = deduplicateCoordinatorList(cleanList);
    if (removedIds.length > 0) addDeletedCoordinatorIds(removedIds);

    // Atualiza Cache
    memoryCoordsCache.set(orgKey, { data: deduplicated, timestamp: Date.now() });

    try {
      localStorage.setItem(COORD_STORAGE_KEY, JSON.stringify(deduplicated));
      if (orgId) {
        localStorage.setItem(`@AppGestao:coordinators_${orgId}`, JSON.stringify(deduplicated));
      }
      localStorage.setItem(`@AppGestao:coordinators_ts_${orgKey}`, String(Date.now()));
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

    // Atualizar Cache de Memória
    const coordEntry = memoryCoordsCache.get(orgId || 'global');
    if (coordEntry) {
      coordEntry.data = coordEntry.data.filter(c => !idSet.has(String(c.id)));
    }

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
  },

  /**
   * Sincroniza a base de dados do computador com a nuvem (Supabase)
   * Garante que eleitores e coordenadores existam no banco para que apareçam no celular
   */
  async syncLocalToCloud(members: Member[], coordinators: Coordinator[], orgId?: string): Promise<{ syncedMembers: number; syncedCoords: number }> {
    const client = getClient();
    if (!client || client.isMock) return { syncedMembers: 0, syncedCoords: 0 };
    const currentOrg = orgId || 'f82a9ced-1547-477a-8f7a-d08231e7bd30';

    let syncedCoords = 0;
    let syncedMembers = 0;

    // 1. Sincroniza Coordenadores primeiro (devido à chave estrangeira)
    if (coordinators && coordinators.length > 0) {
      const coordRows = coordinators.map(c => ({
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
        org_id: c.org_id || currentOrg
      }));

      const COORD_BATCH = 200;
      for (let i = 0; i < coordRows.length; i += COORD_BATCH) {
        const batch = coordRows.slice(i, i + COORD_BATCH);
        const { error } = await client.from('coordinators').upsert(batch, { onConflict: 'id' });
        if (!error) syncedCoords += batch.length;
        else console.warn('Aviso ao sincronizar coordenadores com a nuvem:', error);
      }
    }

    // 2. Sincroniza Membros em lotes
    if (members && members.length > 0) {
      const memberRows = members.map(m => toSupabaseMemberRow(m, currentOrg));
      const MEMBER_BATCH = 250;
      for (let i = 0; i < memberRows.length; i += MEMBER_BATCH) {
        const batch = memberRows.slice(i, i + MEMBER_BATCH);
        const { error } = await client.from('members').upsert(batch, { onConflict: 'id' });
        if (!error) {
          syncedMembers += batch.length;
        } else {
          // Se falhou por foreign key em coordinatorId, tenta salvar sem coordinatorId
          console.warn('Tentando lote de membros com fallback de vínculo...', error?.message);
          const fallbackBatch = batch.map((r: any) => ({ ...r, coordinatorId: null }));
          const { error: fallbackError } = await client.from('members').upsert(fallbackBatch, { onConflict: 'id' });
          if (!fallbackError) syncedMembers += fallbackBatch.length;
        }
      }
    }

    this.invalidateMembersCache(currentOrg);
    this.invalidateCoordinatorsCache(currentOrg);

    return { syncedMembers, syncedCoords };
  },

  /**
   * Força a busca direta da nuvem, descartando o cache local desatualizado
   */
  async forceFetchFromCloud(orgId?: string): Promise<{ members: Member[]; coordinators: Coordinator[] }> {
    const currentOrg = orgId || 'f82a9ced-1547-477a-8f7a-d08231e7bd30';
    this.invalidateMembersCache(currentOrg);
    this.invalidateCoordinatorsCache(currentOrg);
    const [coordinators, members] = await Promise.all([
      this.getCoordinators(currentOrg, true),
      this.getMembers(currentOrg, true)
    ]);
    return { members, coordinators };
  }
};
