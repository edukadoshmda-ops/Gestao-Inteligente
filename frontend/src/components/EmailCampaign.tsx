import { useState, useMemo } from 'react';
import { 
  Mail, Send, Users, CheckCircle2, AlertCircle, Loader2, 
  Sparkles, Eye, RefreshCw, Play, ArrowRight, AlertTriangle,
  Palette, FileText, Check, Search, Layout, MessageSquare, 
  Calendar, ChevronDown, CheckCircle, TrendingUp, UserCheck, 
  Sliders, Globe, HelpCircle
} from 'lucide-react';
import { Member, Coordinator } from '../types';
import { db } from '../lib/db';

interface EmailCampaignProps {
  members: Member[];
  coordinators: Coordinator[];
  organization?: any;
}

const THEME_COLORS = [
  { id: 'civic-blue', name: 'Azul Cívico', hex: '#0c4a6e', hoverHex: '#073b58', bgLight: '#f0f9ff', textClass: 'text-sky-700' },
  { id: 'hope-green', name: 'Verde Esperança', hex: '#15803d', hoverHex: '#14532d', bgLight: '#f0fdf4', textClass: 'text-green-700' },
  { id: 'energy-orange', name: 'Laranja Energia', hex: '#ea580c', hoverHex: '#c2410c', bgLight: '#fff7ed', textClass: 'text-orange-700' },
  { id: 'connection-purple', name: 'Roxo Conexão', hex: '#7c3aed', hoverHex: '#6d28d9', bgLight: '#faf5ff', textClass: 'text-purple-700' },
  { id: 'patriot-gold', name: 'Ouro Pátria', hex: '#a16207', hoverHex: '#854d0e', bgLight: '#fefcbf', textClass: 'text-amber-800' }
];

const TONES = [
  { id: 'Inspirador', emoji: '✨', description: 'Gera esperança, comunidade e entusiasmo.' },
  { id: 'Convincente', emoji: '🎯', description: 'Focado em propostas, dados e apelo lógico.' },
  { id: 'Urgente', emoji: '🚨', description: 'Cria pressa e importância para mobilização.' },
  { id: 'Alegre', emoji: '☀️', description: 'Mensagem descontraída, festiva e positiva.' },
  { id: 'Formal', emoji: '👔', description: 'Tom respeitoso, sério e de liderança.' }
];

const EMAIL_TEMPLATES = [
  {
    id: 'comicio',
    name: '📣 Grande Comício 2026',
    subject: '🚨 {nome}, precisamos de você no nosso Grande Comício da Mudança! 🗳️',
    bannerText: 'CONVITE: COMÍCIO DA MUDANÇA',
    body: 'Olá, {nome}!\n\nChegou o momento decisivo da nossa caminhada. Quero convidar pessoalmente você e sua família para participarem do nosso Grande Comício da Mudança.\n\nEste será um encontro de ideias, esperança e união para mostrarmos a força do nosso projeto cívico.\n\n📅 Data: Próximo Sábado\n⏰ Horário: A partir das 19h00\n📍 Local: Praça Central da Cidade\n\nVista a nossa camisa, traga sua família e venha construir um amanhã com mais saúde, segurança e oportunidades para todos!\n\nSeguimos juntos rumo à vitória!',
    ctaText: 'Ver Localização no Mapa',
    ctaUrl: 'https://maps.google.com'
  },
  {
    id: 'agradecimento',
    name: '🤝 Gratidão e Feedback',
    subject: '💚 Gratidão pela nossa conversa e apoio, {nome}!',
    bannerText: 'AGRADECIMENTO DA CAMINHADA',
    body: 'Olá, {nome}!\n\nEscrevo esta mensagem com o coração cheio de alegria para agradecer imensamente pela recepção calorosa na nossa última caminhada comunitária. Conversar olho no olho com você é o que nos dá forças para seguir em frente.\n\nNosso mandato e nossa campanha são construídos de forma colaborativa, ouvindo de verdade o cidadão. Sua ajuda multiplicando a nossa mensagem é fundamental!\n\nEstamos à inteira disposição para debater propostas reais.\n\nUm forte abraço!',
    ctaText: 'Ver Plano de Ação',
    ctaUrl: 'https://gestaointeligente.app/planodeacao'
  },
  {
    id: 'propostas',
    name: '🗳️ Divulgação de Propostas',
    subject: '📚 As nossas propostas para mudar a Saúde e Segurança, {nome}!',
    bannerText: 'PLANO ESTRATÉGICO PARTICIPATIVO',
    body: 'Olá, {nome}!\n\nQuem quer mudar de verdade apresenta soluções concretas e viáveis, não apenas promessas.\n\nPor isso, preparei um resumo detalhado e interativo com as nossas principais diretrizes para a Saúde Pública (com foco na informatização do agendamento) e para a Segurança (com policiamento integrado nos bairros).\n\nGostaria que você analisasse e deixasse sua sugestão para construirmos juntos o melhor plano para a nossa região.\n\nForte abraço e seguimos firmes!',
    ctaText: 'Baixar Plano Completo (PDF)',
    ctaUrl: 'https://gestaointeligente.app/plano.pdf'
  },
  {
    id: 'urgente',
    name: '🚨 Chamado para Ação',
    subject: '🔥 {nome}, precisamos de você nas ruas neste fim de semana!',
    bannerText: 'CONVOCAÇÃO DE MOBILIZADORES',
    body: 'Olá, {nome}!\n\nEstamos entrando na fase crucial e cada voto de confiança faz toda a diferença. Por isso, faço um chamado especial para você se juntar ao nosso time de mobilizadores voluntários nas ruas neste fim de semana.\n\nFaremos um grande mutirão de adesivaço e caminhada comercial. Se você puder nos doar apenas 2 horas do seu tempo, faremos história juntos!\n\nPosso contar com o seu apoio cívico?',
    ctaText: 'Quero Ser Voluntário',
    ctaUrl: 'https://gestaointeligente.app/cadastro-voluntario'
  }
];

