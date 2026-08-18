import { useState } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Phone, Lock, Building2, Users, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminCreateCampaignProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function AdminCreateCampaign({ onSuccess, onCancel }: AdminCreateCampaignProps) {
  const [formData, setFormData] = useState({
    candidate_name: '',
    candidate_email: '',
    candidate_phone: '',
    candidate_password: '',
    coordinator_name: '',
    coordinator_email: '',
    coordinator_phone: '',
    coordinator_password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validar campos do candidato
      if (!formData.candidate_name || !
formData.candidate_email || !formData.candidate_phone || !formData.candidate_password) {
        setError('Por favor, preencha todos os campos do Candidato.');
        setLoading(false);
        return;
      }

      // Validar campos do coordenador
      if (!formData.coordinator_name || !formData.coordinator_email || !formData.coordinator_phone || !formData.coordinator_password) {
        setError('Por favor, preencha todos os campos do Coordenador.');
        setLoading(false);
        return;
      }

      // Criar organização
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert([{
          candidate_name: formData.candidate_name,
          subscription_status: 'active',
          subdomain: formData.candidate_name.toLowerCase().replace(/\s+/g, '-').substring(0, 20)
        }])
        .select()
        .single();

      if (orgError) {
        throw orgError;
      }

      // Criar usuário candidato
      const { data: candidateAuth, error: candidateError } = await supabase.auth.signUp({
        email: formData.candidate_email,
        password: formData.candidate_password,
        options: {
          data: {
            full_name: formData.candidate_name,
            phone: formData.candidate_phone,
            role: 'candidate'
          }
        }
      });

      if (candidateError) {
        throw candidateError;
      }

      // Criar perfil do candidato
      if (candidateAuth.user) {
        const { error: candidateProfileError } = await supabase
          .from('profiles')
          .insert({
            id: candidateAuth.user.id,
            email: formData.candidate_email,
            full_name: formData.candidate_name,
            role: 'candidate',
            organization_id: orgData.id
          });

        if (candidateProfileError) {
          throw candidateProfileError;
        }
      }

      // Criar usuário coordenador
      const { data: coordinatorAuth, error: coordinatorError } = await supabase.auth.signUp({
        email: formData.coordinator_email,
        password: formData.coordinator_password,
        options: {
          data: {
            full_name: formData.coordinator_name,
            phone: formData.coordinator_phone,
            role: 'coordinator'
          }
        }
      });

      if (coordinatorError) {
        throw coordinatorError;
      }

      // Criar perfil do coordenador
      if (coordinatorAuth.user) {
        const { error: coordinatorProfileError } = await supabase
          .from('profiles')
          .insert({
            id: coordinatorAuth.user.id,
            email: formData.coordinator_email,
            full_name: formData.coordinator_name,
            role: 'coordinator',
            organization_id: orgData.id
          });

        if (coordinatorProfileError) {
          throw coordinatorProfileError;
        }
      }

      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 3000);
    } catch (err: any) {
      console.error('Erro ao criar campanha:', err);
      setError(err.message || 'Erro ao criar campanha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </motion.div>
        <h2 className="text-2xl font-black text-green-600 uppercase mb-4">Campanha Criada!</h2>
        <p className="text-sm font-bold text-gray-600 mb-6">
          A campanha foi criada com sucesso. Os usuários receberão email de confirmação.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="bg-green-600 text-white font-black py-3 rounded-xl uppercase text-sm hover:bg-green-700 transition-all"
        >
          Criar Outra Campanha
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <Building2 className="w-12 h-12 text-gov-blue mx-auto mb-3" />
        <h2 className="text-2xl font-black text-gov-blue uppercase">Criar Nova Campanha</h2>
        <p className="text-xs font-bold text-gray-400 mt-2">Preencha os dados do Candidato e Coordenador</p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-red-50 text-red-700 p-3 rounded-xl border-l-4 border-red-500 text-xs font-bold uppercase mb-4 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Candidato */}
        <div className="bg-blue-50 p-4 rounded-xl">
          <h3 className="text-sm font-black text-gov-blue uppercase mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Dados do Candidato
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Nome *</label>
              <input
                type="text"
                required
                value={formData.candidate_name}
                onChange={(e) => setFormData({...formData, candidate_name: e.target.value})}
                className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl focus:border-gov-blue outline-none font-bold text-sm"
                placeholder="Nome do candidato"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Email *</label>
              <input
                type="email"
                required
                value={formData.candidate_email}
                onChange={(e) => setFormData({...formData, candidate_email: e.target.value})}
                className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl focus:border-gov-blue outline-none font-bold text-sm"
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Telefone *</label>
              <input
                type="tel"
                required
                value={formData.candidate_phone}
                onChange={(e) => setFormData({...formData, candidate_phone: e.target.value})}
                className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl focus:border-gov-blue outline-none font-bold text-sm"
                placeholder="(91) 99999-9999"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Senha *</label>
              <input
                type="password"
                required
                value={formData.candidate_password}
                onChange={(e) => setFormData({...formData, candidate_password: e.target.value})}
                className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl focus:border-gov-blue outline-none font-bold text-sm"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>
        </div>

        {/* Coordenador */}
        <div className="bg-green-50 p-4 rounded-xl">
          <h3 className="text-sm font-black text-gov-blue uppercase mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Dados do Coordenador
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Nome *</label>
              <input
                type="text"
                required
                value={formData.coordinator_name}
                onChange={(e) => setFormData({...formData, coordinator_name: e.target.value})}
                className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl focus:border-gov-blue outline-none font-bold text-sm"
                placeholder="Nome do coordenador"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Email *</label>
              <input
                type="email"
                required
                value={formData.coordinator_email}
                onChange={(e) => setFormData({...formData, coordinator_email: e.target.value})}
                className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl focus:border-gov-blue outline-none font-bold text-sm"
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Telefone *</label>
              <input
                type="tel"
                required
                value={formData.coordinator_phone}
                onChange={(e) => setFormData({...formData, coordinator_phone: e.target.value})}
                className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl focus:border-gov-blue outline-none font-bold text-sm"
                placeholder="(91) 99999-9999"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Senha *</label>
              <input
                type="password"
                required
                value={formData.coordinator_password}
                onChange={(e) => setFormData({...formData, coordinator_password: e.target.value})}
                className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl focus:border-gov-blue outline-none font-bold text-sm"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 space-y-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gov-blue text-white font-black py-3 rounded-xl uppercase text-sm hover:bg-blue-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">Processando...</span>
            ) : (
              'Criar Campanha'
            )}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full bg-gray-100 text-gray-500 font-black py-3 rounded-xl uppercase text-sm hover:bg-gray-200 transition-all"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
