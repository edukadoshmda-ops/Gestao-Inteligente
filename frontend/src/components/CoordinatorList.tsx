import { Coordinator, Member } from '../types';
import { User, Trash2, Edit3, MapPin, ShieldCheck, Users, FileSpreadsheet } from 'lucide-react';
import { motion } from 'motion/react';
import { matchMemberToCoordinator, exportCoordinatorExcel } from '../lib/coordinatorUtils';

interface CoordinatorListProps {
  coordinators: Coordinator[];
  members: Member[];
  onDelete?: (id: string) => void;
  onEdit: (coordinator: Coordinator) => void;
  onSelect: (coordinator: Coordinator) => void;
  candidateName?: string;
  onNotify?: (msg: string) => void;
}

export default function CoordinatorList({ 
  coordinators, 
  members, 
  onDelete, 
  onEdit, 
  onSelect,
  candidateName,
  onNotify 
}: CoordinatorListProps) {
  if (coordinators.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gov-blue/20">
        <ShieldCheck className="w-16 h-16 text-gov-bg mx-auto mb-4" />
        <h3 className="text-xl font-black text-gov-blue uppercase tracking-tight">Nenhum coordenador cadastrado</h3>
        <p className="text-blue-400 text-sm font-medium italic">Cadastre seus coordenadores para iniciar a captação de dados.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {coordinators.map((coordinator) => {
        // Contagem resiliente de pessoas cadastradas (trata ID, prefixos, email, nome e rede)
        const memberCount = members.filter(m => matchMemberToCoordinator(m, coordinator)).length;
        
        return (
          <motion.div
            key={coordinator.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-sm border-l-4 border-gov-yellow border-r border-t border-b border-gray-100 overflow-hidden transition-all hover:shadow-xl flex flex-col justify-between"
          >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gray-100 overflow-hidden border-2 border-gov-blue/10 rounded-2xl shrink-0">
                  {coordinator.photo ? (
                    <img src={coordinator.photo} alt={coordinator.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-full h-full p-4 text-gov-blue/20" />
                  )}
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                      coordinator.role === 'general_coordination'
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                        : coordinator.role === 'area_coordinator' || !coordinator.network_id
                        ? 'bg-purple-100 text-purple-800 border border-purple-300'
                        : 'bg-blue-100 text-blue-800 border border-blue-300'
                    }`}>
                      {coordinator.role === 'general_coordination'
                        ? '⭐ Coordenação Geral'
                        : coordinator.role === 'area_coordinator' || !coordinator.network_id
                        ? '📍 Líder de Área'
                        : '🚶 Coordenador de Campo'}
                    </span>
                  </div>
                  <h3 className="font-black text-gray-900 uppercase tracking-tight truncate leading-tight">{coordinator.name}</h3>
                  <div className="flex items-center gap-1 text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{coordinator.neighborhood || 'Centro'}, {coordinator.city || 'DF'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 bg-gov-bg border-l-2 border-gov-blue/20 rounded-2xl">
                  <span className="text-[9px] font-black text-blue-700 uppercase tracking-tighter">Pessoas Cadastradas</span>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-gov-blue" />
                    <span className="text-lg font-black text-gov-blue">{memberCount}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 p-3 bg-gov-bg border-l-2 border-gov-blue/20 rounded-2xl">
                  <span className="text-[9px] font-black text-blue-700 uppercase tracking-tighter">Título / Seção / Zona</span>
                  <span className="text-sm font-black text-gov-blue uppercase tracking-tight truncate">
                    {coordinator.voterId || 'SEM TÍTULO'}
                  </span>
                  <span className="text-[10px] font-bold text-gov-blue/50 uppercase">
                    SESSÃO: {coordinator.voterSection || '0000'} / ZONA: {coordinator.voterZone || '000'}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => onEdit(coordinator)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gov-bg text-gov-blue border border-gov-blue/20 font-black uppercase text-[9px] tracking-widest hover:bg-gov-blue hover:text-white transition-all rounded-2xl"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Editar
                </button>
                {onDelete && (
                  <button
                    onClick={() => onDelete(coordinator.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white text-red-500 border border-red-100 font-black uppercase text-[9px] tracking-widest hover:bg-red-50 transition-all rounded-2xl"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                )}
              </div>
            </div>

            {/* Barra Inferior com Download da Planilha & Relatório Individual */}
            <div className="flex border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => exportCoordinatorExcel(coordinator, members, candidateName, onNotify)}
                className="flex-1 py-3 px-3 bg-emerald-600 text-white font-black uppercase text-[9px] sm:text-[10px] tracking-wider hover:bg-emerald-700 active:bg-emerald-800 transition-all flex items-center justify-center gap-1.5 border-r border-emerald-700/40"
                title={`Baixar planilha Excel com os apoiadores de ${coordinator.name}`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200 shrink-0" />
                <span>Baixar Planilha ({memberCount})</span>
              </button>
              <button 
                onClick={() => onSelect(coordinator)}
                className="flex-1 py-3 px-3 bg-gov-blue text-white font-black uppercase text-[9px] sm:text-[10px] tracking-wider hover:bg-blue-800 transition-all flex items-center justify-center gap-1"
                title="Ver relatório individual de eleitores"
              >
                <span>Ver Relatório</span>
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