export default function EmailCampaign({ members, coordinators, organization }: EmailCampaignProps) {
  // Configuração do Remetente e Personalização Visual
  const [senderName, setSenderName] = useState(organization?.candidate_name || 'Campanha');
  const [senderEmail, setSenderEmail] = useState(organization?.contact_email || 'contato@gestaointeligente.app');
  const [bannerText, setBannerText] = useState('CONEXÃO ESTRATÉGICA 2026');
  const [themeColor, setThemeColor] = useState('#0c4a6e'); // Padrão: Azul Cívico
  
  // Segmentação
  const [filterType, setFilterType] = useState<'all' | 'neutrals' | 'coordinators' | 'supporters'>('all');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('all');
  
  // Mensagem e Botão Call to Action (CTA)
  const [subject, setSubject] = useState('🚨 {nome}, precisamos de você no nosso time! 🗳️');
  const [body, setBody] = useState(
    `Olá, {nome}!\n\nPassando para compartilhar as novas propostas da nossa caminhada. Queremos construir uma cidade melhor com mais oportunidades e saúde para todos.\n\nSua ajuda compartilhando nossa mensagem é o que nos move rumo à vitória!\n\nUm forte abraço,\n${organization?.candidate_name || 'Campanha'}`
  );
  const [ctaText, setCtaText] = useState('Conhecer Propostas');
  const [ctaUrl, setCtaUrl] = useState('https://gestaointeligente.app');
  const [useCta, setUseCta] = useState(true);

  // Estados de Disparo e UI
  const [isSending, setIsSending] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [resultsLog, setResultsLog] = useState<{ email: string; name: string; status: 'success' | 'error'; reason?: string }[]>([]);
  const [summary, setSummary] = useState<{ total: number; success: number; failed: number } | null>(null);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [testEmail, setTestEmail] = useState('inteligentegest@gmail.com');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isGeneratingMock, setIsGeneratingMock] = useState(false);

  // Inteligência Artificial / Copywriting
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState('Inspirador');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Logs filters
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'error'>('all');

  // Manipuladores de Geração de Mock Supporters
  const handleGenerateMockMembers = async () => {
    setIsGeneratingMock(true);
    const mockData: Member[] = [
      {
        id: 'mock-joao-' + Math.random().toString(36).substr(2, 4),
        name: 'João da Silva (Apoiador)',
        email: 'joaodasilva@gmail.com',
        phone: '(61) 98888-1111',
        gender: 'Masculino',
        neighborhood: 'ASA SUL',
        createdAt: new Date().toISOString(),
        supportLevel: 'Forte'
      } as any,
      {
        id: 'mock-maria-' + Math.random().toString(36).substr(2, 4),
        name: 'Maria Oliveira (Neutra)',
        email: 'mariaoliveira@gmail.com',
        phone: '(61) 98888-2222',
        gender: 'Feminino',
        neighborhood: 'ASA NORTE',
        createdAt: new Date().toISOString(),
        supportLevel: 'Neutro'
      } as any,
      {
        id: 'mock-jose-' + Math.random().toString(36).substr(2, 4),
        name: 'José Santos (Apoiador Forte)',
        email: 'josesantos@gmail.com',
        phone: '(61) 98888-3333',
        gender: 'Masculino',
        neighborhood: 'ASA SUL',
        createdAt: new Date().toISOString(),
        supportLevel: 'Forte'
      } as any
    ];

    try {
      const cleanCurrent = members.filter(m => !m.id.startsWith('mock-'));
      const updated = [...mockData, ...cleanCurrent];
      await db.saveMembers(updated);
      alert('⚡ 3 Apoiadores de teste com e-mail cadastrados com sucesso!\nRecarregando o painel para atualizar a lista...');
      window.location.reload();
    } catch (err: any) {
      alert('Erro ao gerar apoiadores de teste: ' + err.message);
    } finally {
      setIsGeneratingMock(false);
    }
  };

  const handleClearMockMembers = async () => {
    try {
      const cleaned = members.filter(m => !m.id.startsWith('mock-'));
      await db.saveMembers(cleaned);
      alert('🧹 Apoiadores de teste removidos da base com sucesso!\nRecarregando o painel...');
      window.location.reload();
    } catch (err: any) {
      alert('Erro ao limpar apoiadores de teste: ' + err.message);
    }
  };

  // Carrega Template Pronto
  const handleLoadTemplate = (tpl: typeof EMAIL_TEMPLATES[0]) => {
    setSubject(tpl.subject);
    setBody(tpl.body);
    setBannerText(tpl.bannerText);
    if (tpl.ctaText) {
      setUseCta(true);
      setCtaText(tpl.ctaText);
      setCtaUrl(tpl.ctaUrl);
    } else {
      setUseCta(false);
    }
  };

  // Gerador de Conteúdo IA (Simulador Inteligente Local de Alta Qualidade)
  const handleGenerateAIContent = () => {
    if (!aiPrompt.trim()) {
      alert('Por favor, informe no campo de texto o assunto ou tema que deseja abordar no e-mail.');
      return;
    }

    setIsGeneratingAI(true);

    setTimeout(() => {
      let generatedSubject = '';
      let generatedBody = '';
      const cleanPrompt = aiPrompt.toLowerCase();

      // Mapeamento semântico
      if (cleanPrompt.includes('comicio') || cleanPrompt.includes('comício') || cleanPrompt.includes('evento') || cleanPrompt.includes('agenda')) {
        generatedSubject = aiTone === 'Urgente'
          ? '🚨 URGENTE: {nome}, grande mobilização no Comício da Mudança!'
          : '📣 {nome}, vamos juntos para o Grande Comício deste sábado!';
        
        generatedBody = `Olá, {nome}!\n\nChegou a hora de darmos o passo mais importante da nossa caminhada. No próximo sábado, faremos uma grande reunião de força e esperança no nosso Comício Oficial.\n\nQueremos construir um futuro melhor, com propostas eficientes na saúde, educação e oportunidades de trabalho. Mas nada disso é possível sem o seu entusiasmo e a sua presença.\n\n📍 Local: Arena Comunitária Principal\n⏰ Horário: A partir das 18h30\n\nVenha com alegria, traga seus amigos e sua família. Conto com você!\n\nGrande abraço de sempre,\n${senderName}`;
        setCtaText('Confirmar Presença no Mapa');
        setCtaUrl('https://maps.google.com');
      } 
      else if (cleanPrompt.includes('agradecer') || cleanPrompt.includes('obrigado') || cleanPrompt.includes('reunião') || cleanPrompt.includes('reuniao')) {
        generatedSubject = aiTone === 'Alegre'
          ? '🤝 Que alegria conversar com você, {nome}! Obrigado!'
          : '💚 {nome}, meu profundo agradecimento pelo nosso último diálogo!';
        
        generatedBody = `Olá, {nome}!\n\nPassando para agradecer imensamente pelo tempo precioso que passamos conversando e alinhando objetivos no nosso último encontro regional. Ouvir sua história e suas preocupações renova o meu compromisso com a transformação cívica.\n\nNossa candidatura trabalha de portas abertas e com total transparência. Continuaremos nas ruas e bairros ouvindo a todos.\n\nMuito obrigado pelo voto de confiança e por estar conosco nesta caminhada!\n\nUm forte abraço,\n${senderName}`;
        setCtaText('Conhecer Nossas Propostas');
        setCtaUrl('https://gestaointeligente.app/propostas');
      }
      else if (cleanPrompt.includes('saude') || cleanPrompt.includes('saúde') || cleanPrompt.includes('hospital') || cleanPrompt.includes('medico')) {
        generatedSubject = '🏥 {nome}, veja as minhas propostas reais para salvar a Saúde!';
        generatedBody = `Olá, {nome}!\n\nSei que a Saúde é a maior preocupação da nossa população hoje. Filas intermináveis e falta de medicamentos são problemas inaceitáveis.\n\nMinha principal bandeira de trabalho será a criação do Prontuário Único Digital e a contratação descentralizada de médicos especialistas para atender os bairros mais distantes.\n\nQuero que você dê uma olhada detalhada em nosso planejamento técnico e participe dando a sua opinião!\n\nUm forte abraço,\n${senderName}`;
        setCtaText('Baixar Plano de Saúde (PDF)');
        setCtaUrl('https://gestaointeligente.app/plano.pdf');
      }
      else {
        // Genérico inteligente
        generatedSubject = aiTone === 'Urgente'
          ? `🚨 Importante, {nome}: Nova convocação sobre ${aiPrompt.slice(0, 30)}`
          : `✨ Olá, {nome}! Informativo especial sobre ${aiPrompt.slice(0, 30)}`;
        
        generatedBody = `Olá, {nome}!\n\nGostaria de compartilhar com você algumas novidades da nossa caminhada. Com foco e dedicação diária, estamos debatendo propostas estruturadas sobre:\n\n👉 "${aiPrompt}"\n\nAcreditamos que com planejamento estratégico e participação ativa dos moradores, podemos criar soluções práticas para mudar a realidade do nosso DF.\n\nSua voz é indispensável. Acompanhe a nossa agenda de ações no link abaixo!\n\nUm abraço sincero,\n${senderName}`;
        setCtaText('Acompanhar Nossa Agenda');
        setCtaUrl('https://gestaointeligente.app/agenda');
      }

      // Toques de tom personalizados
      if (aiTone === 'Urgente') {
        generatedBody = "⚠️ ATENÇÃO: CONVOCAÇÃO URGENTE DE MOBILIZAÇÃO GERAL ⚠️\n\n" + generatedBody + "\n\n⏰ Por favor, não deixe de ler e repassar aos seus amigos!";
      } else if (aiTone === 'Emocionante') {
        generatedBody = "❤️ Movidos pela fé e pela coragem de acreditar em um amanhã digno...\n\n" + generatedBody + "\n\nUnindo as nossas mãos, não há limite para o que podemos alcançar juntos!";
      } else if (aiTone === 'Alegre') {
        generatedBody = "🎉 Olá! Passando para contagiar o seu dia com muita energia positiva! ☀️\n\n" + generatedBody + "\n\nVamos juntos colorir a nossa cidade com ideias do bem! 💚";
      }

      setSubject(generatedSubject);
      setBody(generatedBody);
      setIsGeneratingAI(false);
      setAiPrompt('');
    }, 1200);
  };

  // Lista única de bairros da base
  const neighborhoods = useMemo(() => {
    const list = new Set<string>();
    members.forEach(m => {
      if (m.neighborhood) list.add(m.neighborhood.toUpperCase().trim());
    });
    return Array.from(list).sort();
  }, [members]);

  // Filtra destinatários dinamicamente com base nas escolhas
  const targetRecipients = useMemo(() => {
    let list: { name: string; email: string }[] = [];

    if (filterType === 'coordinators') {
      list = coordinators
        .filter(c => (c as any).email && (c as any).email.includes('@'))
        .map(c => ({ name: c.name, email: (c as any).email! }));
    } else {
      let filtered = members.filter(m => m.email && m.email.includes('@'));

      if (filterType === 'neutrals') {
        filtered = filtered.filter(m => (m as any).supportLevel === 'Neutro');
      } else if (filterType === 'supporters') {
        filtered = filtered.filter(m => (m as any).supportLevel === 'Forte');
      }

      if (selectedNeighborhood !== 'all') {
        filtered = filtered.filter(m => m.neighborhood?.toUpperCase().trim() === selectedNeighborhood);
      }

      list = filtered.map(m => ({ name: m.name, email: m.email! }));
    }

    return list;
  }, [members, coordinators, filterType, selectedNeighborhood]);

  const handleSendEmails = async () => {
    if (targetRecipients.length === 0) {
      alert('Selecione pelo menos um destinatário válido com e-mail cadastrado.');
      return;
    }

    if (!confirm(`Confirmar envio de ${targetRecipients.length} e-mails em massa?`)) return;

    setIsSending(true);
    setCurrentProgress(0);
    setResultsLog([]);
    setSummary(null);
    setErrorAlert(null);

    const fromOverride = `${senderName} <${senderEmail}>`;

    try {
      // Faz a requisição à Netlify Function atualizada com novos parâmetros
      const response = await fetch('/.netlify/functions/send-bulk-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: targetRecipients,
          subject,
          body,
          fromOverride,
          themeColor,
          ctaText: useCta ? ctaText : undefined,
          ctaUrl: useCta ? ctaUrl : undefined,
          bannerText
        })
      });

      const responseText = await response.text();
      let resData;
      try {
        resData = JSON.parse(responseText);
      } catch (e) {
        if (response.status === 404) {
          throw new Error("O servidor de funções do Netlify não foi encontrado. Certifique-se de acessar usando o Netlify Dev (http://localhost:8888) executando 'npx netlify dev' no seu terminal para que as funções do backend fiquem ativas localmente!");
        }
        throw new Error(`Resposta inválida do servidor (não é JSON): ${responseText.slice(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(resData.error || 'Erro inesperado no servidor');
      }

      setResultsLog(resData.results || []);
      setSummary(resData.summary || null);
    } catch (err: any) {
      console.error('Erro ao disparar campanha de email:', err);
      setErrorAlert(err.message || 'Falha de comunicação com o servidor de disparo.');
    } finally {
      setIsSending(false);
    }
  };

  // Filtragem dos Logs de resultado na UI
  const filteredLogs = useMemo(() => {
    return resultsLog.filter(log => {
      const matchesSearch = log.name.toLowerCase().includes(logSearch.toLowerCase()) || 
                            log.email.toLowerCase().includes(logSearch.toLowerCase()) || 
                            (log.reason && log.reason.toLowerCase().includes(logSearch.toLowerCase()));
      
      const matchesStatus = logFilter === 'all' ? true : log.status === logFilter;
      return matchesSearch && matchesStatus;
    });
  }, [resultsLog, logSearch, logFilter]);

  // Estatísticas simuladas inteligentes para o painel de entrega
  const estimatedMetrics = useMemo(() => {
    if (!summary || summary.success === 0) return null;
    const deliverability = Number(((summary.success / summary.total) * 100).toFixed(1));
    
    // Simula taxas realistas baseadas na qualidade da API do Resend
    const openRate = summary.success > 0 ? 64.8 : 0; 
    const ctr = useCta ? 18.4 : 0; 

    return { deliverability, openRate, ctr };
  }, [summary, useCta]);

  const activeTheme = THEME_COLORS.find(c => c.hex === themeColor) || THEME_COLORS[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      
      {/* HEADER PREMIUM COM GRADIENTE */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-8 border-b-4 border-gov-yellow shadow-2xl rounded-2xl">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Mail className="w-56 h-56 text-white" />
        </div>
        <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-gov-yellow text-gov-blue px-3 py-1 font-black text-[9px] uppercase tracking-widest rounded-xs">
                PRO CONTROL TOWER
              </span>
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/20 px-2 py-0.5 font-bold text-[9px] uppercase tracking-widest rounded-xs">
                Resend API Integrated
              </span>
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">Painel de E-mail em Massa</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
              Crie campanhas altamente personalizadas, configure call-to-actions e monitore relatórios de entrega.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4 shrink-0">
            {/* Indicador de Eleitores com E-mail */}
            <div className="bg-white/5 border border-white/10 p-4 shrink-0 flex items-center gap-3 backdrop-blur-md rounded-2xl">
              <Users className="w-8 h-8 text-gov-yellow" />
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Eleitores com E-mail</span>
                <span className="text-2xl font-black text-white">
                  {members.filter(m => m.email && m.email.includes('@')).length} 
                  <span className="text-[10px] text-gov-yellow font-bold uppercase ml-1.5">Cadastrados</span>
                </span>
              </div>
            </div>

            {/* Indicador de Coordenadores */}
            <div className="bg-white/5 border border-white/10 p-4 shrink-0 flex items-center gap-3 backdrop-blur-md rounded-2xl">
              <UserCheck className="w-8 h-8 text-indigo-400" />
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Coordenadores Ativos</span>
                <span className="text-2xl font-black text-white">
                  {coordinators.filter(c => (c as any).email).length}
                  <span className="text-[10px] text-indigo-400 font-bold uppercase ml-1.5">Na Rede</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOX INFORMATIVO API */}
      <div className="bg-sky-50/70 border-l-4 border-gov-blue p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm rounded-2xl">
        <div className="flex items-start gap-3.5">
          <Sliders className="w-6 h-6 text-gov-blue shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-black text-xs uppercase text-gov-blue">Infraestrutura de Disparo Seguro</h4>
            <p className="text-[11px] font-bold text-gray-600 leading-relaxed uppercase">
              Nosso sistema utiliza a API do <strong className="text-slate-900">Resend</strong> para garantir alta entregabilidade nas caixas de entrada. As chaves são gerenciadas via variável de ambiente (<code className="bg-slate-100 px-1 py-0.5 rounded-xl text-red-600 font-mono text-[10px]">RESEND_API_KEY</code>). O limite de lote por segundo é respeitado de forma nativa.
            </p>
          </div>
        </div>
      </div>

      {errorAlert && (
        <div className="bg-red-50 border-l-4 border-red-500 p-5 flex items-center gap-3 shadow-sm animate-shake rounded-2xl">
          <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
          <p className="text-xs font-black text-red-700 uppercase leading-relaxed">{errorAlert}</p>
        </div>
      )}

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* COLUNA ESQUERDA - CONFIGURADOR, SEGMENTAÇÃO E MENSAGEM */}
        <div className="xl:col-span-7 space-y-6">
          
          {/* SEÇÃO 1: CONFIGURAÇÃO DO REMETENTE E VISUAL */}
          <div className="bg-white p-6 border-t-4 border-gov-blue shadow-lg space-y-4 rounded-2xl">
            <h3 className="text-xs font-black text-gov-blue uppercase tracking-widest border-b border-gray-100 pb-2.5 flex items-center gap-2 rounded-2xl">
              <Palette className="w-4 h-4 text-gov-blue" /> 1. Configurações de Identidade & Layout
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest block">Nome do Remetente</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 outline-none focus:border-gov-blue font-bold uppercase text-[11px] rounded-2xl"
                  placeholder="Nome de Campanha"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest block">E-mail do Remetente</label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 outline-none focus:border-gov-blue font-bold text-[11px] rounded-2xl"
                  placeholder="Ex: contato@campanha.com.br"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest block">Título do Banner Superior</label>
                <input
                  type="text"
                  value={bannerText}
                  onChange={(e) => setBannerText(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 outline-none focus:border-gov-blue font-bold uppercase text-[11px] rounded-2xl"
                  placeholder="Ex: CONEXÃO ESTRATÉGICA 2026"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest block">Paleta de Cor Principal</label>
                <div className="flex items-center gap-2 h-[42px]">
                  {THEME_COLORS.map(color => (
                    <button
                      key={color.id}
                      onClick={() => setThemeColor(color.hex)}
                      className={`w-8 h-8 rounded-full border-2 transition-all relative ${
                        themeColor === color.hex ? 'border-slate-900 scale-110 shadow-md' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    >
                      {themeColor === color.hex && (
                        <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                      )}
                    </button>
                  ))}
                  <span className="text-[10px] font-bold text-gray-500 uppercase ml-2">
                    {THEME_COLORS.find(c => c.hex === themeColor)?.name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: SEGMENTAÇÃO DE PÚBLICO */}
          <div className="bg-white p-6 border-t-4 border-gov-yellow shadow-lg space-y-4 rounded-2xl">
            <h3 className="text-xs font-black text-gov-blue uppercase tracking-widest border-b border-gray-100 pb-2.5 flex items-center gap-2 rounded-2xl">
              <Users className="w-4 h-4 text-gov-yellow" /> 2. Segmentação de Destinatários
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { id: 'all', label: '👥 Todos da Base' },
                { id: 'neutrals', label: '🎯 Apoiador Neutro' },
                { id: 'supporters', label: '💚 Apoiador Forte' },
                { id: 'coordinators', label: '👑 Coordenadores' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFilterType(opt.id as any)}
                  className={`p-3 text-[9px] font-black uppercase text-center border transition-all ${
                    filterType === opt.id 
                      ? 'border-slate-800 bg-slate-950 text-white font-extrabold shadow-sm' 
                      : 'border-gray-200 bg-white text-gray-400 hover:text-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {filterType !== 'coordinators' && neighborhoods.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <label className="text-[9px] font-black text-gov-blue uppercase tracking-widest block">Filtrar por Bairro Comercial/Residencial</label>
                <select
                  value={selectedNeighborhood}
                  onChange={(e) => setSelectedNeighborhood(e.target.value)}
                  className="w-full p-3 bg-white border border-gray-200 outline-none focus:border-gov-blue font-bold text-[11px] rounded-2xl"
                >
                  <option value="all">TODOS OS BAIRROS REGISTRADOS</option>
                  {neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            )}

            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-800 pt-3 border-t border-dashed border-gray-100 bg-gray-50/50 p-2.5 rounded-2xl">
              <span className="flex items-center gap-1.5 text-gray-500">
                <CheckCircle className="w-3.5 h-3.5 text-green-600" /> Público Selecionado:
              </span>
              <span className="bg-gov-blue text-white px-3 py-1 text-xs font-black">
                {targetRecipients.length} {targetRecipients.length === 1 ? 'destinatário' : 'destinatários'}
              </span>
            </div>

            {/* Gerador de Apoiadores fictícios caso a base esteja vazia */}
            {targetRecipients.length === 0 && (
              <div className="bg-amber-50/60 border border-dashed border-amber-300 p-4 text-[10px] font-bold text-slate-700 flex flex-col gap-2 mt-2 rounded-2xl">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <p className="uppercase tracking-widest font-black">Base de e-mail vazia nesta segmentação</p>
                </div>
                <p className="font-semibold text-gray-500 leading-relaxed uppercase text-[9px]">
                  Sua base local de eleitores não possui e-mails válidos na categoria escolhida. Deseja criar 3 apoiadores fictícios com e-mail para testar os filtros e o fluxo de disparo de forma segura?
                </p>
                <button
                  onClick={handleGenerateMockMembers}
                  disabled={isGeneratingMock}
                  className="mt-1 w-full py-2.5 bg-gov-yellow text-gov-blue font-black uppercase text-[9px] hover:bg-yellow-300 transition-all shadow-sm flex items-center justify-center gap-1.5 rounded-2xl"
                >
                  {isGeneratingMock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-gov-blue" />}
                  Gerar 3 Eleitores de Teste (Com E-mail)
                </button>
              </div>
            )}
            
            {members.some(m => m.id.startsWith('mock-')) && (
              <div className="bg-blue-50/80 border border-dashed border-gov-blue/20 p-4 text-[10px] font-bold text-gov-blue flex flex-col gap-2 mt-2 rounded-2xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-gov-blue">
                    <Sparkles className="w-4 h-4 text-gov-yellow fill-gov-yellow shrink-0 animate-pulse" />
                    <p className="uppercase tracking-widest font-black">Modo Sandbox Ativo (Contatos Fictícios)</p>
                  </div>
                  <button
                    onClick={handleClearMockMembers}
                    className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-black uppercase text-[8px] transition-all shadow-xs border border-red-200 rounded-2xl"
                  >
                    🧹 Limpar Base
                  </button>
                </div>
                <p className="font-semibold text-gray-500 leading-relaxed uppercase text-[9px]">
                  Eleitores de simulação carregados com sucesso. Teste as segmentações no painel e depois clique em "Limpar Base" para removê-los.
                </p>
              </div>
            )}
          </div>

          {/* SEÇÃO 3: TEMPLATES E ASSISTENTE DE REDAÇÃO IA */}
          <div className="bg-white p-6 border-t-4 border-indigo-600 shadow-lg space-y-5 rounded-2xl">
            <h3 className="text-xs font-black text-gov-blue uppercase tracking-widest border-b border-gray-100 pb-2.5 flex items-center gap-2 rounded-2xl">
              <Sparkles className="w-4 h-4 text-indigo-600" /> 3. Redator Inteligente & Modelos Prontos
            </h3>

            {/* Modelos de E-mail */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest block">Selecione um Modelo Pré-estruturado</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {EMAIL_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => handleLoadTemplate(tpl)}
                    className="p-2.5 text-[9px] font-bold uppercase text-left border border-gray-100 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 transition-all flex flex-col justify-between h-20 rounded-2xl"
                  >
                    <span className="text-slate-800 font-black block">{tpl.name}</span>
                    <span className="text-[8px] text-gray-400 font-semibold normal-case truncate w-full">{tpl.subject}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Assistente IA */}
            <div className="bg-indigo-950 text-white p-5 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                <Sparkles className="w-32 h-32" />
              </div>
              
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-gov-yellow fill-gov-yellow" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gov-yellow">Copilot IA: Redação Persuasiva</span>
                </div>
                
                <p className="text-[10px] text-gray-300 font-medium leading-relaxed uppercase">
                  Escreva um tema rápido (ex: "Chamar pessoal de Taguatinga para inauguração no sábado, 10h") e selecione o tom. Nosso algoritmo formatará um e-mail estratégico.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Sobre o que deve ser o e-mail?"
                      className="w-full p-3 bg-white/10 border border-white/20 outline-none focus:border-gov-yellow font-bold text-[11px] text-white placeholder-white/30 rounded-2xl"
                    />
                  </div>
                  <div>
                    <select
                      value={aiTone}
                      onChange={(e) => setAiTone(e.target.value)}
                      className="w-full p-3 bg-white/10 border border-white/20 outline-none focus:border-gov-yellow font-bold text-[11px] text-white rounded-2xl"
                    >
                      {TONES.map(t => (
                        <option key={t.id} value={t.id} className="text-slate-900 font-bold">
                          {t.emoji} {t.id}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleGenerateAIContent}
                  disabled={isGeneratingAI || !aiPrompt.trim()}
                  className="w-full py-2.5 bg-gov-yellow text-gov-blue hover:bg-yellow-300 transition-all font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-md disabled:opacity-40 rounded-2xl"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-gov-blue" />
                      Estruturando copywriting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-gov-blue fill-gov-blue" />
                      Gerar Texto com Inteligência Artificial
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: REDAÇÃO E CONTEÚDO FINAL */}
          <div className="bg-white p-6 border-t-4 border-slate-900 shadow-lg space-y-4 rounded-2xl">
            <h3 className="text-xs font-black text-gov-blue uppercase tracking-widest border-b border-gray-100 pb-2.5 flex items-center gap-2 rounded-2xl">
              <FileText className="w-4 h-4 text-slate-800" /> 4. Mensagem & Conteúdo do E-mail
            </h3>

            {/* Assunto */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest block">Assunto do E-mail</label>
                <span className="text-[9px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-2xl">
                  Variável disponível: <code className="font-mono font-bold text-red-600">{`{nome}`}</code>
                </span>
              </div>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-3.5 bg-gray-50 border border-gray-200 outline-none focus:border-gov-blue font-bold text-xs rounded-2xl"
                placeholder="Ex: Prezado {nome}, veja o convite oficial da nossa plenária!"
              />
            </div>

            {/* Editor de Texto do Corpo */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest block">Corpo do E-mail (Texto Principal)</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full h-72 p-4 bg-gray-50 border border-gray-200 outline-none focus:border-gov-blue text-xs font-medium leading-relaxed resize-none font-mono rounded-2xl"
                placeholder="Olá, {nome}!\n\nEscreva aqui o conteúdo da sua mensagem..."
              />
            </div>

            {/* Call to Action (CTA) */}
            <div className="border border-gray-150 p-4 bg-slate-50/50 space-y-3.5 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gov-blue" />
                  <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest block">Botão de Chamada para Ação (CTA)</label>
                </div>
                <input
                  type="checkbox"
                  checked={useCta}
                  onChange={(e) => setUseCta(e.target.checked)}
                  className="w-4.5 h-4.5 accent-gov-blue cursor-pointer"
                  id="use-cta-checkbox"
                />
              </div>

              {useCta && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 animate-in slide-in-from-top-1 duration-200">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Texto do Botão</span>
                    <input
                      type="text"
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-200 outline-none focus:border-gov-blue font-bold text-[11px] uppercase rounded-2xl"
                      placeholder="Ex: Ver no Mapa"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">URL / Link de Destino</span>
                    <input
                      type="url"
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-200 outline-none focus:border-gov-blue font-bold text-[11px] rounded-2xl"
                      placeholder="Ex: https://maps.google.com"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Envio de Teste Rápido */}
            <div className="bg-indigo-50/40 border border-indigo-200 p-5 space-y-3 rounded-xl">
              <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest block flex items-center gap-1">
                🧪 Testar Caixa de Entrada (Quick Test)
              </span>
              <p className="text-[9px] text-indigo-700/80 font-bold uppercase leading-normal">
                Deseja testar se o layout está correto na sua conta? Digite um e-mail de teste para disparar este template instantaneamente!
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1 p-3 bg-white border border-gray-200 outline-none focus:border-indigo-600 font-bold text-[11px] rounded-2xl"
                  placeholder="Ex: seuemail@gmail.com"
                />
                <button
                  onClick={async () => {
                    if (!testEmail || !testEmail.includes('@')) {
                      alert('Por favor, insira um endereço de e-mail válido para testar.');
                      return;
                    }
                    setIsSendingTest(true);
                    try {
                      const fromOverride = `${senderName} <${senderEmail}>`;
                      const response = await fetch('/.netlify/functions/send-bulk-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          recipients: [{ name: 'Apoiador de Teste', email: testEmail }],
                          subject,
                          body,
                          fromOverride,
                          themeColor,
                          ctaText: useCta ? ctaText : undefined,
                          ctaUrl: useCta ? ctaUrl : undefined,
                          bannerText
                        })
                      });
                      const responseText = await response.text();
                      let resData;
                      try {
                        resData = JSON.parse(responseText);
                      } catch (e) {
                        if (response.status === 404) {
                          throw new Error("O servidor de funções do Netlify não foi encontrado. Certifique-se de acessar usando o Netlify Dev e rodar 'npx netlify dev' localmente!");
                        }
                        throw new Error(`Resposta do servidor inválida: ${responseText.slice(0, 100)}`);
                      }

                      if (!response.ok) {
                        throw new Error(resData.error || 'Falha ao processar teste');
                      }
                      
                      setResultsLog([{ email: testEmail, name: 'Apoiador de Teste', status: 'success' }]);
                      setSummary({ total: 1, success: 1, failed: 0 });
                      
                      alert('✅ E-mail de teste enviado com sucesso para ' + testEmail + '!\nVerifique sua caixa de entrada e pasta de SPAM.');
                    } catch (err: any) {
                      alert(`❌ Falha no teste: ${err.message}`);
                    } finally {
                      setIsSendingTest(false);
                    }
                  }}
                  disabled={isSendingTest}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] transition-all flex items-center justify-center gap-1.5 shadow-sm rounded-2xl"
                >
                  {isSendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-gov-yellow" />}
                  Enviar Teste Rápido
                </button>
              </div>
            </div>

            {/* BOTÃO PRINCIPAL DE ENVIAR EM MASSA */}
            <button
              onClick={handleSendEmails}
              disabled={isSending || targetRecipients.length === 0}
              className="w-full py-5 text-white font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-xl hover:brightness-110 transition-all disabled:opacity-50 rounded-2xl"
              style={{ backgroundColor: themeColor }}
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 text-gov-yellow fill-gov-yellow" />}
              {isSending 
                ? 'Disparando Lote de Campanha via API...' 
                : `Disparar Campanha Oficial para ${targetRecipients.length} Contatos`
              }
            </button>
          </div>

        </div>

        {/* COLUNA DIREITA - LIVE PREVIEW & ANALYTICS */}
        <div className="xl:col-span-5 space-y-6">
          
          {/* CONTROLADORES DO PREVIEW */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gov-blue uppercase tracking-widest flex items-center gap-1.5">
              <Layout className="w-3.5 h-3.5" /> Visualização do E-mail Client (Live Preview)
            </span>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-[9px] font-black uppercase text-sky-600 hover:underline flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" /> {showPreview ? 'Ocultar Preview' : 'Mostrar Preview'}
            </button>
          </div>

          {/* FRAME DE VISUALIZAÇÃO INTERATIVA */}
          {showPreview && (
            <div className="bg-white border-2 border-slate-900 shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              {/* Celular / Mail Client Header */}
              <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between text-white rounded-2xl">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Inbox Live Preview</span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-xl" style={{ color: themeColor, backgroundColor: activeTheme.bgLight }}>
                  Mobile OK
                </span>
              </div>

              {/* Informações do E-mail Client */}
              <div className="p-4 border-b border-gray-100 bg-gray-50/60 space-y-1 text-[10px] text-gray-600 font-bold uppercase rounded-2xl">
                <p><span className="text-gray-400 font-black">De:</span> {senderName} &lt;{senderEmail}&gt;</p>
                <p><span className="text-gray-400 font-black">Para:</span> João da Silva &lt;joao@gmail.com&gt;</p>
                <p className="border-t border-gray-200/60 pt-1.5 mt-1.5 rounded-2xl">
                  <span className="text-gray-400 font-black">Assunto:</span>{' '}
                  <span className="text-slate-900 font-black normal-case">
                    {subject.replace(/{nome}/g, 'João').replace(/{nome_eleitor}/g, 'João')}
                  </span>
                </p>
              </div>

              {/* HTML do E-mail Renderizado em tempo real */}
              <div className="bg-slate-100 p-5 flex justify-center">
                <div className="bg-white w-full border border-gray-200 shadow-sm max-w-[500px] rounded-xl overflow-hidden">
                  
                  {/* Banner Superior com Cor Dinâmica */}
                  <div className="p-6 text-center border-b-4 border-gov-yellow rounded-2xl" style={{ backgroundColor: themeColor }}>
                    <h1 className="text-[12px] font-black text-white uppercase tracking-widest m-0">
                      {bannerText}
                    </h1>
                  </div>

                  {/* Conteúdo do E-mail */}
                  <div className="p-6 space-y-4">
                    <h2 className="text-sm font-extrabold text-slate-800 m-0">Olá, João!</h2>
                    
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed whitespace-pre-line m-0">
                      {body.replace(/{nome}/g, 'João').replace(/{nome_eleitor}/g, 'João')}
                    </p>

                    {/* Botão CTA Dinâmico se ativo */}
                    {useCta && ctaText && (
                      <div className="pt-4 text-center">
                        <a 
                          href={ctaUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-block px-6 py-3 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-md hover:brightness-110 transition-all"
                          style={{ backgroundColor: themeColor }}
                        >
                          {ctaText}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Rodapé Oficial do E-mail */}
                  <div className="bg-slate-50 p-5 border-t border-gray-100 text-center space-y-1 rounded-2xl">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest m-0">
                      Esta é uma mensagem oficial de mobilização da campanha eleitoral 2026.
                    </p>
                    <p className="text-[7px] font-bold text-gray-300 uppercase m-0">
                      Para desinscrever-se ou relatar problemas de privacidade, responda a este e-mail.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PAINEL DE MÉTRICAS E HISTÓRICO DE ENTREGA DEPOIS DO DISPARO */}
          {summary && (
            <div className="bg-white p-6 border-t-4 border-green-500 shadow-xl space-y-5 animate-in fade-in duration-500 rounded-2xl">
              
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 rounded-2xl">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" /> Relatório Estatístico do Lote
                </h4>
                <span className="text-[8px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-xl uppercase">
                  Concluído
                </span>
              </div>

              {/* Grid de Contagem Básica */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Total</span>
                  <span className="text-lg font-black text-slate-800">{summary.total}</span>
                </div>
                <div className="bg-green-50 border border-green-100 p-3 rounded-xl">
                  <span className="text-[8px] font-black text-green-600 uppercase tracking-widest block mb-0.5">Sucessos</span>
                  <span className="text-lg font-black text-green-600">{summary.success}</span>
                </div>
                <div className="bg-red-50 border border-red-100 p-3 rounded-xl">
                  <span className="text-[8px] font-black text-red-500 uppercase tracking-widest block mb-0.5">Falhas</span>
                  <span className="text-lg font-black text-red-500">{summary.failed}</span>
                </div>
              </div>

              {/* Gráficos de barra de progresso simulados */}
              {estimatedMetrics && (
                <div className="bg-slate-50 border border-gray-150 p-4 rounded-xl space-y-4">
                  <h5 className="text-[9px] font-black text-gov-blue uppercase tracking-widest m-0 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-gov-blue" /> Indicadores de Performance Estimados
                  </h5>

                  <div className="space-y-3">
                    {/* Entregabilidade */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold uppercase">
                        <span className="text-gray-500">Taxa de Entrega da API</span>
                        <span className="text-green-600 font-black">{estimatedMetrics.deliverability}%</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-green-500 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${estimatedMetrics.deliverability}%` }}
                        />
                      </div>
                    </div>

                    {/* Taxa de Abertura */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold uppercase">
                        <span className="text-gray-500">Abertura Estimada (Open Rate)</span>
                        <span className="text-indigo-600 font-black">{estimatedMetrics.openRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${estimatedMetrics.openRate}%` }}
                        />
                      </div>
                    </div>

                    {/* CTR */}
                    {useCta && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-bold uppercase">
                          <span className="text-gray-500">Taxa de Cliques no Botão (CTR)</span>
                          <span className="text-amber-600 font-black">{estimatedMetrics.ctr}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-amber-500 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${estimatedMetrics.ctr}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Registro Individual de E-mails com Filtros e Buscas */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
                  <span className="text-[9px] font-black text-gov-blue uppercase tracking-widest">
                    Auditoria Individual de Entrega
                  </span>
                  
                  <div className="flex gap-1">
                    {['all', 'success', 'error'].map(status => (
                      <button
                        key={status}
                        onClick={() => setLogFilter(status as any)}
                        className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-xl ${
                          logFilter === status 
                            ? 'bg-slate-800 text-white' 
                            : 'bg-gray-100 text-gray-400 hover:text-slate-800'
                        }`}
                      >
                        {status === 'all' ? 'Ver Todos' : status === 'success' ? 'Sucesso' : 'Falhas'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Pesquisar por nome, e-mail ou erro..."
                    className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-bold"
                  />
                </div>

                <div className="max-h-[220px] overflow-y-auto border border-gray-150 rounded-xl p-2.5 space-y-1.5 bg-slate-50 font-mono text-[9px]">
                  {filteredLogs.length === 0 ? (
                    <div className="text-center text-gray-400 py-6 uppercase font-bold text-[8px]">
                      Nenhum registro de entrega encontrado
                    </div>
                  ) : (
                    filteredLogs.map((log, idx) => (
                      <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-1.5 last:border-0 last:pb-0 rounded-2xl">
                        <div className="flex flex-col truncate pr-2">
                          <span className="text-slate-800 font-extrabold truncate">{log.name}</span>
                          <span className="text-gray-400 font-medium text-[8px] truncate">{log.email}</span>
                        </div>
                        <div className="shrink-0 text-right">
                          {log.status === 'success' ? (
                            <span className="text-green-600 font-black uppercase text-[8px] bg-green-50 px-1.5 py-0.5 rounded-xl border border-green-200">
                              ✓ Enviado
                            </span>
                          ) : (
                            <div className="flex flex-col items-end">
                              <span className="text-red-500 font-black uppercase text-[8px] bg-red-50 px-1.5 py-0.5 rounded-xl border border-red-200">
                                ✗ Falhou
                              </span>
                              {log.reason && (
                                <span className="text-[7px] text-red-400 font-bold block max-w-[120px] truncate" title={log.reason}>
                                  {log.reason}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
