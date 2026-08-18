import { useState } from 'react';
import {
  LayoutGrid, Users, BarChart3, LogOut, ShieldCheck,
  ChevronRight, MessageSquare, Megaphone, Target, MapPin, Menu, X, Sparkles, CalendarCheck, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  onLogout: () => void;
  username: string;
  candidateName?: string;
  role?: 'super_admin' | 'candidate' | 'general_coordination' | 'area_coordinator' | 'coordinator';
  logoUrl?: string;
}

const menuItems = [
  { id: 'list',         label: 'Painel Geral',       icon: LayoutGrid  },
  { id: 'intelligence', label: 'Inteligência Eleitoral',  icon: Target      },
  { id: 'ai_manager',   label: 'Consultoria IA',     icon: Sparkles    },
  { id: 'election_day', label: 'Dia da Eleição',    icon: CalendarCheck },
  { id: 'materials',    label: 'Materiais & Avisos', icon: Megaphone   },
  { id: 'chat',         label: 'Chat da Equipe',     icon: MessageSquare },
  { id: 'ranking',      label: 'Ranking Equipes',    icon: ShieldCheck },
  { id: 'coordinators', label: 'Coordenadores',      icon: Users       },
  { id: 'report',       label: 'Faixa Etária',       icon: BarChart3   },
  { id: 'gender',       label: 'Gênero',             icon: Users       },
  { id: 'neighborhood', label: 'Bairros',            icon: MapPin      },
  { id: 'settings',     label: 'Configurações',      icon: Settings    },
];

function SidebarContent({
  activeTab,
  onTabChange,
  onLogout,
  username,
  candidateName,
  role,
  logoUrl
}: SidebarProps) {
  const isSuperAdmin = username.toLowerCase() === 'edukadoshmda@gmail.com' || role === 'super_admin';

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 flex justify-center items-center border-b border-white/10 shrink-0 h-32 rounded-2xl">
        <div className="w-full h-full max-h-[88px] bg-white rounded-xl p-3 flex items-center justify-center shadow-md overflow-hidden">
          <Logo className="w-full h-full" variant="default" logoUrl={logoUrl} />
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto flex flex-col justify-between py-6">
        <nav className="space-y-0.5 px-3">
          {menuItems.filter(item => {
            if (role === 'coordinator' || role === 'area_coordinator') {
              // Coordenador de área só vê o essencial de campo
              return ['list', 'chat', 'materials'].includes(item.id);
            }
            if (role === 'general_coordination') {
              // Coordenação Geral vê quase tudo, exceto admin master
              return !['admin_master'].includes(item.id);
            }
            // Candidato e Super Admin veem tudo
            return true;
          }).map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={item.label}
              className={`w-full flex items-center justify-between px-4 py-3 transition-all hover-lift active-scale rounded-2xl ${
                activeTab === item.id
                  ? 'bg-white/10 text-white font-black shadow-lg border-l-4 border-gov-yellow'
                  : 'text-white/65 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  className={`w-4 h-4 shrink-0 ${
                    activeTab === item.id ? 'text-white' : 'text-gov-yellow'
                  }`}
                />
                <span className="text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">
                  {item.label}
                </span>
              </div>
              {activeTab === item.id && <ChevronRight className="w-3 h-3 shrink-0" />}
            </button>
          ))}

          {isSuperAdmin && (
            <button
              onClick={() => onTabChange('admin_master')}
              className={`w-full flex items-center justify-between px-4 py-3 mt-6 border-t border-white/10 transition-all rounded-2xl ${
                activeTab === 'admin_master'
                  ? 'bg-gov-yellow text-gov-blue font-black shadow-md'
                  : 'text-gov-yellow hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap">
                  Painel Root
                </span>
              </div>
              {activeTab === 'admin_master' && <ChevronRight className="w-3 h-3 shrink-0" />}
            </button>
          )}
        </nav>

        {/* Footer */}
        <div className="px-4 mt-6 space-y-3">
          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-3 h-3 text-gov-yellow" />
              <span className="text-[8px] font-black uppercase tracking-widest text-white/40">
                Usuário Ativo
              </span>
            </div>
            <p className="text-[10px] font-black uppercase truncate text-white/90">
              {username}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all uppercase text-[10px] font-black tracking-widest rounded-2xl"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* Versão */}
      <div className="px-6 py-4 text-[9px] text-white/30 uppercase tracking-widest font-bold border-t border-white/10 shrink-0 rounded-2xl">
        v2.5.0-saas
      </div>
    </div>
  );
}

export default function Sidebar(props: SidebarProps) {
  const [open, setOpen] = useState(false);

  const handleTabChange = (id: string) => {
    props.onTabChange(id);
    setOpen(false);
  };

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 h-screen bg-gov-blue text-white border-r border-white/10 sticky top-0 shrink-0 z-50 rounded-2xl">
        <SidebarContent {...props} />
      </aside>

      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-[300] bg-gov-blue border-2 border-gov-yellow text-white p-2.5 shadow-xl rounded-2xl"
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="lg:hidden fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm"
            />

            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 z-[500] w-72 bg-gov-blue text-white border-r border-white/10 shadow-2xl flex flex-col rounded-2xl"
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white p-1 transition-colors"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>

              <SidebarContent
                {...props}
                onTabChange={handleTabChange}
                onLogout={() => { props.onLogout(); setOpen(false); }}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
