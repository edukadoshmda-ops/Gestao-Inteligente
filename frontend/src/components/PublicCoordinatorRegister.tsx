import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Camera,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  ArrowLeft,
  Users,
  Copy,
  Check
} from 'lucide-react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { db } from '../lib/db';
import { Organization, Coordinator } from '../types';
import Logo from './Logo';
import { applyAppTheme, getStoredTheme } from '../lib/theme';

interface PublicCoordinatorRegisterProps {
  onBack?: () => void;
  onLoginSuccess?: (session: any) => void;
}

export default function PublicCoordinatorRegister({ onBack, onLoginSuccess }: PublicCoordinatorRegisterProps) {
  const [org, setOrg] = useState<Organization | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [registeredCoord, setRegisteredCoord] = useState<Coordinator | null>(null);
  const [networkId, setNetworkId] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    neighborhood: '',
    city: '',
    voterId: '',
    voterSection: '',
    voterZone: '',
    photo: '',
    whatsapp: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar dados da Organização via URL ou LocalStorage e aplicar tema
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orgId = urlParams.get('org');
    const netId = urlParams.get('network') || urlParams.get('rede') || '';
    if (netId) setNetworkId(netId);

    if (orgId && supabase) {
      supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setOrg(data);
            if (data.theme_primary || data.theme_color) {
              applyAppTheme(data.theme_primary || data.theme_color, data.theme_secondary, data.theme_bg);
            }
          }
          setOrgLoading(false);
        })
        .catch(() => {
          setOrgLoading(false);
        });
    } else {
      try {
        const savedOrg = localStorage.getItem('forja_current_organization');
        if (savedOrg) {
          const parsed = JSON.parse(savedOrg);
          setOrg(parsed);
          if (parsed.theme_primary || parsed.theme_color) {
            applyAppTheme(parsed.theme_primary || parsed.theme_color, parsed.theme_secondary, parsed.theme_bg);
          }
        } else {
          const stored = getStoredTheme();
          if (stored.primary) {
            applyAppTheme(stored.primary, stored.secondary, stored.bg);
          }
        }
      } catch {}
      setOrgLoading(false);
    }
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = formData.name.trim();
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanPassword = formData.password.trim();

    if (!cleanName) {
      setError('Por favor, informe seu nome completo.');
      return;
    }
    if (!cleanEmail) {
      setError('Por favor, informe seu e-mail de acesso.');
      return;
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const currentOrgId = org?.id || new URLSearchParams(window.location.search).get('org') || undefined;

      // 1. Verificar se o e-mail já está cadastrado
      const existingCoords = await db.getCoordinators(currentOrgId);
      const isDuplicate = existingCoords.some(
        c => c.email && c.email.trim().toLowerCase() === cleanEmail
      );

      if (isDuplicate) {
        setError('Este e-mail já está cadastrado como coordenador. Faça login ou use outro e-mail.');
        setLoading(false);
        return;
      }

      // 2. Criar novo coordenador
      const newCoordId = crypto.randomUUID().split('-')[0];
      const newCoordinator: Coordinator = {
        id: newCoordId,
        name: cleanName,
        email: cleanEmail,
        neighborhood: formData.neighborhood.trim() || 'Centro',
        city: formData.city.trim() || 'Capital',
        voterId: formData.voterId.trim() || '',
        voterSection: formData.voterSection.trim() || '',
        voterZone: formData.voterZone.trim() || '',
        photo: formData.photo || '',
        whatsapp: formData.whatsapp.replace(/\D/g, '') || '',
        network_id: networkId || undefined,
        org_id: currentOrgId,
        createdAt: new Date().toISOString(),
        ...({ password: cleanPassword, role: networkId ? 'coordinator' : 'area_coordinator' } as any)
      };

      // 3. Salvar na base de dados (Supabase + LocalStorage)
      const updatedList = [newCoordinator, ...existingCoords];
      await db.saveCoordinators(updatedList, currentOrgId);

      // Salvar credenciais localmente para login imediato
      localStorage.setItem(`@AppGestao:userPass_${cleanEmail}`, cleanPassword);
      localStorage.setItem(`@AppGestao:coordPass_${cleanEmail}`, cleanPassword);
      localStorage.setItem(`@AppGestao:demoPass_${cleanEmail}`, cleanPassword);

      // 4. Se o Supabase Auth ou Admin estiver disponível, sincronizar
      if (supabaseAdmin && !supabaseAdmin.isMock && supabaseAdmin.auth?.admin) {
        try {
          await supabaseAdmin.auth.admin.createUser({
            email: cleanEmail,
            password: cleanPassword,
            email_confirm: true,
            user_metadata: {
              name: cleanName,
              role: networkId ? 'coordinator' : 'area_coordinator',
              organization_id: currentOrgId
            }
          });
        } catch (authErr) {
          console.warn('Sincronização Admin Auth:', authErr);
        }
      }

      setRegisteredCoord(newCoordinator);
      setSuccess(true);
    } catch (err: any) {
      console.error('Erro no cadastro do coordenador:', err);
      setError(err.message || 'Erro ao processar cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterDashboard = () => {
    if (registeredCoord) {
      const fakeSession = {
        user: { id: `coord-${registeredCoord.id}`, email: registeredCoord.email },
        access_token: 'coord-token'
      };
      if (onLoginSuccess) {
        onLoginSuccess(fakeSession);
      } else {
        // Redireciona para login
        window.location.href = window.location.origin + (org?.id ? `?org=${org.id}` : '');
      }
    } else {
      window.location.href = window.location.origin;
    }
  };

  return (
    <div className="min-h-screen bg-gov-bg flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
      >
        {/* Header com Logo e Identidade */}
        <div className="bg-gov-blue text-white p-6 sm:p-8 text-center relative border-b-4 border-gov-yellow">
          {onBack && !success && (
            <button
              type="button"
              onClick={onBack}
              className="absolute left-4 top-4 sm:left-6 sm:top-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5 text-gov-yellow" />
            </button>
          )}

          <div className="flex flex-col items-center">
            {org?.logo_url ? (
              <img
                src={org.logo_url}
                alt={org?.candidate_name || 'Logo'}
                className="h-24 w-auto max-w-[200px] object-contain drop-shadow-lg mb-3 rounded-xl bg-white p-2"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-3 border border-white/20">
                <Users className="w-8 h-8 text-gov-yellow" />
              </div>
            )}

            <span className="bg-gov-yellow text-gov-blue text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest mb-2 shadow-sm">
              Novo Coordenador
            </span>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white leading-tight">
              {org?.candidate_name ? `Campanha ${org.candidate_name}` : 'Cadastro de Coordenador'}
            </h1>
            <p className="text-xs text-blue-200 uppercase font-bold tracking-wider mt-1">
              Faça parte da nossa equipe de coordenação e liderança
            </p>
          </div>
        </div>

        {/* Conteúdo / Formulário ou Sucesso */}
        <div className="p-6 sm:p-8">
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 space-y-6"
            >
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-gov-blue uppercase tracking-tight">
                  Cadastro Realizado com Sucesso!
                </h2>
                <p className="text-sm text-gray-600 font-medium mt-2 max-w-md mx-auto">
                  Parabéns, <strong>{registeredCoord?.name}</strong>! Você agora é um Coordenador Oficial da campanha.
                </p>
              </div>

              <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 text-left max-w-md mx-auto space-y-2 text-xs font-bold text-gray-700">
                <div className="flex justify-between border-b border-blue-100 pb-2">
                  <span className="text-gray-400 uppercase text-[10px]">E-mail de Login:</span>
                  <span className="text-gov-blue font-black">{registeredCoord?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 uppercase text-[10px]">Cidade / Bairro:</span>
                  <span className="text-gray-800">{registeredCoord?.neighborhood}, {registeredCoord?.city}</span>
                </div>
              </div>

              <div className="space-y-3 max-w-md mx-auto pt-2">
                <button
                  type="button"
                  onClick={handleEnterDashboard}
                  className="w-full bg-gov-blue text-white font-black py-4 rounded-2xl shadow-xl hover:bg-blue-800 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs active:scale-[0.98]"
                >
                  <span>Acessar Painel Agora</span>
                  <ArrowRight className="w-4 h-4 text-gov-yellow" />
                </button>

                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  Guarde sua senha para acessar sempre que precisar cadastrar seus eleitores e gerenciar sua rede.
                </p>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-50 text-red-700 p-3.5 rounded-2xl border-l-4 border-red-500 text-xs font-bold flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Upload de Foto */}
              <div className="flex flex-col items-center mb-2">
                <div className="relative group">
                  <div className="w-24 h-24 bg-gray-100 border-2 border-dashed border-gov-blue/20 flex items-center justify-center overflow-hidden rounded-2xl shadow-sm">
                    {formData.photo ? (
                      <img src={formData.photo} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-gov-blue/30" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-gov-blue text-white cursor-pointer hover:bg-blue-800 transition-all shadow-md rounded-xl"
                    title="Adicionar Foto"
                  >
                    <Camera className="w-4 h-4 text-gov-yellow" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-2">
                  Foto de Perfil (Opcional)
                </span>
              </div>

              {/* Nome Completo */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest block ml-1">
                  Nome Completo *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Seu nome completo"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-gov-blue outline-none font-bold text-xs uppercase"
                  />
                </div>
              </div>

              {/* Email & Senha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest block ml-1">
                    E-mail de Acesso *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="seuemail@exemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-gov-blue outline-none font-bold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest flex items-center justify-between ml-1">
                    <span>Senha de Acesso *</span>
                    <span className="text-[8px] text-gray-400 font-bold">(mín. 6 dígitos)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Crie sua senha"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 pr-10 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-gov-blue outline-none font-bold text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Bairro & Cidade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest block ml-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Centro"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-gov-blue outline-none font-bold text-xs uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest block ml-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Belém"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-gov-blue outline-none font-bold text-xs uppercase"
                  />
                </div>
              </div>

              {/* Título / Seção / Zona */}
              <div className="p-4 bg-blue-50/70 border-l-4 border-gov-yellow rounded-2xl">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-blue-800 uppercase block">Título</label>
                    <input
                      type="text"
                      placeholder="00000000"
                      value={formData.voterId}
                      onChange={(e) => setFormData({ ...formData, voterId: e.target.value })}
                      className="w-full p-2.5 bg-white border border-blue-100 rounded-xl focus:border-gov-blue outline-none text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-blue-800 uppercase block">Seção</label>
                    <input
                      type="text"
                      placeholder="0000"
                      value={formData.voterSection}
                      onChange={(e) => setFormData({ ...formData, voterSection: e.target.value })}
                      className="w-full p-2.5 bg-white border border-blue-100 rounded-xl focus:border-gov-blue outline-none text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-blue-800 uppercase block">Zona</label>
                    <input
                      type="text"
                      placeholder="000"
                      value={formData.voterZone}
                      onChange={(e) => setFormData({ ...formData, voterZone: e.target.value })}
                      className="w-full p-2.5 bg-white border border-blue-100 rounded-xl focus:border-gov-blue outline-none text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest flex items-center gap-2 ml-1">
                  <span className="bg-green-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">WhatsApp</span>
                  Número do WhatsApp (com DDD) *
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                  <input
                    type="tel"
                    required
                    placeholder="Ex: 91999990000"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value.replace(/\D/g, '') })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-green-200 rounded-2xl focus:border-green-500 outline-none font-bold text-xs"
                  />
                </div>
                <p className="text-[9px] text-gray-400 font-bold ml-1">
                  * Você receberá comunicados e avisos oficiais da liderança por este WhatsApp.
                </p>
              </div>

              {/* Botão de Envio */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gov-blue text-white font-black py-4 rounded-2xl shadow-xl hover:bg-blue-800 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs active:scale-[0.98] disabled:opacity-50 mt-4"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-gov-yellow" />
                    <span>Salvar e Concluir Cadastro</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <a
                  href={window.location.origin + (org?.id ? `?org=${org.id}` : '')}
                  className="text-[10px] font-bold text-gray-400 hover:text-gov-blue uppercase tracking-wider transition-colors"
                >
                  Já é cadastrado? Faça Login aqui
                </a>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
