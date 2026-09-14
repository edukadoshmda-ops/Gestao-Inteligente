import { useState, useRef, useMemo } from 'react';
import { Member, Coordinator } from '../types';
import { 
  User, 
  Trash2, 
  Edit3, 
  MessageCircle, 
  ShieldCheck, 
  CalendarDays, 
  ArrowDownAZ, 
  ShieldCheck as ShieldIcon,
  Send,
  Copy,
  X,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  MessageSquare
} from 'lucide-react';

type SortMode = 'date' | 'name' | 'coordinator';

interface MemberListProps {
  members: Member[];
  coordinators?: Coordinator[];
  onDelete: (id: string) => void;
  onEdit: (member: Member) => void;
  onSelect: (member: Member) => void;
  welcomeTemplate?: string;
  isCoordinatorView?: boolean;
}

const formatPhone = (phone: string | null | undefined) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

const getWhatsAppLink = (phone: string | null | undefined, name: string, template?: string) => {
  if (!phone) return '#';
  const cleaned = phone.replace(/\D/g, '');
  let formatted = cleaned;
  if (cleaned.length === 10 || cleaned.length === 11) {
    formatted = `55${cleaned}`;
  } else if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
    formatted = cleaned;
  }

  const baseMsg = template || "Olá {nome_eleitor}!";
  const personalizedMsg = baseMsg.replace(/{nome_eleitor}/g, name || '');
  
  return `https://wa.me/${formatted}?text=${encodeURIComponent(personalizedMsg)}`;
};

