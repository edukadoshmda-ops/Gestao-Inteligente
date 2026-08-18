import { useState, useEffect } from 'react';
import { Coordinator } from '../types';
import { X, Save, Camera, User } from 'lucide-react';
import { motion } from 'motion/react';

interface CoordinatorFormProps {
  onSave: (data: Omit<Coordinator, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  initialData?: Coordinator | null;
  networkId?: string; // ID do coordenador superior para hierarquia
  availableCoordinators?: Coordinator[]; // Lista de coordenadores disponíveis para seleção
}

export default function CoordinatorForm({ onSave, onCancel, initialData, networkId, availableCoordinators = [] }: CoordinatorFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    neighborhood: '',
    city: '',
    voterId: '',
    voterSection: '',
    voterZone: '',
    photo: '',
    whatsapp: '',
    network_id: networkId || '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        email: (initialData as any).email || '',
        neighborhood: initialData.neighborhood,
        city: initialData.city,
        voterId: initialData.voterId || '',
        voterSection: initialData.voterSection || '',
        voterZone: initialData.voterZone || '',
        photo: initialData.photo || '',
        whatsapp: initialData.whatsapp || '',
        network_id: (initialData as any).network_id || networkId || '',
      });
    }
  }, [initialData, networkId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-8 border-b-4 border-gov-yellow shadow-2xl max-w-2xl mx-auto rounded-2xl"
    >
      <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-6 rounded-2xl">
        <div>
          <h2 className="text-2xl font-black text-gov-blue uppercase tracking-tighter">
            {initialData ? 'Editar Coordenador' : 'Novo Coordenador'}
          </h2>
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">Gestão de Lideranças</p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-gray-100 transition-colors rounded-2xl">
          <X className="w-6 h-6 text-gray-400" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center mb-8">
           <div className="relative group">
              <div className="w-24 h-24 bg-gray-100 border-2 border-dashed border-gov-blue/20 flex items-center justify-center overflow-hidden rounded-2xl">
                {formData.photo ? (
                  <img src={formData.photo} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-gov-blue/20" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-gov-blue text-white cursor-pointer hover:bg-blue-800 transition-all shadow-lg rounded-2xl">
                <Camera className="w-4 h-4" />
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData({ ...formData, photo: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
           </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest">Nome Completo</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 focus:border-gov-blue outline-none uppercase text-xs font-bold tracking-wider rounded-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 focus:border-gov-blue outline-none text-xs font-bold tracking-wider rounded-full"
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest">Bairro</label>
              <input
                type="text"
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 focus:border-gov-blue outline-none uppercase text-xs font-bold tracking-wider rounded-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest">Cidade</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 focus:border-gov-blue outline-none uppercase text-xs font-bold tracking-wider rounded-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 p-6 bg-gov-bg border-l-4 border-gov-yellow rounded-2xl">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-blue-700 uppercase">Título</label>
              <input
                type="text"
                value={formData.voterId}
                onChange={(e) => setFormData({ ...formData, voterId: e.target.value })}
                className="w-full p-3 bg-white border border-blue-100 focus:border-gov-blue outline-none text-xs font-bold rounded-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-blue-700 uppercase">Seção</label>
              <input
                type="text"
                value={formData.voterSection}
                onChange={(e) => setFormData({ ...formData, voterSection: e.target.value })}
                className="w-full p-3 bg-white border border-blue-100 focus:border-gov-blue outline-none text-xs font-bold rounded-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-blue-700 uppercase">Zona</label>
              <input
                type="text"
                value={formData.voterZone}
                onChange={(e) => setFormData({ ...formData, voterZone: e.target.value })}
                className="w-full p-3 bg-white border border-blue-100 focus:border-gov-blue outline-none text-xs font-bold rounded-full"
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest flex items-center gap-2">
              <span className="bg-green-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-xl">WhatsApp</span>
              Número do WhatsApp (com DDD)
            </label>
            <input
              type="tel"
              placeholder="Ex: 91999990000"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value.replace(/\D/g, '') })}
              className="w-full p-4 bg-gray-50 border-2 border-green-100 focus:border-green-500 outline-none text-xs font-bold tracking-wider rounded-full"
            />
            <p className="text-[9px] text-gray-400 font-bold">* Necessário para receber anúncios e comandos da IA direto no WhatsApp</p>
          </div>

          {/* Seleção de Coordenador Superior (Hierarquia) */}
          {availableCoordinators.length > 0 && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest flex items-center gap-2">
                <span className="bg-purple-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-xl">Hierarquia</span>
                Coordenador Superior (Rede)
              </label>
              <select
                value={formData.network_id}
                onChange={(e) => setFormData({ ...formData, network_id: e.target.value })}
                className="w-full p-4 bg-gray-50 border-2 border-purple-100 focus:border-purple-500 outline-none text-xs font-bold tracking-wider rounded-full"
              >
                <option value="">Sem coordenador superior (Coordenador Principal)</option>
                {availableCoordinators.map(coord => (
                  <option key={coord.id} value={coord.id}>
                    {coord.name} - {coord.neighborhood}
                  </option>
                ))}
              </select>
              <p className="text-[9px] text-gray-400 font-bold">* Define a hierarquia de rede para filtragem de dados</p>
            </div>
          )}
        </div>

        <div className="flex gap-4 pt-6 border-t border-gray-100 rounded-2xl">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 bg-gray-50 text-gray-400 font-black uppercase text-xs tracking-widest hover:bg-gray-100 transition-all rounded-xl"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 py-4 bg-gov-blue text-white font-black uppercase text-xs tracking-widest hover:bg-blue-800 transition-all shadow-xl flex items-center justify-center gap-2 rounded-xl"
          >
            <Save className="w-4 h-4" />
            Salvar Coordenador
          </button>
        </div>
      </form>
    </motion.div>
  );
}
