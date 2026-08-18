/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import PublicRegister from './components/PublicRegister';
import SalesPage from './components/SalesPage';
import RootPanel from './components/RootPanel';
import PWAInstaller from './components/PWAInstaller';
import { Settings, Loader2, DownloadCloud, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { Organization, Profile } from './types';
import Logo from './components/Logo';
import { sendSmartNotification } from './lib/notifications';

export default function App() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(new URLSearchParams(window.location.search).has('org'));
  const [showSales, setShowSales] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'full' | 'premium' | 'starter'>('full');
  const [brandOrg, setBrandOrg] = useState<Organization | null>(null);
  const [isPublicForm, setIsPublicForm] = useState(new URLSearchParams(window.location.search).get('public') === 'true');
  const [isRootView, setIsRootView] = useState(false);
  const [showInstaller, setShowInstaller] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // Pedir permissão PWA no carregamento silenciosamente
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const handleOnline = () => {
      setIsOffline(false);
      sendSmartNotification(
        "✅ Conexão Restabelecida", 
        "O aplicativo Gestão Inteligente voltou a ficar online. Seus dados estão seguros e sendo sincronizados!"
      );
    };

    const handleOffline = () => {
      setIsOffline(true);
      sendSmartNotification(
        "⚠️ Modo Offline de Segurança", 
        "Conexão perdida. Continue cadastrando normalmente, salvaremos tudo na memória local do seu aparelho!"
      );
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Centralized theme management: resets on landing page, applies on login & app views
  useEffect(() => {
    const isLandingPage = !session && !showLogin && !showSales && !isPublicForm;
    
    if (isLandingPage) {
      document.documentElement.style.removeProperty('--theme-primary');
      document.documentElement.style.removeProperty('--theme-secondary');
      document.documentElement.style.removeProperty('--theme-bg');
    } else {
      if (brandOrg && brandOrg.theme_primary) {
        document.documentElement.style.setProperty('--theme-primary', brandOrg.theme_primary);
        document.documentElement.style.setProperty('--theme-secondary', brandOrg.theme_secondary || '');
        document.documentElement.style.setProperty('--theme-bg', brandOrg.theme_bg || '');
        
        localStorage.setItem('@AppGestao:savedTheme', JSON.stringify({
          primary: brandOrg.theme_primary,
          secondary: brandOrg.theme_secondary,
          bg: brandOrg.theme_bg
        }));
      } else {
        const savedTheme = localStorage.getItem('@AppGestao:savedTheme');
        if (savedTheme) {
          try {
            const theme = JSON.parse(savedTheme);
            if (theme && theme.primary && theme.secondary && theme.bg) {
              document.documentElement.style.setProperty('--theme-primary', theme.primary);
              document.documentElement.style.setProperty('--theme-secondary', theme.secondary);
              document.documentElement.style.setProperty('--theme-bg', theme.bg);
            }
          } catch (e) {
            console.error('Error loading saved theme:', e);
          }
        }
      }
    }
  }, [session, showLogin, showSales, isPublicForm, brandOrg]);

  useEffect(() => {
    const orgId = new URLSearchParams(window.location.search).get('org');
    
    // Detect Subdomain
    const hostname = window.location.hostname;
    // Ex: "candidatoA.dominio.com" -> parts: ["candidatoA", "dominio", "com"]
    const parts = hostname.split('.');
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    let subdomain = null;

    // Se tiver mais de 2 partes (ex: app.site.com) e não for www
    if (parts.length > 2 && parts[0] !== 'www' && !isLocal) {
      subdomain = parts[0];
    } else if (isLocal && parts.length > 1) {
      // Para teste local (ex: tenant.localhost)
      subdomain = parts[0];
    }

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
        .then(({ data: org, error }) => {
          if (error) {
            console.warn('Erro ao buscar organização:', error);
            return;
          }
          if (org) {
            setBrandOrg(org);
            if (org.logo_url) {
              localStorage.setItem('@AppGestao:savedLogo', org.logo_url);
              window.dispatchEvent(new Event('logoUpdated'));
            }
          }
        });
    } else if (subdomain) {
      supabase.from('organizations')
        .select('*')
        .eq('subdomain', subdomain)
        .single()
        .then(({ data: org }) => {
          if (org) {
            setBrandOrg(org);
            if (org.logo_url) {
              localStorage.setItem('@AppGestao:savedLogo', org.logo_url);
              window.dispatchEvent(new Event('logoUpdated'));
            }
            // Injeta o org na URL internamente para compatibilidade de rotas
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('org', org.id);
            window.history.replaceState({}, '', newUrl);
          }
        });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        fetchProfile(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
        fetchProfile(session.user.id, session.user.email);
      } else {
        setSession(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Injecao dinamica do Manifest do PWA para White Label
  useEffect(() => {
    if (brandOrg?.logo_url) {
      const manifest = {
        name: brandOrg.candidate_name || "Sistema Eleitoral",
        short_name: brandOrg.candidate_name ? brandOrg.candidate_name.split(' ')[0] : "Campanha",
        start_url: `/?org=${brandOrg.id}`,
        display: "standalone",
        background_color: "#003366",
        theme_color: "#003366",
        icons: [
          {
            src: brandOrg.logo_url,
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: brandOrg.logo_url,
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      };
      const stringManifest = JSON.stringify(manifest);
      const blob = new Blob([stringManifest], { type: 'application/json' });
      const manifestURL = URL.createObjectURL(blob);
      let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'manifest';
        document.head.appendChild(link);
      }
      link.href = manifestURL;
    }
  }, [brandOrg]);


  const fetchProfile = async (userId: string, userEmail?: string) => {
    // Demo roles apenas para ambiente de desenvolvimento e showroom
    const demoRoles: Record<string, { name: string, role: string, orgName: string }> = {
      'edukadoshmda@gmail.com': { name: 'Super Admin Master', role: 'super_admin', orgName: 'PAINEL DE CONTROLE MASTER' },
      'presidente@campanha.com': { name: 'Candidato a Presidente', role: 'candidate', orgName: 'Campanha Presidencial' },
      'governador@campanha.com': { name: 'Candidato a Governador', role: 'candidate', orgName: 'Campanha Governo do Estado' },
      'senador@campanha.com': { name: 'Candidato a Senador', role: 'candidate', orgName: 'Campanha Senado Federal' },
      'df@campanha.com': { name: 'Candidato Dep. Federal', role: 'candidate', orgName: 'Campanha Câmara Federal' },
      'de@campanha.com': { name: 'Candidato Dep. Estadual', role: 'candidate', orgName: 'Campanha Assembleia Legislativa' },
      'prefeito@campanha.com': { name: 'Candidato a Prefeito', role: 'candidate', orgName: 'Campanha Executivo Municipal' },
      'vereador@campanha.com': { name: 'Candidato a Vereador', role: 'candidate', orgName: 'Campanha Legislativo Municipal' },
      'coordenacao@campanha.com': { name: 'Coordenação Geral', role: 'general_coordination', orgName: 'Coordenação de Campanha' },
      'coordenador@campanha.com': { name: 'Coordenador de Rua', role: 'coordinator', orgName: 'Visão de Campo (Restrita)' },
      'teste@campanha.com': { name: 'Visitante', role: 'candidate', orgName: 'Ambiente de Demonstração' },
      'candidato@teste.com': { name: 'Candidato', role: 'candidate', orgName: 'Campanha de Teste' },
      'coordenador@teste.com': { name: 'Coordenador', role: 'coordinator', orgName: 'Campanha de Teste' },
      'area@teste.com': { name: 'Coordenador de Área', role: 'area_coordinator', orgName: 'Campanha de Teste' },
    };

    // Primeiro tenta buscar do banco de dados real (para usuários criados via AdminMaster)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, organization:organizations(*)')
        .eq('id', userId)
        .single();

      if (data && !error) {
        setProfile(data);
        if (data?.organization?.logo_url) {
          localStorage.setItem('@AppGestao:savedLogo', data.organization.logo_url);
          window.dispatchEvent(new Event('logoUpdated'));
        }
        setLoading(false);
        return data;
      } else if (error) {
        console.warn('Erro ao buscar perfil:', error);
        // Se o erro for 406 (perfil não encontrado), tentar criar perfil
        if (error.code === 'PGRST116') {
          console.log('Perfil não encontrado, tentando criar...');
          try {
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                email: userEmail,
                full_name: userEmail.split('@')[0]
              });
            if (insertError) {
              console.error('Erro ao criar perfil:', insertError);
            } else {
              console.log('Perfil criado com sucesso');
              // Tentar buscar novamente
              const { data: newData, error: newError } = await supabase
                .from('profiles')
                .select('*, organization:organizations(*)')
                .eq('id', userId)
                .single();
              if (newData && !newError) {
                setProfile(newData);
                setLoading(false);
                return newData;
              }
            }
          } catch (insertErr) {
            console.error('Erro ao criar perfil:', insertErr);
          }
        }
      }
    } catch (err) {
      console.log('Perfil não encontrado no banco, verificando demo roles...');
    }

    // Fallback para demo roles (apenas para desenvolvimento)
    if (userEmail && demoRoles[userEmail]) {
      const demoData = demoRoles[userEmail];
      const testProfile = {
        id: userId,
        full_name: demoData.name,
        email: userEmail,
        role: demoData.role,
        organization_id: brandOrg?.id || 'demo-org',
        organization: brandOrg || {
          id: 'demo-org',
          name: demoData.orgName,
          candidate_name: demoData.name,
          created_at: new Date().toISOString()
        }
      };
      setProfile(testProfile as any);
      setLoading(false);
      return testProfile;
    }

    // Se não encontrou nem no banco nem nos demo roles
    console.error('Perfil não encontrado para o usuário:', userEmail);
    setLoading(false);
    return null;
  };

  const handleLogin = async (s: any) => {
    setLoading(true);
    setSession(s);
    await fetchProfile(s.user.id, s.user.email);
    setShowLogin(false);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gov-bg flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-gov-blue animate-spin" />
      </div>
    );
  }

  const handleInstallOpen = () => setShowInstaller(true);
  const handleInstallDismiss = () => setShowInstaller(false);

  // LOGICA DE RENDERIZAÇÃO
  if (session && profile) {
    const isMasterAdmin = session.user.email === 'edukadoshmda@gmail.com';

    if (isMasterAdmin && isRootView) {
      return <RootPanel onSignOut={() => supabase.auth.signOut()} onBackToApp={() => setIsRootView(false)} />;
    }

    return (
      <div className="min-h-screen bg-gov-bg relative">
        <AnimatePresence>
          {isOffline && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-0 left-0 w-full bg-orange-500 text-white z-[9999] px-4 py-3 shadow-lg flex items-center justify-center gap-3 border-b-4 border-orange-600"
            >
              <WifiOff className="w-5 h-5 animate-pulse text-white" />
              <div className="text-left">
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest leading-none">Aviso: Você está Offline</p>
                <p className="text-[9px] font-bold text-orange-100 uppercase mt-0.5 hidden sm:block">O app continua funcionando perfeitamente. Seus dados serão sincronizados ao conectar.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <Dashboard
          username={profile.full_name || session.user.email}
          organization={profile.organization}
          profile={profile}
          onLogout={async () => {
            try {
              await supabase.auth.signOut();
              setSession(null);
              setProfile(null);
            } catch (error) {
              console.error('Erro ao fazer logout:', error);
              // Força logout mesmo se houver erro
              setSession(null);
              setProfile(null);
            }
          }}
          onShowSales={() => setShowSales(true)}
        />
        {isMasterAdmin && (
          <button 
            onClick={() => setIsRootView(!isRootView)}
            className="fixed bottom-6 right-6 bg-gov-blue text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all z-[3000] flex items-center gap-2 font-black uppercase text-xs border-2 border-gov-yellow"
          >
            <Settings className="w-5 h-5 animate-pulse" /> {isRootView ? 'Voltar ao App' : 'Painel Root'}
          </button>
        )}
        {/* Botão flutuante de instalação PWA */}
        {deferredPrompt && (
          <motion.button
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2 }}
            onClick={handleInstallOpen}
            className="fixed bottom-6 left-6 bg-white text-blue-800 px-4 py-3 rounded-2xl shadow-2xl border border-blue-100 flex items-center gap-2 text-xs font-black uppercase tracking-wide hover:scale-105 transition-transform z-[2000]"
          >
            <DownloadCloud className="w-4 h-4 text-blue-600" />
            Instalar App
          </motion.button>
        )}
        <PWAInstaller
          visible={showInstaller}
          onInstall={async () => { await handleInstallClick(); setShowInstaller(false); }}
          onDismiss={handleInstallDismiss}
        />
      </div>
    );
  }

  if (showSales) return <SalesPage onBack={() => setShowSales(false)} orgId={profile?.organization?.id} plan={selectedPlan} onChangePlan={setSelectedPlan} />;
  if (isPublicForm) return <PublicRegister onBack={() => setIsPublicForm(false)} />;

  if (showLogin) return (
    <>
      <Login onLogin={handleLogin} onInstall={handleInstallOpen} canInstall={!!deferredPrompt} />
      <PWAInstaller
        visible={showInstaller}
        onInstall={async () => { await handleInstallClick(); setShowInstaller(false); }}
        onDismiss={handleInstallDismiss}
      />
    </>
  );

  return (
    <>
      <LandingPage
        onStart={(plan) => {
          if (plan === 'full' || plan === 'premium' || plan === 'starter') {
            setSelectedPlan(plan);
          } else {
            setSelectedPlan('full');
          }
          setShowSales(true);
        }}
        onLogin={() => setShowLogin(true)}
        onPublicRegister={() => setIsPublicForm(true)}
        onInstall={handleInstallOpen}
        canInstall={!!deferredPrompt}
      />
      <PWAInstaller
        visible={showInstaller}
        onInstall={async () => { await handleInstallClick(); setShowInstaller(false); }}
        onDismiss={handleInstallDismiss}
      />
    </>
  );

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  }
}
