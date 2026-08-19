import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight, CheckCircle2, ShieldCheck, Users, Zap, Database,
  MessageSquare, Target, BarChart3, Sparkles, Trophy, CalendarCheck,
  FileSpreadsheet, FileText, XCircle, ChevronDown, Globe, Brain,
  Download, Star, Lock, Phone, Monitor
} from 'lucide-react';
import Logo from './Logo';
import Testimonials from './Testimonials';

interface LandingPageProps {
  onStart: (plan?: 'full' | 'premium' | 'starter') => void;
  onLogin: () => void;
  onPublicRegister?: () => void;
  onCreateCampaign?: () => void;
  onInstall?: () => void;
  canInstall?: boolean;
}

const features = [
  {
    icon: Brain,
    title: 'Inteligência Artificial',
    desc: 'Nossa IA analisa sua base de apoiadores em tempo real, sugere ações estratégicas e identifica zonas onde sua campanha precisa de mais força.',
    color: 'text-blue-600 bg-blue-50'
  },
  {
    icon: Users,
    title: 'Gestão de Eleitores',
    desc: 'Cadastre, segmente e acompanhe cada eleitor da sua base com dados completos: bairro, seção, zona eleitoral e nível de apoio.',
    color: 'text-green-600 bg-green-50'
  },
  {
    icon: Trophy,
    title: 'Gamificação de Equipes',
    desc: 'Motive coordenadores com ranking gamificado, medalhas e XP conforme cadastram apoiadores. Aumente a produtividade em até 300%.',
    color: 'text-yellow-600 bg-yellow-50'
  },
  {
    icon: CalendarCheck,
    title: 'Boca de Urna em Tempo Real',
    desc: 'Monitore a conversão de votos no Dia D. Saiba quem já votou e onde mobilizar mais pessoas antes do fechamento das urnas.',
    color: 'text-purple-600 bg-purple-50'
  },
  {
    icon: MessageSquare,
    title: 'Automação WhatsApp',
    desc: 'Templates dinâmicos de boas-vindas, aniversários e convites com preenchimento automático de nomes. Comunicação humanizada em escala.',
    color: 'text-emerald-600 bg-emerald-50'
  },
  {
    icon: BarChart3,
    title: 'Inteligência Eleitoral',
    desc: 'Mapas de calor, análise por bairro, faixa etária e gênero. Relatórios completos para orientar cada decisão estratégica da campanha.',
    color: 'text-red-600 bg-red-50'
  },
];

const highlights = [
  { icon: FileSpreadsheet, text: 'Exportação completa da base em Excel (.xlsx)', bold: 'Excel' },
  { icon: FileText, text: 'Relatórios e gráficos exportáveis em PDF', bold: 'PDF' },
  { icon: XCircle, text: 'Cancele a assinatura a qualquer momento, sem multa e sem burocracia', bold: 'Sem Multa' },
  { icon: ShieldCheck, text: 'Dados protegidos com criptografia de ponta a ponta', bold: 'Segurança' },
  { icon: Globe, text: 'Funciona em qualquer município do Brasil', bold: 'Nacional' },
  { icon: Zap, text: 'Ativação instantânea após o pagamento — sem espera', bold: 'Instantâneo' },
];

