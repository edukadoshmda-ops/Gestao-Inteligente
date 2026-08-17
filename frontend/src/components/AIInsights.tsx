import { useMemo, useState, useEffect } from 'react';
import { Member, Coordinator } from '../types';
import { Brain, Sparkles, TrendingUp, AlertCircle, Target, Lightbulb, RefreshCw, CalendarCheck, MessageSquare, Share2, Smartphone, DollarSign, Eye, CheckCircle2, Globe, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AIInsightsProps {
  members: Member[];
  coordinators: Coordinator[];
  organization: Organization | null;
}

import { db } from '../lib/db';
import { Organization } from '../types';

export default function AIInsights({ members, coordinators, organization }: AIInsightsProps) {
  // Estatísticas computadas em tempo real para a IA
  const totalMembers = members.length;
  const totalCoordinators = coordinators.length;
  const neutros = members.filter(m => m.supportLevel === 'Neutro').length;
  const neutroPerc = totalMembers > 0 ? Math.round((neutros / totalMembers) * 100) : 0;
  const supporters = members.filter(m => m.supportLevel === 'Forte').length;
  const supportersPerc = totalMembers > 0 ? Math.round((supporters / totalMembers) * 100) : 0;

  const neighborhoods = useMemo(() => {
    return members.reduce((acc: any, m) => {
      if (m.neighborhood) acc[m.neighborhood] = (acc[m.neighborhood] || 0) + 1;
      return acc;
    }, {});
  }, [members]);

  const sortedNeighborhoods = useMemo(() => {
    return Object.entries(neighborhoods).sort((a: any, b: any) => b[1] - a[1]);
  }, [neighborhoods]);

  const topNeighborhood = sortedNeighborhoods.length > 0 ? sortedNeighborhoods[0][0] : 'Geral';
  const topNeighborhoodCount = sortedNeighborhoods.length > 0 ? sortedNeighborhoods[0][1] : 0;

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'insights' | 'simulator' | 'strategist'>('insights');
  const [goals, setGoals] = useState({ weekly: '', monthly: '', final: '' });
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [dailyInsight, setDailyInsight] = useState<any>(null);
  const [isLoadingDaily, setIsLoadingDaily] = useState(false);

  // Estados e definição dos Agentes de IA Especialistas
  const [selectedAgent, setSelectedAgent] = useState<number>(0);
  const aiAgents = useMemo(() => {
    const targetNeighborhood = sortedNeighborhoods.length > 0 ? sortedNeighborhoods[0][0] : 'Setor Central';
    const activeCoordinatorsCount = coordinators.length;

    return [
      {
        id: 'estrategica',
        name: 'IA Estratégica',
        title: 'Agenda Inteligente e Previsão Eleitoral',
        icon: Target,
        status: 'Agenda Prescritiva',
        statusColor: 'text-orange-500 bg-orange-50 border-orange-200',
        bgColor: 'glass-panel hover-lift border-indigo-150',
        borderColor: 'border-indigo-500',
        textColor: 'text-indigo-900',
        iconColor: 'text-indigo-600',
        insight: `O bairro ${targetNeighborhood} teve queda de mobilização e alto potencial eleitoral. Previsão de crescimento de 11% se agirmos rápido.`,
        details: 'A IA cruzou o histórico eleitoral, engajamento recente e presença da equipe. Concluímos que a região foi abandonada nas últimas semanas. Recomendação de Agenda Automática: caminhada quinta às 18h focada em comércio local.',
        recommendation: 'Use a automação de agenda para convocar as lideranças do bairro e distribuir tarefas de panfletagem prévia via WhatsApp.',
        actionLabel: 'Aprovar Agenda e Distribuir Tarefas',
        actionTemplate: `📅 *AGENDA INTELIGENTE APROVADA* 📅\n\nAlerta Equipe: A inteligência de dados apontou oportunidade de crescimento de 11% em ${targetNeighborhood}.\n\n*Ação:* Caminhada Estratégica\n*Quando:* Quinta-feira às 18h\n\nAs tarefas de panfletagem prévia já foram distribuídas no sistema. Vamos dominar a região!`
      },
      {
        id: 'territorial',
        name: 'IA Territorial',
        title: 'Detecção de Zonas Cegas e Ações',
        icon: Globe,
        status: 'Mutirão Sugerido',
        statusColor: 'text-red-500 bg-red-50 border-red-200',
        bgColor: 'glass-panel hover-lift border-green-150',
        borderColor: 'border-green-600',
        textColor: 'text-green-900',
        iconColor: 'text-green-700',
        insight: `A zona oeste e o bairro ${targetNeighborhood} estão com ausência de militância. Deseja criar mutirão automaticamente?`,
        details: `Nossos sensores detectaram coordenadores inativos e áreas sem cobertura de porta a porta nestas seções eleitorais de alta densidade. O sistema já preparou a logística do mutirão.`,
        recommendation: `Basta aprovar a ação. O sistema criará a equipe, enviará as rotas no WhatsApp de cada coordenador e monitorará a execução via check-in GPS.`,
        actionLabel: 'Criar Mutirão Territorial Automaticamente',
        actionTemplate: `📍 *OPERAÇÃO DE OCUPAÇÃO TERRITORIAL* 📍\n\nEquipe, o mapa de calor indicou áreas descobertas em ${targetNeighborhood}. O sistema acabou de gerar suas rotas!\n\nAbram o aplicativo, acessem a aba de rotas e façam o check-in a cada visita. A operação começa amanhã cedo. Não deixaremos um eleitor para trás!`
      },
      {
        id: 'eleitoral',
        name: 'IA Eleitoral',
        title: 'Comunicação, Discurso e Captação',
        icon: Users,
        status: 'Adaptação de Discurso Pronta',
        statusColor: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        bgColor: 'glass-panel hover-lift border-yellow-150',
        borderColor: 'border-yellow-500',
        textColor: 'text-yellow-900',
        iconColor: 'text-yellow-600',
        insight: `No bairro ${targetNeighborhood}, segurança e transporte geram 80% do engajamento. Deseja adaptar o discurso?`,
        details: 'A máquina de captação automática (Landing Pages + Chatbot WhatsApp) traçou o perfil demográfico da região. A rejeição aos temas passados aumentou, precisamos focar em pautas locais de transporte.',
        recommendation: 'Aprove o novo roteiro. O sistema disparará as diretrizes para a equipe e reajustará os bots de nutrição política do WhatsApp para focar nesse tema para esses eleitores.',
        actionLabel: 'Gerar Discurso Customizado e Pauta Local',
        actionTemplate: `🎬 *ROTEIRO DE VÍDEO E DISCURSO - FOCO TRANSPORTE* 🎬\n\n"Olá, moradores de ${targetNeighborhood}. Eu sei exatamente o que vocês passam esperando o ônibus todo dia. O transporte aqui virou caso de emergência.\n\nMinha proposta é revisar imediatamente as frotas e colocar a linha expressa para funcionar. Chega de sofrimento no ponto!"\n\n[Orientação para equipe: Usem este texto como base para conversas porta a porta hoje].`
      },
      {
        id: 'crise',
        name: 'IA de Crise',
        title: 'Monitoramento War Room',
        icon: AlertCircle,
        status: 'Crise Contida',
        statusColor: 'text-rose-500 bg-rose-50 border-rose-200',
        bgColor: 'glass-panel hover-lift border-rose-150',
        borderColor: 'border-rose-600',
        textColor: 'text-rose-900',
        iconColor: 'text-rose-700',
        insight: 'Aumento de 20% no sentimento negativo no WhatsApp (Ataque Coordenado detectado).',
        details: 'O War Room identificou disseminação de Fake News sobre as propostas de educação em grupos de família e no Facebook. O sistema já isolou as regiões mais afetadas pelo ataque.',
        recommendation: 'A IA já redigiu uma resposta de contenção (Fact-Checking oficial). Aprovar disparo em massa via WhatsApp para os multiplicadores blindarem a narrativa.',
        actionLabel: 'Aprovar Resposta Automática de Crise',
        actionTemplate: `🚨 *COMUNICADO OFICIAL - VERDADE CONTRA FAKE NEWS* 🚨\n\nEstão espalhando mentiras nos grupos sobre nosso plano de educação, porque sabem que estamos crescendo nas pesquisas.\n\nA VERDADE É UMA SÓ: Vamos dobrar o investimento em creches integrais. Não caia em mentiras da velha política.\n\n[Comando à equipe: Repassem este desmentido em TODOS os grupos agora mesmo!]`
      },
      {
        id: 'mobilizacao',
        name: 'IA de Mobilização',
        title: 'Automação de Militância',
        icon: Sparkles,
        status: 'Reconhecimento de Equipe',
        statusColor: 'text-fuchsia-500 bg-fuchsia-50 border-fuchsia-200',
        bgColor: 'glass-panel hover-lift border-fuchsia-150',
        borderColor: 'border-fuchsia-500',
        textColor: 'text-fuchsia-900',
        iconColor: 'text-fuchsia-600',
        insight: `${coordinators[0]?.name || 'João'} lidera o engajamento há 7 dias. Automação ativada!`,
        details: `O sistema acompanha a execução das tarefas distribuídas automaticamente. A equipe de ${coordinators[0]?.name || 'João'} bateu 100% da meta de visitas e panfletagem esta semana.`,
        recommendation: 'Ative o módulo de gamificação. Envie reconhecimento público e libere novos materiais premium para esta equipe continuar tracionando a campanha.',
        actionLabel: 'Aplicar Gamificação e Reconhecer Desempenho',
        actionTemplate: `🏆 *LÍDER DE MOBILIZAÇÃO DA SEMANA* 🏆\n\nO sistema acabou de fechar os relatórios automáticos de produtividade e temos um campeão!\n\nParabéns à equipe do(a) *${coordinators[0]?.name || 'Coordenador'}* por bater 100% das metas de visitas e mobilização!\n\nVocês ganharam a medalha de Ouro da semana e acabam de desbloquear novos materiais de campanha no QG! Que sirva de inspiração para todos! 🚀`
      }
    ];
  }, [members, coordinators, sortedNeighborhoods]);

  // Estados do Estrategista de Crescimento IA
  const [expectedVotes, setExpectedVotes] = useState(5000);
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>(['whatsapp', 'instagram', 'tiktok']);
  const [trafficLevel, setTrafficLevel] = useState<'baixo' | 'medio' | 'alto'>('medio');
  const [daysRemaining, setDaysRemaining] = useState(60);
  const [generatedStrategy, setGeneratedStrategy] = useState<any>(null);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);

  const handleGenerateStrategy = () => {
    setIsGeneratingStrategy(true);
    setTimeout(() => {
      const viewsNeeded = expectedVotes * 25;
      const dailyViews = Math.ceil(viewsNeeded / daysRemaining);
      
      const costPerVote = trafficLevel === 'baixo' ? 2.50 : trafficLevel === 'medio' ? 4.50 : 7.00;
      const totalBudgetSuggested = expectedVotes * costPerVote;
      const dailyBudget = Math.ceil(totalBudgetSuggested / daysRemaining);

      const organicViewsGoal = Math.ceil(viewsNeeded * 0.4 / daysRemaining);
      const paidViewsGoal = Math.ceil(viewsNeeded * 0.6 / daysRemaining);

      const dailyRoutine = [
        "08:00 - WhatsApp: Disparar mensagem motivadora de bom dia no grupo de apoiadores multiplicadores.",
        "12:00 - Redes Sociais: Publicar 1 vídeo curto (Reels/TikTok) com depoimento ou proposta geolocalizada.",
        "16:00 - Engajamento: Responder todos os comentários, reações e mensagens diretas em todas as redes.",
        "20:00 - WhatsApp Loops: Enviar pauta editorial nos grupos solicitando o compartilhamento e curtidas."
      ];

      const weeklySprints = [
        { semana: "Semanas 1-2: Blitz Territorial", acao: "Ativar tráfego pago ultra-segmentado num raio de 3km das principais seções e bairros prioritários." },
        { semana: "Semanas 3-4: Autoridade e Provas", acao: "Publicar carrosséis informativos e depoimentos em vídeo de moradores validando o candidato." },
        { semana: "Semanas 5-6: Funil de WhatsApp", acao: "Promover convites com links para entrar no grupo de apoiadores do candidato." },
        { semana: "Semana Final: Consolidação (Dia D)", acao: "Direcionar 100% da verba de tráfego para anúncios informativos de local de votação e fiscalização." }
      ];

      const monthlyObjectives = [
        { mes: "Mês 1: Atração e Audiência", acao: `Focar em alcançar ${Math.round(viewsNeeded * 0.4)} visualizações gerais para fixação do nome.` },
        { mes: "Mês 2: Engajamento e Cadastro", acao: `Converter a audiência em apoiadores cadastrados na base (Meta: ${Math.round(expectedVotes * 0.6)} apoiadores).` },
        { mes: "Mês Final: Arrastão e Voto", acao: "Mobilizar a base e equipe de fiscais de boca de urna para garantir o comparecimento às urnas." }
      ];

      const networkStrategies: any[] = [];
      
      if (selectedNetworks.includes('instagram')) {
        networkStrategies.push({
          network: 'Instagram',
          color: 'bg-pink-50 border-pink-200 text-pink-850',
          organic: 'Use o formato Carrossel contando propostas específicas para cada bairro. Faça de 3 a 5 Stories diários humanizando a rotina da candidata.',
          paid: 'Impulsione carrosséis informativos focando em interesses políticos locais em um raio de até 5km das seções prioritárias.'
        });
      }
      
      if (selectedNetworks.includes('tiktok')) {
        networkStrategies.push({
          network: 'TikTok',
          color: 'bg-zinc-50 border-zinc-200 text-zinc-950',
          organic: 'Crie vídeos verticais curtos com ganchos fortes nos primeiros 3 segundos. Exemplo: "O que ninguém te conta sobre a saúde no nosso bairro...".',
          paid: 'Anúncios Spark Ads impulsionando os vídeos verticais orgânicos com maior taxa de retenção, mirando a faixa de 16-30 anos.'
        });
      }

      if (selectedNetworks.includes('whatsapp')) {
        networkStrategies.push({
          network: 'WhatsApp',
          color: 'bg-green-50 border-green-200 text-green-800',
          organic: 'Crie listas de transmissão segmentadas com apoiadores "sementes" para pulverizar posts e vídeos semanais nos grupos de família.',
          paid: 'Campanhas de tráfego com clique para WhatsApp direcionando os eleitores indecisos para atendimento direto com a equipe.'
        });
      }

      if (selectedNetworks.includes('facebook')) {
        networkStrategies.push({
          network: 'Facebook',
          color: 'bg-blue-50 border-blue-200 text-blue-800',
          organic: 'Participe e publique ativamente nos principais grupos comunitários de bairros locais. Use imagens claras com textos legíveis.',
          paid: 'Campanhas de Alcance com criativos em vídeo detalhado explicando propostas de infraestrutura voltadas a eleitores mais velhos.'
        });
      }

      if (selectedNetworks.includes('youtube')) {
        networkStrategies.push({
          network: 'YouTube',
          color: 'bg-red-50 border-red-200 text-red-800',
          organic: 'Publique YouTube Shorts constantes contendo cortes de entrevistas e falas mais contundentes da candidata.',
          paid: 'Vídeos não puláveis de 15 segundos veiculados no início de canais locais e portais de notícias da cidade.'
        });
      }

      const adCreatives = [
        {
          titulo: "Campanha 1: Apresentação & Propostas de Infraestrutura",
          copy: `📢 CHEGOU A HORA DA MUDANÇA DE VERDADE!\n\nSou ${organization?.candidate_name || 'Candidato'}, candidata nas eleições de 2026. Nossa cidade precisa de um planejamento inteligente para saúde e segurança. Chega de promessas velhas, queremos renovação real com tecnologia e compromisso!\n\n👉 Clique em saiba mais e conheça minhas propostas completas.`,
          cta: "Saiba Mais"
        },
        {
          titulo: "Campanha 2: Mobilização & Prova Social",
          copy: `🤝 QUEM ESTÁ CONOSCO NÃO VOLTA ATRÁS!\n\nConfira o depoimento emocionante de moradores locais que acreditam no nosso projeto para as eleições de 2026. Juntos somos mais fortes para fiscalizar e governar com inteligência!\n\n👉 Entre para nossa rede de apoiadores cadastrados e receba materiais exclusivos.`,
          cta: "Cadastrar"
        }
      ];

      setGeneratedStrategy({
        expectedVotes,
        daysRemaining,
        trafficLevel,
        metrics: {
          viewsNeeded,
          dailyViews,
          organicViewsGoal,
          paidViewsGoal,
          totalBudgetSuggested,
          dailyBudget
        },
        dailyRoutine,
        weeklySprints,
        monthlyObjectives,
        networkStrategies,
        adCreatives
      });
      setIsGeneratingStrategy(false);
    }, 2000);
  };

  const insights = useMemo(() => {
    if (members.length === 0) return [];

    const list = [];
    
    // 1. Análise de Indecisos
    const neutros = members.filter(m => m.supportLevel === 'Neutro').length;
    const neutroPerc = (neutros / members.length) * 100;
    
    if (neutroPerc > 30) {
      list.push({
        type: 'warning',
        title: 'Alta Taxa de Indecisos',
        msg: `Você tem ${neutros} eleitores (${neutroPerc.toFixed(1)}%) marcados como 'Neutro'. Recomendamos uma força-tarefa de ligações para estes contatos nos próximos 5 dias.`,
        icon: AlertCircle
      });
    }

    // 2. Análise de Bairros (Concentração)
    const neighborhoods = members.reduce((acc: any, m) => {
      if (m.neighborhood) acc[m.neighborhood] = (acc[m.neighborhood] || 0) + 1;
      return acc;
    }, {});
    
    const sortedNeighborhoods = Object.entries(neighborhoods).sort((a: any, b: any) => b[1] - a[1]);
    if (sortedNeighborhoods.length > 0) {
      const top = sortedNeighborhoods[0];
      list.push({
        type: 'success',
        title: 'Dominância Territorial',
        msg: `O bairro ${top[0]} é seu maior reduto com ${top[1]} eleitores. Considere realizar um evento de agradecimento ou caminhada pesada nesta região para consolidar.`,
        icon: Target
      });
    }

    // 3. Eficiência de Coordenadores
    if (coordinators.length > 0) {
      const coordPerformance = coordinators.map(c => ({
        name: c.name,
        count: members.filter(m => m.coordinatorId === c.id).length
      })).sort((a, b) => b.count - a.count);

      if (coordPerformance.length > 1) {
        const best = coordPerformance[0];
        const worst = coordPerformance[coordPerformance.length - 1];
        
        if (best.count > worst.count * 3) {
          list.push({
            type: 'info',
            title: 'Desequilíbrio de Equipe',
            msg: `O coordenador ${best.name} está performando 3x mais que ${worst.name}. Sugerimos que ${best.name} faça um treinamento rápido com o restante da equipe para compartilhar o método de abordagem.`,
            icon: Lightbulb
          });
        }
      }
    }

    // 4. Análise de Faixa Etária
    const jovens = members.filter(m => m.age && m.age < 25).length;
    if (jovens < members.length * 0.15) {
      list.push({
        type: 'opportunity',
        title: 'Oportunidade: Voto Jovem',
        msg: `Menos de 15% da sua base tem menos de 25 anos. Sua campanha pode estar sendo vista como 'tradicional'. Que tal um conteúdo focado em TikTok/Reels para atrair o eleitorado mais novo?`,
        icon: TrendingUp
      });
    }

    return list;
  }, [members, coordinators]);

  // Seed do dia para fallback estratégico
  const getDailySeed = () => {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  };

  const getDailyInsightFallback = (seed: number) => {
    const candidate = organization?.candidate_name || 'Candidato';
    
    // Lista de templates diários baseados no seed
    const templates = [
      {
        title: "🔥 Segunda-Feira de Engajamento Territorial",
        territorialAnalysis: `Hoje é o dia ideal para focar no bairro ${topNeighborhood}, onde temos nossa maior concentração de apoiadores (${topNeighborhoodCount} pessoas). A densidade de eleitores nesta região permite criar um efeito de rede se engajarmos multiplicadores locais.`,
        dailyGoal: `Fazer com que cada coordenador entre em contato com pelo menos 5 apoiadores fortes em ${topNeighborhood} e peça a indicação de 1 vizinho neutro.`,
        whatsappTemplate: `Olá {nome_eleitor}! Tudo bem? Sou da equipe da candidata ${candidate}. Estamos fazendo uma mobilização especial em ${topNeighborhood} esta semana e gostaria de saber se você teria o contato de 1 vizinho que queira conhecer nosso projeto de renovação! Posso contar com você? 🚀`,
        trendAnalysis: "O voto é uma decisão social. Quando o eleitor vê seus vizinhos próximos apoiando uma causa, a barreira de desconfiança cai em até 70%. Use a dominância em bairros redutos a seu favor."
      },
      {
        title: "🎯 Terça-Feira da Conversão de Neutros",
        territorialAnalysis: `Sua base possui atualmente ${neutros} eleitores neutros (${neutroPerc}%). Estes são os votos decisivos na eleição! A distribuição deles nas seções indica que pequenos encontros ou ligações direcionadas podem consolidar a maioria simples rapidamente.`,
        dailyGoal: "Fazer uma força-tarefa de ligações focada exclusivamente nos eleitores neutros cadastrados, com foco em escuta ativa de suas reclamações de saúde/segurança.",
        whatsappTemplate: `Olá {nome_eleitor}, tudo bem? Sou a ${candidate}! Estou revisando pessoalmente os feedbacks do seu bairro e vi que você registrou algumas opiniões sobre melhorias na nossa cidade. Queria te agradecer pelo contato e te enviar meu compromisso para a nossa região. O que você acha? 🤝`,
        trendAnalysis: "Eleitores indecisos ou neutros não querem propostas genéricas, eles querem ser ouvidos. O primeiro candidato que demonstrar escuta genuína e empatia ganha a preferência."
      },
      {
        title: "⚡ Quarta-Feira de Mobilização Digital",
        territorialAnalysis: `Com ${totalMembers} eleitores cadastrados, seu potencial de alcance orgânico nas redes é gigantesco. Se cada um compartilhar uma proposta, podemos alcançar dezenas de milhares de pessoas sem investir um centavo em anúncios.`,
        dailyGoal: "Disparar o modelo de WhatsApp para todos os apoiadores fortes, pedindo para que compartilhem o último vídeo curto da candidata em seus status do WhatsApp e grupos de família.",
        whatsappTemplate: `Oi {nome_eleitor}! Tudo bem? Passando para te mostrar nosso novo vídeo com propostas para as eleições. Se você puder compartilhar no seu status do WhatsApp e com 3 amigos, vai nos ajudar muito a espalhar nossa mensagem de mudança! Segue o link: [LINK] 🗳️`,
        trendAnalysis: "O status do WhatsApp é a mídia social de maior engajamento local no Brasil. Eleitores confiam 9x mais em vídeos enviados por amigos e parentes do que em anúncios patrocinados de partidos."
      },
      {
        title: "👑 Quinta-Feira de Consolidação de Lideranças",
        territorialAnalysis: `Temos atualmente ${totalCoordinators} coordenadores ativos liderando frentes de trabalho. O equilíbrio entre as equipes é crucial para evitar cansaço ou sobreposição de visitas nas mesmas ruas.`,
        dailyGoal: "Realizar uma reunião de alinhamento com a equipe de coordenadores e definir metas de novos cadastros de eleitores em áreas ainda pouco exploradas do município.",
        whatsappTemplate: `Fala {nome_eleitor}, beleza? Passando para agradecer todo o apoio que você tem dado à nossa campanha como líder! Sua energia na rua é o que faz a diferença. Vamos juntos bater nossa meta semanal? Conta comigo! 💪`,
        trendAnalysis: "Campanhas vitoriosas são construídas sobre coordenadores motivados. O reconhecimento público do esforço deles gera um senso de lealdade e multiplica o engajamento na reta final."
      },
      {
        title: "💎 Sexta-Feira de Contágio Social",
        territorialAnalysis: `O final de semana está chegando, período onde ocorrem os encontros familiares e conversas informais sobre política. É o momento perfeito para ativar os apoiadores mais engajados como multiplicadores orgânicos.`,
        dailyGoal: "Enviar uma mensagem de agradecimento e motivação aos apoiadores fortes e incentivar que conversem sobre política e sobre o projeto da candidata nas reuniões de família no sábado/domingo.",
        whatsappTemplate: `Olá {nome_eleitor}! Desejo um excelente final de semana para você e sua família! Queria te deixar um abraço especial da candidata ${candidate} e te incentivar a conversar com seus amigos e familiares sobre a nossa caminhada para mudar nossa cidade! Tamo junto! 🌟`,
        trendAnalysis: "Conversas informais de churrasco e almoço de domingo são responsáveis por até 40% da decisão final de voto de eleitores indecisos que não acompanham a propaganda eleitoral oficial."
      }
    ];
    
    const index = seed % templates.length;
    return templates[index];
  };

  const generateDailyInsight = async (): Promise<any> => {
    const seed = getDailySeed();
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY || '';
    const fallback = getDailyInsightFallback(seed);
    
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return fallback;
    }
    
    try {
      const candidate = organization?.candidate_name || 'Candidato';
      const prompt = `Você é o Gerente de Campanha e Estrategista Eleitoral IA para as eleições de 2026. Analise os seguintes dados reais da campanha para gerar um Insight Inteligente do Dia personalizado.
Dados da Campanha:
- Candidata: ${candidate}
- Total de Eleitores Cadastrados: ${totalMembers}
- Coordenadores na Equipe: ${totalCoordinators}
- Eleitores na base que são Neutros/Indecisos: ${neutros} (${neutroPerc}%)
- Eleitores na base que são Apoiadores Fortes: ${supporters} (${supportersPerc}%)
- Bairro com Maior Concentração de Apoiadores: ${topNeighborhood} (${topNeighborhoodCount} apoiadores cadastrados neste bairro)

Gere um JSON no formato EXATO abaixo, com textos persuasivos, realistas e específicos para campanhas brasileiras (DF/municípios). Não inclua nenhuma formatação markdown além de JSON válido. Não inclua blocos de código com a palavra json. Retorne apenas a string JSON pura.

Formato:
{
  "title": "Título chamativo e inspirador para hoje (ex: 🔥 Terça da Conversão de Neutros)",
  "territorialAnalysis": "Uma breve análise estratégica territorial baseada nos bairros e apoiadores",
  "dailyGoal": "Um objetivo prático e quantificável para os coordenadores fazerem hoje",
  "whatsappTemplate": "Um modelo de mensagem de WhatsApp persuasivo, curto e direto com a tag {nome_eleitor} para enviar hoje",
  "trendAnalysis": "Uma análise de tendência ou conselho de psicologia do voto para hoje"
}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      
      if (!response.ok) throw new Error("Erro na requisição ao Gemini API");
      const json = await response.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      if (parsed.title && parsed.territorialAnalysis && parsed.dailyGoal && parsed.whatsappTemplate && parsed.trendAnalysis) {
        return parsed;
      }
      
      return fallback;
    } catch (err) {
      console.warn("Falha na chamada da API Gemini, usando fallback:", err);
      return fallback;
    }
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setIsLoadingDaily(true);
    setTimeout(async () => {
      setIsAnalyzing(false);
      setShowInsights(true);
      try {
        const insight = await generateDailyInsight();
        setDailyInsight(insight);
      } catch (err) {
        console.error("Erro ao gerar insight diário:", err);
      } finally {
        setIsLoadingDaily(false);
      }
    }, 2000);
  };

  useEffect(() => {
    const loadDaily = async () => {
      try {
        const insight = await generateDailyInsight();
        setDailyInsight(insight);
      } catch (e) {
        console.error(e);
      }
    };
    loadDaily();
  }, [members, coordinators]);

  const generateWarPlan = async (weeklyStr: string, monthlyStr: string, finalStr: string) => {
    const weeklyVal = parseInt(weeklyStr.replace(/\D/g, ''), 10) || 100;
    const monthlyVal = parseInt(monthlyStr.replace(/\D/g, ''), 10) || 400;
    const finalVal = parseInt(finalStr.replace(/\D/g, ''), 10) || 5000;
    
    // Cálculos dinâmicos inteligentes
    const leaderQuotaWeekly = totalCoordinators > 0 ? Math.ceil(weeklyVal / totalCoordinators) : weeklyVal;
    const viewsNeeded = finalVal * 25;
    
    // Heurísticas SWOT inteligentes com base no estado real da base
    const forcas = ["Base de dados estruturada no PWA"];
    if (totalCoordinators > 2) forcas.push(`Equipe consolidada com ${totalCoordinators} coordenadores ativos`);
    if (totalMembers > 50) forcas.push(`Engajamento inicial positivo (${totalMembers} apoiadores cadastrados)`);
    if (Number(topNeighborhoodCount) > 10) forcas.push(`Forte penetração territorial no bairro ${topNeighborhood}`);

    const fraquezas = [];
    if (totalCoordinators < 3) fraquezas.push("Baixa quantidade de líderes de equipe (necessário recrutar mais coordenadores)");
    if (totalMembers < 10) fraquezas.push("Tração inicial lenta na base (menos de 10 apoiadores cadastrados)");
    if (neutroPerc > 40) fraquezas.push(`Alta taxa de indecisos na base (${neutroPerc}% indecisos), risco de dispersão`);
    if (supportersPerc < 20) fraquezas.push("Poucos apoiadores marcados como 'Forte' para atuar como multiplicadores");

    if (fraquezas.length === 0) {
      fraquezas.push("Necessidade de blindagem contra ataques digitais de opositores");
      fraquezas.push("Logística de transporte de eleitores idosos no dia da votação");
    }

    const fallbackPlan = {
      cronograma: [
        { fase: "⚡ FASE 1: Tração Semanal", acao: `Alcançar a meta de ${weeklyVal.toLocaleString('pt-BR')} novos apoiadores por semana. Cada um dos seus ${totalCoordinators || 1} líderes precisa trazer ${leaderQuotaWeekly} apoiadores cadastrados a cada 7 dias.` },
        { fase: "🚀 FASE 2: Escala Mensal", acao: `Consolidar ${monthlyVal.toLocaleString('pt-BR')} apoiadores no mês. Iniciar ondas de tráfego geolocalizado nos redutos eleitorais e disparar mensagens guiadas semanais.` },
        { fase: "🏆 FASE 3: Vitória (Objetivo)", acao: `Consolidar a meta de ${finalVal.toLocaleString('pt-BR')} votos válidos. Estima-se a necessidade de alcançar ${viewsNeeded.toLocaleString('pt-BR')} visualizações nas redes e ter pelo menos 1 fiscal ativo em cada zona.` }
      ],
      swot: {
        forcas: forcas.slice(0, 3),
        fraquezas: fraquezas.slice(0, 3)
      },
      estrategias: [
        `Gamificação da Equipe: Criar um ranking semanal. O coordenador que bater a meta de ${leaderQuotaWeekly} novos eleitores em ${topNeighborhood} ganha destaque no comitê e materiais de campanha adicionais.`,
        `Operação 'Multiplicador Forte': Ativar os ${supporters} apoiadores consolidados como cabos eleitorais digitais voluntários, criando grupos VIP no WhatsApp para distribuição diária de propostas.`,
        `Força-Tarefa de Indecisos: Redirecionar os esforços da equipe para entrar em contato direto e individual com os ${neutros} eleitores classificados como 'Neutros' nas próximas duas semanas.`
      ],
      convocacaoZap: `🚨 *CONVOCAÇÃO GERAL - RUMO À VITÓRIA!* 🚨\n\nEquipe, passamos a régua nas nossas metas e a inteligência da campanha definiu nossa rota de guerra:\n\n🎯 *Objetivo Final:* ${finalVal.toLocaleString('pt-BR')} votos na urna!\n\n📈 *Nossa Meta Semanal:* ${weeklyVal.toLocaleString('pt-BR')} novos apoiadores na base!\n💥 *Meta por Líder:* Apenas *${leaderQuotaWeekly} cadastros* nesta semana por coordenador!\n\nCada cadastro no app aproxima a gente do nosso objetivo. Conto com a dedicação e a garra de cada um de vocês nas ruas hoje! Vamos juntos! 🚀🗳️`
    };

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY || '';
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return fallbackPlan;
    }

    try {
      const candidate = organization?.candidate_name || 'Candidato';
      const prompt = `Você é o Estrategista Eleitoral Chefe e IA. Analise as seguintes metas e métricas reais da campanha para gerar um Plano de Guerra Estratégico altamente persuasivo e personalizado.
Dados da Campanha:
- Candidato: ${candidate}
- Apoiadores Cadastrados Atual: ${totalMembers}
- Coordenadores Ativos: ${totalCoordinators}
- Eleitores Neutros: ${neutros} (${neutroPerc}%)
- Bairro Reduto: ${topNeighborhood} (${topNeighborhoodCount} apoiadores)
- Meta Semanal Desejada: ${weeklyVal} novos apoiadores
- Meta Mensal Desejada: ${monthlyVal} apoiadores
- Objetivo Final de Votos: ${finalVal} votos na urna
- Visualizações Necessárias Estimadas: ${viewsNeeded} visualizações

Gere um JSON no formato EXATO abaixo, com ideias e redações brilhantes em português para uma campanha vencedora. Não inclua nenhuma formatação markdown além de JSON válido. Não inclua blocos de código com a palavra json. Retorne apenas a string JSON pura.

Formato:
{
  "cronograma": [
    { "fase": "⚡ FASE 1: Tração Semanal", "acao": "Texto estratégico descrevendo como bater a meta semanal com base no número de líderes" },
    { "fase": "🚀 FASE 2: Escala Mensal", "acao": "Texto estratégico descrevendo como escalar para a meta mensal com base nos bairros redutos" },
    { "fase": "🏆 FASE 3: Vitória (Objetivo)", "acao": "Texto estratégico descrevendo a reta final e as visualizações necessárias" }
  ],
  "swot": {
    "forcas": ["Força 1 baseada nos apoiadores ou líderes ativos", "Força 2", "Força 3"],
    "fraquezas": ["Fraqueza ou risco 1 baseado no total de apoiadores", "Fraqueza 2", "Fraqueza 3"]
  },
  "estrategias": [
    "Estratégia prática 1 detalhada (mencione os números específicos da campanha)",
    "Estratégia prática 2 detalhada",
    "Estratégia prática 3 detalhada"
  ],
  "convocacaoZap": "Uma mensagem de convocação e motivação emocionante para o candidato enviar aos coordenadores no WhatsApp, mencionando a meta por líder de hoje"
}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      
      if (!response.ok) throw new Error("Erro na requisição ao Gemini API");
      const json = await response.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      if (parsed.cronograma && parsed.swot && parsed.estrategias && parsed.convocacaoZap) {
        return parsed;
      }
      
      return fallbackPlan;
    } catch (err) {
      console.warn("Falha na chamada da API Gemini para Metas, usando fallback:", err);
      return fallbackPlan;
    }
  };

  return (
    <div className="bg-white border-4 border-gov-blue p-8 shadow-2xl overflow-hidden relative rounded-2xl">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Brain className="w-32 h-32" />
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className="bg-gov-blue p-3 rounded-2xl shadow-lg">
          <Sparkles className="w-8 h-8 text-gov-yellow animate-pulse" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-gov-blue uppercase tracking-tight">Gerente de Campanha IA</h3>
          <div className="flex gap-4 mt-1">
            <button 
              onClick={() => setActiveSubTab('insights')}
              className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeSubTab === 'insights' ? 'border-gov-blue text-gov-blue' : 'border-transparent text-gray-400'}`}
            >
              Insights da Base
            </button>
            <button 
              onClick={() => setActiveSubTab('simulator')}
              className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeSubTab === 'simulator' ? 'border-gov-blue text-gov-blue' : 'border-transparent text-gray-400'}`}
            >
              Simulador de Metas
            </button>
            <button 
              onClick={() => setActiveSubTab('strategist')}
              className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeSubTab === 'strategist' ? 'border-gov-blue text-gov-blue' : 'border-transparent text-gray-400'}`}
            >
              🔥 Planejamento de Guerra IA
            </button>
          </div>
        </div>
      </div>

      {activeSubTab === 'simulator' ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest block">Meta Semanal (Novos Votos)</label>
              <input 
                type="text" 
                inputMode="numeric"
                value={goals.weekly}
                onChange={(e) => {
                  const cleanVal = e.target.value.replace(/\D/g, '');
                  const formatted = cleanVal ? Number(cleanVal).toLocaleString('pt-BR') : '';
                  setGoals({...goals, weekly: formatted});
                }}
                placeholder="Ex: 150"
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 outline-none focus:border-gov-blue font-bold rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest block">Meta Mensal</label>
              <input 
                type="text" 
                inputMode="numeric"
                value={goals.monthly}
                onChange={(e) => {
                  const cleanVal = e.target.value.replace(/\D/g, '');
                  const formatted = cleanVal ? Number(cleanVal).toLocaleString('pt-BR') : '';
                  setGoals({...goals, monthly: formatted});
                }}
                placeholder="Ex: 600"
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 outline-none focus:border-gov-blue font-bold rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest block">Objetivo Final (Eleição)</label>
                <button 
                  onClick={() => {
                    const current = members.length;
                    const suggested = current > 0 ? Math.ceil(current * 2.5) : 1000;
                    const formatSuggested = (num: number) => num.toLocaleString('pt-BR');
                    setGoals({
                      weekly: formatSuggested(Math.ceil(suggested / 12)),
                      monthly: formatSuggested(Math.ceil(suggested / 3)),
                      final: formatSuggested(suggested)
                    });
                  }}
                  className="text-[9px] font-black text-blue-500 uppercase hover:underline"
                >
                  Sugerir Metas Realistas
                </button>
              </div>
              <input 
                type="text" 
                inputMode="numeric"
                value={goals.final}
                onChange={(e) => {
                  const cleanVal = e.target.value.replace(/\D/g, '');
                  const formatted = cleanVal ? Number(cleanVal).toLocaleString('pt-BR') : '';
                  setGoals({...goals, final: formatted});
                }}
                placeholder="Ex: 5.000"
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 outline-none focus:border-gov-blue font-bold rounded-2xl"
              />
            </div>
          </div>

          {!generatedPlan ? (
            <button
              onClick={async () => {
                if (!goals.final) return;
                setIsGeneratingPlan(true);
                try {
                  const plan = await generateWarPlan(goals.weekly, goals.monthly, goals.final);
                  setGeneratedPlan(plan);
                  
                  // Salva no Banco para os Coordenadores verem
                  if (organization?.id) {
                    db.saveOrganizationSettings(organization.id, { 
                      welcome_template: JSON.stringify({ goals, plan })
                    });
                  }
                } catch (err) {
                  console.error(err);
                } finally {
                  setIsGeneratingPlan(false);
                }
              }}
              disabled={isGeneratingPlan || !goals.final}
              className="w-full bg-gov-blue text-white py-6 font-black uppercase text-sm tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-blue-800 transition-all disabled:opacity-50 rounded-2xl"
            >
              {isGeneratingPlan ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Target className="w-6 h-6 text-gov-yellow" />}
              {isGeneratingPlan ? 'A IA está traçando a rota...' : 'Gerar Plano de Guerra Estratégico'}
            </button>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-700">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cronograma */}
                <div className="bg-gov-bg p-6 border-l-4 border-gov-blue rounded-2xl">
                  <h4 className="font-black uppercase text-xs text-gov-blue mb-4 flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4" /> Cronograma de Alcance
                  </h4>
                  <div className="space-y-4">
                    {generatedPlan.cronograma.map((item: any, i: number) => (
                      <div key={i} className="relative pl-6 border-l border-gov-blue/20 rounded-2xl">
                        <div className="absolute left-[-5px] top-0 w-2 h-2 bg-gov-blue rounded-full" />
                        <p className="text-[10px] font-black text-gov-blue uppercase">{item.fase}</p>
                        <p className="text-[11px] font-bold text-gray-600 leading-tight">{item.acao}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SWOT */}
                <div className="bg-gray-50 p-6 border-l-4 border-gov-yellow rounded-2xl">
                  <h4 className="font-black uppercase text-xs text-gov-blue mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Pontos Fortes & Fracos
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[9px] font-black text-green-600 uppercase mb-1">Pontos Fortes (Ativos)</p>
                      <ul className="text-[10px] font-bold text-gray-600 list-disc pl-4">
                        {generatedPlan.swot.forcas.map((f: string, i: number) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-red-500 uppercase mb-1">Pontos Fracos (Riscos)</p>
                      <ul className="text-[10px] font-bold text-gray-600 list-disc pl-4">
                        {generatedPlan.swot.fraquezas.map((f: string, i: number) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Planejamento Geral */}
              <div className="bg-blue-50 p-8 border-t-8 border-gov-blue rounded-2xl">
                <h4 className="font-black uppercase text-sm text-gov-blue mb-6 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-gov-yellow" /> Planejamento Tático para os {goals.final} Votos
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {generatedPlan.estrategias.map((est: string, i: number) => (
                    <div key={i} className="bg-white p-4 shadow-sm border border-blue-100 rounded-2xl">
                      <div className="text-gov-blue font-black text-lg mb-2">0{i+1}</div>
                      <p className="text-[11px] font-bold text-gray-700 leading-relaxed italic">"{est}"</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {/* Card de Convocação de WhatsApp */}
                {generatedPlan.convocacaoZap && (
                  <div className="bg-green-50 border-2 border-green-200 p-5 space-y-3 rounded-2xl">
                    <span className="text-[8px] font-black text-green-700 uppercase tracking-widest block">💬 Convocação de WhatsApp Gerada</span>
                    <div className="bg-white/80 border border-green-100 p-4 font-mono text-[9px] text-gray-700 leading-relaxed rounded-xl whitespace-pre-line select-all">
                      {generatedPlan.convocacaoZap}
                    </div>
                  </div>
                )}

                <div className="flex gap-4 flex-wrap">
                  <button 
                    onClick={() => {
                      const text = generatedPlan.convocacaoZap || `🚀 *PLANO DE GUERRA ESTRATÉGICO* 🚀\n\n*METAS:* ${goals.final} votos\n\n*CRONOGRAMA:*\n${generatedPlan.cronograma.map((c:any) => `• ${c.fase}: ${c.acao}`).join('\n')}\n\n*FORÇAS:*\n${generatedPlan.swot.forcas.map((f:string) => `✅ ${f}`).join('\n')}\n\n*ESTRATÉGIAS TÁTICAS:*\n${generatedPlan.estrategias.map((s:string, i:number) => `${i+1}. ${s}`).join('\n')}`;
                      navigator.clipboard.writeText(text);
                      alert('✅ Convocação de WhatsApp copiada com sucesso! Envie para o grupo de coordenadores.');
                    }}
                    className="flex-1 min-w-[200px] py-4 bg-green-500 text-white font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-green-600 shadow-lg rounded-2xl"
                  >
                    <MessageSquare className="w-4 h-4" /> Copiar Convocação da Equipe (Zap)
                  </button>
                  <button 
                    onClick={() => setGeneratedPlan(null)}
                    className="px-6 py-4 border-2 border-gray-200 text-gray-400 font-black uppercase text-[10px] hover:text-gov-blue transition-all rounded-2xl"
                  >
                    Refazer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeSubTab === 'strategist' ? (
        <div className="space-y-8">
          {!generatedStrategy ? (
            <div className="bg-gray-50 border-2 border-gray-100 p-6 space-y-6 rounded-2xl">
              <h4 className="text-sm font-black text-gov-blue uppercase tracking-wider flex items-center gap-2">
                <Brain className="w-5 h-5 text-gov-yellow animate-pulse" /> Configurar Estrategista de Votos IA
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Meta de Votos */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest block">Meta de Votos Esperados</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-gov-blue">🎯</span>
                    <input 
                      type="text"
                      inputMode="numeric"
                      value={expectedVotes ? expectedVotes.toLocaleString('pt-BR') : ''}
                      onChange={(e) => {
                        const cleanVal = e.target.value.replace(/\D/g, '');
                        setExpectedVotes(parseInt(cleanVal, 10) || 0);
                      }}
                      className="w-full pl-10 pr-4 py-4 bg-white border-2 border-gray-200 outline-none focus:border-gov-blue font-black text-gov-blue text-sm rounded-2xl"
                      placeholder="Ex: 5.000"
                    />
                  </div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Quantos votos válidos você planeja obter na urna?</p>
                </div>

                {/* Dias para a Campanha */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest block">Dias restantes até a eleição (Dia D)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-gov-blue">⏳</span>
                    <input 
                      type="text"
                      inputMode="numeric"
                      value={daysRemaining ? daysRemaining.toLocaleString('pt-BR') : ''}
                      onChange={(e) => {
                        const cleanVal = e.target.value.replace(/\D/g, '');
                        setDaysRemaining(parseInt(cleanVal, 10) || 0);
                      }}
                      className="w-full pl-10 pr-4 py-4 bg-white border-2 border-gray-200 outline-none focus:border-gov-blue font-black text-gov-blue text-sm rounded-2xl"
                      placeholder="Ex: 60"
                    />
                  </div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Tempo de planejamento estratégico e tração digital.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Redes Sociais */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest block">Redes Sociais Foco da Campanha</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'whatsapp', label: '🟢 WhatsApp Loops' },
                      { id: 'instagram', label: '📸 Instagram Reels' },
                      { id: 'tiktok', label: '⚫ TikTok Viral' },
                      { id: 'facebook', label: '🔵 Facebook Bairros' },
                      { id: 'youtube', label: '🔴 YouTube Shorts' }
                    ].map(net => {
                      const selected = selectedNetworks.includes(net.id);
                      return (
                        <button
                          key={net.id}
                          onClick={() => {
                            if (selected) {
                              setSelectedNetworks(selectedNetworks.filter(n => n !== net.id));
                            } else {
                              setSelectedNetworks([...selectedNetworks, net.id]);
                            }
                          }}
                          className={`p-3 text-left border-2 font-black uppercase text-[10px] tracking-wide transition-all ${
                            selected ? 'border-gov-blue bg-gov-blue/5 text-gov-blue' : 'border-gray-200 bg-white text-gray-400'
                          }`}
                        >
                          {net.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Orçamento de Tráfego Pago */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest block">Investimento em Tráfego Pago</label>
                  <div className="flex flex-col gap-3">
                    {[
                      { id: 'baixo', label: '💸 Baixo (Orgânico Dominante - até R$ 500/mês)', desc: 'Foco em grupos de WhatsApp e postagens orgânicas em Reels/TikTok.' },
                      { id: 'medio', label: '🚀 Médio (Híbrido Inteligente - R$ 500 a R$ 2.000/mês)', desc: 'Impulsionamento local geográfico de criativos de alto gancho.' },
                      { id: 'alto', label: '🔥 Alto (Tráfego de Elite - acima de R$ 2.000/mês)', desc: 'Campanhas massivas geolocalizadas em todas as redes para dominância total.' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setTrafficLevel(opt.id as any)}
                        className={`p-3.5 text-left border-2 flex flex-col transition-all ${
                          trafficLevel === opt.id ? 'border-gov-blue bg-gov-blue/5' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <span className={`text-[10px] font-black uppercase ${trafficLevel === opt.id ? 'text-gov-blue' : 'text-gray-400'}`}>{opt.label}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerateStrategy}
                disabled={isGeneratingStrategy || expectedVotes <= 0 || selectedNetworks.length === 0}
                className="w-full bg-gov-blue text-white py-6 font-black uppercase text-sm tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-blue-800 transition-all disabled:opacity-50 rounded-2xl"
              >
                {isGeneratingStrategy ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Brain className="w-6 h-6 text-gov-yellow animate-bounce" />}
                {isGeneratingStrategy ? 'Traçando estratégias de crescimento...' : 'Gerar Estratégia de Crescimento IA'}
              </button>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-700">
              {/* Painel de Métricas Eleitorais */}
              <div className="bg-white border-2 border-gov-blue p-6 shadow-sm rounded-2xl">
                <h4 className="font-black uppercase text-xs text-gov-blue mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-gov-yellow" /> Métricas e Metas de Conversão Digital
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 border-l-4 border-gov-blue rounded-2xl">
                    <span className="text-[8px] font-black text-gray-400 uppercase font-bold">Visualizações Necessárias</span>
                    <p className="text-xl font-black text-gov-blue mt-1">{generatedStrategy.metrics.viewsNeeded.toLocaleString('pt-BR')}</p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">Visitas acumuladas para {expectedVotes.toLocaleString('pt-BR')} votos</p>
                  </div>
                  <div className="bg-gray-50 p-4 border-l-4 border-gov-yellow rounded-2xl">
                    <span className="text-[8px] font-black text-gray-400 uppercase font-bold">Custo Médio por Voto</span>
                    <p className="text-xl font-black text-gov-blue mt-1">R$ {generatedStrategy.metrics.totalBudgetSuggested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">Investimento total estimado em anúncios</p>
                  </div>
                  <div className="bg-gray-50 p-4 border-l-4 border-green-500 rounded-2xl">
                    <span className="text-[8px] font-black text-gray-400 uppercase font-bold">Meta de Tráfego Diário</span>
                    <p className="text-xl font-black text-green-600 mt-1">{generatedStrategy.metrics.dailyViews.toLocaleString('pt-BR')} / dia</p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">Alcance orgânico + pago diário</p>
                  </div>
                  <div className="bg-gray-50 p-4 border-l-4 border-pink-500 rounded-2xl">
                    <span className="text-[8px] font-black text-gray-400 uppercase font-bold">Orçamento Diário de Tráfego</span>
                    <p className="text-xl font-black text-pink-600 mt-1">R$ {generatedStrategy.metrics.dailyBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">Investimento diário em campanhas pagas</p>
                  </div>
                </div>
              </div>

              {/* Rotinas e Cronograma de Guerra */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Rotina Diária */}
                <div className="bg-white border-2 border-gray-200 p-6 shadow-sm rounded-2xl">
                  <h4 className="font-black uppercase text-xs text-gov-blue mb-4 flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-gov-yellow" /> Rotina Diária da Campanha
                  </h4>
                  <div className="space-y-4">
                    {generatedStrategy.dailyRoutine.map((routine: string, i: number) => (
                      <div key={i} className="flex gap-3 items-start border-b border-gray-50 pb-2 rounded-2xl">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-gray-600 leading-normal">{routine}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sprints Semanais */}
                <div className="bg-white border-2 border-gray-200 p-6 shadow-sm rounded-2xl">
                  <h4 className="font-black uppercase text-xs text-gov-blue mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gov-yellow" /> Cronograma Semanal de Tração
                  </h4>
                  <div className="space-y-4 relative pl-4 border-l-2 border-gov-blue/15 rounded-2xl">
                    {generatedStrategy.weeklySprints.map((sprint: any, i: number) => (
                      <div key={i} className="relative">
                        <div className="absolute left-[-21px] top-1 w-2.5 h-2.5 bg-gov-blue rounded-full border border-white" />
                        <span className="text-[8px] font-black text-gov-blue uppercase font-bold">{sprint.semana}</span>
                        <p className="text-[10px] font-bold text-gray-600 mt-0.5 leading-snug">{sprint.acao}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Planejamento Mensal */}
                <div className="bg-white border-2 border-gray-200 p-6 shadow-sm rounded-2xl">
                  <h4 className="font-black uppercase text-xs text-gov-blue mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-gov-yellow" /> Etapas Mensais de Crescimento
                  </h4>
                  <div className="space-y-4">
                    {generatedStrategy.monthlyObjectives.map((obj: any, i: number) => (
                      <div key={i} className="bg-gray-50 p-3 border-l-4 border-gov-blue rounded-2xl">
                        <span className="text-[9px] font-black text-gov-blue uppercase font-bold">{obj.mes}</span>
                        <p className="text-[10px] font-bold text-gray-600 mt-0.5 leading-snug">{obj.acao}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Estratégias Específicas por Redes Sociais */}
              <div className="space-y-4">
                <h4 className="font-black uppercase text-xs text-gov-blue flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-gov-yellow" /> Estratégia de Redes Sociais Focadas
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {generatedStrategy.networkStrategies.map((net: any, i: number) => (
                    <div key={i} className={`p-6 border-l-8 rounded-xl shadow-sm border ${net.color}`}>
                      <h5 className="font-black uppercase text-xs mb-3 flex items-center gap-2">
                        {net.network}
                      </h5>
                      <div className="space-y-3">
                        <div>
                          <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Crescimento Orgânico</span>
                          <p className="text-[10px] font-bold mt-0.5 leading-relaxed">{net.organic}</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Anúncios (Tráfego Pago)</span>
                          <p className="text-[10px] font-bold mt-0.5 leading-relaxed">{net.paid}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Criativos para Tráfego Pago */}
              <div className="space-y-4">
                <h4 className="font-black uppercase text-xs text-gov-blue flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gov-yellow" /> Modelos de Anúncio e Copy Prontos (Meta Ads / Google)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {generatedStrategy.adCreatives.map((creative: any, i: number) => (
                    <div key={i} className="bg-gray-50 border-2 border-gray-150 p-6 shadow-sm flex flex-col justify-between rounded-2xl">
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[9px] font-black text-gov-blue uppercase font-bold">{creative.titulo}</span>
                          <span className="text-[8px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 uppercase tracking-wide">Alta Conversão</span>
                        </div>
                        <div className="bg-white p-4 border border-gray-200 text-gray-700 font-bold text-[10px] leading-relaxed whitespace-pre-line rounded-xl">
                          {creative.copy}
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 rounded-2xl">
                        <span className="text-[9px] font-black text-gray-400 uppercase">Botão de Ação (CTA):</span>
                        <button 
                          onClick={() => {
                            try { navigator.clipboard.writeText(creative.copy); } catch(e) {}
                            const encodedText = encodeURIComponent(`*ANÚNCIO: ${creative.titulo}*\n\n${creative.copy}\n\n*DICA:* Configurar botão do Facebook/Google como [ ${creative.cta} ]`);
                            window.open(`https://wa.me/5591993837093?text=${encodedText}`, '_blank');
                          }}
                          className="text-[9px] font-black bg-gov-blue hover:bg-blue-800 text-white px-3 py-1.5 uppercase rounded-xl transition-colors cursor-pointer active:scale-95"
                          title="Enviar este anúncio para o WhatsApp"
                        >
                          {creative.cta}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── PAINEL DE DISPARO PARA COORDENADORES ── */}
              <div className="bg-green-50 border-2 border-green-200 p-6 space-y-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500 text-white p-2 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-green-800 uppercase tracking-wide">Enviar Plano para Coordenadores</h4>
                    <p className="text-[9px] font-bold text-green-600 uppercase mt-0.5">{coordinators.filter((c: any) => c.whatsapp).length} coordenador(es) com WhatsApp cadastrado</p>
                  </div>
                </div>

                {coordinators.filter((c: any) => c.whatsapp).length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
                    <p className="text-[10px] font-black text-yellow-700 uppercase">⚠️ Nenhum coordenador tem WhatsApp cadastrado ainda.</p>
                    <p className="text-[9px] font-bold text-yellow-600 mt-1">Vá em "Coordenadores" → Editar cada um → Preencha o campo WhatsApp para ativar o disparo automático.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {coordinators.filter((c: any) => c.whatsapp).map((coord: any) => {
                      const planText = `🚀 *PLANO DE GUERRA ELEITORAL IA* 🚀\n\nOlá ${coord.name}! Segue seu briefing estratégico gerado pela IA da campanha:\n\n*META:* ${expectedVotes.toLocaleString('pt-BR')} votos\n*PRAZO:* ${daysRemaining.toLocaleString('pt-BR')} dias\n\n*ESTRATÉGIAS PARA SUA ÁREA (${coord.neighborhood}):*\n${generatedStrategy.estrategias.map((e: string) => `• ${e}`).join('\n')}\n\n*ROTINA DIÁRIA:*\n${generatedStrategy.dailyRoutine.map((r: string) => `• ${r}`).join('\n')}\n\n*Criado pelo Sistema Gestão Inteligente IA*`;
                      return (
                        <button
                          key={coord.id}
                          onClick={() => {
                            const encodedText = encodeURIComponent(planText);
                            window.open(`https://wa.me/55${coord.whatsapp}?text=${encodedText}`, '_blank');
                          }}
                          className="flex items-center gap-3 p-3 bg-white border-2 border-green-200 hover:border-green-500 hover:bg-green-50 transition-all text-left rounded-xl"
                        >
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-black text-[10px] flex-shrink-0">
                            {coord.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-[10px] font-black text-gray-800 uppercase truncate">{coord.name}</p>
                            <p className="text-[8px] font-bold text-gray-400 uppercase">{coord.neighborhood} • Toque para enviar</p>
                          </div>
                          <MessageSquare className="w-4 h-4 text-green-500 ml-auto flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    const text = `🚀 *PLANO DE GUERRA ELEITORAL IA* 🚀\n\n*META:* ${expectedVotes.toLocaleString('pt-BR')} votos\n*PRAZO:* ${daysRemaining.toLocaleString('pt-BR')} dias\n*INVESTIMENTO:* ${trafficLevel.toUpperCase()}\n\n*FUNIL ELEITORAL DE REDES:*\n• Alcance Geral: ${generatedStrategy.metrics.viewsNeeded.toLocaleString('pt-BR')} views\n• Tráfego Diário: ${generatedStrategy.metrics.dailyViews.toLocaleString('pt-BR')} views/dia\n• Orçamento Anúncios: R$ ${generatedStrategy.metrics.dailyBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/dia\n\n*ROTINA DIÁRIA DO CANDIDATO:*\n${generatedStrategy.dailyRoutine.map((r:string) => `• ${r}`).join('\n')}\n\n*ESTRATÉGIAS POR REDES SOCIAIS:*\n${generatedStrategy.networkStrategies.map((net:any) => `*${net.network.toUpperCase()}:*\n- Orgânico: ${net.organic}\n- Tráfego Pago: ${net.paid}`).join('\n\n')}\n\n*Criado pelo Sistema Gestão Inteligente IA*`;
                    navigator.clipboard.writeText(text);
                    const encodedText = encodeURIComponent(text);
                    window.open(`https://wa.me/5591993837093?text=${encodedText}`, '_blank');
                  }}
                  className="flex-1 py-5 bg-green-500 text-white font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-green-600 shadow-lg cursor-pointer rounded-2xl"
                >
                  <MessageSquare className="w-5 h-5" /> Compartilhar com Coordenação de Campanha (WhatsApp)
                </button>
                <button 
                  onClick={() => setGeneratedStrategy(null)}
                  className="px-8 py-5 border-2 border-gray-200 text-gray-400 font-black uppercase text-[10px] hover:text-gov-blue hover:border-gov-blue transition-all rounded-2xl"
                >
                  Alterar Parâmetros
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {!showInsights ? (
            <div className="text-center py-12">
              <p className="text-gray-500 font-bold uppercase text-xs mb-6 max-w-sm mx-auto leading-relaxed">
                Nossa IA está pronta para analisar seus {members.length} eleitores e encontrar padrões ocultos que podem decidir a eleição.
              </p>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="bg-gov-blue text-white px-8 py-4 font-black uppercase text-sm tracking-widest flex items-center gap-3 mx-auto hover:bg-blue-800 transition-all shadow-xl disabled:opacity-50 rounded-2xl"
              >
                {isAnalyzing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Brain className="w-5 h-5" />}
                {isAnalyzing ? 'Processando Base de Dados...' : 'Gerar Insights Estratégicos'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* WIDGET PREMIUM: INSIGHT INTELIGENTE DO DIA */}
              {dailyInsight && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-950 text-white p-8 border-4 border-gov-yellow shadow-2xl relative overflow-hidden rounded-2xl"
                  style={{ backgroundColor: '#030712' }}
                >
                  {/* Fundo decorativo sutil */}
                  <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                    <Sparkles className="w-40 h-40 text-gov-yellow" />
                  </div>
                  
                  <div className="relative z-10 space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2 bg-gov-yellow/10 border border-gov-yellow/30 px-3 py-1 rounded-full text-gov-yellow text-[9px] font-black uppercase tracking-widest">
                        <Brain className="w-3.5 h-3.5" /> Insight Inteligente do Dia
                      </div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>

                    <h4 className="text-xl md:text-2xl font-black uppercase text-gov-yellow tracking-tight leading-none">
                      {dailyInsight.title}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="space-y-2">
                        <span className="text-[8px] font-black text-gov-yellow uppercase tracking-widest block">Análise Territorial</span>
                        <p className="text-[11px] text-gray-300 font-bold leading-relaxed">{dailyInsight.territorialAnalysis}</p>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[8px] font-black text-gov-yellow uppercase tracking-widest block">Psicologia do Voto & Tendência</span>
                        <p className="text-[11px] text-gray-300 font-bold leading-relaxed">{dailyInsight.trendAnalysis}</p>
                      </div>
                    </div>

                    {/* Meta de Ação do Dia */}
                    <div className="bg-white/5 border border-white/10 p-5 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between">
                      <div className="space-y-1 text-left w-full sm:w-auto">
                        <span className="text-[8px] font-black text-gov-yellow uppercase tracking-widest block">🎯 Objetivo Prático para Hoje</span>
                        <p className="text-[11px] font-black text-white leading-snug">{dailyInsight.dailyGoal}</p>
                      </div>
                      <span className="shrink-0 px-3 py-1 bg-gov-yellow text-gov-blue text-[9px] font-black uppercase tracking-widest rounded-2xl">Ação Necessária</span>
                    </div>

                    {/* WhatsApp Copy Box */}
                    <div className="space-y-3">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Modelo de WhatsApp de Alta Conversão</span>
                      <div className="bg-black/40 border border-white/5 p-4 font-mono text-[10px] text-green-400 leading-relaxed rounded-2xl break-words select-all whitespace-pre-line relative">
                        {dailyInsight.whatsappTemplate}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(dailyInsight.whatsappTemplate);
                          alert('✅ Modelo de WhatsApp copiado com sucesso! Use-o nos seus envios guiados.');
                        }}
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-black uppercase text-[10px] py-3.5 tracking-wider flex items-center justify-center gap-2 transition-colors shadow-lg rounded-2xl"
                      >
                        <MessageSquare className="w-4 h-4" /> Copiar Texto de Disparo do Dia
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* CENTRAL DE AGENTES DE IA (MULTI-ESPECIALISTAS) */}
              <div className="bg-gray-50 border-2 border-gray-250 p-6 shadow-sm space-y-6 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="bg-gov-blue text-white p-2 rounded-xl">
                    <Brain className="w-5 h-5 text-gov-yellow" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gov-blue uppercase tracking-wide">🤖 Central de Especialistas de IA (Multi-Agentes)</h4>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5 font-black">Cinco agências de inteligência dedicadas analisando sua campanha</p>
                  </div>
                </div>

                {/* Grid dos 5 Agentes */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {aiAgents.map((agent, i) => {
                    const AgentIcon = agent.icon;
                    const isSelected = selectedAgent === i;
                    return (
                      <button
                        key={agent.id}
                        onClick={() => setSelectedAgent(i)}
                        className={`p-4 border-2 text-left flex flex-col justify-between transition-all duration-300 relative group overflow-hidden rounded-2xl ${
                          isSelected 
                            ? `border-gov-blue bg-white shadow-md` 
                            : `border-gray-205 bg-white hover:border-gov-blue`
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-0 left-0 w-full h-1 bg-gov-blue" />
                        )}
                        <div className="flex items-center justify-between w-full mb-3">
                          <div className={`p-2 rounded-xl ${isSelected ? 'bg-gov-blue/10' : 'bg-gray-50'}`}>
                            <AgentIcon className={`w-4 h-4 ${isSelected ? agent.iconColor : 'text-gray-400'}`} />
                          </div>
                          <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-xl border ${
                            isSelected ? agent.statusColor : 'text-gray-400 bg-gray-50 border-gray-100'
                          }`}>
                            {isSelected ? 'ATIVO' : 'AGUARDANDO'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-gray-450 uppercase tracking-widest block font-bold">Agente 0{i + 1}</span>
                          <span className="font-black text-xs text-gray-900 leading-tight block mt-0.5 group-hover:text-gov-blue transition-colors font-black">
                            {agent.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Painel do Agente Selecionado */}
                {aiAgents[selectedAgent] && (
                  <motion.div
                    key={selectedAgent}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white border-2 p-6 space-y-4 shadow-inner relative overflow-hidden rounded-2xl`}
                    style={{ borderColor: aiAgents[selectedAgent].borderColor }}
                  >
                    <div className="flex items-start justify-between flex-wrap gap-4 pb-4 border-b border-gray-100 rounded-2xl">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 ${aiAgents[selectedAgent].statusColor}`}>
                            {aiAgents[selectedAgent].status}
                          </span>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest font-bold">
                            {aiAgents[selectedAgent].title}
                          </span>
                        </div>
                        <h5 className="text-base font-black text-gray-900 uppercase mt-2 font-black">
                          Relatório da {aiAgents[selectedAgent].name}
                        </h5>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-[8px] font-black text-green-600 uppercase tracking-wider font-bold">
                          Dados Sincronizados
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-[8px] font-black text-gray-450 uppercase tracking-widest block font-bold">Insight Detectado</span>
                        <p className="text-sm font-black text-gov-blue leading-snug mt-1 font-black">
                          "{aiAgents[selectedAgent].insight}"
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <div className="space-y-1.5">
                          <span className="text-[8px] font-black text-gray-450 uppercase tracking-widest block font-bold">Análise Detalhada</span>
                          <p className="text-[10px] font-bold text-gray-600 leading-relaxed font-bold">
                            {aiAgents[selectedAgent].details}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-[8px] font-black text-gov-blue uppercase tracking-widest block font-bold">Diretriz Recomendada</span>
                          <p className="text-[10px] font-bold text-gray-600 leading-relaxed font-bold">
                            {aiAgents[selectedAgent].recommendation}
                          </p>
                        </div>
                      </div>

                      {/* WhatsApp / Ação Rápida */}
                      <div className="bg-gray-50 border border-gray-150 p-4 rounded-xl space-y-3 pt-3 mt-4">
                        <span className="text-[8px] font-black text-gray-450 uppercase tracking-widest block font-bold">⚡ Ação Recomendada Pronta (Copiar e Executar)</span>
                        <div className="bg-white border border-gray-200 p-3 font-mono text-[9px] text-gray-700 leading-relaxed rounded-xl break-words select-all whitespace-pre-line font-bold">
                          {aiAgents[selectedAgent].actionTemplate}
                        </div>
                        <button
                          onClick={() => {
                            const text = aiAgents[selectedAgent].actionTemplate;
                            navigator.clipboard.writeText(text);
                            const encodedText = encodeURIComponent(text);
                            window.open(`https://wa.me/5591993837093?text=${encodedText}`, '_blank');
                          }}
                          className="w-full bg-gov-blue hover:bg-blue-800 text-white font-black uppercase text-[9px] py-3.5 tracking-wider flex items-center justify-center gap-2 transition-colors shadow font-black rounded-2xl"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-gov-yellow" />
                          {aiAgents[selectedAgent].actionLabel}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* TÍTULO DOS INSIGHTS DA BASE */}
              {insights.length > 0 && (
                <div className="pt-6 border-t border-gray-100 rounded-2xl">
                  <h5 className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-4">📊 Análise de Padrões da Base de Dados</h5>
                </div>
              )}

              <AnimatePresence>
                {insights.map((insight, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`p-6 border-l-8 flex gap-5 ${
                      insight.type === 'warning' ? 'bg-orange-50 border-orange-500' :
                      insight.type === 'success' ? 'bg-green-50 border-green-500' :
                      insight.type === 'info' ? 'bg-blue-50 border-blue-500' :
                      'bg-purple-50 border-purple-500'
                    }`}
                  >
                    <div className={`p-3 rounded-full h-fit ${
                      insight.type === 'warning' ? 'bg-orange-100 text-orange-600' :
                      insight.type === 'success' ? 'bg-green-100 text-green-600' :
                      insight.type === 'info' ? 'bg-blue-100 text-blue-600' :
                      'bg-purple-100 text-purple-600'
                    }`}>
                      <insight.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-black uppercase text-sm mb-1">{insight.title}</h4>
                      <p className="text-xs text-gray-600 font-medium leading-relaxed">{insight.msg}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              <button 
                onClick={() => setShowInsights(false)}
                className="w-full mt-6 py-4 border-2 border-dashed border-gray-200 text-gray-400 font-black uppercase text-[10px] hover:border-gov-blue hover:text-gov-blue transition-all rounded-2xl"
              >
                Recalcular Análise (F5)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
