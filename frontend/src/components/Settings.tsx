import { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, Key, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SettingsProps {
  username: string;
}

export default function Settings({ username }: SettingsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      if (!currentPassword || !newPassword || !confirmPassword) {
        setError('Por favor, preencha todos os campos.');
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('A nova senha e a confirmação não coincidem.');
        setLoading(false);
        return;
      }

      if (newPassword.length < 6) {
        setError('A nova senha deve ter pelo menos 6 caracteres.');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar senha. Verifique sua senha atual.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* LGPD Section */}
      <div className="bg-white p-6 border-b-4 border-gov-yellow shadow-md rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="w-6 h-6 text-gov-blue" />
          <h2 className="text-xl font-black text-gov-blue uppercase">Política de Privacidade - LGPD</h2>
        </div>
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl mb-4">
          <p className="text-sm font-bold text-blue-900 leading-relaxed">
            Este sistema está em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
          </p>
        </div>

        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
            <p><strong>Coleta de Dados:</strong> Coletamos apenas dados essenciais para o funcionamento da plataforma eleitoral.</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
            <p><strong>Finalidade:</strong> Os dados são utilizados exclusivamente para gestão de campanhas eleitorais e comunicação com eleitores.</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
            <p><strong>Segurança:</strong> Todas as informações são criptografadas e armazenadas em ambiente seguro.</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
            <p><strong>Direitos do Titular:</strong> Você tem direito a acessar, corrigir e excluir seus dados pessoais a qualquer momento.</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
            <p><strong>Compartilhamento:</strong> Seus dados nunca serão vendidos ou compartilhados com terceiros sem seu consentimento explícito.</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-xs font-bold text-yellow-800">
            📧 Para exercer seus direitos ou solicitar exclusão de dados, entre em contato: privacidade@gestao-inteligente.com
          </p>
        </div>
      </div>

      {/* Password Change Section */}
      <div className="bg-white p-6 border-b-4 border-gov-yellow shadow-md rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Key className="w-6 h-6 text-gov-blue" />
          <h2 className="text-xl font-black text-gov-blue uppercase">Alterar Senha</h2>
        </div>

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 text-green-700 p-4 rounded-xl border-l-4 border-green-500 text-sm font-bold mb-4 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Senha alterada com sucesso!
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-red-50 text-red-700 p-4 rounded-xl border-l-4 border-red-500 text-sm font-bold mb-4 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
              Senha Atual *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-gov-blue outline-none font-bold text-sm"
                placeholder="Digite sua senha atual"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
              Nova Senha *
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-gov-blue outline-none font-bold text-sm"
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
              Confirmar Nova Senha *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-gov-blue outline-none font-bold text-sm"
                placeholder="Repita a nova senha"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gov-blue text-white font-black py-3 rounded-xl uppercase text-sm hover:bg-blue-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">Processando...</span>
            ) : (
              <>
                <Key className="w-4 h-4" />
                Alterar Senha
              </>
            )}
          </button>
        </form>

        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
          <p className="text-xs font-bold text-gray-600">
            💡 Recomendamos usar senhas fortes com letras maiúsculas, minúsculas, números e caracteres especiais.
          </p>
        </div>
      </div>
    </div>
  );
}