const faqs = [
  {
    q: 'O que é o Sistema Gestão Inteligente?',
    a: 'É uma plataforma SaaS (Software como Serviço) desenvolvida para candidatos e campanhas eleitorais. Permite cadastrar e gerenciar eleitores, coordenadores e apoiadores com Inteligência Artificial integrada, relatórios avançados e automação de comunicação por WhatsApp.'
  },
  {
    q: 'Posso cancelar a assinatura a qualquer momento?',
    a: 'Sim! Você pode cancelar sua assinatura quando quiser, sem multa, sem taxa de cancelamento e sem burocracia. Basta entrar em contato com nosso suporte. Nenhuma fidelidade é exigida.'
  },
  {
    q: 'Consigo exportar minha base de dados?',
    a: 'Sim! Você pode exportar toda a sua base de eleitores e apoiadores em formato Excel (.xlsx) com todos os dados cadastrados. Também é possível exportar relatórios e gráficos em PDF diretamente do painel.'
  },
  {
    q: 'Quantos eleitores posso cadastrar?',
    a: 'No plano Plus você tem capacidade para milhares de registros. No plano Premium, não há limite prático — a plataforma foi testada com mais de 500.000 registros sem perda de desempenho.'
  },
  {
    q: 'Quantos coordenadores posso adicionar?',
    a: 'Você pode adicionar coordenadores de campo ilimitados. Cada coordenador tem acesso restrito apenas ao cadastro de apoiadores, sem acesso aos dados estratégicos da campanha.'
  },
  {
    q: 'A plataforma funciona no celular?',
    a: 'Sim! O sistema é um PWA (Progressive Web App) que pode ser instalado diretamente no celular como um aplicativo nativo, sem precisar baixar nada na loja. Funciona perfeitamente em iOS e Android.'
  },
  {
    q: 'Como a Inteligência Artificial me ajuda?',
    a: 'A IA analisa sua base de dados em tempo real, identificando indecisos, bairros com maior potencial de votos, melhores horários de contato e sugerindo estratégias diárias, semanais e mensais personalizadas para sua meta de votos.'
  },
  {
    q: 'Os dados dos meus eleitores são seguros?',
    a: 'Absolutamente. Cada campanha tem seu banco de dados completamente isolado. Os dados são criptografados e nunca compartilhados entre organizações. Seguimos todas as diretrizes da LGPD.'
  },
  {
    q: 'Preciso de conhecimento técnico para usar?',
    a: 'Não. A plataforma foi projetada para ser simples e intuitiva. Em menos de 10 minutos qualquer pessoa da equipe de campanha já consegue cadastrar apoiadores e acessar os relatórios.'
  },
  {
    q: 'Posso usar durante as eleições para acompanhar a votação?',
    a: 'Sim! Temos o módulo "Dia da Eleição" específico para monitorar em tempo real quem já votou, por seção e zona eleitoral, permitindo direcionar o transporte e a mobilização de forma precisa.'
  },
];

