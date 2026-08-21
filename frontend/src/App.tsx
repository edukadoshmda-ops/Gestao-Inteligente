/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import PublicRegister from './components/PublicRegister';
import PublicCoordinatorRegister from './components/PublicCoordinatorRegister';
import SalesPage from './components/SalesPage';
import RootPanel from './components/RootPanel';
import PWAInstaller from './components/PWAInstaller';
import { Settings, Loader2, DownloadCloud, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, supabaseAdmin } from './lib/supabase';
import { db } from './lib/db';
import { Organization, Profile } from './types';
import Logo from './components/Logo';
import { sendSmartNotification } from './lib/notifications';
import { applyAppTheme, resetAppTheme, getStoredTheme } from './lib/theme';

export default function App() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(new URLSearchParams(window.location.search).has('org') && !new URLSearchParams(window.location.search).has('coord_register') && !new URLSearchParams(window.location.search).has('cadastro'));
  const [showSales, setShowSales] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'full' | 'premium' | 'starter'>('full');
  const [brandOrg, setBrandOrg] = useState<Organization | null>(null);
  const [isPublicForm, setIsPublicForm] = useState(new URLSearchParams(window.location.search).get('public') === 'true');
  const [isPublicCoordForm, setIsPublicCoordForm] = useState(
    new URLSearchParams(window.location.search).get('coord_register') === 'true' ||
    new URLSearchParams(window.location.search).get('coordenador') === 'true' ||
    new URLSearchParams(window.location.search).get('cadastro') === 'coordenador'
  );
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
    const isLandingPage = !session && !showLogin && !showSales && !isPublicForm && !isPublicCoordForm;
    
    if (isLandingPage) {
      resetAppTheme();
    } else {
      let editedMap: Record<string, any> = {};
      try {
        editedMap = JSON.parse(localStorage.getItem('@AppGestao:editedOrgs') || '{}');
      } catch {}

      const activeOrg = brandOrg || profile?.organization;
      const finalOrg = activeOrg ? { ...activeOrg, ...(editedMap[activeOrg.id] || {}) } : null;

      if (finalOrg && (finalOrg.theme_primary || finalOrg.theme_color)) {
        applyAppTheme(
          finalOrg.theme_primary || finalOrg.theme_color,
          finalOrg.theme_secondary,
          finalOrg.theme_bg
        );
      } else {
        const stored = getStoredTheme();
        if (stored.primary) {
          applyAppTheme(stored.primary, stored.secondary, stored.bg);
        }
      }
    }

    const handleThemeUpdate = (e: any) => {
      if (e.detail?.primary) {
        applyAppTheme(e.detail.primary, e.detail.secondary, e.detail.bg);
      }
    };

    window.addEventListener('themeUpdated', handleThemeUpdate);
    return () => window.removeEventListener('themeUpdated', handleThemeUpdate);
  }, [session, showLogin, showSales, isPublicForm, isPublicCoordForm, brandOrg, profile]);

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
    } else {
      // Buscar a organização real ativa no banco para não usar demo-org
      supabase.from('organizations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data: org }) => {
          if (org) {
            setBrandOrg(org);
            if (org.logo_url) {
              localStorage.setItem('@AppGestao:savedLogo', org.logo_url);
              window.dispatchEvent(new Event('logoUpdated'));
            }
            try {
              localStorage.setItem('forja_current_organization', JSON.stringify(org));
            } catch {}
          }
        });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('✅ PWA install prompt detected', e);
    });

    // Tenta detectar se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('App já está instalado como PWA');
    }

    // Debug: verificar se o service worker está registrado
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        console.log('Service Workers registrados:', registrations.length);
        registrations.forEach(registration => {
          console.log('SW:', registration.scope, registration.active?.state);
        });
      });
    }

    // Debug: verificar se o manifest está carregado
    const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    console.log('Manifest link:', manifestLink?.href);

    console.log('Ambiente:', {
      isLocal: window.location.hostname === 'localhost',
      isHTTPS: window.location.protocol === 'https:',
      userAgent: navigator.userAgent
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
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // 1. Se for login de coordenador cadastrado (prioridade máxima)
    if (userId.startsWith('coord-') || (userEmail && !uuidRegex.test(userId))) {
      const coordId = userId.replace('coord-', '');
      try {
        const coords = await db.getCoordinators(brandOrg?.id);
        const found = coords.find(
          c => c.id === coordId || (c.email && c.email.trim().toLowerCase() === userEmail?.trim().toLowerCase())
        );
        if (found) {
          const isAreaCoord = !(found as any).network_id || (found as any).role === 'area_coordinator';
          const coordRole = (found as any).role || (isAreaCoord ? 'area_coordinator' : 'coordinator');
          const coordProfile = {
            id: found.id,
            email: found.email || userEmail,
            full_name: found.name,
            role: coordRole,
            organization_id: found.org_id || brandOrg?.id,
            organization: brandOrg
          };
          setProfile(coordProfile as any);
          setLoading(false);
          return coordProfile;
        }
      } catch (coordErr) {
        console.warn('Erro ao carregar perfil de coordenador:', coordErr);
      }
    }

    // 2. Demo roles apenas para contas oficiais de demonstração (se a sessão for demo-*)
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
      'candidato@teste.com': { name: 'Candidato Teste', role: 'candidate', orgName: 'Campanha Demonstrativa' },
      'coordenador@teste.com': { name: 'Coordenador Teste', role: 'coordinator', orgName: 'Campanha Demonstrativa' },
      'area@teste.com': { name: 'Coordenador de Área Teste', role: 'area_coordinator', orgName: 'Campanha Demonstrativa' },
    };

    if (userId.startsWith('demo-') && userEmail && demoRoles[userEmail]) {
      const emailKey = userEmail;
      const demoData = demoRoles[emailKey];
      
      let orgData: any = brandOrg;
      if (!orgData || orgData.id === 'demo-org') {
        const { data: dbOrg } = await supabase.from('organizations').select('*').limit(1).maybeSingle();
        if (dbOrg) {
          orgData = dbOrg;
        } else {
          orgData = {
            id: '6de1ca5c-a3fd-43e1-90ef-4aca4afb2238',
            name: demoData.orgName,
            candidate_name: demoData.name,
            created_at: new Date().toISOString()
          };
        }
      }

      try {
        const editedMap = JSON.parse(localStorage.getItem('@AppGestao:editedOrgs') || '{}');
        if (editedMap[orgData.id]) {
          orgData = { ...orgData, ...editedMap[orgData.id] };
        }
      } catch {}

      if (orgData.theme_primary || orgData.theme_color) {
        applyAppTheme(orgData.theme_primary || orgData.theme_color, orgData.theme_secondary, orgData.theme_bg);
      }

      const testProfile = {
        id: userId,
        full_name: demoData.name,
        email: emailKey,
        role: demoData.role,
        organization_id: orgData.id,
        organization: orgData
      };
      setBrandOrg(orgData);
      setProfile(testProfile as any);
      setLoading(false);
      return testProfile;
    }

    // Busca do banco de dados real via cliente administrativo ou supabase
    try {
      const client = (supabaseAdmin && !supabaseAdmin.isMock) ? supabaseAdmin : supabase;
      
      let query = client.from('profiles').select('*, organization:organizations(*)');

      if (uuidRegex.test(userId)) {
        query = query.eq('id', userId);
      } else if (userEmail) {
        query = query.eq('email', userEmail.toLowerCase().trim());
      } else {
        setLoading(false);
        return null;
      }

      const { data, error } = await query.maybeSingle();

      if (data && !error) {
        let orgData = data.organization;
        if (orgData) {
          try {
            const editedMap = JSON.parse(localStorage.getItem('@AppGestao:editedOrgs') || '{}');
            if (editedMap[orgData.id]) {
              orgData = { ...orgData, ...editedMap[orgData.id] };
            }
          } catch {}

          setBrandOrg(orgData);
          if (orgData.theme_primary || orgData.theme_color) {
            applyAppTheme(
              orgData.theme_primary || orgData.theme_color,
              orgData.theme_secondary,
              orgData.theme_bg
            );
          }
          if (orgData.logo_url) {
            localStorage.setItem('@AppGestao:savedLogo', orgData.logo_url);
            window.dispatchEvent(new Event('logoUpdated'));
          }
        }
        const updatedProfile = { ...data, organization: orgData };
        setProfile(updatedProfile);
        setLoading(false);
        return updatedProfile;
      } else if (userEmail) {
        // Fallback: se não encontrou o perfil no Supabase, verificar se é coordenador ou montar perfil provisório
        const coords = await db.getCoordinators(brandOrg?.id);
        const found = coords.find(
          c => (c.email && c.email.trim().toLowerCase() === userEmail?.trim().toLowerCase()) || c.id === userId
        );
        const isArea = found ? (!(found as any).network_id || (found as any).role === 'area_coordinator') : false;

        const fallbackProfile = {
          id: found ? found.id : userId,
          email: userEmail,
          full_name: found ? found.name : userEmail.split('@')[0],
          role: found ? ((found as any).role || (isArea ? 'area_coordinator' : 'coordinator')) : 'coordinator',
          organization_id: brandOrg?.id || undefined,
          organization: brandOrg
        };
        setProfile(fallbackProfile as any);
        setLoading(false);
        return fallbackProfile;
      }
    } catch (err) {
      console.log('Erro na busca do perfil:', err);
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

  // ── ROTAS PÚBLICAS (Têm prioridade sobre sessão ativa) ──
  if (isPublicCoordForm) {
    return <PublicCoordinatorRegister onBack={() => setIsPublicCoordForm(false)} onLoginSuccess={handleLogin} />;
  }
  if (isPublicForm) {
    return <PublicRegister onBack={() => setIsPublicForm(false)} />;
  }
  if (showSales) {
    return <SalesPage onBack={() => setShowSales(false)} orgId={profile?.organization?.id} plan={selectedPlan} onChangePlan={setSelectedPlan} />;
  }

  // ── SESSÃO AUTENTICADA (Painel e Dashboard) ──
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
          onToggleRoot={() => setIsRootView(!isRootView)}
          isRootView={isRootView}
        />
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
