import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Member, Coordinator } from '../types';
import MemberList from './MemberList';
import MemberForm from './MemberForm';
import MemberDetailsModal from './MemberDetailsModal';
import CoordinatorForm from './CoordinatorForm';
import CoordinatorList from './CoordinatorList';
import Sidebar from './Sidebar';
import Toast from './Toast';
import { Plus, LogOut, Search, BarChart3, Download, X, Users, User, Hash, Clock, Upload, Share2, Copy, Check, ShieldCheck, MapPin, MessageSquare, AlertTriangle, AlertCircle, Gift, Smartphone, Database, Trash2, ArrowLeft, CreditCard, Target, Sparkles, Settings as SettingsIcon, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, normalizeName, cleanPhone, deduplicateMemberList } from '../lib/db';
import { supabase, supabaseAdmin } from '../lib/supabase';
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
import { matchMemberToCoordinator, exportCoordinatorExcel } from '../lib/coordinatorUtils';

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
  const [coordinatorSearch, setCoordinatorSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedCoordinator, setSelectedCoordinator] = useState<Coordinator | null>(null);
  const [activeCoordinator, setActiveCoordinator] = useState<Coordinator | null>(null);
  const [genderFilter, setGenderFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'list' | 'report' | 'gender' | 'coordinators' | 'ranking' | 'chat' | 'materials' | 'intelligence' | 'neighborhood' | 'admin_master' | 'ai_manager' | 'election_day' | 'settings'>('list');
  const [listFilterType, setListFilterType] = useState<'all' | 'voters' | 'coordinators'>('all');

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
  const coordExcelInputRef = useRef<HTMLInputElement>(null);
  const [isImportingCoordExcel, setIsImportingCoordExcel] = useState(false);
  const [isCloudRestricted, setIsCloudRestricted] = useState(false);

  const isSuperAdmin = username.toLowerCase().includes('edukadoshmda') || 
                       username.toLowerCase() === 'admin' || 
                       (profile.email && profile.email.toLowerCase().includes('edukadoshmda')) || 
                       profile.role === 'super_admin';
  const isCampaignAdmin = profile.role === 'general_coordination' || profile.role === 'candidate' || isSuperAdmin;
  const isFieldCoordinator = profile.role === 'coordinator';
  const isOverdue = organization?.subscription_status === 'overdue' && !isSuperAdmin;

  // Cores dinâmicas da campanha
  const primaryColor = organization?.theme_primary || organization?.theme_color || '#003366';
  const secondaryColor = organization?.theme_secondary || '#FFCC00';

  const loggedInCoordinator = useMemo(() => {
    if (profile.role === 'coordinator' || profile.role === 'area_coordinator') {
      const pId = profile.id ? profile.id.replace(/^coord-/, '').toLowerCase() : '';
      const pEmail = profile.email ? profile.email.toLowerCase().trim() : '';
      return coordinators.find(c => 
        (c.id && (c.id.toLowerCase() === pId || c.id.toLowerCase() === profile.id.toLowerCase())) || 
        (c.email && pEmail && c.email.toLowerCase().trim() === pEmail)
      );
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

  // Função utilitária resiliente para cópia na área de transferência (Clipboard API + Fallback)
  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      console.warn('navigator.clipboard falhou, tentando fallback', err);
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch (err) {
      console.error('Fallback execCommand falhou', err);
      return false;
    }
  };

  // Função para formatar com segurança para o padrão internacional do WhatsApp (55...)
  const formatWhatsAppNumber = (phone?: string | null) => {
    if (!phone) return '';
    const cleaned = String(phone).replace(/\D/g, '');
    if (!cleaned) return '';
    // Se já começar com 55 e tiver tamanho compatível (12 ou 13 dígitos)
    if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
      return cleaned;
    }
    // Se tiver 10 ou 11 dígitos (DDD + Número), assume Brasil e adiciona 55
    if (cleaned.length === 10 || cleaned.length === 11) {
      return `55${cleaned}`;
    }
    // Se tiver 8 ou 9 dígitos (sem DDD)
    if (cleaned.length >= 8) {
      return `55${cleaned}`;
    }
    return '';
  };

  const handleBulkWhatsApp = async (copyMode: 'newline' | 'comma' = 'newline') => {
    const formattedPhones = filteredMembers
      .map(m => formatWhatsAppNumber(m?.phone))
      .filter(p => Boolean(p) && p.length >= 10);

    // Garante números únicos para não duplicar no disparo
    const uniquePhones = Array.from(new Set(formattedPhones));

    if (uniquePhones.length === 0) {
      showToast("⚠️ Nenhum número de WhatsApp válido encontrado nos eleitores filtrados.");
      return;
    }

    const textToCopy = copyMode === 'comma' ? uniquePhones.join(', ') : uniquePhones.join('\n');
    const copied = await copyTextToClipboard(textToCopy);

    if (copied) {
      showToast(`✅ ${uniquePhones.length} números de WhatsApp copiados com sucesso!`);
    } else {
      showToast(`⚠️ Não foi possível copiar para a área de transferência.`);
    }

    if (uniquePhones.length === 1) {
      const firstMember = filteredMembers.find(m => formatWhatsAppNumber(m?.phone) === uniquePhones[0]);
      const template = bulkMessage?.trim() || organization?.welcome_template || `Olá {nome_eleitor}! Gostaria de conversar sobre a campanha ${organization?.candidate_name || 'Gestão Inteligente'}.`;
      const personalizedMsg = template.replace(/{nome_eleitor}/g, firstMember?.name || '');
      const url = `https://wa.me/${uniquePhones[0]}?text=${encodeURIComponent(personalizedMsg)}`;
      window.open(url, '_blank');
    }
    setShowBulkWhatsAppModal(false);
  };

  const handleImportExcelForCoordinator = async (
    event: React.ChangeEvent<HTMLInputElement>,
    coordinator: Coordinator
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImportingCoordExcel(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (!rows || rows.length < 1) {
        showToast("Arquivo vazio ou sem dados legíveis.");
        return;
      }

      let nameCol = -1;
      let phoneCol = -1;
      let voterCol = -1;
      let emailCol = -1;
      let neighborhoodCol = -1;

      for (let i = 0; i < Math.min(rows.length, 5); i++) {
        rows[i].forEach((cell, idx) => {
          const val = cell?.toString().toLowerCase() || "";
          if (nameCol === -1 && (val.includes("nome") || val.includes("eleitor") || (val.length > 5 && isNaN(Number(val))))) nameCol = idx;
          if (phoneCol === -1 && (val.includes("tel") || val.includes("fone") || val.includes("cel") || val.includes("zap") || val.includes("whatsapp"))) phoneCol = idx;
          if (voterCol === -1 && (val.includes("titulo") || val.includes("título") || val.includes("voter"))) voterCol = idx;
          if (emailCol === -1 && (val.includes("email") || val.includes("e-mail"))) emailCol = idx;
          if (neighborhoodCol === -1 && (val.includes("bairro") || val.includes("regiao") || val.includes("região"))) neighborhoodCol = idx;
        });
      }
      if (nameCol === -1) nameCol = 0;
      if (phoneCol === -1) phoneCol = 1;

      const currentOrgId = organization?.id || profile?.organization_id || profile?.org_id;
      const newImported: Member[] = [];

      for (const row of rows) {
        if (!row || row.length === 0) continue;
        const rawName = row[nameCol]?.toString().trim() || "";
        const normName = normalizeName(rawName);
        if (normName.includes("relatorio") || normName.includes("total") || normName.length < 2) continue;
        if (normName === "nome completo" || normName === "nome") continue;

        const rawPhone = phoneCol >= 0 ? (row[phoneCol]?.toString() || "") : "";
        const phone = cleanPhone(rawPhone);
        const voterId = voterCol >= 0 ? (row[voterCol]?.toString().trim() || "") : "";
        const email = emailCol >= 0 ? (row[emailCol]?.toString().trim().toLowerCase() || "") : "";
        const neighborhood = neighborhoodCol >= 0 ? (row[neighborhoodCol]?.toString().trim() || "") : "";

        newImported.push({
          id: Math.random().toString(36).substring(2, 11),
          name: rawName,
          phone: phone || rawPhone,
          email: email,
          voterId: voterId || undefined,
          neighborhood: neighborhood || coordinator.neighborhood || '',
          gender: "Não Informado",
          coordinatorId: coordinator.id,
          org_id: coordinator.org_id || currentOrgId,
          createdAt: new Date().toISOString(),
        });
      }

      if (newImported.length > 0) {
        const combined = [...newImported, ...members];
        const { deduplicated } = deduplicateMemberList(combined);
        await saveMembers(deduplicated);
        showToast(`✅ ${newImported.length} eleitores importados e vinculados a ${coordinator.name}!`);
      } else {
        showToast('Nenhum eleitor válido encontrado na planilha.');
      }
    } catch (err) {
      console.error('Erro na importação para coordenador:', err);
      showToast('Erro ao processar planilha Excel.');
    } finally {
      setIsImportingCoordExcel(false);
      if (event.target) event.target.value = '';
    }
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

  // Helper para extrair todos os identificadores possíveis (ID, ID sem coord-, email)
  const getUserIdentifierSet = useCallback((p: Profile, coord?: Coordinator | null): Set<string> => {
    const set = new Set<string>();
    if (p?.id) {
      const raw = String(p.id).trim().toLowerCase();
      set.add(raw);
      set.add(raw.replace(/^coord-/, ''));
    }
    if (coord?.id) {
      const raw = String(coord.id).trim().toLowerCase();
      set.add(raw);
      set.add(raw.replace(/^coord-/, ''));
      set.add(`coord-${raw}`);
    }
    if (p?.email) {
      set.add(p.email.trim().toLowerCase());
    }
    if (coord?.email) {
      set.add(coord.email.trim().toLowerCase());
    }
    return set;
  }, []);

  const matchIdentifier = useCallback((val: string | null | undefined, targetSet: Set<string>): boolean => {
    if (!val) return false;
    const clean = String(val).trim().toLowerCase();
    const cleanWithoutPrefix = clean.replace(/^coord-/, '');
    return targetSet.has(clean) || targetSet.has(cleanWithoutPrefix) || targetSet.has(`coord-${cleanWithoutPrefix}`);
  }, []);

  const loadDashboardData = useCallback((forceRefresh = false) => {
    const currentOrgId = organization?.id || profile?.organization_id || profile?.org_id;

    console.log('🔍 loadDashboardData - Profile:', profile?.full_name, 'role:', profile?.role, 'org:', currentOrgId);

    // Buscar coordenadores e membros com persistência resiliente e filtro estrito por organização e cargo
    Promise.all([
      db.getCoordinators(currentOrgId, forceRefresh),
      db.getMembers(currentOrgId, forceRefresh)
    ]).then(([allCoordinators, allMembers]) => {
      console.log('🔍 Total carregado da org:', { coordinators: allCoordinators.length, members: allMembers.length });

      // 1. Super Admin: Visão irrestrita total
      if (isSuperAdmin) {
        setCoordinators(allCoordinators);
        setMembers(allMembers);
        return;
      }

      // 2. Candidato e Coordenação Geral: Visão total de TODA a campanha
      if (profile.role === 'candidate' || profile.role === 'general_coordination') {
        setCoordinators(allCoordinators);
        setMembers(allMembers);
        return;
      }

      // 3. Coordenador de Área: Vê apenas sua rede (ele mesmo + seus coordenadores de campo + eleitores da sua rede)
      if (profile.role === 'area_coordinator') {
        const myIds = getUserIdentifierSet(profile, loggedInCoordinator);

        // Coordenadores subordinados da sua rede
        const mySubordinates = allCoordinators.filter(c => {
          if (!c) return false;
          return matchIdentifier(c.id, myIds) || matchIdentifier(c.network_id, myIds) || (c.email && myIds.has(c.email.toLowerCase().trim()));
        });

        // Todos os IDs vinculados à rede de área
        const networkIds = new Set<string>(myIds);
        mySubordinates.forEach(c => {
          if (c.id) {
            const raw = String(c.id).trim().toLowerCase();
            networkIds.add(raw);
            networkIds.add(raw.replace(/^coord-/, ''));
          }
          if (c.email) networkIds.add(c.email.trim().toLowerCase());
        });

        const networkMembers = allMembers.filter(m => {
          if (!m) return false;
          return matchIdentifier(m.coordinatorId, networkIds) || matchIdentifier(m.network_id, networkIds);
        });

        console.log(`📍 Coordenador de Área: ${mySubordinates.length} coordenadores e ${networkMembers.length} eleitores na rede.`);
        setCoordinators(mySubordinates);
        setMembers(networkMembers);
        return;
      }

      // 4. Coordenador de Campo / Liderança: Vê APENAS seus próprios eleitores cadastrados
      if (profile.role === 'coordinator') {
        const myIds = getUserIdentifierSet(profile, loggedInCoordinator);

        const fieldMembers = allMembers.filter(m => {
          if (!m) return false;
          return matchIdentifier(m.coordinatorId, myIds) || matchIdentifier(m.network_id, myIds);
        });

        console.log(`🚶 Coordenador de Campo: 0 coordenadores externos e ${fieldMembers.length} eleitores próprios.`);
        // Preserva os dados de coordenadores para não quebrar loggedInCoordinator nem disparar loops de re-render
        setCoordinators(allCoordinators);
        setMembers(fieldMembers);
        return;
      }

      // Fallback padrão
      setCoordinators(allCoordinators);
      setMembers(allMembers);
    }).catch(err => {
      console.warn("Aviso ao carregar dados do dashboard:", err);
    });
  }, [organization?.id, profile?.organization_id, profile?.org_id, profile?.id, profile?.role, profile?.email, loggedInCoordinator, isSuperAdmin, getUserIdentifierSet, matchIdentifier]);

  useEffect(() => {
    loadDashboardData();

    // Sincronização inteligente: storage e focus usam o cache (sem bater no Supabase desnecessariamente)
    const handleStorageChange = () => loadDashboardData(false);
    const handleCloudRestricted = () => setIsCloudRestricted(true);
    const handleMemberRegistered = (e: any) => {
      const newM = e.detail;
      if (newM && newM.id) {
        setMembers(prev => {
          if (prev.some(m => m.id === newM.id)) return prev;
          return [newM, ...prev];
        });
      } else {
        loadDashboardData(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);
    window.addEventListener('member_registered', handleMemberRegistered);
    window.addEventListener('supabase_cloud_restricted', handleCloudRestricted);

    // Canal Realtime do Supabase para atualização instantânea sem baixar o banco inteiro
    let subscription: any = null;
    if (supabase && !isCloudRestricted) {
      try {
        const currentOrgId = organization?.id || profile?.organization_id || profile?.org_id;
        subscription = supabase
          .channel('dashboard-realtime-members')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'members' }, (payload: any) => {
            const newM = payload.new as Member;
            if (newM && newM.id) {
              setMembers(prev => prev.some(m => m.id === newM.id) ? prev : [newM, ...prev]);
            }
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'members' }, (payload: any) => {
            const updatedM = payload.new as Member;
            if (updatedM && updatedM.id) {
              setMembers(prev => prev.map(m => m.id === updatedM.id ? { ...m, ...updatedM } : m));
            }
          })
          .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'members' }, (payload: any) => {
            const oldId = payload.old?.id;
            if (oldId) {
              setMembers(prev => prev.filter(m => m.id !== oldId));
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'coordinators' }, () => {
            db.getCoordinators(currentOrgId, true).then(setCoordinators).catch(() => {});
          })
          .subscribe((status: string) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn('Realtime Supabase pausado ou restrito (402). Operando em modo offline resiliente.');
              setIsCloudRestricted(true);
            }
          });
      } catch {
        setIsCloudRestricted(true);
      }
    }

    // Busca aviso dinâmico do Supabase
    const fetchNotice = async () => {
      if (!supabase || isCloudRestricted) return;
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('title, content')
          .limit(1)
          .maybeSingle();

        if (error) {
          if (error.code === '402' || error.message?.includes('restricted') || error.message?.includes('spend cap')) {
            setIsCloudRestricted(true);
          }
          return;
        }

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
      window.removeEventListener('supabase_cloud_restricted', handleCloudRestricted);
      if (subscription && supabase) {
        try {
          supabase.removeChannel(subscription);
        } catch {}
      }
    };
  }, [loadDashboardData, isCloudRestricted]);

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

  const handleAddMember = async (memberData: Omit<Member, 'id' | 'createdAt'>) => {
    const finalMemberData = { ...memberData };
    const currentOrgId = organization?.id || profile?.organization_id || profile?.org_id;
    const myCoordId = loggedInCoordinator?.id || profile.id?.replace(/^coord-/, '') || profile.id;
    if (profile.role === 'coordinator') {
      finalMemberData.coordinatorId = myCoordId;
      finalMemberData.network_id = loggedInCoordinator?.network_id || myCoordId;
    } else if (profile.role === 'area_coordinator') {
      if (!finalMemberData.coordinatorId) {
        finalMemberData.coordinatorId = myCoordId;
      }
      finalMemberData.network_id = myCoordId;
    } else {
      // Para admin / candidato / geral: alinhar o network_id com o coordenador escolhido no select
      if (finalMemberData.coordinatorId) {
        const selectedCoord = coordinators.find(c => {
          const cid = String(c.id).trim().toLowerCase();
          const target = String(finalMemberData.coordinatorId).trim().toLowerCase();
          return cid === target || cid.replace(/^coord-/, '') === target || c.email?.trim().toLowerCase() === target;
        });
        if (selectedCoord) {
          finalMemberData.network_id = selectedCoord.network_id || selectedCoord.id;
        }
      } else {
        finalMemberData.network_id = undefined;
      }
    }

    if (!finalMemberData.org_id && currentOrgId) {
      finalMemberData.org_id = currentOrgId;
    }

    // Validação de Duplicidade (Nome e Título de Eleitor — Telefone agora é permitido ser repetido)
    const newName = normalizeName(finalMemberData.name);
    const newVoter = (finalMemberData.voterId || '').trim();

    if (newName && newName.length >= 2) {
      const dupName = members.find(m =>
        m.id !== selectedMember?.id &&
        normalizeName(m.name) === newName
      );
      if (dupName) {
        alert(`⚠️ ATENÇÃO: Já existe um eleitor cadastrado com o nome "${dupName.name}" nesta campanha!`);
        return;
      }
    }

    if (newVoter && newVoter.length >= 5) {
      const dupVoter = members.find(m =>
        m.id !== selectedMember?.id &&
        (m.voterId || '').trim() === newVoter
      );
      if (dupVoter) {
        alert(`⚠️ ATENÇÃO: Este Título de Eleitor já consta cadastrado para "${dupVoter.name}"!`);
        return;
      }
    }

    if (selectedMember) {
      const mergedMember = { ...selectedMember, ...finalMemberData };
      const updatedMembers = members.map(m =>
        m.id === selectedMember.id ? mergedMember : m
      );
      setMembers(updatedMembers);
      await db.updateMember(mergedMember, currentOrgId);
      setSelectedMember(null);
      showToast('Registro atualizado com sucesso!');
      setIsAdding(false);
    } else {
      const newMember: Member = {
        ...finalMemberData,
        id: crypto.randomUUID().split('-')[0],
        createdAt: new Date().toISOString(),
        org_id: currentOrgId,
        network_id: finalMemberData.network_id || (profile.role === 'area_coordinator' ? myCoordId : undefined)
      };
      setMembers([newMember, ...members]);
      await db.addMember(newMember, currentOrgId);
      showToast('Registro cadastrado com sucesso!');
      setIsAdding(false);
    }
  };

  const handleAddCoordinator = async (coordData: Omit<Coordinator, 'id' | 'createdAt'>) => {
    const currentOrgId = organization?.id || profile?.organization_id || profile?.org_id;
    const coordEmail = coordData.email?.trim().toLowerCase();
    const coordPass = (coordData as any).password;
    const myCoordId = loggedInCoordinator?.id || profile.id?.replace(/^coord-/, '') || profile.id;

    // Validação de Duplicidade para Coordenadores
    const newCoordName = normalizeName(coordData.name);
    if (coordEmail) {
      const dupEmail = coordinators.find(c =>
        c.id !== selectedCoordinator?.id &&
        c.email?.trim().toLowerCase() === coordEmail
      );
      if (dupEmail) {
        alert(`⚠️ ATENÇÃO: Já existe um coordenador cadastrado com o e-mail "${coordEmail}"!`);
        return;
      }
    }

    if (newCoordName && newCoordName.length >= 3) {
      const dupName = coordinators.find(c =>
        c.id !== selectedCoordinator?.id &&
        normalizeName(c.name) === newCoordName
      );
      if (dupName) {
        alert(`⚠️ ATENÇÃO: Já existe um coordenador cadastrado com o nome "${dupName.name}"!`);
        return;
      }
    }

    if (coordEmail && coordPass) {
      localStorage.setItem(`@AppGestao:userPass_${coordEmail}`, coordPass);
      localStorage.setItem(`@AppGestao:coordPass_${coordEmail}`, coordPass);
    }

    if (selectedCoordinator) {
      const mergedCoord = { ...selectedCoordinator, ...coordData };
      const updated = coordinators.map(c =>
        c.id === selectedCoordinator.id ? mergedCoord : c
      );
      setCoordinators(updated);
      await db.updateCoordinator(mergedCoord, currentOrgId);
      setSelectedCoordinator(null);
      showToast('Coordenador atualizado!');
    } else {
      const newCoord: Coordinator = {
        ...coordData,
        id: crypto.randomUUID().split('-')[0],
        createdAt: new Date().toISOString(),
        org_id: currentOrgId,
        network_id: profile.role === 'area_coordinator' ? myCoordId : (coordData.network_id || undefined),
        role: profile.role === 'area_coordinator' ? 'coordinator' : (coordData.role || (coordData.network_id ? 'coordinator' : 'area_coordinator'))
      };
      setCoordinators([newCoord, ...coordinators]);
      await db.addCoordinator(newCoord, currentOrgId);
      showToast('Coordenador cadastrado com sucesso!');
    }
    setIsAddingCoordinator(false);
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Deseja realmente excluir este eleitor?')) return;
    try {
      const currentOrgId = organization?.id || profile?.organization_id || profile?.org_id;
      setMembers(prev => prev.filter(m => String(m.id) !== String(id)));
      await db.deleteMember(id, currentOrgId);
      showToast('Eleitor excluído permanentemente!');
    } catch (err) {
      console.error('Erro ao excluir eleitor:', err);
      showToast('Erro ao excluir eleitor.');
    }
  };

  const handleDeleteCoordinator = async (id: string) => {
    if (!confirm('Deseja realmente excluir este coordenador?')) return;
    try {
      const currentOrgId = organization?.id || profile?.organization_id || profile?.org_id;
      setCoordinators(prev => prev.filter(c => String(c.id) !== String(id)));
      await db.deleteCoordinator(id, currentOrgId);
      showToast('Coordenador excluído com sucesso!');
    } catch (err) {
      console.error('Erro ao excluir coordenador:', err);
      showToast('Erro ao excluir coordenador.');
    }
  };

  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);

  const handleCleanDuplicates = async () => {
    if (!confirm('Deseja fazer a varredura e remover permanentemente todos os registros duplicados de telefone, nome e documento?')) return;
    setIsCleaningDuplicates(true);
    try {
      const currentOrgId = organization?.id || profile?.organization_id || profile?.org_id;
      const res = await db.cleanAllDuplicates(currentOrgId);
      await loadDashboardData();
      if (res.deletedCount > 0) {
        showToast(`✅ Varredura concluída! ${res.deletedCount} duplicatas removidas permanentemente.`);
      } else {
        showToast('✨ Sua base já está 100% limpa! Nenhuma duplicidade encontrada.');
      }
    } catch (err: any) {
      console.error('Erro ao remover duplicados:', err);
      showToast('Erro ao processar remoção de duplicados.');
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  const { handleImportExcel, handleExportExcel, isExporting } = useExcelTools(members, saveMembers, showToast, organization);

  const handleClearAll = async () => {
    if (!confirm('Deseja REALMENTE apagar TODOS os eleitores cadastrados? Esta ação não pode ser desfeita.')) return;
    
    try {
      const currentOrgId = organization?.id || profile?.organization_id || profile?.org_id;
      const allIds = members.map(m => m.id);
      setMembers([]);
      await db.deleteMembers(allIds, currentOrgId);
      
      if (currentOrgId) {
        localStorage.removeItem(`@AppGestao:members_${currentOrgId}`);
      }
      localStorage.removeItem('forja_members_data');
      
      if (supabase && currentOrgId) {
        const { error } = await supabase.from('members').delete().eq('org_id', currentOrgId);
        if (error && supabaseAdmin && supabaseAdmin !== supabase) {
          await supabaseAdmin.from('members').delete().eq('org_id', currentOrgId);
        }
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
      const currentOrgId = organization?.id || profile?.organization_id || profile?.org_id;
      await db.saveCoordinators([], currentOrgId);
      
      if (supabase && currentOrgId) {
        const { error } = await supabase.from('coordinators').delete().eq('org_id', currentOrgId);
        if (error && supabaseAdmin && supabaseAdmin !== supabase) {
          await supabaseAdmin.from('coordinators').delete().eq('org_id', currentOrgId);
        }
      }
      
      showToast('Coordenadores apagados com sucesso!');
    } catch (err: any) {
      console.error('Erro ao apagar coordenadores:', err);
      showToast('Erro ao limpar alguns dados da nuvem.');
    }
  };

  // Helper preciso para verificar se um membro cadastrado corresponde a um coordenador específico
  const isMemberMatchingCoordinator = useCallback((m: { id?: string; email?: string; phone?: string; name?: string; voterId?: string; coordinatorId?: string }, c: Coordinator): boolean => {
    if (!m || !c) return false;
    const mId = String(m.id || '').toLowerCase().replace(/^coord-/, '').trim();
    const cId = String(c.id || '').toLowerCase().replace(/^coord-/, '').trim();
    if (mId && cId && mId === cId) return true;

    // Título de eleitor idêntico (se ambos tiverem preenchido)
    const mVoter = m.voterId ? String(m.voterId).trim() : '';
    const cVoter = c.voterId ? String(c.voterId).trim() : '';
    if (mVoter && cVoter && mVoter.length >= 5 && mVoter === cVoter) return true;

    // Telefone (com 10 ou 11 dígitos, ignorando máscara)
    const mPhone = m.phone ? m.phone.replace(/\D/g, '') : '';
    const cPhone = (c.whatsapp || (c as any).phone) ? (c.whatsapp || (c as any).phone).replace(/\D/g, '') : '';
    if (mPhone && cPhone && mPhone.length >= 10 && (mPhone === cPhone || mPhone.endsWith(cPhone) || cPhone.endsWith(mPhone))) return true;

    // E-mail válido e não genérico
    const mEmail = m.email ? m.email.toLowerCase().trim() : '';
    const cEmail = c.email ? c.email.toLowerCase().trim() : '';
    const isGenericEmail = (email: string) => /^(maria123|teste|admin|contato|eleitor|coord)/.test(email) || email === 'maria123@gmail.com';
    if (mEmail && cEmail && !isGenericEmail(mEmail) && !isGenericEmail(cEmail) && mEmail === cEmail) return true;

    // Nome completo exato e idêntico normalizado (com mais de uma palavra)
    const mName = normalizeName(m.name);
    const cName = normalizeName(c.name);
    if (mName && cName && mName === cName && mName.includes(' ')) return true;

    return false;
  }, []);

  // Relação Geral Unificada de todas as pessoas cadastradas na Campanha (Coordenadores + Eleitores)
  // Para Super Admin, Candidato e Coordenação Geral:
  // - TODOS os Coordenadores legítimos identificados em VERDE (exatamente igual ao total da campanha, ex: 134)
  // - Eleitores legítimos identificados em PRETO
  const allCampaignPeople = useMemo(() => {
    if (isFieldCoordinator) {
      return members.map(m => ({ ...m, isCoordinator: false }));
    }

    // Rastrear quais coordenadores foram encontrados e vinculados a registros de membros existentes
    const matchedCoordIds = new Set<string>();

    // 1. Marca os membros que correspondem a coordenadores legítimos (1 para 1)
    const list: Member[] = members.map(m => {
      const foundCoord = coordinators.find(c => !matchedCoordIds.has(c.id) && isMemberMatchingCoordinator(m, c));
      if (foundCoord) {
        matchedCoordIds.add(foundCoord.id);
        return {
          ...m,
          isCoordinator: true,
          coordinatorRole: foundCoord.role || 'coordinator'
        };
      }
      return {
        ...m,
        isCoordinator: false
      };
    });

    // 2. Mescla TODOS os coordenadores que ainda não possuem linha em members
    coordinators.forEach(c => {
      if (!matchedCoordIds.has(c.id)) {
        list.push({
          id: c.id.startsWith('coord-') ? c.id : `coord-${c.id}`,
          name: c.name,
          email: c.email || '',
          phone: c.whatsapp || (c as any).phone || '',
          voterId: c.voterId || '',
          voterSection: c.voterSection || '',
          voterZone: c.voterZone || '',
          gender: 'Coordenador',
          neighborhood: c.neighborhood || '',
          region: c.city || 'DF',
          referral: 'Coordenação Geral',
          createdAt: c.createdAt || '',
          org_id: c.org_id,
          network_id: c.network_id,
          isCoordinator: true,
          coordinatorRole: c.role || 'coordinator'
        });
      }
    });

    return list;
  }, [members, coordinators, isFieldCoordinator, isMemberMatchingCoordinator]);

  // Totais estratégicos para os cards do topo do painel
  const campaignTotalCount = allCampaignPeople.length;
  const campaignCoordCount = useMemo(() => {
    return allCampaignPeople.filter(p => Boolean(p.isCoordinator)).length;
  }, [allCampaignPeople]);
  const campaignVoterCount = useMemo(() => {
    return Math.max(0, campaignTotalCount - campaignCoordCount);
  }, [campaignTotalCount, campaignCoordCount]);

  const filteredMembers = useMemo(() => {
    // Se for Coordenador de Campo, vê APENAS seus próprios eleitores cadastrados
    let baseMembers = isFieldCoordinator
      ? members
      : (activeCoordinator 
          ? members.filter(m => matchMemberToCoordinator(m, activeCoordinator))
          : allCampaignPeople);

    if (!debouncedSearch.trim()) return baseMembers;

    const term = debouncedSearch.toLowerCase().trim();
    return baseMembers.filter(m =>
      m.name?.toLowerCase().includes(term) ||
      m.phone?.includes(term) ||
      (m.voterId && m.voterId.includes(term)) ||
      (m.neighborhood && m.neighborhood.toLowerCase().includes(term))
    );
  }, [allCampaignPeople, members, debouncedSearch, activeCoordinator, isFieldCoordinator]);


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
        onTabChange={(tab) => {
          if (tab === 'list') {
            setActiveCoordinator(null);
          }
          setActiveTab(tab);
        }} 
        onLogout={onLogout} 
        username={username} 
        candidateName={organization?.candidate_name}
        role={profile.role}
        logoUrl={organization?.logo_url}
      />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8 pt-20 lg:pt-8 pb-6">
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
                {/* ── PLACAR ESTRATÉGICO: Total Geral, Eleitores e Coordenadores ── */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  {/* Card 1: Total Geral */}
                  <button
                    type="button"
                    onClick={() => setListFilterType('all')}
                    className={`p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-center sm:items-start justify-between gap-1.5 sm:gap-2 text-left transition-all hover-lift active-scale border shadow-sm ${
                      listFilterType === 'all'
                        ? 'bg-slate-950 text-white border-gov-yellow ring-2 ring-gov-yellow/30 shadow-md'
                        : 'bg-white text-slate-800 border-gray-200 hover:border-slate-300'
                    }`}
                    title="Clique para ver todos os registros da campanha"
                  >
                    <div className="flex flex-col items-center sm:items-start min-w-0">
                      <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${listFilterType === 'all' ? 'text-gov-yellow' : 'text-slate-500'}`}>
                        Total Geral
                      </span>
                      <span className={`text-xl sm:text-2xl lg:text-3xl font-black tracking-tight mt-0.5 ${listFilterType === 'all' ? 'text-white' : 'text-slate-900'}`}>
                        {campaignTotalCount}
                      </span>
                      <span className={`text-[8px] sm:text-[9px] font-bold uppercase mt-0.5 truncate hidden sm:inline-block ${listFilterType === 'all' ? 'text-slate-300' : 'text-slate-400'}`}>
                        Toda a Base
                      </span>
                    </div>
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${listFilterType === 'all' ? 'bg-gov-yellow/20' : 'bg-slate-100'}`}>
                      <Users className={`w-4 h-4 sm:w-5 sm:h-5 ${listFilterType === 'all' ? 'text-gov-yellow' : 'text-slate-600'}`} />
                    </div>
                  </button>

                  {/* Card 2: Eleitores */}
                  <button
                    type="button"
                    onClick={() => setListFilterType('voters')}
                    className={`p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-center sm:items-start justify-between gap-1.5 sm:gap-2 text-left transition-all hover-lift active-scale border shadow-sm ${
                      listFilterType === 'voters'
                        ? 'bg-indigo-700 text-white border-indigo-400 ring-2 ring-indigo-400/30 shadow-md'
                        : 'bg-white text-slate-800 border-indigo-100 hover:border-indigo-300'
                    }`}
                    title="Clique para filtrar apenas os eleitores"
                  >
                    <div className="flex flex-col items-center sm:items-start min-w-0">
                      <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${listFilterType === 'voters' ? 'text-indigo-200' : 'text-indigo-600'}`}>
                        Eleitores
                      </span>
                      <span className={`text-xl sm:text-2xl lg:text-3xl font-black tracking-tight mt-0.5 ${listFilterType === 'voters' ? 'text-white' : 'text-indigo-950'}`}>
                        {campaignVoterCount}
                      </span>
                      <span className={`text-[8px] sm:text-[9px] font-bold uppercase mt-0.5 truncate hidden sm:inline-block ${listFilterType === 'voters' ? 'text-indigo-200' : 'text-indigo-500'}`}>
                        Apoiadores
                      </span>
                    </div>
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${listFilterType === 'voters' ? 'bg-white/20' : 'bg-indigo-50'}`}>
                      <User className={`w-4 h-4 sm:w-5 sm:h-5 ${listFilterType === 'voters' ? 'text-white' : 'text-indigo-600'}`} />
                    </div>
                  </button>

                  {/* Card 3: Coordenadores */}
                  <button
                    type="button"
                    onClick={() => setListFilterType('coordinators')}
                    className={`p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-center sm:items-start justify-between gap-1.5 sm:gap-2 text-left transition-all hover-lift active-scale border shadow-sm ${
                      listFilterType === 'coordinators'
                        ? 'bg-emerald-700 text-white border-emerald-400 ring-2 ring-emerald-400/30 shadow-md'
                        : 'bg-white text-slate-800 border-emerald-100 hover:border-emerald-300'
                    }`}
                    title="Clique para filtrar apenas os coordenadores"
                  >
                    <div className="flex flex-col items-center sm:items-start min-w-0">
                      <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${listFilterType === 'coordinators' ? 'text-emerald-200' : 'text-emerald-600'}`}>
                        Coordenadores
                      </span>
                      <span className={`text-xl sm:text-2xl lg:text-3xl font-black tracking-tight mt-0.5 ${listFilterType === 'coordinators' ? 'text-white' : 'text-emerald-950'}`}>
                        {campaignCoordCount}
                      </span>
                      <span className={`text-[8px] sm:text-[9px] font-bold uppercase mt-0.5 truncate hidden sm:inline-block ${listFilterType === 'coordinators' ? 'text-emerald-200' : 'text-emerald-500'}`}>
                        Lideranças
                      </span>
                    </div>
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${listFilterType === 'coordinators' ? 'bg-white/20' : 'bg-emerald-50'}`}>
                      <ShieldCheck className={`w-4 h-4 sm:w-5 sm:h-5 ${listFilterType === 'coordinators' ? 'text-white' : 'text-emerald-600'}`} />
                    </div>
                  </button>
                </div>

                {/* Header / Toolbar */}
                <div className="glass-panel p-4 rounded-2xl flex flex-col xl:flex-row justify-between items-center gap-4 hover-lift">
                  <div className="flex flex-col flex-1 w-full lg:min-w-[250px]">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      <span className="text-[10px] sm:text-[11px] font-black text-gov-blue uppercase tracking-widest">
                        {isFieldCoordinator
                          ? `Meus Cadastros: ${members.length} eleitores`
                          : `Base Ativa: ${campaignTotalCount} Pessoas (${campaignVoterCount} Eleitores • ${campaignCoordCount} Coordenadores)`}
                      </span>
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

                    {isCampaignAdmin && (
                      <button
                        onClick={handleCleanDuplicates}
                        disabled={isCleaningDuplicates}
                        className="bg-purple-600 text-white px-3 py-3 font-black uppercase text-[8px] sm:text-[9px] flex items-center justify-center gap-1.5 hover:bg-purple-700 transition-all shadow-sm rounded-2xl"
                        title="Varre e remove permanentemente todos os registros com telefone ou nome duplicado"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> {isCleaningDuplicates ? 'Limpando...' : 'Remover Duplicados'}
                      </button>
                    )}

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

                    {isCampaignAdmin && (
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
                    <div className="bg-white p-6 border-b-4 border-gov-yellow shadow-md flex flex-col gap-4 rounded-2xl">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h3 className="text-xl font-black text-gov-blue uppercase">Gestão de Coordenadores</h3>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => setShowCoordShareModal(true)}
                            className="bg-green-600 text-white px-4 py-3 font-black uppercase text-[10px] flex items-center gap-2 rounded-2xl hover:bg-green-700 transition-all flex-shrink-0 shadow-sm"
                            title="Gerar e compartilhar link para cadastro de novos coordenadores"
                          >
                            <Share2 className="w-4 h-4 text-green-200" /> Link de Cadastro
                          </button>
                          {isCampaignAdmin && (
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
                      {/* Lupa de pesquisa de coordenadores */}
                      <div className="relative w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gov-blue/40 pointer-events-none" />
                        <input
                          type="text"
                          value={coordinatorSearch}
                          onChange={(e) => setCoordinatorSearch(e.target.value)}
                          placeholder="Pesquisar coordenador por nome, e-mail, bairro ou cidade..."
                          className="w-full pl-10 pr-10 py-3 bg-gov-bg border border-gov-blue/15 rounded-xl text-sm font-medium text-gov-blue placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gov-blue/20 focus:border-gov-blue/30"
                        />
                        {coordinatorSearch && (
                          <button
                            onClick={() => setCoordinatorSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gov-blue"
                            title="Limpar pesquisa"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {coordinatorSearch.trim() && (
                        <p className="text-[11px] font-bold text-gov-blue/60 uppercase tracking-widest">
                          Mostrando coordenadores com “{coordinatorSearch.trim()}”
                        </p>
                      )}
                    </div>
                    {(() => {
                      const term = coordinatorSearch.toLowerCase().trim();
                      const filteredCoordinators = !term ? coordinators : coordinators.filter(c =>
                        (c.name && c.name.toLowerCase().includes(term)) ||
                        (c.email && c.email.toLowerCase().includes(term)) ||
                        (c.neighborhood && c.neighborhood.toLowerCase().includes(term)) ||
                        (c.city && c.city.toLowerCase().includes(term)) ||
                        ((c as any).whatsapp && String((c as any).whatsapp).includes(term))
                      );
                      if (term && filteredCoordinators.length === 0) {
                        return (
                          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                            <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm font-black text-gray-500 uppercase">Nenhum coordenador encontrado</p>
                            <p className="text-xs text-gray-400 mt-1">Tente outro nome, e-mail, bairro ou cidade</p>
                            <button onClick={() => setCoordinatorSearch('')} className="mt-4 px-5 py-2 bg-gov-blue text-white rounded-xl text-xs font-black uppercase">Limpar filtro</button>
                          </div>
                        );
                      }
                      return (
                        <CoordinatorList
                          coordinators={filteredCoordinators}
                          members={members}
                          candidateName={organization?.candidate_name}
                          onNotify={showToast}
                          onEdit={(c) => { setSelectedCoordinator(c); setIsAddingCoordinator(true); }}
                          onDelete={permissions.canDeleteCoordinators ? handleDeleteCoordinator : undefined}
                          onSelect={(c) => {
                            setActiveCoordinator(c);
                            setActiveTab('list');
                          }}
                        />
                      );
                    })()}
                  </div>
                ) : activeTab === 'list' ? (
                  <div className="space-y-6">
                    {activeCoordinator && (
                      <div className="bg-gov-blue p-4 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-l-8 border-gov-yellow rounded-2xl shadow-md">
                        <div className="flex items-center gap-4">
                          <ShieldCheck className="w-6 h-6 text-gov-yellow hidden sm:block shrink-0" />
                          <div>
                            <h4 className="font-black uppercase text-xs">Relatório Individual: {activeCoordinator.name}</h4>
                            <p className="text-[10px] text-blue-200 uppercase font-bold tracking-widest">Mostrando apenas eleitores vinculados a este coordenador</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="file"
                            ref={coordExcelInputRef}
                            accept=".xlsx,.xls,.csv"
                            onChange={(e) => handleImportExcelForCoordinator(e, activeCoordinator)}
                            className="hidden"
                          />
                          <button
                            onClick={() => coordExcelInputRef.current?.click()}
                            disabled={isImportingCoordExcel}
                            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-sm transition-all shrink-0 border border-blue-400/30"
                            title={`Fazer upload de planilha Excel de apoiadores para ${activeCoordinator.name}`}
                          >
                            <Upload className="w-4 h-4 text-blue-200" />
                            {isImportingCoordExcel ? 'Subindo...' : 'Subir Planilha (.xlsx)'}
                          </button>
                          <button
                            onClick={() => exportCoordinatorExcel(activeCoordinator, members, organization?.candidate_name, showToast)}
                            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-sm transition-all shrink-0"
                            title={`Baixar planilha Excel com os apoiadores de ${activeCoordinator.name}`}
                          >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                            Baixar Planilha (.xlsx)
                          </button>
                        </div>
                      </div>
                    )}
                    <MemberList
                      members={filteredMembers}
                      coordinators={coordinators}
                      onEdit={(m) => { setSelectedMember(m); setIsAdding(true); }}
                      onDelete={handleDeleteMember}
                      onSelect={() => { }}
                      welcomeTemplate={organization?.welcome_template}
                      isCoordinatorView={isFieldCoordinator}
                      filterType={listFilterType}
                      onFilterChange={setListFilterType}
                    />
                  </div>
                ) : activeTab === 'chat' ? (
                  <Chat 
                    currentUser={{ 
                      id: profile?.id || (loggedInCoordinator?.id ? String(loggedInCoordinator.id) : ('user-' + (username || 'coord'))),
                      name: profile?.full_name || loggedInCoordinator?.name || username || 'Coordenador'
                    }}
                    org_id={effectiveOrgId}
                  />
                ) : activeTab === 'materials' ? (
                  <Materials 
                    isAdmin={true} 
                    organization={organization} 
                    org_id={effectiveOrgId}
                  />
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
          const myCoordId = loggedInCoordinator?.id || profile.id?.replace(/^coord-/, '') || profile.id;
          let coordParams = '';
          if (profile.role === 'coordinator') {
            coordParams = `&coord=${myCoordId}&network=${loggedInCoordinator?.network_id || myCoordId}`;
          } else if (profile.role === 'area_coordinator') {
            coordParams = `&coord=${myCoordId}&network=${myCoordId}`;
          }
          const publicVoterUrl = `${window.location.origin}?public=true&org=${effectiveOrgId}${coordParams}`;
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
        {showCoordShareModal && (() => {
          const myCoordId = loggedInCoordinator?.id || profile.id?.replace(/^coord-/, '') || profile.id;
          let coordRegisterParams = '';
          if (profile.role === 'area_coordinator') {
            coordRegisterParams = `&network=${myCoordId}`;
          }
          const publicCoordUrl = `${window.location.origin}?coord_register=true&org=${effectiveOrgId}${coordRegisterParams}`;

          return (
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
                  {publicCoordUrl}
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(publicCoordUrl);
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
                      const msg = `Olá! Faça seu cadastro como Coordenador Oficial da campanha ${effectiveCandidateName}:\n\n🔗 ${publicCoordUrl}\n\nApós o cadastro, você terá acesso imediato ao seu painel!`;
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
          );
        })()}
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
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-[10px] text-gray-500 mb-4 font-bold uppercase tracking-widest gap-1">
                <span>Enviando para os {filteredMembers.length} eleitores filtrados na tela.</span>
                <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 self-start sm:self-auto font-black">
                  {filteredMembers.filter(m => formatWhatsAppNumber(m?.phone).length >= 10).length} com WhatsApp
                </span>
              </div>
              <textarea
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
                className="w-full h-28 p-4 bg-gray-50 border-2 border-gray-100 outline-none focus:border-gov-blue font-medium text-sm mb-4 resize-none rounded-2xl"
                placeholder="Escreva sua mensagem aqui..."
              />
              <div className="space-y-2">
                <button
                  onClick={() => handleBulkWhatsApp('newline')}
                  className="w-full py-4 bg-green-500 text-white font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-green-600 active:bg-green-700 transition-all shadow-lg rounded-2xl"
                >
                  <Copy className="w-4 h-4" /> Copiar Números e Preparar Envio
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkWhatsApp('comma')}
                    className="flex-1 py-2.5 bg-gray-100 text-gov-blue font-black uppercase text-[9px] flex items-center justify-center gap-1.5 hover:bg-gray-200 transition-all rounded-xl border border-gray-200"
                    title="Copiar números separados por vírgula (55..., 55...)"
                  >
                    <Copy className="w-3.5 h-3.5 text-gray-500" /> Copiar c/ Vírgula
                  </button>
                  <button
                    onClick={async () => {
                      const msg = bulkMessage?.trim() || organization?.welcome_template || '';
                      if (!msg) {
                        showToast('Digite uma mensagem antes de copiar.');
                        return;
                      }
                      const ok = await copyTextToClipboard(msg);
                      if (ok) showToast('✅ Texto da mensagem copiado!');
                    }}
                    className="flex-1 py-2.5 bg-blue-50 text-blue-800 font-black uppercase text-[9px] flex items-center justify-center gap-1.5 hover:bg-blue-100 transition-all rounded-xl border border-blue-200"
                    title="Copiar texto digitado na mensagem"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" /> Copiar Mensagem
                  </button>
                </div>
              </div>
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
