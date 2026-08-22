import { useState, useEffect, useMemo, useCallback } from 'react';
import { Member, Coordinator } from '../types';
import MemberList from './MemberList';
import MemberForm from './MemberForm';
import MemberDetailsModal from './MemberDetailsModal';
import CoordinatorForm from './CoordinatorForm';
import CoordinatorList from './CoordinatorList';
import Sidebar from './Sidebar';
import Toast from './Toast';
import { Plus, LogOut, Search, BarChart3, Download, X, Users, Hash, Clock, Upload, Share2, Copy, Check, ShieldCheck, MapPin, MessageSquare, AlertTriangle, AlertCircle, Gift, Smartphone, Database, Trash2, ArrowLeft, CreditCard, Target, Sparkles, Settings as SettingsIcon } from 'lucide-react';
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
import Settings from './Settings';
import { checkPermissions, getNetworkFilter } from '../lib/permissions';

import { Organization, Profile } from '../types';


interface DashboardProps {
  username: string;
  organization: Organization | null;
  profile: Profile;
  onLogout: () => void;
  onShowSales?: () => void;
  onToggleRoot?: () => void;
  isRootView?: boolean;
}

export default function Dashboard({ username, organization, profile, onLogout, onShowSales, onToggleRoot }: DashboardProps) {
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
  const [activeTab, setActiveTab] = useState<'list' | 'report' | 'gender' | 'coordinators' | 'ranking' | 'chat' | 'materials' | 'intelligence' | 'neighborhood' | 'admin_master' | 'ai_manager' | 'election_day' | 'settings'>('list');

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
  const [showCoordShareModal, setShowCoordShareModal] = useState(false);
  const [showBulkWhatsAppModal, setShowBulkWhatsAppModal] = useState(false);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [bulkMessage, setBulkMessage] = useState(`Olá! Gostaria de conversar sobre a campanha ${organization?.candidate_name || 'Campanha Eleitoral'}.`);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyCoordSuccess, setCopyCoordSuccess] = useState(false);
  const [systemNotice, setSystemNotice] = useState<{ title: string, msg: string } | null>(null);

  const isSuperAdmin = username.toLowerCase().includes('edukadoshmda') || 
                       username.toLowerCase() === 'admin' || 
                       (profile.email && profile.email.toLowerCase().includes('edukadoshmda')) || 
                       profile.role === 'super_admin';
  const isCampaignAdmin = profile.role === 'general_coordination' || profile.role === 'candidate' || isSuperAdmin;
  const isOverdue = organization?.subscription_status === 'overdue' && !isSuperAdmin;

  // Cores dinâmicas da campanha
  const primaryColor = organization?.theme_primary || organization?.theme_color || '#003366';
  const secondaryColor = organization?.theme_secondary || '#FFCC00';

  const loggedInCoordinator = useMemo(() => {
    if (profile.role === 'coordinator') {
      return coordinators.find(c => c.id === profile.id || c.email?.toLowerCase() === profile.id.toLowerCase());
    }
    return null;
  }, [coordinators, profile]);

  const effectiveOrgId = useMemo(() => {
    if (organization?.id && organization.id !== 'demo-org' && organization.id !== 'undefined') {
      return organization.id;
    }
    if (profile?.organization_id && profile.organization_id !== 'demo-org') {
      return profile.organization_id;
    }
    if (profile?.org_id && profile.org_id !== 'demo-org') {
      return profile.org_id;
    }
    const urlOrg = new URLSearchParams(window.location.search).get('org');
    if (urlOrg && urlOrg !== 'demo-org') {
      return urlOrg;
    }
    try {
      const saved = JSON.parse(localStorage.getItem('forja_current_organization') || '{}');
      if (saved?.id && saved.id !== 'demo-org') return saved.id;
    } catch {}
    return '6de1ca5c-a3fd-43e1-90ef-4aca4afb2238';
  }, [organization, profile]);

  const effectiveCandidateName = useMemo(() => {
    if (organization?.candidate_name && organization.candidate_name !== 'Visitante' && organization.candidate_name !== 'Administrador') {
      return organization.candidate_name;
    }
    try {
      const saved = JSON.parse(localStorage.getItem('forja_current_organization') || '{}');
      if (saved?.candidate_name && saved.candidate_name !== 'Visitante') return saved.candidate_name;
    } catch {}
    return 'Gestão Inteligente';
  }, [organization]);

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

  const loadDashboardData = useCallback(() => {
    const currentOrgId = organization?.id || profile?.organization_id || profile?.org_id;

    // Buscar coordenadores e membros com persistência resiliente e filtro de hierarquia de rede
    Promise.all([
      db.getCoordinators(currentOrgId),
      db.getMembers(currentOrgId)
    ]).then(([allCoordinators, allMembers]) => {
      if (networkFilter?.isRestricted) {
        if (networkFilter.isArea) {
          // Coordenador de Área: vê seus coordenadores de campo subordinados e os eleitores vinculados à sua rede (e registros da campanha)
          const mySubordinates = allCoordinators.filter(c => c.network_id === profile.id || c.id === profile.id);
          const subordinateIds = new Set(mySubordinates.map(c => c.id));
          subordinateIds.add(profile.id);

          setCoordinators(mySubordinates);
          const networkMembers = allMembers.filter(m => 
            m.network_id === profile.id || 
            (m.coordinatorId && subordinateIds.has(m.coordinatorId)) ||
            !m.coordinatorId // Apoiadores cadastrados pelo link geral da campanha
          );
          setMembers(networkMembers.length > 0 ? networkMembers : allMembers);
        } else if (networkFilter.isField) {
          // Coordenador de Campo: sem lista de outros coordenadores, apenas seus eleitores cadastrados
          setCoordinators([]);
          const fieldMembers = allMembers.filter(m => 
            m.coordinatorId === profile.id || 
            m.network_id === profile.id
          );
          setMembers(fieldMembers);
        }
      } else {
        // Candidato, Coordenador Geral e Super Admin têm VISÃO TOTAL DA CAMPANHA
        setCoordinators(allCoordinators);
        setMembers(allMembers);
      }
    }).catch(err => {
      console.warn("Aviso ao carregar dados do dashboard:", err);
    });
  }, [organization?.id, profile?.organization_id, profile?.org_id, profile.id, networkFilter]);

  useEffect(() => {
    loadDashboardData();

    // Sincronização automática quando a janela ganha foco ou quando há novo cadastro em outra aba
    const handleStorageChange = () => loadDashboardData();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);
    window.addEventListener('member_registered', handleStorageChange);

    // Canal Realtime do Supabase para atualização instantânea de novos membros
    let subscription: any = null;
    if (supabase) {
      subscription = supabase
        .channel('dashboard-realtime-members')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
          loadDashboardData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'coordinators' }, () => {
          loadDashboardData();
        })
        .subscribe();
    }

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

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
      window.removeEventListener('member_registered', handleStorageChange);
      if (subscription && supabase) {
        supabase.removeChannel(subscription);
      }
    };
  }, [loadDashboardData]);

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
    const currentOrgId = organization?.id || profile?.organization_id || profile?.org_id;
    await db.saveMembers(data, currentOrgId);
  };

  const handleAddMember = (memberData: Omit<Member, 'id' | 'createdAt'>) => {
    const finalMemberData = { ...memberData };

    // Prioriza o network_id do formulário (vem do MemberForm), se não tiver usa o networkFilter
    let memberNetworkId = (memberData as any).network_id || (networkFilter ? profile.id : undefined);

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

    // Atribuição automática de rede e coordenador para novos eleitores
    if (profile.role === 'coordinator' || profile.role === 'area_coordinator') {
      if (!memberNetworkId) memberNetworkId = profile.id;
      if (!finalMemberData.coordinatorId) finalMemberData.coordinatorId = profile.id;
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
    const currentOrgId = organization?.id || profile?.organization_id || profile?.org_id;
    const coordEmail = coordData.email?.trim().toLowerCase();
    const coordPass = (coordData as any).password;

    if (coordEmail && coordPass) {
      localStorage.setItem(`@AppGestao:userPass_${coordEmail}`, coordPass);
      localStorage.setItem(`@AppGestao:coordPass_${coordEmail}`, coordPass);
    }

    if (selectedCoordinator) {
      const updated = coordinators.map(c =>
        c.id === selectedCoordinator.id ? { ...c, ...coordData } : c
      );
      setCoordinators(updated);
      await db.saveCoordinators(updated, currentOrgId);
      setSelectedCoordinator(null);
      showToast('Coordenador atualizado!');
    } else {
      const newCoord: Coordinator = {
        ...coordData,
        id: crypto.randomUUID().split('-')[0],
        createdAt: new Date().toISOString(),
        org_id: currentOrgId,
        network_id: networkFilter ? profile.id : undefined // Adiciona network_id se for coordenador criando sub-coordenador
      };
      const updated = [newCoord, ...coordinators];
      setCoordinators(updated);
      await db.saveCoordinators(updated, currentOrgId);
      showToast('Coordenador cadastrado!');
    }
    setIsAddingCoordinator(false);
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Deseja realmente excluir este eleitor?')) return;
    try {
      const currentOrgId = organization?.id || profile?.organization_id || profile?.org_id;
      setMembers(prev => prev.filter(m => m.id !== id));
      await db.deleteMember(id, currentOrgId);
      showToast('Eleitor excluído com sucesso!');
    } catch (err) {
      console.error('Erro ao excluir eleitor:', err);
      showToast('Erro ao excluir eleitor.');
    }
  };

  const handleDeleteCoordinator = async (id: string) => {
    if (!confirm('Deseja realmente excluir este coordenador?')) return;
    try {
      const currentOrgId = organization?.id || profile?.organization_id || profile?.org_id;
      setCoordinators(prev => prev.filter(c => c.id !== id));
      await db.deleteCoordinator(id, currentOrgId);
      showToast('Coordenador excluído com sucesso!');
    } catch (err) {
      console.error('Erro ao excluir coordenador:', err);
      showToast('Erro ao excluir coordenador.');
    }
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
    <div 
      className="h-screen bg-gov-bg flex flex-row overflow-hidden" 
      style={{ 
        '--theme-primary': primaryColor,
        '--theme-secondary': secondaryColor,
        '--color-gov-blue': primaryColor, 
        '--color-gov-yellow': secondaryColor 
      } as any}
    >
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
                geminiApiKey={organization?.gemini_api_key}
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

                    {isSuperAdmin && onToggleRoot && (
                      <button
                        onClick={onToggleRoot}
                        className="bg-gov-blue text-white border-2 border-gov-yellow px-2.5 py-2.5 sm:px-3 sm:py-2.5 font-black uppercase text-[7.5px] sm:text-[8px] flex items-center justify-center gap-1 hover:bg-blue-900 hover:scale-105 transition-all shadow-sm rounded-2xl group"
                        title="Abrir Painel Root"
                      >
                        <SettingsIcon className="w-3 h-3 text-gov-yellow group-hover:rotate-90 transition-transform shrink-0" />
                        <span>Painel Root</span>
                      </button>
                    )}

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

                    <button
                      onClick={() => setShowShareModal(true)}
                      className="bg-teal-600 text-white px-3 py-3 font-black uppercase text-[8px] sm:text-[9px] flex items-center justify-center gap-1.5 hover:bg-teal-700 transition-all shadow-sm rounded-2xl"
                      title="Copiar e compartilhar link de cadastro de eleitores"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Link do Eleitor
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
                    <div className="bg-white p-6 border-b-4 border-gov-yellow shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-2xl">
                      <h3 className="text-xl font-black text-gov-blue uppercase">Gestão de Coordenadores</h3>
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => setShowCoordShareModal(true)}
                          className="bg-green-600 text-white px-4 py-3 font-black uppercase text-[10px] flex items-center gap-2 rounded-2xl hover:bg-green-700 transition-all flex-shrink-0 shadow-sm"
                          title="Gerar e compartilhar link para cadastro de novos coordenadores"
                        >
                          <Share2 className="w-4 h-4 text-green-200" /> Link de Cadastro
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={handleClearCoordinators}
                            className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 font-black uppercase text-[10px] flex items-center gap-2 rounded-2xl hover:bg-red-100 flex-shrink-0"
                            title="Apagar Todos os Coordenadores"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {permissions.canCreateCoordinators && (
                          <button
                            onClick={() => setIsAddingCoordinator(true)}
                            className="bg-gov-blue text-white px-6 py-3 font-black uppercase text-[10px] flex items-center gap-2 rounded-2xl flex-shrink-0"
                          >
                            <Plus className="w-4 h-4" /> Novo Coordenador
                          </button>
                        )}
                      </div>
                    </div>
                    <CoordinatorList
                      coordinators={coordinators}
                      onEdit={(c) => { setSelectedCoordinator(c); setIsAddingCoordinator(true); }}
                      onDelete={permissions.canDeleteCoordinators ? handleDeleteCoordinator : undefined}
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
                      onDelete={handleDeleteMember}
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
                ) : activeTab === 'settings' ? (
                  <Settings username={username} organization={organization} profile={profile} />
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

      {/* Modal de Compartilhamento WhatsApp de Eleitores */}
      <AnimatePresence>
        {showShareModal && (() => {
          const coordParam = (loggedInCoordinator || profile.role === 'coordinator' || profile.role === 'area_coordinator') ? `&coord=${profile.id}` : '';
          const publicVoterUrl = `${window.location.origin}?public=true&org=${effectiveOrgId}${coordParam}`;
          const whatsappShareMsg = `Olá! Faça parte do nosso time de apoiadores para a campanha ${organization?.candidate_name || 'Gestão Inteligente 2026'}. Cadastre-se pelo link oficial:\n\n${publicVoterUrl}`;

          return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gov-blue/60 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white p-6 sm:p-8 border-4 border-emerald-600 max-w-md w-full text-center shadow-2xl relative rounded-3xl"
              >
                <button
                  onClick={() => setShowShareModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gov-blue p-1 rounded-full hover:bg-gray-100 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <Share2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-black text-gov-blue uppercase mb-2">Link de Cadastro de Eleitores</h3>
                <p className="text-[10px] text-gray-500 mb-5 font-bold uppercase tracking-widest leading-relaxed">
                  Envie este link para apoiadores, familiares e em grupos de WhatsApp para realizarem seu próprio cadastro.
                </p>
                <div className="bg-gray-50 p-4 border-2 border-dashed border-emerald-300 mb-5 break-all text-[11px] font-mono font-bold text-emerald-700 select-all rounded-2xl">
                  {publicVoterUrl}
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(publicVoterUrl);
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 2000);
                    }}
                    className={`w-full py-3.5 ${copySuccess ? 'bg-green-600' : 'bg-gov-blue'} text-white font-black uppercase text-xs flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-md rounded-xl`}
                  >
                    {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copySuccess ? 'Link Copiado com Sucesso!' : 'Copiar Link de Cadastro'}
                  </button>

                  <button
                    onClick={() => {
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappShareMsg)}`, '_blank');
                    }}
                    className="w-full py-3.5 bg-emerald-600 text-white font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-md rounded-xl"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Enviar Direto no WhatsApp
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Modal de Compartilhamento de Link de Coordenadores */}
      <AnimatePresence>
        {showCoordShareModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gov-blue/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 border-4 border-gov-yellow max-w-md w-full text-center shadow-2xl relative rounded-3xl"
            >
              <button
                onClick={() => setShowCoordShareModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gov-blue p-1 rounded-full hover:bg-gray-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
                <Users className="w-8 h-8 text-gov-blue" />
              </div>
              <h3 className="text-xl font-black text-gov-blue uppercase mb-2">Link de Cadastro de Coordenador</h3>
              <p className="text-[11px] text-gray-500 mb-5 font-bold uppercase tracking-wide leading-relaxed">
                Envie este link para suas lideranças para que elas façam seu próprio cadastro de coordenador na campanha.
              </p>

              {/* Link Box */}
              <div className="bg-gray-50 p-4 border-2 border-dashed border-gov-yellow/60 mb-5 break-all text-[11px] font-mono font-bold text-gov-blue select-all rounded-2xl">
                {`${window.location.origin}?coord_register=true&org=${effectiveOrgId}${networkFilter ? `&network=${profile.id}` : ''}`}
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    const coordLink = `${window.location.origin}?coord_register=true&org=${effectiveOrgId}${networkFilter ? `&network=${profile.id}` : ''}`;
                    navigator.clipboard.writeText(coordLink);
                    setCopyCoordSuccess(true);
                    setTimeout(() => setCopyCoordSuccess(false), 2500);
                  }}
                  className={`w-full py-3.5 ${copyCoordSuccess ? 'bg-green-600' : 'bg-gov-blue'} text-white font-black uppercase text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-md rounded-xl`}
                >
                  {copyCoordSuccess ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-gov-yellow" />}
                  {copyCoordSuccess ? 'Link Copiado com Sucesso!' : 'Copiar Link do Formulário'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const coordLink = `${window.location.origin}?coord_register=true&org=${effectiveOrgId}${networkFilter ? `&network=${profile.id}` : ''}`;
                    const msg = `Olá! Faça seu cadastro como Coordenador Oficial da campanha ${effectiveCandidateName}:\n\n🔗 ${coordLink}\n\nApós o cadastro, você terá acesso imediato ao seu painel!`;
                    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
                    window.open(waUrl, '_blank');
                  }}
                  className="w-full py-3.5 bg-green-600 text-white font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-md rounded-xl"
                >
                  <Smartphone className="w-4 h-4 text-green-200" />
                  Enviar Convite no WhatsApp
                </button>
              </div>
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