export default function LandingPage({ onStart, onLogin, onPublicRegister, onCreateCampaign, onInstall, canInstall }: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const scrollToPricing = () => {
    const el = document.getElementById('pricing');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans overflow-hidden">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex justify-between items-center shadow-sm">
        <Logo className="w-36 h-10" forceDefault={true} />
        <div className="flex items-center gap-3">
          {canInstall && onInstall && (
            <button
              onClick={onInstall}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 border-2 border-gov-blue text-gov-blue font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all rounded-full"
            >
              <Download className="w-3.5 h-3.5" /> Instalar App
            </button>
          )}
          <button
            onClick={onLogin}
            className="px-6 py-3 bg-gov-blue text-white font-black uppercase text-[10px] tracking-widest hover:bg-blue-800 transition-all shadow-lg rounded-full"
          >
            Acessar Painel
          </button>
          {onCreateCampaign && (
            <button
              onClick={onCreateCampaign}
              className="px-6 py-3 bg-green-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-green-700 transition-all shadow-lg rounded-full"
            >
              Criar Campanha
            </button>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-40 pb-28 px-6 flex flex-col items-center text-center overflow-hidden" style={{background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 40%, #112266 70%, #0d1b3e 100%)'}}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(ellipse at 20% 60%, rgba(212,175,55,0.35) 0%, transparent 55%), radial-gradient(ellipse at 80% 10%, rgba(59,130,246,0.25) 0%, transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(17,34,102,0.8) 0%, transparent 60%)' }} />
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="z-10 mb-8">
          <Logo className="w-64 h-28" variant="white" forceDefault={true} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="z-10 inline-flex items-center gap-2 px-5 py-2 border text-[11px] font-black uppercase tracking-widest mb-6 rounded-full" style={{background: 'rgba(212,175,55,0.12)', borderColor: 'rgba(212,175,55,0.4)', color: '#D4AF37'}}>
          <Star className="w-3.5 h-3.5" /> A Tecnologia das Campanhas Vitoriosas
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="z-10 text-4xl lg:text-7xl font-black uppercase leading-[1.05] tracking-tighter text-white max-w-4xl mb-6">
          Ganhe com{' '}
          <span style={{color: '#D4AF37', textShadow: '0 0 40px rgba(212,175,55,0.4)'}}>Inteligência</span>
          <br />
          <span style={{background: 'linear-gradient(90deg, #C0A535, #F0D060, #C0A535)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>&amp; Gestão</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="z-10 text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed mb-10 font-medium" style={{color: 'rgba(200,215,255,0.8)'}}>
          A plataforma de elite para gestão eleitoral que utiliza Inteligência Artificial e análise de dados para garantir a sua vitória.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="z-10 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={scrollToPricing}
            className="px-12 py-5 font-black uppercase text-sm tracking-widest transition-all shadow-2xl group flex items-center justify-center gap-3 rounded-full"
            style={{background: 'linear-gradient(135deg, #D4AF37, #F0D060)', color: '#0a0f1e'}}
            onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg, #F0D060, #D4AF37)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg, #D4AF37, #F0D060)')}
          >
            Começar Agora <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={onLogin}
            className="px-12 py-5 font-black uppercase text-sm tracking-widest transition-all flex items-center justify-center gap-3 rounded-full"
            style={{border: '2px solid rgba(212,175,55,0.4)', color: 'rgba(212,175,55,0.9)', background: 'rgba(212,175,55,0.06)'}}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.15)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.7)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.06)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; }}
          >
            Já tenho conta
          </button>
        </motion.div>

      </section>

      {/* ── Destaques rápidos ── */}
      <section className="py-12 bg-white border-b border-gray-100 rounded-2xl">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {highlights.map((h, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex flex-col items-center text-center gap-2 p-4">
              <div className="w-10 h-10 rounded-full bg-gov-blue/5 flex items-center justify-center">
                <h.icon className="w-5 h-5 text-gov-blue" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-gov-blue">{h.bold}</span>
              <p className="text-[9px] font-bold text-gray-500 leading-snug text-center">{h.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Seção Showcase (Software Completo) ── */}
      <section className="py-20 bg-[#F8FAFC] px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="rounded-3xl overflow-hidden relative shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 40%, #112266 80%, #0d1b3e 100%)' }}
          >
            {/* Grid overlay sutil */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            {/* Glow dourado */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(ellipse at 30% 50%, rgba(212,175,55,0.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 30%, rgba(59,130,246,0.15) 0%, transparent 50%)' }} />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 p-8 sm:p-10 lg:p-14 items-center">
              
              {/* Coluna Esquerda: Texto e Benefícios */}
              <div>
                <motion.div 
                  initial={{ opacity: 0, x: -20 }} 
                  whileInView={{ opacity: 1, x: 0 }} 
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="inline-flex items-center gap-2 bg-[#E6A100]/15 border border-[#E6A100]/30 text-[#E6A100] text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-6">
                    <Monitor className="w-3.5 h-3.5" /> Plataforma Completa
                  </span>
                  
                  <h2 className="text-2xl sm:text-3xl lg:text-[2.1rem] font-black text-white leading-[1.15] mb-3 tracking-tight">
                    O Gestão Inteligente é um{' '}
                    <span className="italic" style={{ color: '#E6A100' }}>software completo</span>{' '}
                    para a sua equipe e um{' '}
                    <span className="italic" style={{ background: 'linear-gradient(90deg, #E6A100, #F0D060)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>excelente custo-benefício</span>{' '}
                    para você!
                  </h2>
                  
                  <p className="text-blue-200/70 text-sm font-medium leading-relaxed mb-8 max-w-lg">
                    Tudo que a sua campanha precisa em uma única plataforma. Do cadastro ao dia da eleição.
                  </p>
                </motion.div>

                {/* Lista de Benefícios */}
                <div className="space-y-4">
                  {[
                    { icon: Users, text: 'Criar e administrar a base eleitoral e lideranças.' },
                    { icon: Target, text: 'Identificar, segmentar e conhecer os eleitores.' },
                    { icon: BarChart3, text: 'Mobilizar a base eleitoral de maneira mais eficaz.' },
                    { icon: MessageSquare, text: 'Engajar as lideranças em suas iniciativas.' },
                    { icon: Brain, text: 'Fortalecer conexões com eleitores e lideranças.' },
                    { icon: CalendarCheck, text: 'Ter insights e previsibilidades para suas estratégias.' },
                    { icon: FileSpreadsheet, text: 'Exportar relatórios completos em Excel e PDF.' },
                    { icon: Trophy, text: 'Gamificar e motivar coordenadores de campo.' },
                  ].map((item, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + i * 0.06 }}
                      className="flex items-center gap-3 group"
                    >
                      <div className="w-7 h-7 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110" style={{ background: 'linear-gradient(135deg, rgba(230,161,0,0.2), rgba(230,161,0,0.05))' }}>
                        <item.icon className="w-3.5 h-3.5 text-[#E6A100]" />
                      </div>
                      <span className="text-[13px] font-semibold text-blue-100/90 leading-snug group-hover:text-white transition-colors">
                        {item.text}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Coluna Direita: Mockup de Dispositivos */}
              <motion.div 
                initial={{ opacity: 0, x: 30, scale: 0.95 }} 
                whileInView={{ opacity: 1, x: 0, scale: 1 }} 
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' }}
                className="relative flex items-center justify-center"
              >
                {/* Glow atrás do mockup */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[80%] h-[80%] rounded-full" style={{ background: 'radial-gradient(circle, rgba(230,161,0,0.12) 0%, rgba(59,130,246,0.06) 50%, transparent 70%)' }} />
                </div>
                
                <img 
                  src="/app-mockup.png" 
                  alt="Gestão Inteligente rodando em Laptop e Celular" 
                  className="relative z-10 w-full max-w-lg lg:max-w-xl drop-shadow-2xl hover:scale-[1.02] transition-transform duration-500 rounded-2xl"
                />
              </motion.div>
            </div>

            {/* Barra de stats rápida */}
            <div className="relative z-10 border-t border-white/[0.06] px-8 sm:px-10 lg:px-14 py-5 rounded-2xl">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { value: '500K+', label: 'Registros Suportados' },
                  { value: '24/7', label: 'Suporte Dedicado' },
                  { value: '100%', label: 'Dados Criptografados' },
                  { value: 'PWA', label: 'Funciona no Celular' },
                ].map((stat, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 10 }} 
                    whileInView={{ opacity: 1, y: 0 }} 
                    viewport={{ once: true }}
                    transition={{ delay: 0.7 + i * 0.08 }}
                    className="text-center"
                  >
                    <div className="text-lg sm:text-xl font-black text-[#E6A100] tracking-tight">{stat.value}</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-blue-300/50">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── O que o app faz ── */}
      <section className="py-24 bg-gray-50 px-6 rounded-2xl">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-[10px] font-black uppercase tracking-[0.3em] text-gov-blue bg-blue-50 px-4 py-2 mb-4">Funcionalidades</span>
            <h2 className="text-3xl lg:text-5xl font-black uppercase text-gray-900 leading-tight">
              Tudo que sua campanha<br />
              <span className="text-gov-blue">precisa em um só lugar</span>
            </h2>
            <p className="mt-4 text-gray-500 font-medium max-w-xl mx-auto">
              Do cadastro de eleitores ao Dia da Eleição, a plataforma acompanha cada etapa da sua campanha com dados precisos e estratégia inteligente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bg-white p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group rounded-2xl">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${f.color}`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-black uppercase text-sm tracking-wide text-gray-900 mb-3">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-medium">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Exportação e Cancelamento — Destaques ── */}
      <section className="py-20 bg-gov-blue px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} className="bg-white/10 border border-white/20 p-8 text-white text-center rounded-2xl">
            <FileSpreadsheet className="w-10 h-10 text-gov-yellow mx-auto mb-4" />
            <h3 className="font-black uppercase text-sm tracking-widest mb-3">Exportar para Excel</h3>
            <p className="text-blue-200 text-sm leading-relaxed font-medium">
              Baixe toda a sua base de eleitores e apoiadores em planilha <strong className="text-white">.xlsx</strong> com um clique. Os dados são seus — sempre.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/10 border border-white/20 p-8 text-white text-center rounded-2xl">
            <FileText className="w-10 h-10 text-gov-yellow mx-auto mb-4" />
            <h3 className="font-black uppercase text-sm tracking-widest mb-3">Relatórios em PDF</h3>
            <p className="text-blue-200 text-sm leading-relaxed font-medium">
              Gráficos, relatórios por bairro, faixa etária e gênero exportáveis em <strong className="text-white">PDF</strong> profissional para apresentar à equipe.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-green-500/20 border-2 border-green-400 p-8 text-white text-center relative overflow-hidden rounded-2xl">
            <div className="absolute top-3 right-3 bg-green-400 text-gray-900 text-[8px] font-black uppercase px-2 py-1 tracking-wider">Garantia</div>
            <XCircle className="w-10 h-10 text-green-400 mx-auto mb-4" />
            <h3 className="font-black uppercase text-sm tracking-widest mb-3">Cancele Quando Quiser</h3>
            <p className="text-blue-200 text-sm leading-relaxed font-medium">
              <strong className="text-white">Sem multa. Sem fidelidade. Sem burocracia.</strong> Cancele sua assinatura a qualquer momento com total liberdade.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section className="py-24 bg-white px-6 rounded-2xl">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-[10px] font-black uppercase tracking-[0.3em] text-gov-blue bg-blue-50 px-4 py-2 mb-4">Como Funciona</span>
            <h2 className="text-3xl lg:text-5xl font-black uppercase text-gray-900">
              Em 3 passos você está<br />
              <span className="text-gov-blue">na campanha</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: Lock, title: 'Escolha seu Plano', desc: 'Selecione o plano ideal e realize o pagamento via PIX, boleto ou cartão de forma segura e instantânea.' },
              { step: '02', icon: Zap, title: 'Ativação Automática', desc: 'Após a confirmação, seu painel é criado automaticamente. Você recebe um link exclusivo por e-mail e WhatsApp.' },
              { step: '03', icon: Target, title: 'Vença a Eleição', desc: 'Cadastre sua equipe, importe seus eleitores e use a IA para traçar estratégias e bater sua meta de votos.' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="relative text-center">
                <div className="w-16 h-16 rounded-full bg-gov-blue flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200">
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 text-[60px] font-black text-gray-50 select-none leading-none z-0">{item.step}</div>
                <h3 className="font-black uppercase text-sm tracking-wide text-gray-900 mb-3 relative z-10">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-medium">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Seção de Preços (Precificação) ── */}
      <section id="pricing" className="py-24 bg-gray-50 px-6 border-y border-gray-100 rounded-2xl">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-[10px] font-black uppercase tracking-[0.3em] text-gov-blue bg-blue-50 px-4 py-2 mb-4">
              Planos &amp; Preços
            </span>
            <h2 className="text-3xl lg:text-5xl font-black uppercase text-gray-900 leading-tight">
              Escolha o plano ideal<br />
              <span className="text-gov-blue">para a sua vitória</span>
            </h2>
            <p className="mt-4 text-gray-500 font-medium max-w-xl mx-auto">
              Ativação instantânea após o pagamento. Sem fidelidade, sem taxa de cancelamento e com garantia de 7 dias.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            
            {/* Plano Full */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col justify-between hover-lift relative"
            >
              <div>
                <span className="text-[10px] font-black text-gov-blue bg-blue-50 px-3 py-1 uppercase tracking-wider rounded-full">
                  Mais Recomendado
                </span>
                <h3 className="text-xl font-black uppercase text-gray-900 mt-4 mb-2">Plano Full</h3>
                <p className="text-xs text-gray-500 font-medium mb-6">Completo com todas as inteligências de campanha e IA inclusa.</p>
                
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-lg font-bold text-gray-500">R$</span>
                  <span className="text-5xl font-black text-gray-950 tracking-tight text-[#003366]">599</span>
                  <span className="text-sm font-semibold text-gray-500">/mês</span>
                </div>

                <ul className="space-y-4 mb-8">
                  {[
                    "Gestão Inteligente de Eleitores",
                    "Inteligência Artificial Integrada",
                    "Boca de Urna Real-Time (Dia D)",
                    "Exportação de Dados em Excel (.xlsx)",
                    "Relatórios em PDF",
                    "Suporte Técnico VIP 24/7",
                    "Acesso PWA Multiplataforma"
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs font-bold text-gray-700 uppercase tracking-tight">
                      <CheckCircle2 className="w-4 h-4 text-gov-blue shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <button
                onClick={() => onStart('full')}
                className="w-full py-4 border-2 border-gov-blue text-gov-blue hover:bg-gov-blue hover:text-white transition-all font-black uppercase text-xs tracking-widest active-scale cursor-pointer rounded-full"
              >
                Assinar Plano Full
              </button>
            </motion.div>

            {/* Plano Premium */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-gov-blue rounded-2xl border-2 border-[#D4AF37] shadow-xl p-8 flex flex-col justify-between hover-lift relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 bg-[#D4AF37] text-[#0d1b3e] text-[8px] font-black uppercase px-3 py-1 tracking-wider rounded-full">
                Melhor Opção
              </div>
              
              <div>
                <span className="text-[10px] font-black text-[#D4AF37] bg-white/10 px-3 py-1 uppercase tracking-wider rounded-full">
                  Elite &amp; Suporte
                </span>
                <h3 className="text-xl font-black uppercase text-white mt-4 mb-2">Plano Premium</h3>
                <p className="text-xs text-blue-200 font-medium mb-6">Acompanhamento estratégico dedicado por um gestor especialista.</p>
                
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-lg font-bold text-blue-300">R$</span>
                  <span className="text-5xl font-black text-white tracking-tight">499</span>
                  <span className="text-sm font-semibold text-blue-300">/mês</span>
                </div>

                <ul className="space-y-4 mb-8">
                  {[
                    "Tudo do Plano Full Incluso",
                    "Gestor de Suporte Dedicado Real-Time",
                    "Relatórios Semanais (E-mail/WhatsApp)",
                    "Planos de Ação Estratégicos I.A.",
                    "Reuniões de Alinhamento Mensais",
                    "Prioridade Máxima no Atendimento 24/7"
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs font-bold text-blue-100 uppercase tracking-tight">
                      <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <button
                onClick={() => onStart('premium')}
                className="w-full py-4 font-black uppercase text-xs tracking-widest active-scale text-[#0d1b3e] cursor-pointer rounded-full"
                style={{background: 'linear-gradient(135deg, #D4AF37, #F0D060)'}}
              >
                Assinar Plano Premium
              </button>
            </motion.div>

            {/* Plano Starter */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col justify-between hover-lift relative"
            >
              <div>
                <span className="text-[10px] font-black text-gov-blue bg-blue-50 px-3 py-1 uppercase tracking-wider rounded-full">
                  Básico Inicial
                </span>
                <h3 className="text-xl font-black uppercase text-gray-900 mt-4 mb-2">Plano Starter</h3>
                <p className="text-xs text-gray-500 font-medium mb-6">Estrutura inicial essencial para candidaturas iniciantes.</p>
                
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-lg font-bold text-gray-500">R$</span>
                  <span className="text-5xl font-black text-gray-950 tracking-tight text-[#003366]">299</span>
                  <span className="text-sm font-semibold text-gray-500">/mês</span>
                </div>

                <ul className="space-y-4 mb-8">
                  {[
                    "Gestão Básica de Apoiadores",
                    "Limite de até 5 Coordenadores",
                    "Exportação Básica em Excel",
                    "Mapas e Relatórios Simplificados",
                    "Suporte Comercial por E-mail"
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs font-bold text-gray-700 uppercase tracking-tight">
                      <CheckCircle2 className="w-4 h-4 text-gov-blue shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <button
                onClick={() => onStart('starter')}
                className="w-full py-4 border-2 border-gov-blue text-gov-blue hover:bg-gov-blue hover:text-white transition-all font-black uppercase text-xs tracking-widest active-scale cursor-pointer rounded-full"
              >
                Assinar Plano Starter
              </button>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── Casos de Sucesso / Depoimentos ── */}
      <Testimonials />

      {/* ── FAQ ── */}
      <section className="py-24 bg-gray-50 px-6 rounded-2xl">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-[10px] font-black uppercase tracking-[0.3em] text-gov-blue bg-blue-50 px-4 py-2 mb-4">FAQ</span>
            <h2 className="text-3xl lg:text-5xl font-black uppercase text-gray-900">
              Perguntas<br />
              <span className="text-gov-blue">Frequentes</span>
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white border border-gray-200 overflow-hidden rounded-2xl">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors rounded-2xl"
                >
                  <span className="font-black text-sm text-gray-900 pr-4">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-gov-blue shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-2 border-t border-gray-100 rounded-2xl">
                        <p className="text-gray-600 text-sm leading-relaxed font-medium">{faq.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-blue-950 to-gov-blue px-6">
        <motion.div whileInView={{ opacity: [0, 1], y: [24, 0] }} className="max-w-3xl mx-auto text-center">
          <span className="inline-block text-[10px] font-black uppercase tracking-[0.3em] text-gov-yellow bg-gov-yellow/10 border border-gov-yellow/30 px-4 py-2 mb-8 rounded-2xl">Sua Vitória Começa Aqui</span>
          <h2 className="text-4xl lg:text-6xl font-black uppercase text-white leading-[1.05] tracking-tighter mb-6">
            Sua campanha profissional<br />
            <span className="text-gov-yellow">começa agora.</span>
          </h2>
          <p className="text-blue-300 font-medium mb-10 max-w-xl mx-auto">
            Assuma o controle dos seus dados, mobilize seu time e garanta cada voto com a tecnologia líder de mercado.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={scrollToPricing}
              className="px-12 py-5 bg-gov-yellow text-gray-900 font-black uppercase text-sm tracking-widest hover:bg-yellow-400 transition-all shadow-2xl group flex items-center justify-center gap-3 cursor-pointer rounded-full"
            >
              Assinar Agora <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => window.open('https://wa.me/5591993837093', '_blank')}
              className="px-12 py-5 border-2 border-white/30 text-white font-black uppercase text-sm tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3 rounded-full"
            >
              <Phone className="w-4 h-4" /> Falar com Consultor
            </button>
          </div>
          <p className="mt-6 text-blue-400 text-xs font-bold uppercase tracking-wider">
            ✓ Sem multa de cancelamento &nbsp;·&nbsp; ✓ Exportação em PDF e Excel &nbsp;·&nbsp; ✓ Ativação instantânea
          </p>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 bg-gray-950 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <Logo className="w-32 h-12" variant="white" forceDefault={true} />
          <div className="flex gap-8 text-[10px] font-black uppercase text-gray-500 tracking-widest">
            <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Segurança</a>
            <a href="#" className="hover:text-white transition-colors">Suporte</a>
          </div>
          <p className="text-[10px] font-bold uppercase text-gray-600 tracking-wider">
            © 2026 Plataforma Eleitoral de Elite. Todos os direitos reservados.
          </p>
        </div>
      </footer>

    </div>
  );
}
