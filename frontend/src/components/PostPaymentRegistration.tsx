import { useState } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Phone, Lock, Building2, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PostPaymentRegistrationProps {
  orgId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function PostPaymentRegistration({ orgId, onSuccess, onCancel }: PostPaymentRegistrationProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'candidate' as 'candidate' | 'coordinator'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validar campos
      if (!formData.full_name || !formData.email || !formData.phone || !formData.password) {
        setError('Por favor, preencha todos os campos obrigatórios.');
        setLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('As senhas não coincidem.');
        setLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        setLoading(false);
        return;
      }

      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            phone: formData.phone,
            role: formData.role
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Erro ao criar usuário.');
      }

      // Se orgId foi fornecido, associar o usuário à organização
      if (orgId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
            organization_id: orgId
          });

        if (profileError) {
          throw profileError;
        }
      }

      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 3000);
    } catch (err: any) {
      console.error('Erro ao criar cadastro:', err);
      setError(err.message || 'Erro ao criar cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md mx-auto text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </motion.div>
        <h2 className="text-2xl font-black text-green-600 uppercase mb-4">Cadastro Realizado!</h2>
        <p className="text-sm font-bold text-gray-600 mb-6">
          Seu cadastro foi realizado com sucesso. Verifique seu email para confirmar a conta.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="bg-green-600 text-white font-black py-3 rounded-xl uppercase text-sm hover:bg-green-700 transition-all"
        >
          Ir para Login
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md mx-auto">
      <div className="text-center mb-6">
        <Building2 className="w-12 h-12 text-gov-blue mx-auto mb-3" />
        <h2 className="text-2xl font-black text-gov-blue uppercase">Complete seu Cadastro</h2>
        <p className="text-xs font-bold text-gray-400 mt-2">Preencha seus dados para acessar a plataforma</p>
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
            Nome Completo *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              className="w-full pl-10 pr-3 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-gov-blue outline-none font-bold text-sm"
              placeholder="Seu nome completo"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
            Email *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full pl-10 pr-3 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-gov-blue outline-none font-bold text-sm"
              placeholder="email@exemplo.com"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
            Telefone *
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full pl-10 pr-3 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-gov-blue outline-none font-bold text-sm"
              placeholder="(91) 99999-9999"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
            Senha *
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full pl-10 pr-3 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-gov-blue outline-none font-bold text-sm"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
            Confirmar Senha *
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              className="w-full pl-10 pr-3 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-gov-blue outline-none font-bold text-sm"
              placeholder="Repita a senha"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
            Tipo de Usuário *
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData({...formData, role: 'candidate'})}
              className={`p-3 rounded-xl font-bold text-sm border-2 transition-all ${
                formData.role === 'candidate'
                  ? 'bg-gov-blue text-white border-gov-blue'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gov-blue'
              }`}
            >
              <Users className="w-4 h-4 mx-auto mb-1" />
              Candidato
            </button>
            <button
              type="button"
              onClick={() => setFormData({...formData, role: 'coordinator'})}
              className={`p-3 rounded-xl font-bold text-sm border-2 transition-all ${
                formData.role === 'coordinator'
                  ? 'bg-gov-blue text-white border-gov-blue'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gov-blue'
              }`}
            >
              <Users className="w-4 h-4 mx-auto mb-1" />
              Coordenador
            </button>
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
              'Completar Cadastro'
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
