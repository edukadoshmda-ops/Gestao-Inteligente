import { useState, useRef } from 'react';
import { Member } from '../types';
import { User, Trash2, Edit3, MessageCircle } from 'lucide-react';

interface MemberListProps {
  members: Member[];
  onDelete: (id: string) => void;
  onEdit: (member: Member) => void;
  onSelect: (member: Member) => void;
  welcomeTemplate?: string;
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

export default function MemberList({ members, onDelete, onEdit, onSelect, welcomeTemplate }: MemberListProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const tableContainerRef = useRef<HTMLDivElement>(null);

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
        <p className="text-blue-400 text-sm font-medium italic">Inicie o processo de registro de apoiadores.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-xl overflow-hidden border border-gray-200 rounded-none">
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
            {members.map((member, idx) => (
              <tr 
                key={member.id} 
                className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50 transition-colors cursor-pointer group`}
                onClick={() => onSelect(member)}
              >
                <td className="px-4 py-2.5 text-xs font-black text-gray-900 uppercase border-r border-gray-100">
                  {member.name}
                </td>
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
                <td className="px-4 py-2.5 text-xs font-bold text-gray-600 border-r border-gray-100 text-center">
                  {member.age || 'N/A'}
                </td>
                <td className="px-4 py-2.5 text-[10px] font-black text-blue-400 uppercase border-r border-gray-100">
                  {member.gender || 'N/A'}
                </td>
                <td className="px-4 py-2.5 text-xs border-r border-gray-100">
                  <div className="flex flex-col">
                    <span className="font-black text-gov-blue text-[11px]">{member.voterId || 'N/A'}</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase">
                      SEC: {member.voterSection || '0000'} / ZON: {member.voterZone || '000'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(member); }}
                      className="p-1.5 text-gov-blue hover:bg-gov-bg rounded-xl transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(member.id); }}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-gov-blue text-white px-4 py-2 flex justify-between items-center text-[10px] font-black uppercase tracking-widest sticky bottom-0 z-10">
        <span>Gestão Inteligente 2026</span>
        <span>Total: {members.length} registros</span>
      </div>
    </div>
  );
}
