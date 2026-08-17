import { useState } from 'react';
import { Voter } from '../types';
import { Save, Phone, Calendar, Users, MapPin, Hash, Mail, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoterFormProps {
  onSave: (voter: Omit<Voter, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  initialData?: Voter | null;
}

export default function VoterForm({ onSave, onCancel, initialData }: VoterFormProps) {
  const initialState = {
    name: '',
    cpf: '',
    voterId: '',
    voterZone: '',
    municipality: '',
    email: '',
    password: '',
    phone: '',
    birthDate: '',
    gender: '',
    sex: '',
    civilStatus: '',
    votingSection: '',
  };

  const [formData, setFormData] = useState({
    name: initialData?.name || initialState.name,
    cpf: initialData?.cpf || initialState.cpf,
    voterId: initialData?.voterId || initialState.voterId,
    voterZone: initialData?.voterZone || initialState.voterZone,
    municipality: initialData?.municipality || initialState.municipality,
    email: initialData?.email || initialState.email,
    password: initialData?.password || initialState.password,
    phone: initialData?.phone || initialState.phone,
    birthDate: initialData?.birthDate || initialState.birthDate,
    gender: initialData?.gender || initialState.gender,
    sex: initialData?.sex || initialState.sex,
    civilStatus: initialData?.civilStatus || initialState.civilStatus,
    votingSection: initialData?.votingSection || initialState.votingSection,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const validateCPF = (cpf: string) => {
    const cleanCPF = cpf.replace(/[^\d]+/g, '');
    if (cleanCPF.length !== 11 || !!cleanCPF.match(/(\d)\1{10}/)) return false;
    let sum = 0;
    let remainder;
    for (let i = 1; i <= 9; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
    return true;
  };

  const validateVoterId = (id: string) => {
    const digits = id.replace(/\D/g, '');
    return digits.length === 12;
  };

  const validatePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
  };

  const validateBirthDate = (date: string) => {
    if (!date) return false;
    const selectedDate = new Date(date);
    const today = new Date();
    const minDate = new Date();
    minDate.setFullYear(today.getFullYear() - 120);
    return selectedDate < today && selectedDate > minDate;
  };

  const maskCPF = (value: string) => {
    const masked = value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
    
    if (errors.cpf) {
      const clean = masked.replace(/[^\d]+/g, '');
      if (clean.length === 11 && validateCPF(masked)) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.cpf;
          return newErrors;
        });
      }
    }
    return masked;
  };

  const maskVoterId = (value: string) => {
    const masked = value.replace(/\D/g, '').slice(0, 12);
    if (errors.voterId && masked.length === 12) {
      setErrors(prev => {
        const { voterId, ...rest } = prev;
        return rest;
      });
    }
    return masked;
  };

  const maskPhone = (value: string) => {
    const masked = value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');

    if (errors.phone) {
      const clean = masked.replace(/\D/g, '');
      if (clean.length >= 10) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.phone;
          return newErrors;
        });
      }
    }
    return masked;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, cpf: maskCPF(e.target.value) });
  };

  const handleVoterIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, voterId: maskVoterId(e.target.value) });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, phone: maskPhone(e.target.value) });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!validateCPF(formData.cpf)) {
      newErrors.cpf = 'CPF inválido ou incompleto.';
    }

    if (!validateVoterId(formData.voterId)) {
      newErrors.voterId = 'Título de Eleitor deve conter 12 dígitos.';
    }

    if (!formData.voterZone || !/^\d{1,4}$/.test(formData.voterZone)) {
      newErrors.voterZone = 'Zona eleitoral deve conter até 4 números.';
    }

    if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Telefone inválido (mínimo 10 dígitos).';
    }

    if (!validateBirthDate(formData.birthDate)) {
      newErrors.birthDate = 'Data de nascimento inválida.';
    }

    if (formData.name.trim().split(' ').length < 2) {
      newErrors.name = 'Informe o nome completo (nome e sobrenome).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
      
      // Se for novo cadastro, limpa o formulário e mostra mensagem
      if (!initialData) {
        setFormData(initialState);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-gov-blue max-w-3xl mx-auto"
    >
      <div className="bg-gov-blue p-8 text-white flex items-end justify-between border-b-4 border-gov-yellow rounded-2xl">
        <div>
          <h2 className="text-3xl font-black uppercase leading-none">
            {initialData ? 'Editar Cadastro' : 'Novo Cadastro'}
          </h2>
          <p className="text-blue-200 mt-2 font-medium italic text-xs">Preencha os dados do eleitor conforme documento oficial.</p>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-6xl font-black text-white/10 leading-none select-none">
            {initialData ? '02' : '01'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-10 space-y-8">
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="bg-green-50 border-l-4 border-green-500 p-4 overflow-hidden rounded-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="bg-green-500 p-1 rounded-full">
                  <Save className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-green-800 font-black uppercase text-xs tracking-widest">Cadastro Salvo com Sucesso</p>
                  <p className="text-green-600 font-bold text-[10px] uppercase tracking-tighter">O formulário foi limpo e os dados estão seguros.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-12 gap-y-6 gap-x-6">
          {/* Nome */}
          <div className="col-span-12 md:col-span-8">
            <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${errors.name ? 'text-red-500' : 'text-gov-blue'}`}>
              Nome Completo do Eleitor
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Users className={`h-4 w-4 ${errors.name ? 'text-red-300' : 'text-gov-blue/30 group-focus-within:text-gov-blue'} transition-colors`} />
              </div>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors(prev => {
                    const { name, ...rest } = prev;
                    return rest;
                  });
                }}
                className={`block w-full pl-12 pr-4 py-3.5 border-2 rounded-xl focus:bg-white outline-none transition-all font-medium placeholder:text-gray-300 ${
                  errors.name ? 'border-red-200 bg-red-50 focus:border-red-500' : 'border-gray-100 focus:border-gov-yellow bg-gray-50'
                }`}
                placeholder="Digite conforme a identidade"
              />
            </div>
            {errors.name && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter italic">{errors.name}</p>}
          </div>

          {/* CPF */}
          <div className="col-span-12 md:col-span-4">
            <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${errors.cpf ? 'text-red-500' : 'text-gov-blue'}`}>
              CPF (Identificação)
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Hash className={`h-4 w-4 ${errors.cpf ? 'text-red-300' : 'text-gov-blue/30 group-focus-within:text-gov-blue'} transition-colors`} />
              </div>
              <input
                required
                type="text"
                maxLength={14}
                value={formData.cpf}
                onChange={handleCpfChange}
                className={`block w-full pl-12 pr-4 py-3.5 border-2 rounded-xl focus:bg-white outline-none transition-all font-medium placeholder:text-gray-300 ${
                  errors.cpf ? 'border-red-200 bg-red-50 focus:border-red-500' : 'border-gray-100 focus:border-gov-yellow bg-gray-50'
                }`}
                placeholder="000.000.000-00"
              />
            </div>
            {errors.cpf && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter italic">{errors.cpf}</p>}
          </div>

          {/* Título Eleitoral */}
          <div className="col-span-12 md:col-span-8">
            <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${errors.voterId ? 'text-red-500' : 'text-gov-blue'}`}>
              Número do Título Eleitoral
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Hash className={`h-4 w-4 ${errors.voterId ? 'text-red-300' : 'text-gov-blue/30 group-focus-within:text-gov-blue'} transition-colors`} />
              </div>
              <input
                required
                type="text"
                maxLength={12}
                value={formData.voterId}
                onChange={handleVoterIdChange}
                className={`block w-full pl-12 pr-4 py-3.5 border-2 rounded-xl focus:bg-white outline-none transition-all font-medium placeholder:text-gray-300 ${
                  errors.voterId ? 'border-red-200 bg-red-50 focus:border-red-500' : 'border-gray-100 focus:border-gov-yellow bg-gray-50'
                }`}
                placeholder="0000 0000 0000"
              />
            </div>
            {errors.voterId && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter italic">{errors.voterId}</p>}
          </div>

          {/* Zona Eleitoral */}
          <div className="col-span-12 md:col-span-4">
            <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${errors.voterZone ? 'text-red-500' : 'text-gov-blue'}`}>
              Zona Eleitoral (Votação)
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Hash className={`h-4 w-4 ${errors.voterZone ? 'text-red-300' : 'text-gov-blue/30 group-focus-within:text-gov-blue'} transition-colors`} />
              </div>
              <input
                required
                type="text"
                maxLength={4}
                value={formData.voterZone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, voterZone: val });
                  if (errors.voterZone) setErrors(prev => {
                    const { voterZone, ...rest } = prev;
                    return rest;
                  });
                }}
                className={`block w-full pl-12 pr-4 py-3.5 border-2 rounded-xl focus:bg-white outline-none transition-all font-medium placeholder:text-gray-300 ${
                  errors.voterZone ? 'border-red-200 bg-red-50 focus:border-red-500' : 'border-gray-100 focus:border-gov-yellow bg-gray-50'
                }`}
                placeholder="Ex: 0134"
              />
            </div>
            {errors.voterZone && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter italic">{errors.voterZone}</p>}
          </div>

          {/* Seção / Local */}
          <div className="col-span-12 md:col-span-8">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-1.5 block">
              Seção / Local de Votação
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MapPin className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <input
                required
                type="text"
                value={formData.votingSection}
                onChange={(e) => setFormData({ ...formData, votingSection: e.target.value })}
                className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 rounded-xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium placeholder:text-gray-300"
                placeholder="Ex: Seção 0142 - Escola Municipal"
              />
            </div>
          </div>

          {/* Município */}
          <div className="col-span-12 md:col-span-12">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-1.5 block">
              Município / Cidade
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MapPin className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <input
                required
                type="text"
                value={formData.municipality}
                onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
                className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 rounded-xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium placeholder:text-gray-300"
                placeholder="Ex: São Paulo - SP"
              />
            </div>
          </div>

          {/* Email (Login) */}
          <div className="col-span-12 md:col-span-6">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-1.5 block">
              E-mail (Login de Acesso)
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 rounded-xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium placeholder:text-gray-300"
                placeholder="eleitor@exemplo.com.br"
              />
            </div>
          </div>

          {/* Senha */}
          <div className="col-span-12 md:col-span-6">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-1.5 block">
              Senha Institucional
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <input
                required={!initialData}
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 rounded-xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium placeholder:text-gray-300"
                placeholder={initialData ? "Deixe em branco para manter" : "••••••••"}
              />
            </div>
          </div>

          {/* Telefone */}
          <div className="col-span-12 md:col-span-7">
            <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${errors.phone ? 'text-red-500' : 'text-gov-blue'}`}>
              Telefone / Celular
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className={`h-4 w-4 ${errors.phone ? 'text-red-300' : 'text-gov-blue/30 group-focus-within:text-gov-blue'} transition-colors`} />
              </div>
              <input
                required
                type="tel"
                maxLength={15}
                value={formData.phone}
                onChange={handlePhoneChange}
                className={`block w-full pl-12 pr-4 py-3.5 border-2 rounded-xl focus:bg-white outline-none transition-all font-medium placeholder:text-gray-300 ${
                  errors.phone ? 'border-red-200 bg-red-50 focus:border-red-500' : 'border-gray-100 focus:border-gov-yellow bg-gray-50'
                }`}
                placeholder="(00) 00000-0000"
              />
            </div>
            {errors.phone && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter italic">{errors.phone}</p>}
          </div>

          {/* Data de Nascimento */}
          <div className="col-span-12 md:col-span-5">
            <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${errors.birthDate ? 'text-red-500' : 'text-gov-blue'}`}>
              Data de Nascimento
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Calendar className={`h-4 w-4 ${errors.birthDate ? 'text-red-300' : 'text-gov-blue/30 group-focus-within:text-gov-blue'} transition-colors`} />
              </div>
              <input
                required
                type="date"
                value={formData.birthDate}
                onChange={(e) => {
                  setFormData({ ...formData, birthDate: e.target.value });
                  if (errors.birthDate) setErrors(prev => {
                    const { birthDate, ...rest } = prev;
                    return rest;
                  });
                }}
                className={`block w-full pl-12 pr-4 py-3.5 border-2 rounded-xl focus:bg-white outline-none transition-all font-medium ${
                  errors.birthDate ? 'border-red-200 bg-red-50 focus:border-red-500' : 'border-gray-100 focus:border-gov-yellow bg-gray-50'
                }`}
              />
            </div>
            {errors.birthDate && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter italic">{errors.birthDate}</p>}
          </div>

          {/* Identidade de Gênero */}
          <div className="col-span-12 md:col-span-6">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-1.5 block">
              Identidade de Gênero
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Users className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <select
                required
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 rounded-xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium appearance-none cursor-pointer"
              >
                <option value="">Selecione...</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Não-Binário">Não-Binário</option>
                <option value="Transgênero">Transgênero</option>
                <option value="Agênero">Agênero</option>
                <option value="Outro">Outro / Prefere não dizer</option>
              </select>
            </div>
          </div>

          {/* Sexo (Electoral) */}
          <div className="col-span-12 md:col-span-6">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-1.5 block">
              Sexo (Documental)
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Users className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <select
                required
                value={formData.sex}
                onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 rounded-xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium appearance-none cursor-pointer"
              >
                <option value="">Selecione...</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Não Identificado">Não Identificado</option>
              </select>
            </div>
          </div>

          {/* Estado Civil */}
          <div className="col-span-12 md:col-span-6">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-1.5 block">
              Estado Civil
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Hash className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <select
                required
                value={formData.civilStatus}
                onChange={(e) => setFormData({ ...formData, civilStatus: e.target.value })}
                className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 rounded-xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium appearance-none cursor-pointer"
              >
                <option value="">Selecione...</option>
                <option value="Solteiro(a)">Solteiro(a)</option>
                <option value="Casado(a)">Casado(a)</option>
                <option value="Divorciado(a)">Divorciado(a)</option>
                <option value="Viúvo(a)">Viúvo(a)</option>
                <option value="União Estável">União Estável</option>
              </select>
            </div>
          </div>

        </div>

        <div className="flex justify-between items-center pt-6 border-t border-gray-100 rounded-2xl">
          <button
            type="button"
            onClick={onCancel}
            className="px-8 py-3 text-gov-blue/50 font-black hover:text-gov-blue transition-all uppercase tracking-widest text-xs"
          >
            Voltar para Lista
          </button>
          
          <div className="flex gap-6">
            <button
              type="button"
              onClick={() => setFormData(initialState)}
              className="px-8 py-3 text-gov-blue font-black border-2 border-gov-blue rounded-xl hover:bg-gov-bg transition-all uppercase tracking-widest text-xs"
            >
              Limpar
            </button>
            <button
              type="submit"
              className="px-12 py-3 bg-gov-yellow text-gov-blue font-black rounded-xl shadow-md hover:bg-yellow-300 transition-all flex items-center gap-2 uppercase tracking-widest text-xs"
            >
              <Save className="w-4 h-4" />
              {initialData ? 'Atualizar Registro' : 'Finalizar Cadastro'}
            </button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
