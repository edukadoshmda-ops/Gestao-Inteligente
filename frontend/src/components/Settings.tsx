import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, Key, CheckCircle2, AlertCircle, Eye, EyeOff, Sparkles, Save, ExternalLink, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Organization } from '../types';

interface SettingsProps {
  username: string;
  organization?: Organization | null;
}

export default function Settings({ username, organization }: SettingsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Gemini API Key state
  const [geminiKey, setGeminiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [geminiSaving, setGeminiSaving] = useState(false);
  const [geminiSuccess, setGeminiSuccess] = useState(false);
  const [geminiError, setGeminiError] = useState('');
  const [geminiCopied, setGeminiCopied] = useState(false);

  // Load existing key on mount
  useEffect(() => {
    if (organization?.gemini_api_key) {
      setGeminiKey(organization.gemini_api_key);
    }
  }, [organization]);

  const handleSaveGeminiKey = async () => {
    if (!organization?.id) {
      setGeminiError('Organização não identificada. Faça login novamente.');
      return;
    }
    if (!geminiKey.trim()) {
      setGeminiError('Cole a chave da API antes de salvar.');
      return;
    }
    if (!geminiKey.startsWith('AIza')) {
      setGeminiError('Chave inválida. Deve começar com "AIza...". Verifique e tente novamente.');
      return;
    }

    setGeminiSaving(true);
    setGeminiError('');

    try {
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ gemini_api_key: geminiKey.trim() })
        .eq('id', organization.id);

      if (updateError) throw updateError;

      setGeminiSuccess(true);
      setTimeout(() => setGeminiSuccess(false), 5000);
    } catch (err: any) {
      setGeminiError(err.message || 'Erro ao salvar chave. Tente novamente.');
    } finally {
      setGeminiSaving(false);
    }
  };

  const handleRemoveGeminiKey = async () => {
    if (!organization?.id) return;
    if (!confirm('Tem certeza? Sem a chave da IA, o preenchimento automático e a consultoria ficarão indisponíveis.')) return;

    setGeminiSaving(true);
    try {
      await supabase
        .from('organizations')
        .update({ gemini_api_key: null })
        .eq('id', organization.id);
      setGeminiKey('');
      setGeminiSuccess(true);
      setTimeout(() => setGeminiSuccess(false), 3000);
    } catch (err: any) {
      setGeminiError(err.message);
    } finally {
      setGeminiSaving(false);
    }
  };

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

      if (newPassword.length < 6) {
        setError('A nova senha deve ter pelo menos 6 caracteres.');
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('A nova senha e a confirmação não coincidem.');
        setLoading(false);
        return;
      }

      if (currentPassword === newPassword) {
        setError('A nova senha deve ser diferente da senha atual.');
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email;

      if (session && userEmail && !session.user.id.startsWith('demo-')) {
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: currentPassword
        });

        if (verifyError) {
          if (verifyError.message.toLowerCase().includes('invalid login credentials')) {
            setError('A senha atual digitada está incorreta.');
            setLoading(false);
            return;
          }
        }

        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (updateError) throw updateError;
      } else {
        const savedDemoPass = localStorage.getItem(`@AppGestao:demoPass_${userEmail || username}`) || '123456';
        if (currentPassword !== savedDemoPass && currentPassword !== '123456') {
          setError('A senha atual digitada está incorreta.');
          setLoading(false);
          return;
        }
        localStorage.setItem(`@AppGestao:demoPass_${userEmail || username}`, newPassword);
        try { await supabase.auth.updateUser({ password: newPassword }); } catch (e) {}
      }

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      console.error('Erro ao alterar senha:', err);
      const msg = err.message || '';
      if (msg.includes('Auth session missing')) {
        setError('Sessão expirada. Por favor, saia e faça login novamente.');
      } else if (msg.includes('should be at least 6 characters')) {
        setError('A nova senha deve ter no mínimo 6 caracteres.');
      } else if (msg.includes('same_password') || msg.includes('different')) {
        setError('A nova senha deve ser diferente da senha anterior.');
      } else {
        setError(msg || 'Erro ao alterar senha. Verifique seus dados e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── GEMINI AI KEY ────────────────────────────── */}
      <div className="bg-white p-6 border-b-4 border-gov-yellow shadow-md rounded-2xl">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-6 h-6 text-gov-yellow" />
          <h2 className="text-xl font-black text-gov-blue uppercase">Chave da IA (Google Gemini)</h2>
        </div>
        <p className="text-xs text-gray-500 font-bold mb-5 uppercase tracking-wide">
          Configure a chave exclusiva da sua campanha para usar as funcionalidades de inteligência artificial.
        </p>

        {/* Status badge */}
        {organization?.gemini_api_key ? (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2 mb-4 w-fit">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <span className="text-[11px] font-black text-green-700 uppercase tracking-widest">IA Ativa — Chave Configurada</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2 mb-4 w-fit">
            <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="text-[11px] font-black text-orange-600 uppercase tracking-widest">Sem Chave — IA usando chave padrão do sistema</span>
          </div>
        )}

        {/* Info box */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-xl mb-5">
          <p className="text-xs font-bold text-blue-800 leading-relaxed">
            💡 <strong>Como obter sua chave gratuita:</strong> Acesse{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-600 inline-flex items-center gap-1 hover:text-blue-800"
            >
              aistudio.google.com/apikey <ExternalLink className="w-3 h-3" />
            </a>
            , clique em <strong>"Create API Key"</strong>, copie e cole aqui. É 100% gratuito.
          </p>
        </div>

        {/* Key input */}
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
              Sua Chave API Gemini
            </label>
            <div className="relative flex items-center">
              <Key className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy... (cole aqui sua chave)"
                className="w-full pl-10 pr-20 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-gov-yellow outline-none font-mono text-sm"
              />
              <div className="absolute right-3 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (geminiKey) {
                      navigator.clipboard.writeText(geminiKey);
                      setGeminiCopied(true);
                      setTimeout(() => setGeminiCopied(false), 2000);
                    }
                  }}
                  className="p-1.5 text-gray-400 hover:text-gov-blue transition-colors"
                  title="Copiar chave"
                >
                  {geminiCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="p-1.5 text-gray-400 hover:text-gov-blue transition-colors"
                  title={showGeminiKey ? 'Ocultar' : 'Mostrar chave'}
                >
                  {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {geminiError && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-xl border-l-4 border-red-500 text-xs font-bold"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {geminiError}
            </motion.div>
          )}

          {geminiSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-green-50 text-green-700 p-3 rounded-xl border-l-4 border-green-500 text-xs font-bold"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Chave salva! A IA da sua campanha agora usa sua própria cota gratuita.
            </motion.div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveGeminiKey}
              disabled={geminiSaving || !geminiKey.trim()}
              className="flex-1 bg-gov-blue text-white font-black py-3 rounded-xl uppercase text-xs tracking-widest hover:bg-blue-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {geminiSaving ? (
                <span className="animate-pulse">Salvando...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Chave da IA
                </>
              )}
            </button>

            {organization?.gemini_api_key && (
              <button
                type="button"
                onClick={handleRemoveGeminiKey}
                disabled={geminiSaving}
                className="px-4 py-3 text-red-500 border-2 border-red-200 hover:bg-red-50 font-black text-xs uppercase rounded-xl transition-all"
              >
                Remover
              </button>
            )}
          </div>
        </div>

        {/* Feature list */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            '🎙️ Preenchimento de cadastro por voz',
            '📸 Leitura automática do Título de Eleitor',
            '🤖 Consultoria IA estratégica',
            '📊 Análise inteligente da base eleitoral',
          ].map((f) => (
            <div key={f} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
              <span className="text-[11px] font-bold text-gray-600">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── LGPD ──────────────────────────────────────── */}
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
          {[
            { label: 'Coleta de Dados', text: 'Coletamos apenas dados essenciais para o funcionamento da plataforma eleitoral.' },
            { label: 'Finalidade', text: 'Os dados são utilizados exclusivamente para gestão de campanhas eleitorais e comunicação com eleitores.' },
            { label: 'Segurança', text: 'Todas as informações são criptografadas e armazenadas em ambiente seguro.' },
            { label: 'Direitos do Titular', text: 'Você tem direito a acessar, corrigir e excluir seus dados pessoais a qualquer momento.' },
            { label: 'Compartilhamento', text: 'Seus dados nunca serão vendidos ou compartilhados com terceiros sem seu consentimento explícito.' },
          ].map(({ label, text }) => (
            <div key={label} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <p><strong>{label}:</strong> {text}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-xs font-bold text-yellow-800">
            📧 Para exercer seus direitos ou solicitar exclusão de dados, entre em contato: privacidade@gestao-inteligente.com
          </p>
        </div>
      </div>

      {/* ── ALTERAR SENHA ─────────────────────────────── */}
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
          {[
            { label: 'Senha Atual *', value: currentPassword, setValue: setCurrentPassword, show: showPassword, setShow: setShowPassword, placeholder: 'Digite sua senha atual', Icon: Lock },
            { label: 'Nova Senha *', value: newPassword, setValue: setNewPassword, show: showNewPassword, setShow: setShowNewPassword, placeholder: 'Mínimo 6 caracteres', Icon: Key },
            { label: 'Confirmar Nova Senha *', value: confirmPassword, setValue: setConfirmPassword, show: showConfirmPassword, setShow: setShowConfirmPassword, placeholder: 'Repita a nova senha', Icon: Lock },
          ].map(({ label, value, setValue, show, setShow, placeholder, Icon }) => (
            <div key={label}>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">{label}</label>
              <div className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={show ? 'text' : 'password'}
                  required
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-gov-blue outline-none font-bold text-sm"
                  placeholder={placeholder}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gov-blue text-white font-black py-3 rounded-xl uppercase text-sm hover:bg-blue-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <span className="animate-pulse">Processando...</span> : <><Key className="w-4 h-4" />Alterar Senha</>}
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
