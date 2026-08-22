import { useState, useMemo } from 'react';
import { Member } from '../types';
import { CheckCircle2, Search, Filter, BarChart3, Clock, MapPin, UserCheck, UserMinus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ElectionDayProps {
  members: Member[];
}

export default function ElectionDay({ members }: ElectionDayProps) {
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');

  const zones = useMemo(() => {
    return Array.from(new Set(members.map(m => m.voterZone).filter(Boolean))).sort();
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (m.voterId && m.voterId.includes(searchTerm));
      const matchesZone = zoneFilter ? m.voterZone === zoneFilter : true;
      const matchesSection = sectionFilter ? m.voterSection === sectionFilter : true;
      return matchesSearch && matchesZone && matchesSection;
    });
  }, [members, searchTerm, zoneFilter, sectionFilter]);

  const stats = useMemo(() => {
    const total = members.length;
    const voted = votedIds.size;
    const percentage = total > 0 ? (voted / total) * 100 : 0;
    return { total, voted, percentage };
  }, [members, votedIds]);

  const toggleVote = (id: string) => {
    const newVoted = new Set(votedIds);
    if (newVoted.has(id)) newVoted.delete(id);
    else newVoted.add(id);
    setVotedIds(newVoted);
  };

  const sections = useMemo(() => {
    const baseList = zoneFilter ? members.filter(m => m.voterZone === zoneFilter) : members;
    return Array.from(new Set(baseList.map(m => m.voterSection).filter(Boolean))).sort();
  }, [members, zoneFilter]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Dashboard de Progresso */}
      <div className="bg-gov-blue p-8 text-white border-b-8 border-gov-yellow shadow-2xl relative overflow-hidden rounded-2xl">
        <div className="absolute right-0 top-0 opacity-10 p-4">
          <BarChart3 className="w-32 h-32" />
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
          <div className="text-center md:text-left">
            <h3 className="text-3xl font-black uppercase tracking-tighter italic">Monitoramento Real-Time</h3>
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-[0.3em] mt-1">Status da Base: Dia da Eleição</p>
          </div>
          
          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase text-gov-yellow mb-1">Total Esperado</p>
              <p className="text-4xl font-black">{stats.total}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase text-green-400 mb-1">Votos Confirmados</p>
              <p className="text-4xl font-black text-green-400">{stats.voted}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white/10 h-6 rounded-full overflow-hidden relative border border-white/20">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${stats.percentage}%` }}
            className="h-full bg-gov-yellow rounded-full"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-white mix-blend-difference">
              Meta de Conversão: {stats.percentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Filtros de Alta Velocidade */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gov-blue/30" />
          <input 
            type="text"
            placeholder="NOME OU TÍTULO..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gov-blue outline-none font-black uppercase text-sm rounded-xl"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gov-blue/30" />
          <select 
            value={zoneFilter}
            onChange={e => {
              setZoneFilter(e.target.value);
              setSectionFilter('');
            }}
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gov-blue outline-none font-black uppercase text-sm appearance-none rounded-xl"
          >
            <option value="">TODAS AS ZONAS</option>
            {zones.map(z => <option key={z} value={z}>ZONA {z}</option>)}
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gov-blue/30" />
          <select 
            value={sectionFilter}
            onChange={e => setSectionFilter(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gov-blue outline-none font-black uppercase text-sm appearance-none rounded-xl"
          >
            <option value="">TODAS AS SEÇÕES</option>
            {sections.map(s => <option key={s} value={s}>SEÇÃO {s}</option>)}
          </select>
        </div>
      </div>

      {/* Lista de Eleitores */}
      <div className="space-y-3">
        {filteredMembers.map(member => (
          <motion.div 
            key={member.id}
            layout
            className={`p-5 flex items-center justify-between border-2 transition-all rounded-xl ${
              votedIds.has(member.id) 
                ? 'bg-green-50 border-green-500 opacity-60' 
                : 'bg-white border-gray-100 hover:border-gov-blue'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 flex items-center justify-center border-2 rounded-full ${
                votedIds.has(member.id) ? 'bg-green-500 border-green-500 text-white' : 'bg-gray-50 border-gray-200 text-gray-300'
              }`}>
                {votedIds.has(member.id) ? <UserCheck className="w-6 h-6" /> : <UserMinus className="w-6 h-6" />}
              </div>
              <div>
                <h4 className={`font-black uppercase text-sm ${votedIds.has(member.id) ? 'text-green-700' : 'text-gray-900'}`}>
                  {member.name}
                </h4>
                <div className="flex gap-3 mt-1">
                  <span className="text-[9px] font-bold text-gray-400 uppercase flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> SEÇÃO {member.voterSection || '---'}
                  </span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3" /> ZONA {member.voterZone || '---'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => toggleVote(member.id)}
              className={`px-6 py-3 font-black uppercase text-[10px] tracking-widest transition-all rounded-xl ${
                votedIds.has(member.id)
                  ? 'bg-white text-green-600 border-2 border-green-500'
                  : 'bg-gov-blue text-white shadow-lg active:scale-95'
              }`}
            >
              {votedIds.has(member.id) ? 'VOTO CONFIRMADO' : 'CONFIRMAR VOTO'}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
