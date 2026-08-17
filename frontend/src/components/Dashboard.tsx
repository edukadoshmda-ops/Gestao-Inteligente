import { useState, useEffect, useMemo } from 'react';
import { Member, Coordinator } from '../types';
import MemberList from './MemberList';
import MemberForm from './MemberForm';
import MemberDetailsModal from './MemberDetailsModal';
import CoordinatorForm from './CoordinatorForm';
import CoordinatorList from './CoordinatorList';
import Sidebar from './Sidebar';
import Toast from './Toast';
import { Plus, LogOut, Search, BarChart3, Download, X, Users, Hash, Clock, Upload, Share2, Copy, Check, ShieldCheck, MapPin, MessageSquare, AlertTriangle, AlertCircle, Gift, Smartphone, Database, Trash2, ArrowLeft, CreditCard, Target, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import AnalyticsTab from './AnalyticsTab';
import { useExcelTools } from '../hooks/useExcelTools';
import Chat from './Chat';
import Materials from './Materials';
import ElectoralIntelligence from './ElectoralIntelligence';
import AdminMaster from './AdminMaster';
import AIInsights from './AIInsights';
import ElectionDay from './ElectionDay';
import { checkPermissions, getNetworkFilter } from '../lib/permissions';

import { Organization, Profile } from '../types';


interface DashboardProps {
  username: string;
  organization: Organization | null;
  profile: Profile;
  onLogout: () => void;
  onShowSales?: () => void;
}

export default function Dashboard({ username, organization, profile, onLogout, onShowSales }: DashboardProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingCoordinator, setIsAddingCoordinator] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedCoordinator, setSelectedCoordinator] = useState<Coordinator | null>(null);
  const [activeCoordinator, setActiveCoordinator] = useState<Coordinator | null>(null);
  const [genderFilter, setGenderFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'list' | 'report' | 'gender' | 'coordinators' | 'ranking' | 'chat' | 'materials' | 'intelligence' | 'neighborhood' | 'admin_master' | 'ai_manager' | 'election_day'>('list');

  // Verificar permissões do usuário
  const permissions = checkPermissions(profile);
  const networkFilter = getNetworkFilter(profile);


  const [reportFilters, setReportFilters] = useState<Record<string, string>>({
    name: '',
    age: '',
    gender: '',
    phone: '',
    voterId: '',
    voterSection: '',
    voterZone: ''
  });
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [showShareModal, setShowShareModal] = useState(false);
  const [showBulkWhatsAppModal, setShowBulkWhatsAppModal] = useState(false);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [bulkMessage, setBulkMessage] = useState(`Olá! Gostaria de conversar sobre a campanha ${organization?.candidate_name || 'Campanha Eleitoral'}.`);
  const [copySuccess, setCopySuccess] = useState(false);
  const [systemNotice, setSystemNotice] = useState<{ title: string, msg: string } | null>(null);

  const isSuperAdmin = username.toLowerCase() === 'edukadoshmda@gmail.com' || username.toLowerCase() === 'admin' || profile.email?.toLowerCase() === 'edukadoshmda@gmail.com' || profile.role === 'super_admin';
  const isCampaignAdmin = profile.role === 'general_coordination' || profile.role === 'candidate' || isSuperAdmin;
  const isOverdue = organization?.subscription_status === 'overdue' && !isSuperAdmin;

  // Cores dinâmicas
  const primaryColor = organization?.theme_color || '#003366';

  const loggedInCoordinator = useMemo(() => {
    if (profile.role === 'coordinator') {
      return coordinators.find(c => c.id === profile.id || c.email?.toLowerCase() === profile.id.toLowerCase());
    }
    return null;
  }, [coordinators, profile]);

  // Função para formatar automaticamente para o padrão internacional do WhatsApp (55...)
  const formatWhatsAppNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    // Se já começar com 55 e tiver tamanho compatível (12 ou 13 dígitos)
    if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
      return cleaned;
    }
    // Se tiver 10 ou 11 dígitos (DDD + Número), assume que é Brasil e adiciona 55
    if (cleaned.length === 10 || cleaned.length === 11) {
      return `55${cleaned}`;
    }
    return cleaned;
  };

  const handleBulkWhatsApp = () => {
    // Busca o template da organização ou usa o padrão
    const template = organization?.welcome_template || `Olá {nome_eleitor}! Gostaria de conversar sobre a campanha ${organization?.candidate_name || 'Gestão Inteligente'}.`;

    const formattedPhones = filteredMembers
      .map(m => formatWhatsAppNumber(m.phone))
      .filter(p => p.startsWith('55') && p.length >= 12);

    if (formattedPhones.length === 0) {
      showToast("Nenhum contato válido encontrado.");
      return;
    }

    navigator.clipboard.writeText(formattedPhones.join('\n'));
    showToast(`${formattedPhones.length} números formatados (55...) copiados!`);

    if (formattedPhones.length === 1) {
      const firstMember = filteredMembers[0];
      const personalizedMsg = template.replace(/{nome_eleitor}/g, firstMember.name);
      const url = `https://wa.me/${formattedPhones[0]}?text=${encodeURIComponent(personalizedMsg)}`;
      window.open(url, '_blank');
    } else {
      alert(`Pronto! Copiamos ${formattedPhones.length} números no padrão internacional (55...) e sua mensagem de boas-vindas. \n\n1. Vá ao WhatsApp\n2. Crie uma Lista de Transmissão\n3. Cole os números.`);
    }
    setShowBulkWhatsAppModal(false);
  };

  const handleExportVCF = () => {
    const phonesToExport = filteredMembers.filter(m => m.phone && m.phone.length >= 8);
    if (phonesToExport.length === 0) {
      showToast("Nenhum contato válido para exportar.");
      return;
    }

    let vcfContent = '';
    phonesToExport.forEach(m => {
      const phone = m.phone.replace(/\D/g, '');
      const cleanName = m.name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      vcfContent += 'BEGIN:VCARD\r\n';
      vcfContent += 'VERSION:3.0\r\n';
      vcfContent += `FN:${cleanName} (${organization?.candidate_name || 'GESTÃO INTELIGENTE'})\r\n`;
      vcfContent += `TEL;TYPE=CELL,VOICE:${phone}\r\n`;
      vcfContent += 'END:VCARD\r\n';
    });

    try {
      const blob = new Blob([vcfContent], { type: 'text/vcard;charset=utf-8' });
      const fileName = `AGENDA_ELEITORES_${new Date().getTime()}.vcf`;
      const file = new File([blob], fileName, { type: 'text/vcard' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: 'Agenda Gestão Inteligente',
          text: 'Importe estes contatos para sua agenda.'
        }).then(() => showToast('✅ Agenda compartilhada!'))
          .catch(() => downloadVCF(blob, fileName));
      } else {
        downloadVCF(blob, fileName);
      }
    } catch (err) {
      showToast('⚠️ Erro ao gerar agenda. Tente novamente.');
    }
  };

  const sendBirthdayMessage = (member: Member) => {
    const template = organization?.birthday_template || `Parabéns {nome_eleitor}! 🎉 Muita saúde e felicidade hoje!`;
    const personalizedMsg = template.replace(/{nome_eleitor}/g, member.name);
    const phone = formatWhatsAppNumber(member.phone);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(personalizedMsg)}`;
    window.open(url, '_blank');
  };

  const downloadVCF = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('✅ Arquivo de agenda baixado! Abra-o para salvar os contatos.');
  };

  useEffect(() => {
    // Buscar membros com filtro de rede se aplicável
    db.getMembers().then(allMembers => {
      if (networkFilter) {
        // Filtrar membros pela rede do coordenador
        const networkMembers = allMembers.filter(m => m.network_id === profile.id);
        setMembers(networkMembers);
      } else {
        setMembers(allMembers);
      }
    });

    // Buscar coordenadores com filtro de rede se aplicável
    db.getCoordinators().then(allCoordinators => {
      if (networkFilter) {
        // Filtrar coordenadores pela rede
        const networkCoordinators = allCoordinators.filter(c => c.network_id === profile.id);
        setCoordinators(networkCoordinators);
      } else {
        setCoordinators(allCoordinators);
      }
    });

    // Busca aviso dinâmico do Supabase
    const fetchNotice = async () => {
      if (!supabase) return;
      try {
        const { data } = await supabase
          .from('announcements')
          .select('title, content')
          .limit(1)
          .maybeSingle();

        if (data) setSystemNotice({ title: data.title, msg: data.content });
      } catch {
        // Tabela não existe ou sem permissão — silencioso
      }
    };
    fetchNotice();
  }, []);

  // Debounce para busca profissional
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300); // Ajustado para 300ms
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Identifica aniversariantes do dia e da semana
  const birthdayMembers = useMemo(() => {
    const today = new Date();
    const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return members.filter(m => {
      if (!m.birthDate) return false;
      return m.birthDate.endsWith(monthDay);
    });
  }, [members]);

  const weekBirthdaysCount = useMemo(() => {
    const today = new Date();
    let count = 0;
    
    for (let i = 1; i <= 7; i++) {
      const nextDate = new Date();
      nextDate.setDate(today.getDate() + i);
      const nextStr = `${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
      
      count += members.filter(m => m.birthDate && m.birthDate.endsWith(nextStr)).length;
    }
    return count;
  }, [members]);


  const showToast = (message: string) => {
    setToast({ message, visible: true });
  };

  const saveMembers = async (data: Member[]) => {
    setMembers(data);
    await db.saveMembers(data);
  };

  const handleAddMember = (memberData: Omit<Member, 'id' | 'createdAt'>) => {
    const finalMemberData = { ...memberData };

    // Prioriza o network_id do formulário (vem do MemberForm), se não tiver usa o networkFilter
    const memberNetworkId = (memberData as any).network_id || (networkFilter ? profile.id : undefined);

    if (!isSuperAdmin && loggedInCoordinator) {
      finalMemberData.coordinatorId = loggedInCoordinator.id;
    }

    // Validação de Duplicidade (Regra de Negócio Profissional)
    if (finalMemberData.voterId) {
      const isDuplicate = members.some(m =>
        m.voterId === finalMemberData.voterId &&
        m.id !== selectedMember?.id
      );

      if (isDuplicate) {
        alert('⚠️ ATENÇÃO: Este Título de Eleitor já consta na nossa base de dados!');
        return;
      }
    }

    // Validação de permissão: Coordenador não pode criar membro sem network_id
    if (!isSuperAdmin && profile.role === 'coordinator' && !memberNetworkId) {
      alert('⚠️ ERRO: Coordenador deve estar associado a uma rede para cadastrar membros.');
      return;
    }

    if (selectedMember) {
      const updatedMembers = members.map(m =>
        m.id === selectedMember.id ? { ...m, ...finalMemberData } : m
      );
      saveMembers(updatedMembers);
      setSelectedMember(null);
      showToast('Registro atualizado com sucesso!');
      setIsAdding(false);
    } else {
      const newMember: Member = {
        ...finalMemberData,
        id: crypto.randomUUID().split('-')[0],
        createdAt: new Date().toISOString(),
        org_id: organization?.id,
        network_id: memberNetworkId
      };
      saveMembers([newMember, ...members]);
      showToast('Registro cadastrado com sucesso!');
      setIsAdding(false);
    }
  };

  const handleAddCoordinator = async (coordData: Omit<Coordinator, 'id' | 'createdAt'>) => {
    if (selectedCoordinator) {
      const updated = coordinators.map(c =>
        c.id === selectedCoordinator.id ? { ...c, ...coordData } : c
      );
      setCoordinators(updated);
      await db.saveCoordinators(updated);
      setSelectedCoordinator(null);
      showToast('Coordenador atualizado!');
    } else {
      const newCoord: Coordinator = {
        ...coordData,
        id: crypto.randomUUID().split('-')[0],
        createdAt: new Date().toISOString(),
        org_id: organization?.id,
        network_id: networkFilter ? profile.id : undefined // Adiciona network_id se for coordenador criando sub-coordenador
      };
      const updated = [newCoord, ...coordinators];
      setCoordinators(updated);
      await db.saveCoordinators(updated);
      showToast('Coordenador cadastrado!');
    }
    setIsAddingCoordinator(false);
  };

  const { handleImportExcel, handleExportExcel, isExporting } = useExcelTools(members, saveMembers, showToast, organization);

  const handleClearAll = async () => {
    if (!confirm('Deseja REALMENTE apagar TODOS os eleitores cadastrados? Esta ação não pode ser desfeita.')) return;
    
    try {
      setMembers([]);
      localStorage.removeItem('forja_members_data');
      
      if (supabase) {
        const { error } = await supabase.from('members').delete().neq('id', 'x');
        if (error) throw error;
      }
      
      showToast('Base de dados limpa com sucesso!');
    } catch (err: any) {
      console.error('Erro ao limpar base:', err);
      showToast('Erro ao limpar alguns dados da nuvem.');
    }
  };

  const handleClearCoordinators = async () => {
    if (!confirm('Deseja REALMENTE apagar TODOS os coordenadores cadastrados? Esta ação não pode ser desfeita.')) return;
    
    try {
      setCoordinators([]);
      await db.saveCoordinators([]);
      
      if (supabase) {
        const { error } = await supabase.from('coordinators').delete().neq('id', 'x');
        if (error) throw error;
      }
      
      showToast('Coordenadores apagados com sucesso!');
    } catch (err: any) {
      console.error('Erro ao apagar coordenadores:', err);
      showToast('Erro ao limpar alguns dados da nuvem.');
    }
  };



  const filteredMembers = useMemo(() => {
    let baseMembers = members;

    // RESTRIÇÃO DE CARGO: Coordenador só vê os seus membros
    if (!isCampaignAdmin && profile.role === 'coordinator') {
      baseMembers = members.filter(m => m.coordinatorId === profile.id);
    }

    if (!debouncedSearch.trim()) return baseMembers;

    const term = debouncedSearch.toLowerCase().trim();
    return baseMembers.filter(m =>
      m.name.toLowerCase().includes(term) ||
      m.phone.includes(term) ||
      (m.voterId && m.voterId.includes(term))
    );
  }, [members, debouncedSearch, isCampaignAdmin, profile.id]);


  if (isOverdue && !isSuperAdmin) {
    return (
      <div className="h-screen bg-white flex flex-col items-center justify-center p-6 text-center rounded-2xl">
        <div className="bg-red-50 p-12 border-4 border-red-500 shadow-2xl max-w-md rounded-2xl">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-red-700 uppercase mb-4">Acesso Suspenso</h2>
          <p className="text-sm font-bold text-red-600/70 uppercase leading-relaxed mb-8">
            A assinatura desta campanha está pendente ou atrasada. Por favor, entre em contato com o administrador financeiro.
          </p>
          <button 
            onClick={onLogout}
            className="w-full py-4 bg-red-600 text-white font-black uppercase text-sm rounded-xl"
          >
            Fazer Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gov-bg flex flex-row overflow-hidden" style={{ '--gov-blue': primaryColor } as any}>
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onLogout={onLogout} 
        username={username} 
        candidateName={organization?.candidate_name}
        role={profile.role}
        logoUrl={organization?.logo_url}
      />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-16 lg:pt-8 pb-6">
          {isOverdue && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-10 bg-red-600 p-8 border-b-8 border-red-900 shadow-2xl text-white text-center relative overflow-hidden rounded-2xl"
            >
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <AlertCircle className="w-48 h-48" />
               </div>
               <div className="relative z-10 max-w-2xl mx-auto">
                 <h2 className="text-3xl font-black uppercase italic mb-2 tracking-tighter">Acesso Bloqueado</h2>
                 <p className="text-sm font-bold uppercase mb-6 text-red-100">Sua assinatura está vencida. Regularize seu pagamento para continuar usando a plataforma.</p>
                 <button 
                   onClick={onShowSales}
                   className="px-10 py-4 bg-white text-red-600 font-black uppercase text-xs tracking-widest hover:bg-gray-100 transition-all shadow-xl flex items-center justify-center gap-3 mx-auto rounded-2xl"
                 >
                   <CreditCard className="w-5 h-5" /> Regularizar Agora
                 </button>
               </div>
            </motion.div>
          )}
          {/* Banner de Aviso do Sistema */}
          <AnimatePresence>
            {systemNotice && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mb-6 bg-gov-yellow border-l-8 border-gov-blue p-4 flex items-center justify-between shadow-lg rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-gov-blue" />
                  <div>
                    <h4 className="font-black text-[10px] uppercase text-gov-blue leading-none">{systemNotice.title}</h4>
                    <p className="text-xs font-bold text-gov-blue/80 mt-1">{systemNotice.msg}</p>
                  </div>
                </div>
                <button onClick={() => setSystemNotice(null)} className="text-gov-blue/50 hover:text-gov-blue">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

            {/* Banner de Aniversariantes */}
            <AnimatePresence>
              {birthdayMembers.length > 0 && !isAdding && (
                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="mb-6 bg-white border-l-8 border-green-500 p-5 flex items-center justify-between shadow-xl ring-1 ring-black/5 rounded-2xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-full animate-bounce">
                      <Gift className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-black text-xs uppercase text-gov-blue">Aniversariantes de Hoje! 🎂</h4>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Temos {birthdayMembers.length} pessoas soprando velinhas na base hoje.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBirthdayModal(true)}
                    className="bg-green-500 text-white px-4 py-2 font-black uppercase text-[9px] hover:bg-green-600 transition-all shadow-md rounded-xl"
                  >
                    Ver e Parabenizar
                  </button>
                </motion.div>
              )}

              {/* Widget de Metas Estratégicas para Coordenadores */}
              {activeTab === 'list' && organization?.welcome_template?.startsWith('{') && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="mb-6 glass-panel-dark hover-lift p-6 border-l-4 border-gov-yellow rounded-2xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Target className="w-24 h-24 text-white" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-gov-yellow animate-pulse" />
                      <h4 className="text-white font-black uppercase text-sm tracking-widest">Ordem do Dia: Metas da Campanha</h4>
                    </div>
                    
                    {(() => {
                      try {
                        const data = JSON.parse(organization.welcome_template);
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white/10 p-4 border border-white/10 rounded-xl">
                              <p className="text-[9px] font-black text-gov-yellow uppercase mb-1">Meta da Semana</p>
                              <p className="text-2xl font-black text-white">{data.goals.weekly} <span className="text-[10px] opacity-50">Votos</span></p>
                            </div>
                            <div className="bg-white/10 p-4 border border-white/10 rounded-xl">
                              <p className="text-[9px] font-black text-gov-yellow uppercase mb-1">Ação Estratégica</p>
                              <p className="text-[11px] font-bold text-blue-100 leading-tight">
                                {data.plan.cronograma[0].acao}
                              </p>
                            </div>
                            <div className="bg-white/10 p-4 border border-white/10 rounded-xl">
                              <p className="text-[9px] font-black text-gov-yellow uppercase mb-1">Foco Mensal</p>
                              <p className="text-2xl font-black text-white">{data.goals.monthly} <span className="text-[10px] opacity-50">Votos</span></p>
                            </div>
                          </div>
                        );
                      } catch (e) { return null; }
                    })()}
                  </div>
                </motion.div>
              )}

              {weekBirthdaysCount > 0 && birthdayMembers.length === 0 && !isAdding && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-6 bg-blue-50 border-l-8 border-blue-500 p-4 flex items-center gap-4 shadow-sm rounded-2xl"
                >
                  <Gift className="w-5 h-5 text-blue-500" />
                  <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
                    Atenção: {weekBirthdaysCount} eleitores farão aniversário nos próximos 7 dias. Prepare as mensagens!
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

          <AnimatePresence mode="wait">
            {isAdding ? (
              <MemberForm
                onSave={handleAddMember}
                onCancel={() => { setIsAdding(false); setSelectedMember(null); }}
                initialData={selectedMember}
                coordinators={coordinators}
                networkId={networkFilter ? profile.id : undefined}
              />
            ) : isAddingCoordinator ? (
              <CoordinatorForm
                onSave={handleAddCoordinator}
                onCancel={() => { setIsAddingCoordinator(false); setSelectedCoordinator(null); }}
                initialData={selectedCoordinator}
                networkId={networkFilter ? profile.id : undefined}
                availableCoordinators={coordinators}
              />
            ) : (
              <div className="space-y-6">
                {/* Header / Toolbar */}
                <div className="glass-panel p-4 rounded-2xl flex flex-col xl:flex-row justify-between items-center gap-4 hover-lift">
                  <div className="flex flex-col flex-1 w-full lg:min-w-[250px]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      <span className="text-[10px] font-black text-gov-blue uppercase tracking-widest">Base: {members.length} registros sincronizados</span>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gov-blue/30" />
                      <input
                        type="text"
                        placeholder="Buscar eleitor por nome, fone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 outline-none focus:border-gov-blue uppercase text-[10px] font-bold tracking-wider rounded-2xl"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-start xl:justify-end gap-2 w-full xl:w-auto">
                    <input type="file" id="xl-import" accept=".xlsx,.xls,.csv" onChange={handleImportExcel} className="hidden" />

                    <button
                      onClick={handleExportVCF}
                      className="bg-indigo-600 text-white px-3 py-3 font-black uppercase text-[8px] sm:text-[9px] flex items-center justify-center gap-1.5 hover:bg-indigo-700 transition-all shadow-sm rounded-2xl"
                      title="Salvar Contatos no Celular"
                    >
                      <Smartphone className="w-3.5 h-3.5" /> Agenda
                    </button>

                    <button
                      onClick={() => setShowBulkWhatsAppModal(true)}
                      className="bg-green-500 text-white px-3 py-3 font-black uppercase text-[8px] sm:text-[9px] flex items-center justify-center gap-1.5 hover:bg-green-600 transition-all shadow-sm rounded-2xl"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Transmissão
                    </button>

                    <button
                      onClick={() => setShowShareModal(true)}
                      className="bg-white text-green-600 border border-green-600 px-3 py-3 font-black uppercase text-[8px] sm:text-[9px] flex items-center justify-center gap-1.5 hover:bg-green-50 transition-all rounded-2xl"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Cadastro
                    </button>

                    <button
                      onClick={() => document.getElementById('xl-import')?.click()}
                      className="bg-white text-gov-blue border border-gov-blue px-3 py-3 font-black uppercase text-[8px] sm:text-[9px] flex items-center justify-center gap-1.5 hover:bg-blue-50 transition-all rounded-2xl"
                    >
                      <Upload className="w-3.5 h-3.5" /> Importar
                    </button>

                    <button
                      onClick={handleExportExcel}
                      disabled={isExporting}
                      className={` ${isExporting ? 'bg-gray-100 text-gray-400' : 'bg-gov-yellow text-gov-blue hover:shadow-md'} px-3 py-3 font-black uppercase text-[8px] sm:text-[9px] flex items-center justify-center gap-1.5 transition-all border border-gov-blue/10 rounded-2xl`}
                    >
                      <Download className="w-3.5 h-3.5" /> {isExporting ? '...' : 'Exportar'}
                    </button>

                    {permissions.canCreateMembers && (
                      <button
                        onClick={() => setIsAdding(true)}
                        className="col-span-2 sm:col-span-1 bg-gov-blue text-white px-4 py-3 font-black uppercase text-[10px] flex items-center justify-center gap-1.5 shadow-md hover:bg-blue-800 transition-all rounded-2xl"
                      >
                        <Plus className="w-4 h-4" /> Novo Registro
                      </button>
                    )}

                    {isSuperAdmin && (
                      <button
                        onClick={handleClearAll}
                        className="col-span-2 sm:col-span-1 bg-red-50 text-red-600 border border-red-200 px-4 py-3 font-black uppercase text-[10px] flex items-center justify-center gap-1.5 hover:bg-red-100 transition-all rounded-2xl"
                        title="Limpar toda a base de dados"
                      >
                        <Trash2 className="w-4 h-4" /> Apagar Tudo
                      </button>
                    )}


                  </div>
                </div>

                {activeTab === 'coordinators' ? (
                  <div className="space-y-6">
                    <div className="bg-white p-6 border-b-4 border-gov-yellow shadow-md flex justify-between items-center rounded-2xl">
                      <h3 className="text-xl font-black text-gov-blue uppercase">Gestão de Coordenadores</h3>
                      <div className="flex gap-2">
                        {isSuperAdmin && (
                          <button
                            onClick={handleClearCoordinators}
                            className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 font-black uppercase text-[10px] flex items-center gap-2 rounded-2xl hover:bg-red-100"
                            title="Apagar Todos os Coordenadores"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {permissions.canCreateCoordinators && (
                          <button
                            onClick={() => setIsAddingCoordinator(true)}
                            className="bg-gov-blue text-white px-6 py-3 font-black uppercase text-[10px] flex items-center gap-2 rounded-2xl"
                          >
                            <Plus className="w-4 h-4" /> Novo Coordenador
                          </button>
                        )}
                      </div>
                    </div>
                    <CoordinatorList
                      coordinators={coordinators}
                      onEdit={(c) => { setSelectedCoordinator(c); setIsAddingCoordinator(true); }}
                      onDelete={permissions.canDeleteCoordinators ? async (id) => {
                        const updated = coordinators.filter(c => c.id !== id);
                        setCoordinators(updated);
                        await db.saveCoordinators(updated);
                      } : undefined}
                      onSelect={(c) => {
                        setActiveCoordinator(c);
                        setActiveTab('list');
                      }}
                    />
                  </div>
                ) : activeTab === 'list' ? (
                  <div className="space-y-6">
                    {activeCoordinator && (
                      <div className="bg-gov-blue p-4 text-white flex justify-between items-center border-l-8 border-gov-yellow rounded-2xl">
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => setActiveCoordinator(null)}
                            className="p-2 hover:bg-white/10 rounded-full transition-all group"
                            title="Voltar para lista geral"
                          >
                            <ArrowLeft className="w-6 h-6 text-gov-yellow group-hover:scale-125 transition-transform" />
                          </button>
                          <ShieldCheck className="w-6 h-6 text-gov-yellow hidden sm:block" />
                          <div>
                            <h4 className="font-black uppercase text-xs">Relatório Individual: {activeCoordinator.name}</h4>
                            <p className="text-[10px] text-blue-200 uppercase font-bold tracking-widest">Mostrando apenas eleitores cadastrados por este coordenador</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveCoordinator(null)}
                          className="bg-white/10 hover:bg-white/20 px-3 py-1 text-[10px] font-black uppercase rounded-2xl"
                        >
                          Ver Tudo
                        </button>
                      </div>
                    )}
                    <MemberList
                      members={activeCoordinator
                        ? filteredMembers.filter(m => m.coordinatorId === activeCoordinator.id)
                        : filteredMembers}
                      onEdit={(m) => { setSelectedMember(m); setIsAdding(true); }}
                      onDelete={(id) => saveMembers(members.filter(m => m.id !== id))}
                      onSelect={() => { }}
                      welcomeTemplate={organization?.welcome_template}
                    />
                  </div>
                ) : activeTab === 'chat' ? (
                  <Chat 
                    currentUser={{ 
                      id: isSuperAdmin ? 'admin' : loggedInCoordinator?.id || 'anon',
                      name: isSuperAdmin ? 'Suporte Gestão Inteligente' : loggedInCoordinator?.name || 'Coordenador'
                    }}
                    org_id={organization?.id}
                  />
                ) : activeTab === 'materials' ? (
                  <Materials isAdmin={isSuperAdmin} organization={organization} />
                ) : activeTab === 'intelligence' ? (
                  <ElectoralIntelligence members={members} coordinators={coordinators} organization={organization} />
                ) : activeTab === 'ai_manager' ? (
                  <AIInsights 
                    members={members} 
                    coordinators={coordinators} 
                    organization={organization}
                  />
                ) : activeTab === 'election_day' ? (
                  <ElectionDay members={members} />
                ) : activeTab === 'admin_master' && permissions.canAccessAdminMaster ? (
                  <AdminMaster />
                ) : (

                  <AnalyticsTab
                    members={members}
                    coordinators={coordinators}
                    activeTab={activeTab as 'gender' | 'report' | 'ranking' | 'neighborhood'}
                  />

                )}
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Modal de Compartilhamento WhatsApp */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gov-blue/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 border-4 border-gov-blue max-w-sm w-full text-center shadow-2xl relative rounded-2xl"
            >
              <button
                onClick={() => setShowShareModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gov-blue"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Share2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-black text-gov-blue uppercase mb-2">Link de Cadastro</h3>
              <p className="text-[10px] text-gray-500 mb-6 font-bold uppercase tracking-widest leading-relaxed">
                Envie este link para sua equipe ou em grupos de WhatsApp para que os apoiadores se cadastrem sozinhos.
              </p>
              <div className="bg-gray-50 p-4 border-2 border-dashed border-gov-blue/20 mb-6 break-all text-[10px] font-mono font-bold text-blue-600 select-all rounded-2xl">
                {window.location.origin}?org={organization?.id}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}?org=${organization?.id}`);
                  setCopySuccess(true);
                  setTimeout(() => setCopySuccess(false), 2000);
                }}
                className={`w-full py-4 ${copySuccess ? 'bg-green-600' : 'bg-gov-blue'} text-white font-black uppercase text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg`}
              >
                {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copySuccess ? 'Copiado para a área de transferência!' : 'Copiar Link para WhatsApp'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Composição de Mensagem em Massa */}
      <AnimatePresence>
        {showBulkWhatsAppModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gov-blue/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 border-4 border-gov-blue max-w-lg w-full shadow-2xl relative rounded-2xl"
            >
              <button onClick={() => setShowBulkWhatsAppModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gov-blue">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-black text-gov-blue uppercase mb-4 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-green-500" /> Transmissão WhatsApp
              </h3>
              <p className="text-[10px] text-gray-500 mb-4 font-bold uppercase tracking-widest">
                Enviando para os {filteredMembers.length} eleitores filtrados na tela.
              </p>
              <textarea
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
                className="w-full h-32 p-4 bg-gray-50 border-2 border-gray-100 outline-none focus:border-gov-blue font-medium text-sm mb-6 resize-none rounded-2xl"
                placeholder="Escreva sua mensagem aqui..."
              />
              <button
                onClick={handleBulkWhatsApp}
                className="w-full py-4 bg-green-500 text-white font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-green-600 transition-all shadow-lg rounded-2xl"
              >
                <Copy className="w-4 h-4" /> Copiar Números e Preparar Envio
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Listagem de Aniversariantes */}
      <AnimatePresence>
        {showBirthdayModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gov-blue/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border-4 border-gov-blue max-w-md w-full shadow-2xl overflow-hidden rounded-2xl"
            >
              <div className="bg-gov-blue p-6 text-white border-b-4 border-gov-yellow flex justify-between items-center rounded-2xl">
                <h3 className="text-lg font-black uppercase flex items-center gap-2">
                  <Gift className="w-5 h-5 text-gov-yellow" /> Parabéns do Dia
                </h3>
                <button onClick={() => setShowBirthdayModal(false)}><X className="w-5 h-5" /></button>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {birthdayMembers.map(member => (
                  <div key={member.id} className="p-4 border-b border-gray-100 flex items-center justify-between hover:bg-gov-bg transition-colors rounded-2xl">
                    <div>
                      <p className="font-black text-gov-blue uppercase text-xs">{member.name}</p>
                      <p className="text-[10px] font-bold text-blue-400 uppercase">{member.phone}</p>
                    </div>
                    <button
                      onClick={() => sendBirthdayMessage(member)}
                      className="bg-green-500 text-white p-2 rounded-xl hover:bg-green-600 transition-all group"
                      title="Mandar Parabéns"
                    >
                      <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-6 bg-gray-50 text-center rounded-2xl">
                <p className="text-[9px] font-black text-gray-400 uppercase mb-4 tracking-tighter">
                  Dica: Manter contato em datas especiais aumenta a fidelidade do eleitor.
                </p>
                <button
                  onClick={() => setShowBirthdayModal(false)}
                  className="w-full py-3 bg-gov-blue text-white font-black uppercase text-xs tracking-widest"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {toast.visible && <Toast message={toast.message} isVisible={toast.visible} onClose={() => setToast({ ...toast, visible: false })} />}
    </div>
  );
}
