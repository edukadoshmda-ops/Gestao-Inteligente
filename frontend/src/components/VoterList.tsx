import { Voter } from '../types';
import { User, Phone, MapPin, Calendar, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

interface VoterListProps {
  voters: Voter[];
  onDelete: (id: string) => void;
  onSelect: (voter: Voter) => void;
}

export default function VoterList({ voters, onDelete, onSelect }: VoterListProps) {
  if (voters.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gov-blue/20">
        <User className="w-16 h-16 text-gov-bg mx-auto mb-4" />
        <h3 className="text-xl font-black text-gov-blue uppercase tracking-tight">Nenhum eleitor cadastrado</h3>
        <p className="text-blue-400 text-sm font-medium italic">Inicie o processo de registro institucional.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {voters.map((voter) => (
        <motion.div
          layout
          key={voter.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ 
            y: -4,
            scale: 1.01,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
          }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(voter)}
          className="bg-white rounded-2xl shadow-sm border-l-4 border-gov-blue border-r border-t border-b border-gray-100 p-6 transition-colors group relative cursor-pointer hover:border-gov-yellow"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(voter.id);
            }}
            className="absolute top-4 right-4 p-2 text-gray-200 hover:text-red-500 hover:bg-red-50 transition-all z-10"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 bg-gov-bg rounded-2xl flex items-center justify-center flex-shrink-0 border border-gov-blue/10">
              <User className="w-5 h-5 text-gov-blue" />
            </div>
            <div className="overflow-hidden">
              <h3 className="font-black text-gray-900 uppercase tracking-tight truncate leading-tight">{voter.name}</h3>
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                {voter.gender}
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400 font-bold uppercase tracking-widest">Telefone</span>
              <span className="font-black text-gov-blue">{voter.phone}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400 font-bold uppercase tracking-widest">Nascimento</span>
              <span className="font-black text-gov-blue">{new Date(voter.birthDate).toLocaleDateString()}</span>
            </div>
            <div className="flex flex-col gap-1 p-3 bg-gov-bg border-l-2 border-gov-yellow rounded-2xl">
              <span className="text-[9px] font-black text-blue-700 uppercase tracking-tighter">Seção Eleitoral</span>
              <span className="text-sm font-black text-gov-blue uppercase tracking-tight">{voter.votingSection}</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center text-[9px] text-gray-300 uppercase tracking-widest font-black rounded-2xl">
            <span>{voter.civilStatus}</span>
            <span className="bg-gray-50 px-2 py-0.5 rounded-2xl">{voter.id.toUpperCase().slice(0, 6)}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