export default function MemberList({ 
  members, 
  coordinators = [], 
  onDelete, 
  onEdit, 
  onSelect, 
  welcomeTemplate,
  isCoordinatorView = false
}: MemberListProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Estados de seleção para WhatsApp em massa
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchMessage, setBatchMessage] = useState(welcomeTemplate || 'Olá {nome_eleitor}! Gostaria de conversar com você sobre a nossa campanha.');
  const [currentDispatchIndex, setCurrentDispatchIndex] = useState(0);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const sortedMembers = useMemo(() => {
    const copy = [...members];
    if (sortMode === 'date') {
      return copy.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
    }
    if (sortMode === 'name') {
      return copy.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
    }
    // coordinator first, then alphabetical
    return copy.sort((a, b) => {
      const ca = Boolean(a.isCoordinator) ? 0 : 1;
      const cb = Boolean(b.isCoordinator) ? 0 : 1;
      if (ca !== cb) return ca - cb;
      return (a.name || '').localeCompare(b.name || '', 'pt-BR');
    });
  }, [members, sortMode]);

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {
      console.warn('Clipboard API error', e);
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const membersWithPhone = useMemo(() => {
    return sortedMembers.filter(m => Boolean(m.phone && m.phone.replace(/\D/g, '').length >= 8));
  }, [sortedMembers]);

  const isAllSelected = membersWithPhone.length > 0 && membersWithPhone.every(m => selectedMemberIds.has(m.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedMemberIds(new Set());
    } else {
      setSelectedMemberIds(new Set(membersWithPhone.map(m => m.id)));
    }
  };

  const toggleSelectMember = (id: string) => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedList = useMemo(() => {
    return sortedMembers.filter(m => selectedMemberIds.has(m.id) && m.phone);
  }, [sortedMembers, selectedMemberIds]);

  const handleCopySelectedNumbers = async (sep: 'newline' | 'comma' = 'newline') => {
    const phones = selectedList
      .map(m => {
        const cleaned = (m.phone || '').replace(/\D/g, '');
        if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) return cleaned;
        if (cleaned.length === 10 || cleaned.length === 11) return `55${cleaned}`;
        return cleaned.length >= 8 ? `55${cleaned}` : '';
      })
      .filter(Boolean);

    if (phones.length === 0) return;
    const txt = sep === 'comma' ? phones.join(', ') : phones.join('\n');
    await copyToClipboard(txt);
    setToastMsg(`✅ ${phones.length} números copiados!`);
    setTimeout(() => setToastMsg(null), 3000);
  };


  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tableContainerRef.current) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, a, textarea')) return;

    setIsDragging(true);
    setStartX(e.pageX - tableContainerRef.current.offsetLeft);
    setStartY(e.pageY - tableContainerRef.current.offsetTop);
    setScrollLeft(tableContainerRef.current.scrollLeft);
    setScrollTop(tableContainerRef.current.scrollTop);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !tableContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - tableContainerRef.current.offsetLeft;
    const y = e.pageY - tableContainerRef.current.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    tableContainerRef.current.scrollLeft = scrollLeft - walkX;
    tableContainerRef.current.scrollTop = scrollTop - walkY;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  if (members.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gov-blue/20">
        <User className="w-16 h-16 text-gov-bg mx-auto mb-4" />
        <h3 className="text-xl font-black text-gov-blue uppercase tracking-tight">Nenhum registro encontrado</h3>
        <p className="text-blue-400 text-sm font-medium italic">Inicie o processo de registro de apoiadores ou coordenadores.</p>
      </div>
    );
  }

  const isCoord = (m: Member) => Boolean(m.isCoordinator);
  const coordCount = members.filter(isCoord).length;
  const voterCount = members.length - coordCount;

  return (
    <div className="bg-white shadow-xl overflow-hidden border border-gray-200 rounded-none">
      {/* ── Sort Controls ─────────────────────────────────────────────── */}
      {!isCoordinatorView && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mr-1">Ordenar:</span>
          {(
            [
              { mode: 'date' as SortMode, label: 'Data', icon: <CalendarDays className="w-3 h-3" /> },
              { mode: 'name' as SortMode, label: 'A–Z', icon: <ArrowDownAZ className="w-3 h-3" /> },
              { mode: 'coordinator' as SortMode, label: 'Coordenadores', icon: <ShieldIcon className="w-3 h-3" /> },
            ] as { mode: SortMode; label: string; icon: React.ReactNode }[]
          ).map(({ mode, label, icon }) => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wide rounded-xl border transition-all ${
                sortMode === mode
                  ? 'bg-gov-blue text-white border-gov-blue shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gov-blue hover:text-gov-blue'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Barra de Ações para Eleitores Marcados ─────────────────────── */}
      {selectedMemberIds.size > 0 && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md border-b-2 border-emerald-800 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse"></span>
            <span className="text-xs font-black uppercase tracking-wider">
              {selectedMemberIds.size} {selectedMemberIds.size === 1 ? 'eleitor selecionado' : 'eleitores selecionados'} para envio
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setCurrentDispatchIndex(0);
                setShowBatchModal(true);
              }}
              className="bg-white text-emerald-800 hover:bg-emerald-50 active:bg-gray-100 px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5 shadow-sm transition-all hover:scale-105"
            >
              <Send className="w-3.5 h-3.5 text-emerald-600" />
              Enviar Mensagem WhatsApp
            </button>
            <button
              onClick={() => handleCopySelectedNumbers('newline')}
              className="bg-emerald-800/80 hover:bg-emerald-900 text-white px-3.5 py-2 rounded-xl font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5 transition-all"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-200" />
              Copiar Números
            </button>
            <button
              onClick={() => setSelectedMemberIds(new Set())}
              className="text-emerald-100 hover:text-white px-3 py-2 text-[10px] font-bold uppercase tracking-wider underline transition-all"
            >
              Desmarcar Todos
            </button>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-[300] bg-gov-blue text-white px-5 py-3 rounded-2xl shadow-2xl border-2 border-gov-yellow font-black uppercase text-xs flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-gov-yellow" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div 

        ref={tableContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className={`relative overflow-auto select-none transition-[cursor] duration-75 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`} 
        style={{ maxHeight: '600px' }}
      >
        <table className="w-full text-left border-collapse min-w-[1100px]">
          <thead>
            <tr className="bg-gov-blue text-white sticky top-0 z-20">
              <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest border-r border-blue-900/50 text-center w-14 sticky left-0 bg-gov-blue z-30 rounded-none">Nº</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border-r border-blue-900/50">Nome Completo</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border-r border-blue-900/50">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    title={isAllSelected ? "Desmarcar todos" : "Marcar todos com WhatsApp"}
                  />
                  <span>WhatsApp</span>
                  {selectedMemberIds.size > 0 && (
                    <span className="bg-emerald-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black ml-1">
                      {selectedMemberIds.size}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border-r border-blue-900/50 text-center">Idade</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border-r border-blue-900/50">Gênero</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border-r border-blue-900/50">Título / Seção / Zona</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedMembers.map((member, idx) => {
              const isCoordinatorMember = !isCoordinatorView && Boolean(member.isCoordinator);

              return (
                <tr 
                  key={member.id} 
                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50 transition-colors cursor-pointer group`}
                  onClick={() => onSelect(member)}
                >
                  {/* Número Sequencial */}
                  <td className="px-3 py-2.5 text-xs font-black text-center text-gov-blue border-r border-gray-100 bg-gray-50/70 w-14">
                    {idx + 1}
                  </td>

                  {/* Nome Completo: VERDE para Coordenadores, PRETO para Eleitores */}
                  <td className="px-4 py-2.5 text-xs font-black uppercase border-r border-gray-100">
                    <div className="flex items-center gap-2">
                      <span 
                        style={{ color: isCoordinatorMember ? '#059669' : '#000000' }}
                        className={isCoordinatorMember ? "text-emerald-600 font-black tracking-tight" : "text-black font-black tracking-tight"}
                      >
                        {member.name}
                      </span>
                      {isCoordinatorMember && (
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0 inline-flex items-center gap-1 shadow-sm">
                          <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                          Coordenador
                        </span>
                      )}
                    </div>
                  </td>

                  {/* WhatsApp com Caixa de Seleção */}
                  <td className="px-4 py-2.5 text-xs border-r border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.has(member.id)}
                        disabled={!member.phone}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectMember(member.id);
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-20 shrink-0"
                        title={member.phone ? "Marcar eleitor para envio de WhatsApp" : "Sem telefone cadastrado"}
                      />
                      <a 
                        href={getWhatsAppLink(member.phone, member.name, welcomeTemplate)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-green-600 transition-colors flex items-center gap-1.5"
                      >
                        {member.phone ? (
                          <span className="font-black text-blue-700 text-sm">{formatPhone(member.phone)}</span>
                        ) : (
                          <span className="text-red-500 font-black italic"> (SEM TELEFONE)</span>
                        )}
                        <MessageCircle className="w-4 h-4 text-green-500" />
                      </a>
                    </div>
                  </td>

                  {/* Idade */}
                  <td className="px-4 py-2.5 text-xs font-bold text-gray-600 border-r border-gray-100 text-center">
                    {member.age || 'N/A'}
                  </td>

                  {/* Gênero */}
                  <td className="px-4 py-2.5 text-[10px] font-black uppercase border-r border-gray-100">
                    <span className="text-gov-blue font-bold">
                      {member.gender || 'N/A'}
                    </span>
                  </td>

                  {/* Título / Seção / Zona */}
                  <td className="px-4 py-2.5 text-xs border-r border-gray-100">
                    <div className="flex flex-col">
                      <span className="font-black text-gov-blue text-[11px]">{member.voterId || 'N/A'}</span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase">
                        SEC: {member.voterSection || '0000'} / ZON: {member.voterZone || '000'}
                      </span>
                    </div>
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(member); }}
                        className="p-1.5 text-gov-blue hover:bg-gov-bg rounded-xl transition-all"
                        title="Editar registro"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(member.id); }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Excluir registro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Rodapé com contagem unificada da campanha ou isolada do coordenador */}
      <div className="bg-gov-blue text-white px-4 py-2.5 flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] font-black uppercase tracking-widest sticky bottom-0 z-10 shadow-lg">
        <span className="text-yellow-400 font-black">
          {isCoordinatorView ? 'Meus Eleitores Cadastrados' : 'Relação Geral da Campanha'}
        </span>
        <div className="flex items-center gap-4 flex-wrap">
          {!isCoordinatorView && (
            <>
              <span className="text-emerald-300 font-black bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                ● {coordCount} Coordenadores (Verde)
              </span>
              <span className="text-gray-200 font-black bg-white/10 px-2.5 py-0.5 rounded-full">
                ● {voterCount} Eleitores (Preto)
              </span>
            </>
          )}
          <span className="text-white font-black bg-white/15 px-3 py-0.5 rounded-full">
            Total: {members.length} {isCoordinatorView ? 'Eleitores' : 'Pessoas Cadastradas'}
          </span>
        </div>
      </div>

      {/* ── Modal de Envio em Massa / Disparo para Selecionados ───────── */}
      {showBatchModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-gov-blue/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-6 sm:p-8 border-4 border-emerald-600 max-w-xl w-full shadow-2xl relative rounded-3xl max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowBatchModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gov-blue p-1 rounded-full hover:bg-gray-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gov-blue uppercase tracking-tight">
                  Transmissão WhatsApp ({selectedList.length} Marcados)
                </h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                  Envie mensagens personalizadas para os eleitores selecionados
                </p>
              </div>
            </div>

            {/* Editor da Mensagem */}
            <div className="mb-4">
              <label className="block text-[10px] font-black uppercase text-gray-600 mb-1.5 tracking-wider">
                Mensagem a enviar (use <span className="text-emerald-600 font-mono">{"{nome_eleitor}"}</span> para personalizar):
              </label>
              <textarea
                value={batchMessage}
                onChange={(e) => setBatchMessage(e.target.value)}
                rows={3}
                className="w-full p-3 bg-gray-50 border-2 border-gray-200 outline-none focus:border-emerald-600 rounded-2xl text-xs font-medium resize-none transition-all"
                placeholder="Ex: Olá {nome_eleitor}! Tudo bem? Gostaria de convidar..."
              />
            </div>

            {/* Opção 1: Disparo 1 a 1 guiado */}
            {selectedList.length > 0 && (
              <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900">
                    Disparo Individual Guiado (1 a 1)
                  </span>
                  <span className="text-[10px] font-black text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-300">
                    {currentDispatchIndex + 1} de {selectedList.length}
                  </span>
                </div>

                {/* Eleitor Atual */}
                {selectedList[currentDispatchIndex] && (() => {
                  const curr = selectedList[currentDispatchIndex];
                  const isSent = sentIds.has(curr.id);
                  const cleaned = (curr.phone || '').replace(/\D/g, '');
                  const formattedPhone = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
                  const personalized = batchMessage.replace(/{nome_eleitor}/g, curr.name || '');
                  const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(personalized)}`;

                  return (
                    <div>
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-emerald-200 mb-3 shadow-sm">
                        <div className="truncate">
                          <p className="font-black text-xs uppercase text-gov-blue truncate">{curr.name}</p>
                          <p className="text-[10px] font-bold text-blue-600 uppercase">{formatPhone(curr.phone)}</p>
                        </div>
                        {isSent ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2 py-1 rounded-lg border border-emerald-300 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" /> Enviado
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-800 text-[9px] font-black uppercase px-2 py-1 rounded-lg border border-amber-200">
                            Pendente
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            setSentIds(prev => new Set(prev).add(curr.id));
                            if (currentDispatchIndex < selectedList.length - 1) {
                              setCurrentDispatchIndex(prev => prev + 1);
                            }
                          }}
                          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black uppercase text-[10px] tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Abrir WhatsApp ({currentDispatchIndex + 1}/{selectedList.length})
                        </a>

                        <button
                          disabled={currentDispatchIndex === 0}
                          onClick={() => setCurrentDispatchIndex(prev => Math.max(0, prev - 1))}
                          className="px-3 py-3 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 font-black text-xs rounded-xl border border-gray-200 transition-all"
                          title="Anterior"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <button
                          disabled={currentDispatchIndex >= selectedList.length - 1}
                          onClick={() => setCurrentDispatchIndex(prev => Math.min(selectedList.length - 1, prev + 1))}
                          className="px-3 py-3 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 font-black text-xs rounded-xl border border-gray-200 transition-all"
                          title="Próximo"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Opção 2: Copiar Lista para Transmissão em Massa */}
            <div className="border-t border-gray-100 pt-4">
              <span className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-2">
                Ou Copie para Lista de Transmissão do WhatsApp:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => handleCopySelectedNumbers('newline')}
                  className="py-3 px-3 bg-gov-blue hover:bg-blue-900 text-white font-black uppercase text-[9px] tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5 text-gov-yellow" />
                  Copiar Números (1 por linha)
                </button>
                <button
                  onClick={() => handleCopySelectedNumbers('comma')}
                  className="py-3 px-3 bg-gray-100 hover:bg-gray-200 text-gov-blue font-black uppercase text-[9px] tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all border border-gray-200"
                >
                  <Copy className="w-3.5 h-3.5 text-gray-600" />
                  Copiar Números (c/ Vírgula)
                </button>
                <button
                  onClick={async () => {
                    const ok = await copyToClipboard(batchMessage);
                    if (ok) {
                      setToastMsg('✅ Mensagem copiada!');
                      setTimeout(() => setToastMsg(null), 3000);
                    }
                  }}
                  className="sm:col-span-2 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black uppercase text-[9px] tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all border border-emerald-200"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-600" />
                  Copiar Texto da Mensagem
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
