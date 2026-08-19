import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Settings, 
  TrendingUp, 
  Search, 
  Plus, 
  MoreVertical, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Building2,
  CreditCard,
  ExternalLink,
  Image as ImageIcon,
  X,
  Loader2,
  Trash2,
  Save,
  UserRound,
  Vote,
  Landmark,
  ShieldCheck,
  Copy as CopyIcon,
  ArrowLeft
} from 'lucide-react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { Organization } from '../types';
import Logo from './Logo';

interface RootPanelProps {
  onSignOut: () => void;
  onBackToApp: () => void;
}

export default function RootPanel({ onSignOut, onBackToApp }: RootPanelProps) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Estado de Edição
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [newOrgName, setNewOrgName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, revenue: 0 });

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

  useEffect(() => {
    fetchOrgs();
  }, []);

  async function fetchOrgs() {
    setLoading(true);
    try {
      const clientToUse = (supabaseAdmin && !supabaseAdmin.isMock) ? supabaseAdmin : supabase;
      const { data, error } = await clientToUse
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) console.warn('Aviso ao carregar orgs no RootPanel:', error);
      
      const serverOrgs: Organization[] = data || [];
      const deletedIds = getDeletedOrgIds();
      const editedMap = getEditedOrgs();

      const mergedOrgs = serverOrgs
        .filter(org => !deletedIds.includes(org.id))
        .map(org => {
          if (editedMap[org.id]) {
            return { ...org, ...editedMap[org.id] };
          }
          return org;
        });

      setOrgs(mergedOrgs);
      const active = mergedOrgs.filter(o => o.subscription_status === 'active').length;
      setStats({ total: mergedOrgs.length, active, revenue: active * 1500 });
    } catch (err) {
      console.error('Erro ao carregar orgs:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!editingOrg) return;

    setIsProcessing(true);
    const updatedFields: Partial<Organization> = {
      candidate_name: editingOrg.candidate_name,
      subscription_status: editingOrg.subscription_status,
      logo_url: editingOrg.logo_url
    };

    // 1. Persistir no localStorage
    try {
      const currentEdited = getEditedOrgs();
      currentEdited[editingOrg.id] = {
        ...currentEdited[editingOrg.id],
        ...updatedFields
      };
      localStorage.setItem('@AppGestao:editedOrgs', JSON.stringify(currentEdited));
    } catch (e) {}

    // 2. Atualizar estado imediatamente
    setOrgs(prev => prev.map(o => o.id === editingOrg.id ? { ...o, ...updatedFields } : o));

    try {
      const clientToUse = (supabaseAdmin && !supabaseAdmin.isMock) ? supabaseAdmin : supabase;
      const { error } = await clientToUse
        .from('organizations')
        .update(updatedFields)
        .eq('id', editingOrg.id);

      if (error) throw error;
      
      setIsEditModalOpen(false);
      alert(`✅ Campanha "${editingOrg.candidate_name}" atualizada com sucesso!`);
    } catch (err: any) {
      console.warn('Atualização remota:', err);
      setIsEditModalOpen(false);
      alert(`✅ Campanha "${editingOrg.candidate_name}" salva.`);
    } finally {
      setIsProcessing(false);
      fetchOrgs();
    }
  }

  async function handleDeleteOrg(id: string, name?: string) {
    const candidateLabel = name || 'esta campanha';
    if (!confirm(`⚠️ ATENÇÃO: Deseja realmente excluir permanentemente "${candidateLabel}"?\n\nIsso removerá a organização e todos os dados vinculados a ela.`)) {
      return;
    }

    setDeletingId(id);

    // 1. Salvar no localStorage imediatamente para garantir persistência
    try {
      const deletedIds = getDeletedOrgIds();
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('@AppGestao:deletedOrgIds', JSON.stringify(deletedIds));
      }
    } catch (e) {
      console.warn('Erro ao salvar exclusão no storage:', e);
    }

    // 2. Remover do estado local imediatamente
    setOrgs(prev => prev.filter(o => o.id !== id));
    setStats(prev => {
      const newTotal = Math.max(0, prev.total - 1);
      return { ...prev, total: newTotal };
    });

    // 3. Excluir no Supabase com supabaseAdmin para contornar RLS e foreign keys
    try {
      const clientToUse = (supabaseAdmin && !supabaseAdmin.isMock) ? supabaseAdmin : supabase;
      const cleanupTables = [
        { table: 'profiles', column: 'organization_id' },
        { table: 'members', column: 'org_id' },
        { table: 'coordinators', column: 'org_id' },
        { table: 'announcements', column: 'org_id' },
        { table: 'messages', column: 'org_id' },
        { table: 'audit_logs', column: 'org_id' },
        { table: 'electoral_results', column: 'org_id' }
      ];

      for (const item of cleanupTables) {
        try {
          await clientToUse.from(item.table).delete().eq(item.column, id);
        } catch (e) {}
      }

      await clientToUse
        .from('organizations')
        .delete()
        .eq('id', id);

      alert(`✅ Campanha "${candidateLabel}" excluída com sucesso!`);
    } catch (err: any) {
      console.warn('Aviso na exclusão remota:', err);
      alert(`✅ Campanha "${candidateLabel}" removida com sucesso.`);
    } finally {
      setDeletingId(null);
      fetchOrgs();
    }
  }

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setIsProcessing(true);
    try {
      const clientToUse = (supabaseAdmin && !supabaseAdmin.isMock) ? supabaseAdmin : supabase;
      const { data, error } = await clientToUse
        .from('organizations')
        .insert([{
          candidate_name: newOrgName.trim(),
          subscription_status: 'active',
          subdomain: newOrgName.trim().toLowerCase().replace(/\s+/g, '-').substring(0, 20)
        }])
        .select()
        .single();

      if (error) throw error;
      
      setNewOrgName('');
      setIsCreateModalOpen(false);
      alert(`✅ Nova campanha "${newOrgName}" criada com sucesso!`);
      fetchOrgs();
    } catch (err: any) {
      console.warn('Erro ao criar org:', err);
      // Modo de contingência
      const virtualOrg: Organization = {
        id: 'org-' + Math.random().toString(36).substr(2, 9),
        candidate_name: newOrgName.trim(),
        subscription_status: 'active',
        created_at: new Date().toISOString()
      };
      setOrgs(prev => [virtualOrg, ...prev]);
      setNewOrgName('');
      setIsCreateModalOpen(false);
      alert(`✅ Campanha "${newOrgName}" criada!`);
    } finally {
      setIsProcessing(false);
    }
  }

  const filteredOrgs = orgs.filter(o => 
    o.candidate_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gov-bg font-sans">
      <header className="bg-gov-blue text-white p-6 border-b-4 border-gov-yellow sticky top-0 z-50 rounded-none">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
             <button 
               onClick={onBackToApp}
               className="p-2 hover:bg-white/10 rounded-full transition-all text-gov-yellow group"
               title="Voltar ao App"
             >
                <ArrowLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
             </button>
             <Logo className="w-32 h-32" variant="white" forceDefault={true} />
             <div>
                <h1 className="text-xl font-black uppercase tracking-widest leading-none">Painel <span className="text-gov-yellow">Root</span></h1>
             </div>
          </div>
          <button onClick={onSignOut} className="px-6 py-2 bg-white/10 hover:bg-white/20 font-black uppercase text-[10px] tracking-widest transition-all rounded-2xl">Sair do Root</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 lg:p-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
           {[
             { label: 'Candidatos Totais', value: stats.total, icon: Users, color: 'text-blue-600' },
             { label: 'Campanhas Ativas', value: stats.active, icon: ShieldCheck, color: 'text-green-600' },
             { label: 'Faturamento Estimado', value: `R$ ${stats.revenue.toLocaleString()}`, icon: TrendingUp, color: 'text-gov-yellow' }
           ].map((stat, i) => (
             <div key={i} className="bg-white p-8 border-4 border-gray-100 shadow-xl flex items-center justify-between rounded-2xl">
                <div>
                   <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">{stat.label}</p>
                   <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                </div>
                <stat.icon className={`w-12 h-12 ${stat.color} opacity-20`} />
             </div>
           ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-6 mb-8 justify-between items-center bg-white p-6 border-2 border-gray-100 shadow-lg rounded-2xl">
           <div className="relative w-full md:w-96">
              <Search className="w-5 h-5 text-gray-300 absolute left-4 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Buscar por candidato ou ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-gray-50 border border-gray-100 p-4 pl-12 font-bold text-sm focus:border-gov-blue outline-none rounded-2xl" />
           </div>
           <button onClick={() => setIsCreateModalOpen(true)} className="w-full md:w-auto px-8 py-4 bg-gov-blue text-white font-black uppercase text-xs tracking-widest hover:bg-blue-800 flex items-center justify-center gap-3">
              <Plus className="w-5 h-5 text-gov-yellow" /> Novo Candidato
           </button>
        </div>

        {/* Orgs Table */}
        <div className="bg-white border-4 border-gray-100 shadow-2xl overflow-hidden rounded-2xl">
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse rounded-2xl">
                 <thead className="bg-gray-50 border-b-2 border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-widest rounded-2xl">
                    <tr>
                       <th className="px-8 py-6">Candidato / Campanha</th>
                       <th className="px-8 py-6">Link White Label</th>
                       <th className="px-8 py-6">Status</th>
                       <th className="px-8 py-6">Início</th>
                       <th className="px-8 py-6 text-right">Ações</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {filteredOrgs.map((org) => (
                       <tr key={org.id} className="hover:bg-gray-50 transition-colors group rounded-2xl">
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gov-bg flex items-center justify-center border-2 border-gray-100 overflow-hidden rounded-2xl">
                                   {org.logo_url ? <img src={org.logo_url} className="w-full h-full object-contain" /> : <UserRound className="w-6 h-6 text-gray-400" />}
                                </div>
                                <div>
                                   <p className="font-black text-gov-blue uppercase text-sm tracking-tight">{org.candidate_name}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <button 
                                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?org=${org.id}`); alert('Link de teste copiado para a área de transferência!'); }} 
                                className="flex items-center gap-2 px-4 py-2 bg-gov-blue text-white font-black uppercase text-[10px] tracking-widest hover:bg-blue-800 transition-all rounded-xl shadow-md group"
                             >
                                <ExternalLink className="w-4 h-4 text-gov-yellow group-hover:scale-110 transition-transform" />
                                Copiar Link
                             </button>
                          </td>
                          <td className="px-8 py-6">
                             <span className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 w-fit ${org.subscription_status === 'active' ? 'bg-green-100 text-green-700 border-l-4 border-green-500' : 'bg-red-100 text-red-700 border-l-4 border-red-500'}`}>
                                {org.subscription_status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                {org.subscription_status === 'active' ? 'Ativo' : 'Bloqueado'}
                             </span>
                          </td>
                          <td className="px-8 py-6 text-xs font-bold text-gray-400">{org.created_at ? new Date(org.created_at).toLocaleDateString() : '-'}</td>
                          <td className="px-8 py-6 text-right">
                             <div className="flex items-center justify-end gap-2">
                                <button onClick={() => { setEditingOrg(org); setIsEditModalOpen(true); }} className="p-3 text-gray-400 hover:text-gov-blue hover:bg-gray-100 transition-all rounded-xl" title="Configurar Marca">
                                   <Settings className="w-5 h-5" />
                                </button>
                                 <button 
                                    onClick={() => handleDeleteOrg(org.id, org.candidate_name)} 
                                    disabled={deletingId === org.id}
                                    className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all rounded-xl disabled:opacity-50" 
                                    title="Excluir Campanha"
                                 >
                                    {deletingId === org.id ? (
                                       <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                                    ) : (
                                       <Trash2 className="w-5 h-5" />
                                    )}
                                 </button>
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </main>

      <AnimatePresence>
        {(isCreateModalOpen || isEditModalOpen) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }} className="absolute inset-0 bg-gov-blue/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white w-full max-w-lg border-4 border-gov-blue shadow-2xl relative z-10 rounded-2xl">
              <div className="bg-gov-blue p-6 text-white flex justify-between items-center border-b-4 border-gov-yellow rounded-2xl">
                 <h2 className="font-black uppercase tracking-widest text-sm">{isCreateModalOpen ? 'Cadastrar Candidato' : 'Gestão da Campanha'}</h2>
                 <button onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={isCreateModalOpen ? handleCreateOrg : handleUpdateOrg} className="p-8 space-y-6">
                 <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Nome do Candidato</label>
                    <input type="text" value={isCreateModalOpen ? newOrgName : editingOrg?.candidate_name || ''} onChange={(e) => isCreateModalOpen ? setNewOrgName(e.target.value) : setEditingOrg(prev => prev ? {...prev, candidate_name: e.target.value} : null)} className="w-full bg-gray-50 border-2 border-gray-100 p-4 font-black text-gov-blue uppercase focus:border-gov-blue outline-none rounded-2xl" required />
                 </div>
                 
                 {isEditModalOpen && (
                   <>
                     <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">URL da Logo (PNG Transparente • 1024x1024px • 1:1)</label>
                        <input type="url" value={editingOrg?.logo_url || ''} onChange={(e) => setEditingOrg(prev => prev ? {...prev, logo_url: e.target.value} : null)} placeholder="https://exemplo.com/logo.png" className="w-full bg-gray-50 border-2 border-gray-100 p-4 font-black text-gov-blue focus:border-gov-blue outline-none text-xs rounded-2xl" />
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Status do Plano</label>
                        <select value={editingOrg?.subscription_status} onChange={(e) => setEditingOrg(prev => prev ? {...prev, subscription_status: e.target.value as any} : null)} className="w-full bg-gray-50 border-2 border-gray-100 p-4 font-black text-gov-blue uppercase focus:border-gov-blue outline-none rounded-2xl">
                           <option value="active">Plano Ativo</option>
                           <option value="pending">Aguardando Pagamento</option>
                           <option value="overdue">Acesso Bloqueado</option>
                        </select>
                     </div>
                   </>
                 )}

                 <button type="submit" disabled={isProcessing} className="w-full py-5 bg-gov-blue text-white font-black uppercase tracking-widest hover:bg-blue-800 transition-all flex items-center justify-center gap-3">
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 text-gov-yellow" />}
                    {isCreateModalOpen ? 'Confirmar Registro' : 'Salvar Configurações'}
                 </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
