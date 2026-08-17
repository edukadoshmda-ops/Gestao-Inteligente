import { Coordinator } from '../types';
import { User, Trash2, Edit3, MapPin, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface CoordinatorListProps {
  coordinators: Coordinator[];
  onDelete: (id: string) => void;
  onEdit: (coordinator: Coordinator) => void;
  onSelect: (coordinator: Coordinator) => void;
}

export default function CoordinatorList({ coordinators, onDelete, onEdit, onSelect }: CoordinatorListProps) {
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
      {coordinators.map((coordinator) => (
        <motion.div
          key={coordinator.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-sm border-l-4 border-gov-yellow border-r border-t border-b border-gray-100 overflow-hidden transition-all hover:shadow-xl"
        >
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gray-100 overflow-hidden border-2 border-gov-blue/10 rounded-2xl">
                {coordinator.photo ? (
                  <img src={coordinator.photo} alt={coordinator.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-full h-full p-4 text-gov-blue/20" />
                )}
              </div>
              <div className="overflow-hidden">
                <h3 className="font-black text-gray-900 uppercase tracking-tight truncate leading-tight">{coordinator.name}</h3>
                <div className="flex items-center gap-1 text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1">
                  <MapPin className="w-3 h-3" />
                  {coordinator.neighborhood}, {coordinator.city}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex flex-col gap-1 p-3 bg-gov-bg border-l-2 border-gov-blue/20 rounded-2xl">
                <span className="text-[9px] font-black text-blue-700 uppercase tracking-tighter">Título / Seção / Zona</span>
                <span className="text-sm font-black text-gov-blue uppercase tracking-tight">
                  {coordinator.voterId || 'SEM TÍTULO'}
                </span>
                <span className="text-[10px] font-bold text-gov-blue/50 uppercase">
                  SESSÃO: {coordinator.voterSection || '0000'} / ZONA: {coordinator.voterZone || '000'}
                </span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => onEdit(coordinator)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gov-bg text-gov-blue border border-gov-blue/20 font-black uppercase text-[9px] tracking-widest hover:bg-gov-blue hover:text-white transition-all rounded-2xl"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Editar
              </button>
              <button
                onClick={() => onDelete(coordinator.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white text-red-500 border border-red-100 font-black uppercase text-[9px] tracking-widest hover:bg-red-50 transition-all rounded-2xl"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </button>
            </div>
          </div>
          <button 
            onClick={() => onSelect(coordinator)}
            className="w-full py-3 bg-gov-blue text-white font-black uppercase text-[10px] tracking-widest hover:bg-blue-800 transition-all"
          >
            Ver Relatório Individual
          </button>
        </motion.div>
      ))}
    </div>
  );
}
