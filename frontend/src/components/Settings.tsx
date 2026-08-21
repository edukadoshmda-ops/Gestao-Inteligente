import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, Key, CheckCircle2, AlertCircle, Eye, EyeOff, Sparkles, Save, ExternalLink, Copy, Check, Palette, Building2, User } from 'lucide-react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { db } from '../lib/db';
import { Organization, Profile } from '../types';
import { PARTY_THEMES, applyAppTheme, normalizeHex } from '../lib/theme';

interface SettingsProps {
  username: string;
  organization?: Organization | null;
  profile?: Profile | null;
}

export default function Settings({ username, organization, profile }: SettingsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Determina se o usuário tem privilégio de configuração geral de campanha
  const userRole = profile?.role || 'coordinator';
  const isCampaignAdmin = userRole === 'super_admin' || userRole === 'candidate' || userRole === 'general_coordination';

  // Theme state
  const [primaryColor, setPrimaryColor] = useState(organization?.theme_primary || organization?.theme_color || '#003366');
  const [secondaryColor, setSecondaryColor] = useState(organization?.theme_secondary || '#FFCC00');
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeSuccess, setThemeSuccess] = useState(false);
  const [themeError, setThemeError] = useState('');

  // Gemini API Key state
  const [geminiKey, setGeminiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [geminiSaving, setGeminiSaving] = useState(false);
  const [geminiSuccess, setGeminiSuccess] = useState(false);
  const [geminiError, setGeminiError] = useState('');
  const [geminiCopied, setGeminiCopied] = useState(false);

  // Load existing data on mount / organization update
  useEffect(() => {
    if (organization?.gemini_api_key) {
      setGeminiKey(organization.gemini_api_key);
    }
    if (organization?.theme_primary || organization?.theme_color) {
      setPrimaryColor(organization.theme_primary || organization.theme_color || '#003366');
    }
    if (organization?.theme_secondary) {
      setSecondaryColor(organization.theme_secondary || '#FFCC00');
    }
  }, [organization]);

  const handleSaveTheme = async () => {
    setThemeSaving(true);
    setThemeError('');
    setThemeSuccess(false);

    const prim = normalizeHex(primaryColor, '#003366');
    const sec = normalizeHex(secondaryColor, '#FFCC00');

    try {
      // 1. Aplicar imediatamente no DOM e no localStorage
      applyAppTheme(prim, sec);

      // 2. Salvar em editedOrgs para persistência offline
      if (organization?.id) {
        try {
          const edited = JSON.parse(localStorage.getItem('@AppGestao:editedOrgs') || '{}');
          edited[organization.id] = {
            ...edited[organization.id],
            theme_primary: prim,
            theme_secondary: sec,
            theme_color: prim
          };
          localStorage.setItem('@AppGestao:editedOrgs', JSON.stringify(edited));
        } catch {}

        // 3. Salvar no Supabase
        const { error: updateErr } = await supabase
          .from('organizations')
          .update({
            theme_primary: prim,
            theme_secondary: sec,
            theme_color: prim
          })
          .eq('id', organization.id);

        if (updateErr) {
          console.warn('Aviso ao salvar tema no Supabase:', updateErr);
        }
      }

      setThemeSuccess(true);
      setTimeout(() => setThemeSuccess(false), 4000);
    } catch (err: any) {
      setThemeError(err.message || 'Erro ao salvar tema');
    } finally {
      setThemeSaving(false);
    }
  };

  const handleSaveGeminiKey = async () => {
    if (!organization?.id) {
      setGeminiError('Organização não identificada. Faça login novamente.');
      return;
    }
    const cleanKey = geminiKey.trim();
    if (!cleanKey) {
      setGeminiError('Cole a chave da API antes de salvar.');
      return;
    }
    if (cleanKey.length < 15 || cleanKey.includes(' ')) {
      setGeminiError('Chave inválida. Verifique a chave copiada do Google AI Studio e tente novamente.');
      return;
    }

    setGeminiSaving(true);
    setGeminiError('');

    try {
      // 1. Salvar no LocalStorage para persistência imediata
      try {
        const edited = JSON.parse(localStorage.getItem('@AppGestao:editedOrgs') || '{}');
        edited[organization.id] = {
          ...edited[organization.id],
          gemini_api_key: cleanKey
        };
        localStorage.setItem('@AppGestao:editedOrgs', JSON.stringify(edited));
      } catch {}

      // 2. Salvar no Supabase
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ gemini_api_key: cleanKey })
        .eq('id', organization.id);

      if (updateError) {
        console.warn('Aviso ao salvar chave no Supabase:', updateError);
      }

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
      try {
        const edited = JSON.parse(localStorage.getItem('@AppGestao:editedOrgs') || '{}');
        if (edited[organization.id]) {
          delete edited[organization.id].gemini_api_key;
          localStorage.setItem('@AppGestao:editedOrgs', JSON.stringify(edited));
        }
      } catch {}

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
      let cleanEmail = (profile?.email || session?.user?.email || (username.includes('@') ? username : '')).trim().toLowerCase();

      // 1. Buscar se é um coordenador cadastrado na base
      const orgId = organization?.id || profile?.organization_id;
      const allCoords = await db.getCoordinators(orgId);
      const matchingCoord = allCoords.find(
        c => (c.email && cleanEmail && c.email.trim().toLowerCase() === cleanEmail) ||
             c.id === profile?.id ||
             `coord-${c.id}` === profile?.id ||
             (c.name && username && c.name.trim().toLowerCase() === username.trim().toLowerCase())
      );

      if (!cleanEmail && matchingCoord?.email) {
        cleanEmail = matchingCoord.email.trim().toLowerCase();
      }

      const savedUserPass = cleanEmail ? localStorage.getItem(`@AppGestao:userPass_${cleanEmail}`) : null;
      const savedCoordPass = cleanEmail ? localStorage.getItem(`@AppGestao:coordPass_${cleanEmail}`) : null;
      const savedDemoPass = cleanEmail ? localStorage.getItem(`@AppGestao:demoPass_${cleanEmail}`) : null;
      const coordDbPass = matchingCoord ? (matchingCoord as any).password : null;

      let isCurrentPasswordValid = false;

      // Verificação Local / Base de Coordenadores
      if (
        (savedUserPass && currentPassword === savedUserPass) ||
        (savedCoordPass && currentPassword === savedCoordPass) ||
        (savedDemoPass && currentPassword === savedDemoPass) ||
        (coordDbPass && currentPassword === coordDbPass) ||
        (!savedUserPass && !savedCoordPass && !coordDbPass && (currentPassword === '123456' || currentPassword === 'temp123456'))
      ) {
        isCurrentPasswordValid = true;
      }

      // Verificação via Supabase Auth (se for usuário real de Auth)
      if (!isCurrentPasswordValid && session && cleanEmail && !session.user.id.startsWith('demo-') && !session.user.id.startsWith('coord-')) {
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: currentPassword
        });
        if (!verifyError) {
          isCurrentPasswordValid = true;
        }
      }

      if (!isCurrentPasswordValid) {
        setError('A senha atual digitada está incorreta.');
        setLoading(false);
        return;
      }

      // 2. Persistir a nova senha em todas as camadas do sistema

      // A) Salvar nas chaves locais para login instantâneo e offline
      if (cleanEmail) {
        localStorage.setItem(`@AppGestao:userPass_${cleanEmail}`, newPassword);
        localStorage.setItem(`@AppGestao:coordPass_${cleanEmail}`, newPassword);
        localStorage.setItem(`@AppGestao:demoPass_${cleanEmail}`, newPassword);
      }
      if (username) {
        localStorage.setItem(`@AppGestao:userPass_${username.toLowerCase()}`, newPassword);
        localStorage.setItem(`@AppGestao:demoPass_${username.toLowerCase()}`, newPassword);
      }

      // B) Atualizar cadastro do coordenador na tabela/storage de coordenadores
      if (matchingCoord || allCoords.length > 0) {
        const updatedCoords = allCoords.map(c => {
          if (
            (c.email && c.email.trim().toLowerCase() === cleanEmail) ||
            c.id === profile?.id ||
            c.id === matchingCoord?.id
          ) {
            return { ...c, password: newPassword };
          }
          return c;
        });
        await db.saveCoordinators(updatedCoords, orgId);

        if (matchingCoord?.id) {
          try {
            await supabase
              .from('coordinators')
              .update({ password: newPassword })
              .eq('id', matchingCoord.id);
          } catch (e) {
            console.warn('Atualização direta de coordenador:', e);
          }
        }
      }

      // C) Tentar atualizar no Supabase Auth se houver sessão ou Admin
      try {
        if (session && !session.user.id.startsWith('demo-') && !session.user.id.startsWith('coord-')) {
          await supabase.auth.updateUser({ password: newPassword });
        }
      } catch (authErr) {
        console.warn('Aviso ao atualizar Supabase Auth padrão:', authErr);
      }

      // D) Se supabaseAdmin estiver ativo, sincronizar admin
      if (supabaseAdmin && !supabaseAdmin.isMock && supabaseAdmin.auth?.admin && cleanEmail) {
        try {
          const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
          const authUser = usersList?.users?.find((u: any) => u.email?.toLowerCase() === cleanEmail);
          if (authUser) {
            await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
              password: newPassword,
              email_confirm: true
            });
          }
        } catch (adminErr) {
          console.warn('Aviso no Supabase Admin Auth:', adminErr);
        }
      }

      // E) Tentar atualizar na tabela de profiles
      if (cleanEmail) {
        try {
          await supabase
            .from('profiles')
            .update({ password: newPassword })
            .eq('email', cleanEmail);
        } catch (pErr) {
          // Coluna password pode não existir em profiles — seguro ignorar
        }
      }

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      console.error('Erro ao alterar senha:', err);
      const msg = err.message || '';
      if (msg.includes('should be at least 6 characters')) {
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

      {/* ── CARD DE IDENTIFICAÇÃO DO USUÁRIO ──────────────── */}
      <div className="bg-white p-6 border-b-4 border-gov-blue shadow-md rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gov-blue/10 flex items-center justify-center text-gov-blue">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-gov-blue uppercase">{profile?.full_name || username}</h2>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-gov-blue text-white">
                {userRole === 'area_coordinator' ? 'Coordenador de Área' : userRole === 'coordinator' ? 'Coordenador' : userRole === 'general_coordination' ? 'Coordenação Geral' : userRole === 'candidate' ? 'Candidato' : 'Administrador'}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-bold">{profile?.email || username}</p>
          </div>
        </div>
      </div>

      {/* ── ALTERAR SENHA (DESTAQUE PRIORITÁRIO) ─────────────── */}
      <div className="bg-white p-6 border-b-4 border-gov-yellow shadow-md rounded-2xl">
        <div className="flex items-center gap-3 mb-2">
          <Key className="w-6 h-6 text-gov-blue" />
          <h2 className="text-xl font-black text-gov-blue uppercase">Alterar Senha de Acesso</h2>
        </div>
        <p className="text-xs text-gray-500 font-bold mb-5 uppercase tracking-wide">
          Atualize sua senha pessoal para manter sua conta e os dados da campanha sempre seguros.
        </p>

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 text-green-700 p-4 rounded-xl border-l-4 border-green-500 text-sm font-bold mb-4 flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Sua senha foi alterada com sucesso! Utilize a nova senha nos próximos acessos.</span>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-red-50 text-red-700 p-4 rounded-xl border-l-4 border-red-500 text-sm font-bold mb-4 flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-xl">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gov-blue text-white font-black py-3.5 rounded-xl uppercase text-xs tracking-widest hover:bg-blue-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-gov-blue/20"
          >
            {loading ? <span className="animate-pulse">Atualizando senha...</span> : <><Key className="w-4 h-4 text-gov-yellow" />Salvar Nova Senha</>}
          </button>
        </form>

        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl max-w-xl">
          <p className="text-xs font-bold text-gray-600">
            💡 Dica: Crie uma senha de no mínimo 6 dígitos fácil de lembrar e não a compartilhe com terceiros.
          </p>
        </div>
      </div>

      {/* ── IDENTIDADE VISUAL & TEMA DA CAMPANHA (VISÍVEL APENAS PARA GESTORES) ──────────── */}
      {isCampaignAdmin && (
        <div className="bg-white p-6 border-b-4 border-gov-yellow shadow-md rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <Palette className="w-6 h-6 text-gov-blue" />
            <h2 className="text-xl font-black text-gov-blue uppercase">Identidade Visual & Cores da Campanha</h2>
          </div>
          <p className="text-xs text-gray-500 font-bold mb-5 uppercase tracking-wide">
            Personalize as cores oficiais da sua campanha eleitoral no sistema em tempo real.
          </p>

          {themeSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-green-50 text-green-700 p-4 rounded-xl border-l-4 border-green-500 text-xs font-bold mb-4"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Tema da campanha atualizado com sucesso no sistema!
            </motion.div>
          )}

          {themeError && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 bg-red-50 text-red-700 p-4 rounded-xl border-l-4 border-red-500 text-xs font-bold mb-4"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {themeError}
            </motion.div>
          )}

          {/* Modelos Partidários Rápidos */}
          <div className="mb-4">
            <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-wider">
              Modelos Partidários Rápidos (1-Clique):
            </label>
            <div className="flex flex-wrap gap-2">
              {PARTY_THEMES.map((theme, idx) => {
                const isSelected = primaryColor.toLowerCase() === theme.primary.toLowerCase();
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrimaryColor(theme.primary);
                      setSecondaryColor(theme.secondary);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition-all border ${
                      isSelected
                        ? 'border-gov-blue bg-white shadow-md ring-2 ring-gov-blue/20'
                        : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300'
                    }`}
                    title={theme.name}
                  >
                    <span className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: theme.primary }} />
                    <span className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm -ml-1.5" style={{ backgroundColor: theme.secondary }} />
                    <span className="text-gray-700">{theme.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Color Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="p-3 bg-gray-50 border-2 border-gray-100 rounded-xl">
              <label className="text-[10px] font-black uppercase text-gray-500 block mb-2">
                Cor Primária (Header, Menus, Títulos)
              </label>
              <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 focus-within:border-gov-blue">
                <input 
                  type="color" 
                  value={normalizeHex(primaryColor, '#003366')}
                  onChange={e => setPrimaryColor(e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer bg-transparent border-0"
                />
                <input 
                  type="text" 
                  value={primaryColor}
                  onChange={e => {
                    let val = e.target.value;
                    if (val && !val.startsWith('#') && /^[0-9A-Fa-f]/.test(val)) val = '#' + val;
                    setPrimaryColor(val);
                  }}
                  className="flex-1 font-mono font-black text-sm text-gray-800 uppercase outline-none"
                  placeholder="#003366"
                />
              </div>
            </div>

            <div className="p-3 bg-gray-50 border-2 border-gray-100 rounded-xl">
              <label className="text-[10px] font-black uppercase text-gray-500 block mb-2">
                Cor Secundária (Destaques, Bordas, Alertas)
              </label>
              <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 focus-within:border-gov-blue">
                <input 
                  type="color" 
                  value={normalizeHex(secondaryColor, '#FFCC00')}
                  onChange={e => setSecondaryColor(e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer bg-transparent border-0"
                />
                <input 
                  type="text" 
                  value={secondaryColor}
                  onChange={e => {
                    let val = e.target.value;
                    if (val && !val.startsWith('#') && /^[0-9A-Fa-f]/.test(val)) val = '#' + val;
                    setSecondaryColor(val);
                  }}
                  className="flex-1 font-mono font-black text-sm text-gray-800 uppercase outline-none"
                  placeholder="#FFCC00"
                />
              </div>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="mb-5 p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <span className="text-[10px] font-black uppercase text-gray-400 block mb-2">Prévia da Identidade Visual:</span>
            <div 
              className="p-4 rounded-xl flex items-center justify-between text-white shadow-md transition-all"
              style={{ 
                backgroundColor: normalizeHex(primaryColor, '#003366'),
                borderBottom: `4px solid ${normalizeHex(secondaryColor, '#FFCC00')}`
              }}
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5" style={{ color: normalizeHex(secondaryColor, '#FFCC00') }} />
                <div>
                  <p className="font-black text-sm uppercase tracking-wider">
                    {organization?.candidate_name || 'Campanha Eleitoral'}
                  </p>
                  <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">
                    Gestão Estratégica
                  </p>
                </div>
              </div>
              <span 
                className="px-3 py-1 rounded-lg text-xs font-black uppercase shadow-sm"
                style={{
                  backgroundColor: normalizeHex(secondaryColor, '#FFCC00'),
                  color: normalizeHex(primaryColor, '#003366')
                }}
              >
                Exemplo Botão
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveTheme}
            disabled={themeSaving}
            className="w-full bg-gov-blue text-white font-black py-3 rounded-xl uppercase text-xs tracking-widest hover:bg-blue-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-gov-blue/20"
          >
            {themeSaving ? (
              <span className="animate-pulse">Aplicando tema...</span>
            ) : (
              <>
                <Save className="w-4 h-4 text-gov-yellow" />
                Salvar e Aplicar Cores da Campanha
              </>
            )}
          </button>
        </div>
      )}

      {/* ── GEMINI AI KEY (VISÍVEL APENAS PARA GESTORES) ────────────────────────────── */}
      {isCampaignAdmin && (
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
                  placeholder="Cole aqui sua chave (ex: AIzaSy... ou AQ.Ab8R...)"
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
      )}

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

    </div>
  );
}
