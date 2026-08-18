import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Lock, 
  ArrowRight, 
  Loader2, 
  ShieldCheck, 
  ChevronRight,
  Sparkles,
  Smartphone,
  Camera,
  DownloadCloud,
  Palette
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import Logo from './Logo';

interface LoginProps {
  onLogin: (session: any) => void;
  onInstall?: () => void;
  canInstall?: boolean;
}

export default function Login({ onLogin, onInstall, canInstall }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [brandOrg, setBrandOrg] = useState<any>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);

  const PARTY_THEMES = [
    { name: 'Azul Padrão (PL/PP/Republicanos)', primary: '#1e3a8a', secondary: '#facc15', bg: '#eff6ff' },
    { name: 'Vermelho (PT/PCdoB)', primary: '#b91c1c', secondary: '#fef08a', bg: '#fef2f2' },
    { name: 'Verde (PV/MDB)', primary: '#15803d', secondary: '#fde047', bg: '#f0fdf4' },
    { name: 'Laranja (NOVO)', primary: '#ea580c', secondary: '#fed7aa', bg: '#fff7ed' },
    { name: 'Azul Claro (PSDB/União)', primary: '#0284c7', secondary: '#fef08a', bg: '#f0f9ff' },
    { name: 'Amarelo (PSB/PDT)', primary: '#ca8a04', secondary: '#1e3a8a', bg: '#fefce8' },
    { name: 'Bordô (Solidariedade)', primary: '#9f1239', secondary: '#fbcfe8', bg: '#fff1f2' },
    { name: 'Preto (Podemos/PSD)', primary: '#171717', secondary: '#facc15', bg: '#f5f5f5' },
  ];

  const applyTheme = async (theme: any) => {
    document.documentElement.style.setProperty('--theme-primary', theme.primary);
    document.documentElement.style.setProperty('--theme-secondary', theme.secondary);
    document.documentElement.style.setProperty('--theme-bg', theme.bg);
    localStorage.setItem('@AppGestao:savedTheme', JSON.stringify(theme));
    
    if (brandOrg?.id) {
      await db.saveOrganizationSettings(brandOrg.id, {
        theme_primary: theme.primary,
        theme_secondary: theme.secondary,
        theme_bg: theme.bg
      });
    }

    setShowThemes(false);
  };

  useEffect(() => {
    const orgId = new URLSearchParams(window.location.search).get('org');
    if (orgId) {
      // Validar se é um UUID válido antes de buscar
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(orgId)) {
        console.warn('ID de organização inválido:', orgId);
        return;
      }

      supabase.from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()
        .then(({ data, error }: { data: any, error: any }) => {
          if (error) {
            console.warn('Erro ao buscar organização:', error);
            return;
          }
          if (data) setBrandOrg(data);
        });
    } else {
      // Carregar logo salva no dispositivo caso não tenha link de org
      const savedLogo = localStorage.getItem('@AppGestao:savedLogo');
      if (savedLogo) {
        setBrandOrg((prev: any) => ({ ...prev, logo_url: savedLogo }));
      }
      // Carregar tema salvo no dispositivo
      const savedTheme = localStorage.getItem('@AppGestao:savedTheme');
      if (savedTheme) {
        try {
          const theme = JSON.parse(savedTheme);
          document.documentElement.style.setProperty('--theme-primary', theme.primary);
          document.documentElement.style.setProperty('--theme-secondary', theme.secondary);
          document.documentElement.style.setProperty('--theme-bg', theme.bg);
        } catch (e) {}
      }
    }
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTestLogo = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        setBrandOrg((prev: any) => ({ ...prev, logo_url: dataUrl }));
        localStorage.setItem('@AppGestao:savedLogo', dataUrl);
        window.dispatchEvent(new Event('logoUpdated'));
        
        if (brandOrg?.id) {
          await db.saveOrganizationSettings(brandOrg.id, { logo_url: dataUrl });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const cleanEmail = email.trim().toLowerCase();

      // BYPASS DE TESTES E HIERARQUIA AUTOMÁTICA
      const demoRoles = [
        'edukadoshmda@gmail.com', 'presidente@campanha.com', 'governador@campanha.com',
        'senador@campanha.com', 'df@campanha.com', 'de@campanha.com', 'prefeito@campanha.com',
        'vereador@campanha.com',
        'candidato@teste.com', 'coordenador@teste.com', 'area@teste.com'
      ];

      if (import.meta.env.DEV && demoRoles.includes(cleanEmail) && password === '123456') {
        const fakeSession = {
          user: { id: `demo-${cleanEmail}`, email: cleanEmail },
          access_token: 'demo-token'
        };
        onLogin(fakeSession);
        return;
      }

      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (signUpError) throw signUpError;
        alert('Conta criada com sucesso! Verifique seu e-mail para confirmar.');
      } else {
        const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (signInError) throw signInError;
        if (session) onLogin(session);
      }
    } catch (err: any) {
      // Tradução de erros comuns do Supabase
      const errorTranslations: Record<string, string> = {
        'Invalid login credentials': 'E-mail ou senha incorretos.',
        'For security purposes': 'Por motivos de segurança, aguarde alguns segundos antes de tentar novamente.',
        'Email not confirmed': 'E-mail não confirmado. Verifique sua caixa de entrada.',
        'User already registered': 'Este e-mail já está cadastrado.',
        'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
        'Email link is invalid or has expired': 'O link de confirmação expirou. Solicite um novo e-mail de confirmação.',
        'email rate limit exceeded': 'Muitas tentativas de envio de e-mail. Aguarde alguns minutos antes de tentar novamente.',
        'Rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
      };

      const translatedError = Object.keys(errorTranslations).find(key =>
        err.message.includes(key)
      );

      const errorMessage = translatedError ? errorTranslations[translatedError] : err.message;
      setError(errorMessage);

      // Mostrar botão de reenviar se o erro for de link expirado
      if (err.message.includes('Email link is invalid or has expired') || err.message.includes('Email not confirmed')) {
        setShowResendButton(true);
      } else {
        setShowResendButton(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Digite seu e-mail para reenviar a confirmação.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (error) throw error;

      alert('E-mail de confirmação reenviado com sucesso! Verifique sua caixa de entrada.');
      setShowResendButton(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao reenviar e-mail de confirmação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gov-bg flex flex-col items-center justify-center p-6 lg:p-10 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-[346px] bg-white rounded-3xl shadow-2xl overflow-visible border border-gray-200 origin-center"
      >
        {/* ── Área da Logo ── */}
        <div className="bg-white pt-5 pb-0 text-center rounded-t-3xl">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col items-center mx-auto"
          >
            {brandOrg?.logo_url ? (
              <img
                src={brandOrg.logo_url}
                alt={brandOrg?.candidate_name || 'Logo'}
                className="h-32 w-auto max-w-full object-contain drop-shadow-xl px-3 rounded-2xl"
              />
            ) : (
              <div className="w-48 h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 text-gray-400 mt-3 mb-2 p-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight px-2">
                  Sua Logo Aqui
                </span>
                <span className="text-[6px] font-bold uppercase mt-2 opacity-60">PNG ou JPG (1024x1024px)</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Showroom de Acesso Rápido ── */}
        <div className="px-5 py-1.5 bg-gray-50 border-y border-gray-100 mb-2 rounded-2xl">
          <p className="text-[7px] font-black uppercase text-gov-blue/50 text-center mb-1.5 tracking-widest">
            Acesso Rápido
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: 'Admin Root', color: 'bg-red-100 text-red-700' },
              { label: 'Candidato', color: 'bg-blue-100 text-blue-700' },
              { label: 'Coordenador', color: 'bg-yellow-100 text-yellow-700' },
              { label: 'Coordenador Área', color: 'bg-green-100 text-green-700' },
            ].map((role) => (
              <button
                key={role.label}
                type="button"
                onClick={() => {
                  setPassword('123456');
                }}
                className={`${role.color} py-1 px-1.5 rounded-xl font-black text-[7px] uppercase tracking-tighter hover:opacity-80 transition-opacity flex items-center justify-center`}
              >
                {role.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Formulário ── */}
        <form onSubmit={handleSubmit} className="px-6 pt-1.5 pb-6 space-y-2.5">
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-50 text-red-700 p-2 rounded-xl border-l-4 border-red-500 text-[10px] font-bold uppercase"
            >
              <strong>Erro:</strong> {error}
              {showResendButton && (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={loading}
                  className="block w-full mt-2 bg-red-600 text-white py-2 rounded-lg text-[9px] font-bold uppercase hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Reenviar E-mail de Confirmação'}
                </button>
              )}
            </motion.div>
          )}

          <div className="space-y-2.5">
            <div>
              <label className="text-[8px] font-black text-gov-blue uppercase tracking-widest mb-1 ml-1 block">
                E-mail Institucional
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-3 w-3 text-gov-blue/40" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-8 pr-2.5 py-2 border-2 border-gov-bg rounded-xl focus:border-gov-blue transition-all outline-none bg-gray-50/50 font-medium text-xs"
                  placeholder="exemplo@campanha.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[8px] font-black text-gov-blue uppercase tracking-widest mb-1 ml-1 block">
                Senha de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-3 w-3 text-gov-blue/40" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-8 pr-2.5 py-2 border-2 border-gov-bg rounded-xl focus:border-gov-blue transition-all outline-none bg-gray-50/50 font-medium text-xs"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gov-blue text-white font-black py-2.5 rounded-2xl shadow-lg hover:bg-blue-800 transition-all flex items-center justify-center group tracking-widest uppercase text-xs active:scale-[0.98] disabled:opacity-50 mt-1.5"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {isSignUp ? 'Criar Conta' : 'Acessar Painel'}
                <ArrowRight className="ml-1.5 w-3 h-3 group-hover:translate-x-1 transition-transform text-gov-yellow" />
              </>
            )}
          </button>

          {canInstall && onInstall && (
            <button
              type="button"
              onClick={onInstall}
              className="w-full bg-green-600 text-white font-black py-3 rounded-2xl shadow-lg hover:bg-green-700 transition-all flex items-center justify-center group tracking-widest uppercase text-xs active:scale-[0.98] border-b-4 border-green-800"
            >
              <DownloadCloud className="w-4 h-4 mr-2 text-green-200" /> Instalar Aplicativo
            </button>
          )}

          <div className="text-center pt-3 border-t border-gray-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-gov-blue font-bold text-[10px] uppercase tracking-tighter hover:underline"
            >
              {isSignUp ? 'Já possui uma conta? Entre' : 'Deseja criar uma nova conta? Cadastre-se'}
            </button>
          </div>
        </form>
      </motion.div>

      {/* ── Ferramentas de personalização — fora do card ── */}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-2.5 mt-4"
      >
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={handleTestLogo}
            className="flex items-center gap-1.5 bg-white text-gov-blue px-3 py-1.5 rounded-full shadow-md border border-gray-200 text-[10px] font-bold uppercase tracking-wider hover:scale-105 transition-transform"
            title="Testar minha Logo"
          >
            <Camera className="w-3 h-3 text-gov-yellow" />
            Logo
          </button>
          <span className="text-[6px] font-black uppercase text-gray-400 tracking-tighter">PNG/JPG • 1:1</span>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowThemes(!showThemes)}
            className="flex items-center gap-1.5 bg-white text-gov-blue px-3 py-1.5 rounded-full shadow-md border border-gray-200 text-[10px] font-bold uppercase tracking-wider hover:scale-105 transition-transform"
            title="Cor do Partido"
          >
            <Palette className="w-3 h-3 text-gov-blue" />
            Tema
          </button>

          {showThemes && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white shadow-2xl border border-gray-100 rounded-2xl p-2.5 flex gap-1.5 z-50"
            >
              {PARTY_THEMES.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyTheme(t)}
                  className="w-6 h-6 rounded-full shadow-md border-2 border-white hover:scale-110 transition-transform"
                  style={{ backgroundColor: t.primary }}
                  title={t.name}
                />
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
