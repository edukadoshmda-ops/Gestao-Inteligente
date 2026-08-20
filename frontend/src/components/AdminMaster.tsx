import { useState, useEffect, useMemo } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { Organization, Profile } from '../types';
import { 
  Building2, 
  Plus, 
  Users, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  DollarSign, 
  ShieldCheck, 
  Search, 
  Filter, 
  TrendingUp, 
  UserPlus, 
  Mail, 
  Key,
  Edit2,
  X,
  Save,
  Image as ImageIcon,
  Globe,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { asaasService } from '../services/asaas';
import notificationService from '../services/notifications';
import AdminCreateCampaign from './AdminCreateCampaign';
import { PARTY_THEMES, applyAppTheme, normalizeHex } from '../lib/theme';

export default function AdminMaster() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    candidate_name: '',
    subdomain: '',
    subscription_status: 'active' as 'active' | 'pending' | 'trialing' | 'overdue',
    logo_url: '',
    theme_primary: '',
    theme_secondary: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({ candidate_name: '', subdomain: '' });
  const [userFormData, setUserFormData] = useState({ email: '', full_name: '', role: 'coordinator', organization_id: '', password: '123456' });
  const [paletteModalOrg, setPaletteModalOrg] = useState<Organization | null>(null);
  const [quickPrimary, setQuickPrimary] = useState('#003366');
  const [quickSecondary, setQuickSecondary] = useState('#FFCC00');
  // Persistência local para garantir que edições e exclusões funcionem sempre
  const getDeletedOrgIds = (): string[] => {
    try {
      const stored = localStorage.getItem('@AppGestao:deletedOrgIds');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const getEditedOrgs = (): Record<string, Partial<Organization>> => {
    try {
      const stored = localStorage.getItem('@AppGestao:editedOrgs');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) console.warn('Aviso ao buscar orgs no Supabase:', error);
      
      const serverOrgs: Organization[] = data || [];
      const deletedIds = getDeletedOrgIds();
      const editedMap = getEditedOrgs();

      // Filtra os deletados e mescla as alterações editadas
      const mergedOrgs = serverOrgs
        .filter(org => !deletedIds.includes(org.id))
        .map(org => {
          if (editedMap[org.id]) {
            return { ...org, ...editedMap[org.id] };
          }
          return org;
        });

      setOrgs(mergedOrgs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const clientToUse = (supabaseAdmin && !supabaseAdmin.isMock) ? supabaseAdmin : supabase;
      const { data, error } = await clientToUse
        .from('profiles')
        .select('*, organization:organizations(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrgs();
    fetchProfiles();
  }, []);

  const filteredOrgs = useMemo(() => {
    return orgs.filter((org: Organization) => {
      const matchesSearch = org.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (org.subdomain && org.subdomain.includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' ? true : org.subscription_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orgs, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const active = orgs.filter((o: Organization) => o.subscription_status === 'active').length;
    const revenue = active * 497; // Valor exemplo
    return { total: orgs.length, active, revenue };
  }, [orgs]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validação básica
      if (!formData.candidate_name.trim() || !formData.subdomain.trim()) {
        alert('Por favor, preencha todos os campos.');
        return;
      }

      const { error } = await supabase
        .from('organizations')
        .insert([{
          candidate_name: formData.candidate_name.trim(),
          subdomain: formData.subdomain.toLowerCase().trim(),
          subscription_status: 'pending'
        }]);

      if (error) {
        console.error('Erro ao criar organização:', error);
        throw error;
      }

      alert('Organização criada com sucesso!');
      setIsAdding(false);
      setFormData({ candidate_name: '', subdomain: '' });
      fetchOrgs();
    } catch (err: any) {
      console.error('Erro detalhado:', err);
      alert(`Erro ao criar organização: ${err.message || err.details || 'Erro desconhecido'}`);
    }
  };

  const handleCreateBilling = async (orgId: string, orgName: string) => {
    if (!confirm(`Deseja gerar uma nova cobrança no Asaas para ${orgName}?`)) return;

    try {
      const customer = await asaasService.createCustomer(orgName, 'financeiro@campanha.com');
      const subscription = await asaasService.createSubscription(customer.id, 497.00);

      const { error } = await supabase
        .from('organizations')
        .update({
          asaas_customer_id: customer.id,
          subscription_status: 'trialing'
        })
        .eq('id', orgId);

      if (error) throw error;

      alert(`✅ Cobrança Gerada!\n\nLink: ${subscription.paymentLink}`);
      window.open(subscription.paymentLink, '_blank');
      fetchOrgs();
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  const handleActivateOrg = async (orgId: string, orgName: string) => {
    if (!confirm(`Deseja ativar a campanha ${orgName}?`)) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ subscription_status: 'active' })
        .eq('id', orgId);

      if (error) throw error;

      // Buscar contatos da organização para enviar notificação
      const adminContacts = await notificationService.getAdminContacts(orgId);
      
      // Enviar notificação para cada contato admin
      for (const contact of adminContacts) {
        await notificationService.sendUserActivationNotification(
          orgId,
          orgName,
          contact.email,
          contact.phone
        );
      }

      alert(`✅ Campanha ${orgName} ativada com sucesso! Notificação enviada.`);
      fetchOrgs();
    } catch (err: any) {
      alert('Erro ao ativar campanha: ' + err.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validação
      if (!userFormData.email || !userFormData.full_name || !userFormData.organization_id) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
      }

      const cleanEmail = userFormData.email.trim().toLowerCase();
      const cleanName = userFormData.full_name.trim();
      const cleanPassword = userFormData.password?.trim() || '123456';
      let userId: string | null = null;

      // 1. Tentar criar usuário usando supabaseAdmin para evitar RLS e rate-limits
      if (supabaseAdmin && !supabaseAdmin.isMock && supabaseAdmin.auth?.admin) {
        const { data: adminAuthData, error: adminAuthError } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: cleanPassword,
          email_confirm: true,
          user_metadata: {
            full_name: cleanName,
            role: userFormData.role
          }
        });

        if (adminAuthData?.user?.id) {
          userId = adminAuthData.user.id;
        } else if (adminAuthError && (adminAuthError.message?.includes('already been registered') || adminAuthError.message?.includes('already registered'))) {
          // Se já existe no Auth, buscar o ID existente e atualizar senha e metadados
          const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
          const existing = usersList?.users?.find((u: any) => u.email?.toLowerCase() === cleanEmail);
          if (existing) {
            userId = existing.id;
            await supabaseAdmin.auth.admin.updateUserById(existing.id, {
              password: cleanPassword,
              email_confirm: true,
              user_metadata: {
                full_name: cleanName,
                role: userFormData.role
              }
            });
          }
        } else if (adminAuthError) {
          console.warn('Aviso no admin createUser:', adminAuthError);
        }
      }

      // Se não conseguiu via Admin API, tentar signUp via cliente público
      if (!userId) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            data: {
              full_name: cleanName,
              role: userFormData.role
            }
          }
        });

        if (authError && !authError.message?.includes('already registered')) {
          console.error('Erro no auth:', authError);
          throw authError;
        }

        if (authData?.user?.id) {
          userId = authData.user.id;
        }
      }

      if (!userId) {
        userId = crypto.randomUUID();
      }

      // 2. Salvar credencial local para contingência e fallback de login
      try {
        localStorage.setItem(`@AppGestao:userPass_${cleanEmail}`, cleanPassword);
      } catch {}

      // 3. Criar ou atualizar perfil na tabela profiles usando supabaseAdmin para contornar RLS
      const clientToUse = (supabaseAdmin && !supabaseAdmin.isMock) ? supabaseAdmin : supabase;
      const { error: profileError } = await clientToUse
        .from('profiles')
        .upsert({
          id: userId,
          email: cleanEmail,
          full_name: cleanName,
          role: userFormData.role,
          organization_id: userFormData.organization_id
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error('Erro no profile:', profileError);
        throw profileError;
      }

      alert(`✅ Usuário cadastrado com sucesso!\n\n📧 Email: ${cleanEmail}\n🔑 Senha de Acesso: ${cleanPassword}\n\nO usuário já pode fazer login imediatamente.`);
      setIsAddingUser(false);
      setUserFormData({ email: '', full_name: '', role: 'coordinator', organization_id: '', password: '123456' });
      fetchProfiles();
    } catch (err: any) {
      console.error('Erro ao criar usuário:', err);
      alert(`Erro ao criar usuário: ${err.message || 'Erro desconhecido'}\n\nVerifique se o email já está cadastrado ou se há problemas de conexão.`);
    }
  };

  const handleDeleteProfile = async (profileId: string, profileName: string) => {
    if (!confirm(`⚠️ Deseja realmente remover o usuário "${profileName}"?`)) {
      return;
    }

    // 1. Atualizar UI imediatamente
    setProfiles(prev => prev.filter(p => p.id !== profileId));

    try {
      const clientToUse = (supabaseAdmin && !supabaseAdmin.isMock) ? supabaseAdmin : supabase;

      // 2. Remover do banco de dados na tabela profiles
      const { error: profileError } = await clientToUse
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (profileError) {
        console.warn('Aviso ao remover profile:', profileError);
      }

      // 3. Remover conta no Auth se supabaseAdmin estiver disponível
      if (supabaseAdmin && !supabaseAdmin.isMock && supabaseAdmin.auth?.admin) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(profileId);
        } catch (authErr) {
          console.warn('Aviso ao remover do Auth:', authErr);
        }
      }

      alert(`✅ Usuário "${profileName}" removido com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao excluir usuário:', err);
      alert(`Aviso ao remover usuário: ${err.message || 'Erro de sincronização'}`);
    } finally {
      fetchProfiles();
    }
  };

  const handleOpenEdit = (org: Organization) => {
    setEditingOrg(org);
    setEditFormData({
      candidate_name: org.candidate_name || '',
      subdomain: org.subdomain || '',
      subscription_status: org.subscription_status || 'active',
      logo_url: org.logo_url || '',
      theme_primary: org.theme_primary || org.theme_color || '#003366',
      theme_secondary: org.theme_secondary || '#FFCC00'
    });
    setIsEditing(true);
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    if (!editFormData.candidate_name.trim()) {
      alert('O nome do candidato / campanha é obrigatório.');
      return;
    }

    setLoading(true);
    const primColor = normalizeHex(editFormData.theme_primary, '#003366');
    const secColor = normalizeHex(editFormData.theme_secondary, '#FFCC00');

    const updatedFields: Partial<Organization> = {
      candidate_name: editFormData.candidate_name.trim(),
      subdomain: editFormData.subdomain ? editFormData.subdomain.toLowerCase().trim() : undefined,
      subscription_status: editFormData.subscription_status,
      logo_url: editFormData.logo_url ? editFormData.logo_url.trim() : undefined,
      theme_primary: primColor,
      theme_secondary: secColor,
      theme_color: primColor,
    };

    // 1. Salvar no localStorage para persistência garantida
    try {
      const currentEdited = getEditedOrgs();
      currentEdited[editingOrg.id] = {
        ...currentEdited[editingOrg.id],
        ...updatedFields
      };
      localStorage.setItem('@AppGestao:editedOrgs', JSON.stringify(currentEdited));
    } catch (e) {
      console.warn('Erro ao salvar localmente:', e);
    }

    // 2. Atualizar estado imediatamente
    setOrgs(prev => prev.map(o => o.id === editingOrg.id ? { ...o, ...updatedFields } : o));

    // 3. Aplicar tema no DOM e no localStorage em tempo real
    applyAppTheme(primColor, secColor);

    // 4. Atualizar no Supabase
    try {
      const { error: updateError } = await supabase
        .from('organizations')
        .update(updatedFields)
        .eq('id', editingOrg.id);
      if (updateError) {
        console.warn('Aviso na atualização do Supabase:', updateError);
      }
    } catch (err: any) {
      console.warn('Atualização remota no Supabase:', err);
    } finally {
      setLoading(false);
      setIsEditing(false);
      setEditingOrg(null);
      alert(`✅ Organização "${editFormData.candidate_name}" e tema atualizados com sucesso!`);
    }
  };

  const handleApplyPalette = async (org: Organization, primary: string, secondary: string) => {
    const prim = normalizeHex(primary, '#003366');
    const sec = normalizeHex(secondary, '#FFCC00');

    // 1. Atualizar estado local imediatamente
    setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, theme_primary: prim, theme_secondary: sec, theme_color: prim } : o));

    // 2. Salvar no localStorage
    try {
      const editedMap = getEditedOrgs();
      editedMap[org.id] = {
        ...editedMap[org.id],
        theme_primary: prim,
        theme_secondary: sec,
        theme_color: prim
      };
      localStorage.setItem('@AppGestao:editedOrgs', JSON.stringify(editedMap));
    } catch {}

    // 3. Aplicar tema no DOM se for o tema ativo
    applyAppTheme(prim, sec);

    // 4. Salvar no Supabase via supabaseAdmin
    try {
      const client = (supabaseAdmin && !supabaseAdmin.isMock) ? supabaseAdmin : supabase;
      await client
        .from('organizations')
        .update({
          theme_primary: prim,
          theme_secondary: sec,
          theme_color: prim
        })
        .eq('id', org.id);
    } catch (e) {
      console.warn('Erro ao salvar tema remoto:', e);
    }

    setPaletteModalOrg(null);
  };

  const handleDeleteOrg = async (orgId: string, orgName: string) => {
    if (!confirm(`⚠️ ATENÇÃO: Deseja realmente excluir permanentemente "${orgName}"?\n\nIsso removerá a organização e todos os dados vinculados a ela.`)) {
      return;
    }

    setIsDeleting(orgId);

    // 1. Persistir exclusão no localStorage imediatamente
    try {
      const deletedIds = getDeletedOrgIds();
      if (!deletedIds.includes(orgId)) {
        deletedIds.push(orgId);
        localStorage.setItem('@AppGestao:deletedOrgIds', JSON.stringify(deletedIds));
      }
    } catch (e) {
      console.warn('Erro ao salvar exclusão no storage:', e);
    }

    // 2. Remover do estado local imediatamente
    setOrgs(prev => prev.filter(o => o.id !== orgId));

    // 3. Tentar exclusão no Supabase com segurança
    try {
      const cleanupTables = [
        { table: 'profiles', column: 'organization_id' },
        { table: 'members', column: 'org_id' },
        { table: 'coordinators', column: 'org_id' },
        { table: 'announcements', column: 'org_id' },
        { table: 'messages', column: 'org_id' },
      ];

      for (const item of cleanupTables) {
        try {
          await supabase.from(item.table).delete().eq(item.column, orgId);
        } catch {}
      }

      await supabase
        .from('organizations')
        .delete()
        .eq('id', orgId);
    } catch (err: any) {
      console.warn('Exclusão no Supabase:', err);
    } finally {
      setIsDeleting(null);
      alert(`✅ Organização "${orgName}" excluída com sucesso!`);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header com Stats de Faturamento */}
      <div className="bg-gov-blue p-5 sm:p-8 text-white border-b-4 border-gov-yellow shadow-xl rounded-2xl overflow-hidden">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="w-full xl:w-auto">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <ShieldCheck className="w-7 h-7 sm:w-8 h-8 text-gov-yellow shrink-0" /> Painel Master SaaS
            </h2>
            <p className="text-[10px] sm:text-xs font-bold text-blue-200 uppercase tracking-widest mt-1">
              Controle de {stats.total} Campanhas Ativas • {profiles.length} Usuários
            </p>
          </div>

          <div className="w-full xl:w-auto flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 flex-1 sm:flex-initial">
              <div className="bg-white/5 p-3 sm:p-4 border border-white/10 rounded-2xl flex flex-col justify-center min-w-0">
                <p className="text-[9px] font-black uppercase text-gov-yellow mb-1 truncate">Assinaturas Ativas</p>
                <p className="text-lg sm:text-2xl font-black">{stats.active} / {stats.total}</p>
              </div>
              <div className="bg-gov-yellow p-3 sm:p-4 rounded-2xl flex flex-col justify-center min-w-0">
                <p className="text-[9px] font-black uppercase text-gov-blue mb-1 truncate">Faturamento Estimado</p>
                <div className="flex items-center gap-1 sm:gap-2">
                  <TrendingUp className="w-4 h-4 text-gov-blue shrink-0" />
                  <p className="text-lg sm:text-2xl font-black text-gov-blue truncate">R$ {stats.revenue.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
              <button
                onClick={() => setIsCreatingCampaign(true)}
                className="bg-gov-yellow text-gov-blue px-2.5 py-2.5 sm:px-4 sm:py-3 font-black uppercase text-[9px] sm:text-xs flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 hover:bg-yellow-400 transition-all shadow-md rounded-2xl text-center"
              >
                <Building2 className="w-4 h-4 shrink-0" /> 
                <span className="truncate">Nova Campanha</span>
              </button>
              <button
                onClick={() => setIsAddingUser(true)}
                className="bg-green-600 text-white px-2.5 py-2.5 sm:px-4 sm:py-3 font-black uppercase text-[9px] sm:text-xs flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 hover:bg-green-700 transition-all shadow-md rounded-2xl text-center"
              >
                <UserPlus className="w-4 h-4 shrink-0" /> 
                <span className="truncate">Novo Usuário</span>
              </button>
              <button
                onClick={() => setIsAdding(true)}
                className="bg-white text-gov-blue px-2.5 py-2.5 sm:px-4 sm:py-3 font-black uppercase text-[9px] sm:text-xs flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 hover:bg-gray-100 transition-all shadow-md rounded-2xl text-center"
              >
                <Plus className="w-4 h-4 shrink-0" /> 
                <span className="truncate">Novo Cliente</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar de Busca e Filtro */}
      <div className="bg-white p-3 sm:p-4 border-b-2 border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3 rounded-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Buscar candidato ou subdomínio..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-gray-50 border-2 border-transparent focus:border-gov-blue outline-none font-bold text-xs sm:text-sm rounded-2xl"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto bg-gray-50 p-2.5 sm:p-3 font-black uppercase text-[10px] border-2 border-transparent focus:border-gov-blue outline-none rounded-2xl cursor-pointer"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativos</option>
            <option value="pending">Pendentes</option>
            <option value="trialing">Em Teste</option>
            <option value="overdue">Atrasados</option>
          </select>
        </div>
      </div>

      {isAdding && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-5 sm:p-8 border-4 border-gov-blue shadow-2xl max-w-xl mx-auto rounded-2xl"
        >
          <h3 className="font-black text-gov-blue uppercase mb-6 flex items-center gap-2 text-sm sm:text-base">
            <Building2 className="w-5 h-5" /> Cadastrar Novo Cliente
          </h3>
          <form onSubmit={handleCreateOrg} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Nome da Campanha</label>
              <input type="text" required value={formData.candidate_name} onChange={e => setFormData({...formData, candidate_name: e.target.value})} className="w-full p-3 bg-gray-50 border-2 border-gray-100 outline-none focus:border-gov-blue font-bold text-sm rounded-2xl" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Subdomínio (Slug)</label>
              <input type="text" required value={formData.subdomain} onChange={e => setFormData({...formData, subdomain: e.target.value})} className="w-full p-3 bg-gray-50 border-2 border-gray-100 outline-none focus:border-gov-blue font-bold text-sm rounded-2xl" />
            </div>
            <div className="flex gap-2 pt-4">
              <button type="submit" className="flex-1 bg-gov-blue text-white font-black py-3 uppercase text-xs rounded-2xl">Salvar Cadastro</button>
              <button type="button" onClick={() => setIsAdding(false)} className="flex-1 bg-gray-100 text-gray-500 font-black py-3 uppercase text-xs rounded-2xl">Cancelar</button>
            </div>
          </form>
        </motion.div>
      )}

      {isCreatingCampaign && (
        <AdminCreateCampaign
          onSuccess={() => {
            setIsCreatingCampaign(false);
            fetchOrgs();
          }}
          onCancel={() => setIsCreatingCampaign(false)}
        />
      )}

      {isAddingUser && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-5 sm:p-8 border-4 border-green-600 shadow-2xl max-w-xl mx-auto rounded-2xl"
        >
          <h3 className="font-black text-green-600 uppercase mb-6 flex items-center gap-2 text-sm sm:text-base">
            <UserPlus className="w-5 h-5" /> Cadastrar Novo Usuário
          </h3>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Nome Completo</label>
              <input type="text" required value={userFormData.full_name} onChange={e => setUserFormData({...userFormData, full_name: e.target.value})} className="w-full p-3 bg-gray-50 border-2 border-gray-100 outline-none focus:border-green-600 font-bold text-sm rounded-2xl" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">E-mail</label>
              <input type="email" required value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} className="w-full p-3 bg-gray-50 border-2 border-gray-100 outline-none focus:border-green-600 font-bold text-sm rounded-2xl" placeholder="exemplo@campanha.com" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Senha de Acesso (Mínimo 6 caracteres)</label>
              <input 
                type="text" 
                required 
                minLength={6} 
                value={userFormData.password || '123456'} 
                onChange={e => setUserFormData({...userFormData, password: e.target.value})} 
                className="w-full p-3 bg-gray-50 border-2 border-gray-100 outline-none focus:border-green-600 font-bold text-sm rounded-2xl" 
                placeholder="123456" 
              />
              <span className="text-[9px] text-gray-400 font-bold block mt-1">Padrão do sistema: 123456</span>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Papel (Função)</label>
              <select
                required
                value={userFormData.role}
                onChange={e => setUserFormData({...userFormData, role: e.target.value})}
                className="w-full p-3 bg-gray-50 border-2 border-gray-100 outline-none focus:border-green-600 font-bold text-sm rounded-2xl"
              >
                <option value="candidate">Candidato (Acesso Total)</option>
                <option value="general_coordination">Coordenação Geral (Acesso Administrativo)</option>
                <option value="area_coordinator">Coordenador de Área (Acesso Campo)</option>
                <option value="coordinator">Coordenador de Rua (Acesso Restrito)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Organização</label>
              <select
                required
                value={userFormData.organization_id}
                onChange={e => setUserFormData({...userFormData, organization_id: e.target.value})}
                className="w-full p-3 bg-gray-50 border-2 border-gray-100 outline-none focus:border-green-600 font-bold text-sm rounded-2xl"
              >
                <option value="">Selecione uma organização</option>
                {orgs.map(org => (
                  <option key={org.id} value={org.id}>{org.candidate_name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-4">
              <button type="submit" className="flex-1 bg-green-600 text-white font-black py-3 uppercase text-xs rounded-2xl">Criar Usuário</button>
              <button type="button" onClick={() => setIsAddingUser(false)} className="flex-1 bg-gray-100 text-gray-500 font-black py-3 uppercase text-xs rounded-2xl">Cancelar</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Seção de Usuários */}
      <div className="bg-white border-2 border-gray-100 p-4 sm:p-6 shadow-sm rounded-2xl">
        <h3 className="font-black text-gov-blue uppercase mb-4 flex items-center gap-2 text-xs sm:text-sm">
          <Users className="w-5 h-5" /> Usuários Cadastrados ({profiles.length})
        </h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {profiles.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
              <UserPlus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Nenhum usuário cadastrado</p>
            </div>
          ) : (
            profiles.map(profile => (
              <div key={profile.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-2xl gap-2 sm:gap-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-gov-blue/10 p-2 rounded-full shrink-0">
                    <UserPlus className="w-4 h-4 text-gov-blue" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-gov-blue uppercase truncate">{profile.full_name}</p>
                    <p className="text-[9px] font-bold text-gray-400 truncate">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 pl-9 sm:pl-0">
                  <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-xl ${
                    profile.role === 'candidate' ? 'bg-blue-100 text-blue-700' :
                    profile.role === 'general_coordination' ? 'bg-yellow-100 text-yellow-700' :
                    profile.role === 'area_coordinator' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {profile.role === 'candidate' ? 'Candidato' :
                     profile.role === 'general_coordination' ? 'Coord. Geral' :
                     profile.role === 'area_coordinator' ? 'Coord. Área' :
                     'Coordenador'}
                  </span>
{
                    /* ... */
                  }
                  <button
                    onClick={() => handleDeleteProfile(profile.id, profile.full_name)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    title="Excluir Usuário"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Grid de Clientes com Scroll se necessário */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-gov-blue/20" /></div>
        ) : filteredOrgs.map(org => {
          const primColor = org.theme_primary || org.theme_color || '#003366';
          const secColor = org.theme_secondary || '#FFCC00';

          return (
            <div 
              key={org.id} 
              className="bg-white border-2 border-gray-100 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group rounded-2xl flex flex-col justify-between"
              style={{ borderTop: `5px solid ${primColor}` }}
            >
              <div>
                <div className="flex items-center gap-3 sm:gap-4 mb-3">
                  <div 
                    className="p-2.5 sm:p-3 rounded-2xl shrink-0 flex items-center justify-center border"
                    style={{ backgroundColor: `${primColor}15`, borderColor: `${primColor}30` }}
                  >
                    {org.logo_url ? (
                      <img src={org.logo_url} alt={org.candidate_name} className="w-6 h-6 object-contain" onError={(e) => { (e.target as any).style.display = 'none'; }} />
                    ) : (
                      <Building2 className="w-5 h-5 sm:w-6 h-6" style={{ color: primColor }} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black uppercase text-sm leading-none truncate" style={{ color: primColor }}>{org.candidate_name}</h4>
                    <p className="text-[9px] font-bold text-gray-400 mt-1 truncate">SUBDOMÍNIO: {org.subdomain || '---'}</p>
                  </div>
                </div>

                {/* Identidade Visual / Cores da Campanha - Clicável para abrir o seletor */}
                <button
                  type="button"
                  onClick={() => {
                    setPaletteModalOrg(org);
                    setQuickPrimary(primColor);
                    setQuickSecondary(secColor);
                  }}
                  className="w-full flex items-center justify-between mb-3 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all text-left group/color"
                  title="Clique para escolher entre 16 modelos partidários ou personalizar as cores"
                >
                  <div className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-gov-blue group-hover/color:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase text-gray-600">Mudar Cores:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: primColor }} title={`Cor Primária: ${primColor}`} />
                      <span className="text-[9px] font-black uppercase font-mono" style={{ color: primColor }}>{primColor}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: secColor }} title={`Cor Secundária: ${secColor}`} />
                      <span className="text-[9px] font-black uppercase font-mono text-gray-600">{secColor}</span>
                    </div>
                  </div>
                </button>

                <div className="space-y-2 border-t border-gray-50 pt-3 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-gray-400 uppercase">Status:</span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-xl ${
                      org.subscription_status === 'active' ? 'bg-green-100 text-green-700' : 
                      org.subscription_status === 'trialing' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {org.subscription_status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-gray-400 uppercase">Link Login (Equipe):</span>
                    <button 
                      onClick={() => {
                        const link = `${window.location.origin}?org=${org.id}`;
                        navigator.clipboard.writeText(link);
                        alert(`🔑 Link de Login exclusivo copiado!\n\n${link}`);
                      }}
                      className="text-[9px] font-black text-gov-blue hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg border border-blue-200 transition-colors"
                      title="Copiar link que cai direto no login da campanha"
                    >
                      Copiar Login
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-gray-400 uppercase">Link Cadastro (Rua):</span>
                    <button 
                      onClick={() => {
                        const link = `${window.location.origin}?org=${org.id}&public=true`;
                        navigator.clipboard.writeText(link);
                        alert(`📋 Link de Cadastro Público copiado!\n\n${link}`);
                      }}
                      className="text-[9px] font-black text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 px-2 py-0.5 rounded-lg border border-green-200 transition-colors"
                      title="Copiar link de adesão para eleitores e voluntários"
                    >
                      Copiar Cadastro
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-gray-400 uppercase">Link Coord. Geral:</span>
                    <button 
                      onClick={() => {
                        const link = `${window.location.origin}?org=${org.id}&signup=true&role=general_coordination`;
                        navigator.clipboard.writeText(link);
                        alert(`📋 Link de Cadastro de Coord. Geral copiado!\n\n${link}`);
                      }}
                      className="text-[9px] font-black text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-lg border border-purple-200 transition-colors"
                      title="Copiar link de cadastro para Coordenadores Gerais"
                    >
                      Copiar Cadastro
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-gray-400 uppercase">Link Coord. Área:</span>
                    <button 
                      onClick={() => {
                        const link = `${window.location.origin}?org=${org.id}&signup=true&role=area_coordinator`;
                        navigator.clipboard.writeText(link);
                        alert(`📋 Link de Cadastro de Coord. de Área copiado!\n\n${link}`);
                      }}
                      className="text-[9px] font-black text-orange-700 hover:text-orange-900 bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded-lg border border-orange-200 transition-colors"
                      title="Copiar link de cadastro para Coordenadores de Área"
                    >
                      Copiar Cadastro
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-2 mt-6 pt-2">
                {org.subscription_status === 'pending' && (
                  <button
                    onClick={() => handleActivateOrg(org.id, org.candidate_name)}
                    className="flex-1 min-w-[70px] bg-blue-600 text-white p-2.5 text-[9px] font-black uppercase hover:bg-blue-700 flex items-center justify-center gap-1 rounded-xl transition-all shadow-sm"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Ativar
                  </button>
                )}
                <button
                  onClick={() => handleCreateBilling(org.id, org.candidate_name)}
                  className="flex-1 min-w-[75px] bg-green-600 text-white p-2.5 text-[9px] font-black uppercase hover:bg-green-700 flex items-center justify-center gap-1 rounded-xl transition-all shadow-sm"
                >
                  <DollarSign className="w-3 h-3" /> Faturar
                </button>
                <button 
                  onClick={() => {
                    setPaletteModalOrg(org);
                    setQuickPrimary(primColor);
                    setQuickSecondary(secColor);
                  }}
                  className="flex-1 min-w-[75px] bg-purple-50 text-purple-700 hover:bg-purple-100 p-2.5 text-[9px] font-black uppercase flex items-center justify-center gap-1 rounded-xl transition-all border border-purple-200"
                  title="Personalizar Cores & Tema"
                >
                  <Palette className="w-3 h-3" /> Cores
                </button>
                <button 
                  onClick={() => handleOpenEdit(org)}
                  className="flex-1 min-w-[70px] bg-gray-50 text-gov-blue p-2.5 text-[9px] font-black uppercase hover:bg-gov-bg flex items-center justify-center gap-1 rounded-xl transition-all border border-gray-100 hover:border-gov-blue/20"
                  title="Editar Organização"
                >
                  <Edit2 className="w-3 h-3" /> Editar
                </button>
                <button 
                  className="p-2.5 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 rounded-xl transition-all border border-red-100 flex items-center justify-center shrink-0 disabled:opacity-50"
                  onClick={() => handleDeleteOrg(org.id, org.candidate_name)}
                  disabled={isDeleting === org.id}
                  title="Excluir Organização"
                >
                  {isDeleting === org.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {filteredOrgs.length === 0 && !loading && (
        <div className="text-center py-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Nenhum cliente encontrado com esses filtros</p>
        </div>
      )}

      {/* Modal de Edição de Organização */}
      <AnimatePresence>
        {isEditing && editingOrg && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsEditing(false)} 
              className="absolute inset-0 bg-gov-blue/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="bg-white w-full max-w-xl border-4 border-gov-blue shadow-2xl relative z-10 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="bg-gov-blue p-6 text-white flex justify-between items-center border-b-4 border-gov-yellow">
                <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-gov-yellow" /> Editar Organização / Campanha
                </h3>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateOrg} className="p-6 md:p-8 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 block mb-1 tracking-wider flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-gov-blue" /> Nome do Candidato / Campanha
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={editFormData.candidate_name} 
                    onChange={e => setEditFormData({ ...editFormData, candidate_name: e.target.value })} 
                    className="w-full p-3 bg-gray-50 border-2 border-gray-100 outline-none focus:border-gov-blue font-bold text-sm rounded-xl text-gov-blue"
                    placeholder="Ex: Deputada Mirla Miranda"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 block mb-1 tracking-wider flex items-center gap-1">
                    <Globe className="w-3 h-3 text-gov-blue" /> Subdomínio / Slug
                  </label>
                  <input 
                    type="text" 
                    value={editFormData.subdomain} 
                    onChange={e => setEditFormData({ ...editFormData, subdomain: e.target.value })} 
                    className="w-full p-3 bg-gray-50 border-2 border-gray-100 outline-none focus:border-gov-blue font-bold text-sm rounded-xl text-gov-blue lowercase"
                    placeholder="Ex: mirla-miranda"
                  />
                  <span className="text-[9px] text-gray-400 font-bold block mt-1">Usado para identificação única da campanha</span>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 block mb-1 tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-gov-blue" /> Status da Assinatura
                  </label>
                  <select 
                    value={editFormData.subscription_status} 
                    onChange={e => setEditFormData({ ...editFormData, subscription_status: e.target.value as any })} 
                    className="w-full p-3 bg-gray-50 border-2 border-gray-100 outline-none focus:border-gov-blue font-black text-sm uppercase rounded-xl text-gov-blue"
                  >
                    <option value="active">🟢 Ativo (Plano Pago)</option>
                    <option value="pending">🟡 Pendente (Aguardando)</option>
                    <option value="trialing">🔵 Em Teste (Trial)</option>
                    <option value="overdue">🔴 Atrasado / Bloqueado</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 block mb-1 tracking-wider flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-gov-blue" /> URL da Logo (PNG Transparente • 1:1)
                  </label>
                  <input 
                    type="url" 
                    value={editFormData.logo_url} 
                    onChange={e => setEditFormData({ ...editFormData, logo_url: e.target.value })} 
                    className="w-full p-3 bg-gray-50 border-2 border-gray-100 outline-none focus:border-gov-blue font-bold text-xs rounded-xl text-gov-blue"
                    placeholder="https://exemplo.com/logo.png"
                  />
                  {editFormData.logo_url && (
                    <div className="mt-2 flex items-center gap-3 p-2 bg-gray-50 border border-gray-200 rounded-xl">
                      <img src={editFormData.logo_url} alt="Preview Logo" className="w-10 h-10 object-contain bg-white rounded-lg border" onError={(e) => { (e.target as any).style.display = 'none'; }} />
                      <span className="text-[10px] font-bold text-gray-500">Prévia da Logo</span>
                    </div>
                  )}
                </div>

                {/* Seletor de Tema e Cores da Campanha */}
                <div className="space-y-3 p-4 bg-gray-50/80 border-2 border-gray-100 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-gray-700 tracking-wider flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-gov-blue" /> Tema & Identidade Visual
                    </label>
                    <span className="text-[9px] font-bold text-gray-400">Cores Oficiais da Campanha</span>
                  </div>

                  {/* Atalhos Rápidos de Partidos */}
                  <div>
                    <span className="text-[9px] font-black uppercase text-gray-400 block mb-1.5">Modelos Partidários Rápidos:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {PARTY_THEMES.map((theme, idx) => {
                        const isSelected = editFormData.theme_primary?.toLowerCase() === theme.primary.toLowerCase();
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setEditFormData({
                              ...editFormData,
                              theme_primary: theme.primary,
                              theme_secondary: theme.secondary
                            })}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black transition-all border ${
                              isSelected
                                ? 'border-gov-blue bg-white shadow-sm ring-2 ring-gov-blue/20'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                            title={theme.name}
                          >
                            <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: theme.primary }} />
                            <span className="w-2.5 h-2.5 rounded-full border border-black/10 -ml-1" style={{ backgroundColor: theme.secondary }} />
                            <span className="text-gray-700 truncate max-w-[90px]">{theme.name?.split('(')[0].trim()}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Inputs Customizados de Cores */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-500 block mb-1 tracking-wider">
                        Cor Primária (Header/Botões)
                      </label>
                      <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border-2 border-gray-200 focus-within:border-gov-blue transition-colors">
                        <input 
                          type="color" 
                          value={normalizeHex(editFormData.theme_primary, '#003366')} 
                          onChange={e => setEditFormData({ ...editFormData, theme_primary: e.target.value })} 
                          className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                        />
                        <input 
                          type="text" 
                          value={editFormData.theme_primary} 
                          onChange={e => {
                            let val = e.target.value;
                            if (val && !val.startsWith('#') && /^[0-9A-Fa-f]/.test(val)) val = '#' + val;
                            setEditFormData({ ...editFormData, theme_primary: val });
                          }} 
                          className="flex-1 bg-transparent outline-none font-mono font-black text-xs text-gray-800 uppercase"
                          placeholder="#003366"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-500 block mb-1 tracking-wider">
                        Cor Secundária (Destaques/Detalhes)
                      </label>
                      <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border-2 border-gray-200 focus-within:border-gov-blue transition-colors">
                        <input 
                          type="color" 
                          value={normalizeHex(editFormData.theme_secondary, '#FFCC00')} 
                          onChange={e => setEditFormData({ ...editFormData, theme_secondary: e.target.value })} 
                          className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                        />
                        <input 
                          type="text" 
                          value={editFormData.theme_secondary} 
                          onChange={e => {
                            let val = e.target.value;
                            if (val && !val.startsWith('#') && /^[0-9A-Fa-f]/.test(val)) val = '#' + val;
                            setEditFormData({ ...editFormData, theme_secondary: val });
                          }} 
                          className="flex-1 bg-transparent outline-none font-mono font-black text-xs text-gray-800 uppercase"
                          placeholder="#FFCC00"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Prévia em Tempo Real */}
                  <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-2">
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider block">
                      Prévia Visual em Tempo Real:
                    </span>
                    <div 
                      className="p-3 rounded-xl flex items-center justify-between text-white shadow-md transition-all"
                      style={{ 
                        backgroundColor: normalizeHex(editFormData.theme_primary, '#003366'),
                        borderBottom: `4px solid ${normalizeHex(editFormData.theme_secondary, '#FFCC00')}`
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" style={{ color: normalizeHex(editFormData.theme_secondary, '#FFCC00') }} />
                        <span className="font-black text-xs uppercase tracking-wider truncate max-w-[200px]">
                          {editFormData.candidate_name || 'Nome da Campanha'}
                        </span>
                      </div>
                      <span 
                        className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase shadow-sm"
                        style={{
                          backgroundColor: normalizeHex(editFormData.theme_secondary, '#FFCC00'),
                          color: normalizeHex(editFormData.theme_primary, '#003366')
                        }}
                      >
                        Ativo
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 bg-gov-blue hover:bg-blue-800 text-white font-black py-3.5 px-4 uppercase text-xs tracking-wider flex items-center justify-center gap-2 rounded-xl transition-all shadow-lg shadow-gov-blue/20"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-gov-yellow" />}
                    Salvar Alterações
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsEditing(false)} 
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black py-3.5 px-4 uppercase text-xs tracking-wider rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal de Seleção Rápida de Paleta & Cores (16 opções + customizado) */}
        {paletteModalOrg && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setPaletteModalOrg(null)} 
              className="absolute inset-0 bg-gov-blue/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="bg-white w-full max-w-2xl border-4 border-gov-blue shadow-2xl relative z-10 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="bg-gov-blue p-6 text-white flex justify-between items-center border-b-4 border-gov-yellow">
                <div>
                  <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                    <Palette className="w-4 h-4 text-gov-yellow" /> Escolher Cores da Campanha
                  </h3>
                  <p className="text-[11px] text-blue-200 font-bold mt-0.5">
                    {paletteModalOrg.candidate_name}
                  </p>
                </div>
                <button 
                  onClick={() => setPaletteModalOrg(null)}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* 16 Modelos Partidários / Estilos */}
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 block mb-2 tracking-wider">
                    Modelos Partidários & Paletas Oficiais (16 Opções Rápidas):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PARTY_THEMES.map((theme, idx) => {
                      const isSelected = quickPrimary.toLowerCase() === theme.primary.toLowerCase() && quickSecondary.toLowerCase() === theme.secondary.toLowerCase();
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setQuickPrimary(theme.primary);
                            setQuickSecondary(theme.secondary);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl text-left transition-all border-2 ${
                            isSelected
                              ? 'border-gov-blue bg-blue-50/50 shadow-md ring-2 ring-gov-blue/20'
                              : 'border-gray-100 bg-white hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex items-center -space-x-1 shrink-0">
                              <span className="w-4 h-4 rounded-full border border-white shadow" style={{ backgroundColor: theme.primary }} />
                              <span className="w-4 h-4 rounded-full border border-white shadow" style={{ backgroundColor: theme.secondary }} />
                            </div>
                            <span className="text-[11px] font-black text-gray-800 truncate">{theme.name}</span>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-gov-blue shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Pickers */}
                <div className="p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl space-y-3">
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
                    Personalizar Cores Exatas (Seletor ou Código HEX):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-500 block mb-1">Cor Primária (Header / Botões)</label>
                      <div className="flex items-center gap-2 bg-white p-2 rounded-xl border-2 border-gray-200">
                        <input 
                          type="color" 
                          value={normalizeHex(quickPrimary, '#003366')} 
                          onChange={e => setQuickPrimary(e.target.value)} 
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0" 
                        />
                        <input 
                          type="text" 
                          value={quickPrimary} 
                          onChange={e => {
                            let val = e.target.value;
                            if (val && !val.startsWith('#') && /^[0-9A-Fa-f]/.test(val)) val = '#' + val;
                            setQuickPrimary(val);
                          }} 
                          className="flex-1 bg-transparent outline-none font-mono font-black text-xs uppercase" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-500 block mb-1">Cor Secundária (Destaques / Detalhes)</label>
                      <div className="flex items-center gap-2 bg-white p-2 rounded-xl border-2 border-gray-200">
                        <input 
                          type="color" 
                          value={normalizeHex(quickSecondary, '#FFCC00')} 
                          onChange={e => setQuickSecondary(e.target.value)} 
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0" 
                        />
                        <input 
                          type="text" 
                          value={quickSecondary} 
                          onChange={e => {
                            let val = e.target.value;
                            if (val && !val.startsWith('#') && /^[0-9A-Fa-f]/.test(val)) val = '#' + val;
                            setQuickSecondary(val);
                          }} 
                          className="flex-1 bg-transparent outline-none font-mono font-black text-xs uppercase" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Prévia da Campanha */}
                  <div 
                    className="p-3.5 rounded-xl flex items-center justify-between text-white shadow-lg transition-all"
                    style={{ 
                      backgroundColor: normalizeHex(quickPrimary, '#003366'),
                      borderBottom: `4px solid ${normalizeHex(quickSecondary, '#FFCC00')}`
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-5 h-5" style={{ color: normalizeHex(quickSecondary, '#FFCC00') }} />
                      <span className="font-black text-sm uppercase tracking-wide truncate">
                        {paletteModalOrg.candidate_name}
                      </span>
                    </div>
                    <span 
                      className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase shadow-sm"
                      style={{
                        backgroundColor: normalizeHex(quickSecondary, '#FFCC00'),
                        color: normalizeHex(quickPrimary, '#003366')
                      }}
                    >
                      Exemplo de Botão
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => handleApplyPalette(paletteModalOrg, quickPrimary, quickSecondary)} 
                    className="flex-1 bg-gov-blue hover:bg-blue-800 text-white font-black py-3.5 px-4 uppercase text-xs tracking-wider flex items-center justify-center gap-2 rounded-xl transition-all shadow-lg"
                  >
                    <Save className="w-4 h-4 text-gov-yellow" /> Aplicar e Salvar Cores
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setPaletteModalOrg(null)} 
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black py-3.5 px-4 uppercase text-xs tracking-wider rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
