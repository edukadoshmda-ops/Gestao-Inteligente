import { useState, useRef, useMemo } from 'react';
import { Member, Coordinator } from '../types';
import { User, Trash2, Edit3, MessageCircle, ShieldCheck, CalendarDays, ArrowDownAZ, ShieldCheck as ShieldIcon } from 'lucide-react';

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
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border-r border-blue-900/50 sticky left-0 bg-gov-blue z-30 rounded-none">Nome Completo</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border-r border-blue-900/50">WhatsApp</th>
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

                  {/* WhatsApp */}
                  <td className="px-4 py-2.5 text-xs border-r border-gray-100">
                    <div className="flex items-center gap-2">
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
    </div>
  );
}
