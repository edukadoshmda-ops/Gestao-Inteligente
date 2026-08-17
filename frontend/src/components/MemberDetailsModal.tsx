import { Member } from '../types';
import { X, User, Phone, Hash, Clock, Edit3, Printer, Mail, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MemberDetailsModalProps {
  member: Member | null;
  onClose: () => void;
  onEdit?: (member: Member) => void;
}

export default function MemberDetailsModal({ member, onClose, onEdit }: MemberDetailsModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const getWhatsAppLink = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length === 10 || cleaned.length === 11) {
      formatted = `55${cleaned}`;
    } else if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
      formatted = cleaned;
    }
    return `https://wa.me/${formatted}`;
  };

  return (
    <AnimatePresence>
      {member && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:p-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gov-blue/60 backdrop-blur-sm print:hidden"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border-2 border-gov-blue overflow-hidden print:border-0 print:shadow-none"
          >
            {/* Header */}
            <div className="bg-gov-blue p-6 text-white flex items-center justify-between border-b-4 border-gov-yellow print:bg-white print:text-gov-blue print:border-b-2 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gov-yellow rounded-xl flex items-center justify-center font-black text-gov-blue text-2xl shadow-lg print:shadow-none">
                  FJ
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">Ficha de Apoiador</h2>
                  <p className="text-[10px] uppercase tracking-widest font-bold opacity-70">Gestão de Base Eleitoral</p>
                </div>
              </div>
              <div className="flex gap-2 print:hidden">
                <button
                  onClick={handlePrint}
                  className="p-2 hover:bg-white/10 transition-colors rounded-xl border border-white/20"
                  title="Imprimir Ficha"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 transition-colors rounded-xl border border-white/20"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 md:p-10">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="w-24 h-24 bg-gov-bg flex items-center justify-center border-4 border-gov-blue/10 flex-shrink-0 print:border-2 rounded-2xl">
                  <User className="w-12 h-12 text-gov-blue" />
                </div>

                <div className="flex-1 space-y-6">
                  <div>
                    <h3 className="text-2xl font-black text-gov-blue uppercase tracking-tight leading-tight mb-1">
                      {member.name}
                    </h3>
                    <div className="flex gap-2">
                      <span className="text-[10px] font-black px-2 py-0.5 bg-gov-blue text-white uppercase tracking-widest">
                        {member.gender}
                      </span>
                      {member.age && (
                        <span className="text-[10px] font-black px-2 py-0.5 bg-gov-yellow text-gov-blue uppercase tracking-widest">
                          {member.age} ANOS
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-6 border-t border-gray-100 rounded-2xl">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Telefone / Contato</span>
                      <a
                        href={getWhatsAppLink(member.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 font-bold text-gov-blue hover:text-green-600 transition-colors group/phone"
                      >
                        <Phone className="w-4 h-4 text-gov-yellow group-hover/phone:text-green-500" />
                        {member.phone}
                        <MessageCircle className="w-3 h-3 text-green-500 opacity-0 group-hover/phone:opacity-100 transition-opacity" />
                      </a>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">E-mail</span>
                      <div className="flex items-center gap-2 font-bold text-gov-blue">
                        <Mail className="w-4 h-4 text-gov-yellow" />
                        {member.email}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Título de Eleitor</span>
                      <div className="flex items-center gap-2 font-bold text-gov-blue">
                        <Hash className="w-4 h-4 text-gov-yellow" />
                        {member.voterId || 'N/A'}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Seção / Zona</span>
                      <div className="flex items-center gap-2 font-bold text-gov-blue">
                        <Hash className="w-4 h-4 text-gov-yellow" />
                        {member.voterSection || '0000'} / {member.voterZone || '000'}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Data de Nascimento</span>
                      <div className="flex items-center gap-2 font-bold text-gov-blue">
                        <Clock className="w-4 h-4 text-gov-yellow" />
                        {member.birthDate ? new Date(member.birthDate).toLocaleDateString('pt-BR') : 'N/A'}
                      </div>
                    </div>


                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Data de Cadastro</span>
                      <div className="flex items-center gap-2 font-bold text-gov-blue">
                        <Clock className="w-4 h-4 text-gov-yellow" />
                        {new Date(member.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>

                    <div className="col-span-full space-y-1 pt-4 border-t border-gray-100/50 rounded-2xl">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Identificador Único (UID)</span>
                      <div className="flex items-center gap-2 font-bold text-gov-blue font-mono text-xs opacity-60">
                        <Hash className="w-3 h-3 text-gov-yellow" />
                        {member.id.toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gov-bg p-6 flex justify-end gap-4 border-t border-gray-100 print:hidden rounded-2xl">
              {onEdit && (
                <button
                  onClick={() => onEdit(member)}
                  className="px-8 py-3 border-2 border-gov-blue text-gov-blue font-black uppercase tracking-widest text-xs rounded-xl hover:bg-white transition-all flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Editar Registro
                </button>
              )}
              <button
                onClick={onClose}
                className="px-10 py-3 bg-gov-blue text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg hover:bg-blue-800 transition-all"
              >
                Fechar Consulta
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
