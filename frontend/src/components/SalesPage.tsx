import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Copy, CheckCircle2, ShieldCheck, Landmark,
  CreditCard, Zap, Smartphone, Lock, Loader2, User,
  Mail, Phone, IdCard, HelpCircle, BadgeCheck, Sparkles,
  Trophy, Flame, ShieldAlert, Award, Monitor, BarChart3,
  Users, Brain, Target, CalendarCheck, MessageSquare, FileSpreadsheet
} from 'lucide-react';
import Logo from './Logo';
import PostPaymentRegistration from './PostPaymentRegistration';
import { supabase } from '../lib/supabase';
import notificationService from '../services/notifications';

interface SalesPageProps {
  onBack: () => void;
  orgId?: string;
  plan?: 'full' | 'premium' | 'starter';
  onChangePlan?: (plan: 'full' | 'premium' | 'starter') => void;
}

export default function SalesPage({ onBack, orgId, plan = 'full', onChangePlan }: SalesPageProps) {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix' | 'transfer'>('pix');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<any>(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [showRegistration, setShowRegistration] = useState(false);
  const [createdOrgId, setCreatedOrgId] = useState<string | undefined>();

  // Dados do cliente
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [phone, setPhone] = useState('');

  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCheckout = async () => {
    if (!name || !email || !cpfCnpj) {
      setCheckoutError('Por favor, preencha todos os campos obrigatórios (Nome, E-mail e CPF/CNPJ).');
      return;
    }
    setIsProcessing(true);
    setCheckoutError('');
    setCheckoutResult(null);

    try {
      // Se não tiver orgId, criar organização automaticamente
      let finalOrgId = orgId;
      if (!finalOrgId) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert([{
            candidate_name: name,
            subscription_status: 'active',
            subdomain: name.toLowerCase().replace(/\s+/g, '-').substring(0, 20)
          }])
          .select()
          .single();

        if (orgError) throw orgError;
        finalOrgId = orgData.id;

        // Enviar notificação de ativação para o usuário
        const planPrices = { full: 599, premium: 499, starter: 299 };
        await notificationService.sendUserActivationNotification(
          finalOrgId,
          name || '',
          email || '',
          phone || '',
          { billingType: paymentMethod, value: planPrices[plan] }
        );
      }

      const res = await fetch('/.netlify/functions/asaas-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, cpfCnpj, phone, paymentMethod, orgId: finalOrgId, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar pagamento.');
      setCheckoutResult({ ...data, orgId: finalOrgId });
      setCreatedOrgId(finalOrgId);
      setShowRegistration(true);
    } catch (err: any) {
      setCheckoutError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Detalhes dinâmicos dos planos
  const planDetails = {
    full: {
      name: "Plano Full",
      price: "599,00",
      tagline: "Tecnologia e Inteligência",
      features: [
        "Gestão inteligente em tempo real de toda informação da campanha",
        "Propostas estratégicas IA baseadas nos dados do APP",
        "Gamificação de coordenadores de campo",
        "Boca de Urna Real-Time (Dia D)",
        "Suporte Técnico VIP 24/7",
        "Acesso PWA Multiplataforma para Celular"
      ]
    },
    premium: {
      name: "Plano Premium",
      price: "499,00",
      tagline: "Acompanhamento Exclusivo & IA Completa",
      features: [
        "Tudo do Plano Full incluso",
        "Disponibiliza um gestor da equipe para acompanhamento e suporte em tempo real",
        "Relatórios semanais por e-mail e WhatsApp com informações da campanha",
        "Planos estratégicos de ação com auxílio avançado de IA",
        "Prioridade máxima no atendimento 24/7",
        "Reuniões de Alinhamento Estratégico Mensais"
      ]
    },
    starter: {
      name: "Plano Starter",
      price: "299,00",
      tagline: "Estrutura essencial para sua campanha",
      features: [
        "Gestão Básica de Apoiadores",
        "Limite de até 5 Coordenadores",
        "Exportação de dados em Excel",
        "Mapas e Relatórios Simplificados",
        "Suporte via e-mail comercial"
      ]
    }
  };

  const currentPlan = planDetails[plan] || planDetails.full;

  return (
    <>
      <div className="min-h-screen bg-[#F4F6F9] font-sans text-[#1A202C] antialiased">
      
      {/* Barra de Segurança no Topo (Estilo Hotmart High-Trust) */}
      <div className="bg-[#1A202C] text-[#E2E8F0] py-2 px-4 sm:px-6 flex justify-between items-center text-[9px] sm:text-[11px] font-medium tracking-wide">
        <div className="flex items-center gap-2 mx-auto sm:mx-0">
          <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#38A169]" />
          <span className="hidden sm:inline">Ambiente 100% seguro e criptografado. Suas informações estão protegidas.</span>
          <span className="sm:hidden">Ambiente seguro e criptografado</span>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <span>SSL 256 BITS</span>
          <span>•</span>
          <span>COMPRA GARANTIDA</span>
        </div>
      </div>

      {/* Header com Navegação e Logo */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-40 shadow-sm transition-all duration-300 rounded-2xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase text-[#718096] hover:text-[#003366] transition-colors group"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 transition-transform group-hover:-translate-x-1" />
            <span className="hidden sm:inline">Voltar</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-[#A0AEC0] bg-[#EDF2F7] px-2 sm:px-2.5 py-1 rounded-xl">CHECKOUT SEGURO</span>
          </div>

          <div className="h-8 w-20 sm:h-10 sm:w-28 flex items-center">
            <Logo className="w-full h-full text-[#003366]" />
          </div>
        </div>
      </header>

      {/* Grid Principal */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Banner do Checkout */}
        <div className="text-center mb-6 max-w-2xl mx-auto px-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#003366] tracking-tight mb-2 leading-tight">
            Falta muito pouco para <span className="text-[#E6A100]">blindar</span> a sua vitória!
          </h1>
          <p className="text-xs sm:text-sm text-[#718096] font-medium">
            Preencha seus dados de faturamento abaixo para ativar sua plataforma de inteligência eleitoral instantaneamente.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Coluna Esquerda: Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Card do Plano Selecionado */}
            <div className="bg-[#003366] text-white p-4 sm:p-6 rounded-2xl border border-white/10 shadow-md flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#E6A100] text-[#003366] font-black text-[7px] sm:text-[8px] uppercase tracking-widest px-2 sm:px-3 py-1 rounded-bl-lg shadow-sm">
                Plano Selecionado
              </div>
              <div>
                <span className="text-[8px] sm:text-[9px] font-black text-blue-200 uppercase tracking-widest block mb-0.5">Você está adquirindo:</span>
                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-[#E6A100]">{currentPlan.name}</h3>
                <p className="text-[10px] sm:text-xs text-blue-100 font-medium">{currentPlan.tagline}</p>
              </div>
              <div className="text-right sm:text-right shrink-0">
                <span className="text-[8px] sm:text-[9px] font-black text-blue-200 uppercase tracking-widest block">Valor da Assinatura</span>
                <div className="flex items-baseline gap-0.5 justify-end">
                  <span className="text-[10px] sm:text-xs font-bold text-white">R$</span>
                  <span className="text-2xl sm:text-3xl font-black text-white tracking-tighter">{currentPlan.price.split(',')[0]}</span>
                  <span className="text-[10px] sm:text-xs font-bold text-blue-200">,00/mês</span>
                </div>
              </div>
            </div>
            
            {/* Bloco 1: Dados Pessoais */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 sm:p-6 md:p-8 relative overflow-hidden transition-all duration-300 hover:shadow-md">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#003366]" />

              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#003366] text-white flex items-center justify-center font-black text-xs sm:text-sm">
                  1
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#003366] uppercase tracking-wide">Dados de Faturamento</h2>
                  <p className="text-[10px] sm:text-xs text-[#718096] font-medium">Precisamos destas informações para gerar sua licença e emitir a nota fiscal</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                <div className="md:col-span-2">
                  <label className="text-[10px] sm:text-xs font-bold text-[#4A5568] block mb-1 sm:mb-1.5 uppercase tracking-wider">Nome Completo *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#A0AEC0] absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      type="text"
                      placeholder="Ex: João da Silva"
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-2.5 sm:p-3.5 pl-9 sm:pl-11 font-semibold text-[#1A202C] focus:border-[#E6A100] focus:bg-white outline-none transition-all shadow-sm text-sm sm:text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] sm:text-xs font-bold text-[#4A5568] block mb-1 sm:mb-1.5 uppercase tracking-wider">E-mail *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#A0AEC0] absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />
                    <input
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      type="email"
                      placeholder="Ex: joao@campanha.com"
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-2.5 sm:p-3.5 pl-9 sm:pl-11 font-semibold text-[#1A202C] focus:border-[#E6A100] focus:bg-white outline-none transition-all shadow-sm text-sm sm:text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] sm:text-xs font-bold text-[#4A5568] block mb-1 sm:mb-1.5 uppercase tracking-wider">CPF ou CNPJ *</label>
                  <div className="relative">
                    <IdCard className="w-4 h-4 text-[#A0AEC0] absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />
                    <input
                      value={cpfCnpj}
                      onChange={e => setCpfCnpj(e.target.value)}
                      type="text"
                      placeholder="Ex: 000.000.000-00"
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-2.5 sm:p-3.5 pl-9 sm:pl-11 font-semibold text-[#1A202C] focus:border-[#E6A100] focus:bg-white outline-none transition-all shadow-sm text-sm sm:text-base"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] sm:text-xs font-bold text-[#4A5568] block mb-1 sm:mb-1.5 uppercase tracking-wider">WhatsApp para Notificações</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#A0AEC0] absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />
                    <input
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      type="text"
                      placeholder="Ex: (91) 99999-9999"
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-2.5 sm:p-3.5 pl-9 sm:pl-11 font-semibold text-[#1A202C] focus:border-[#E6A100] focus:bg-white outline-none transition-all shadow-sm text-sm sm:text-base"
                    />
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-[#A0AEC0] font-bold block mt-1 uppercase tracking-wide">
                    * Enviaremos as atualizações de ativação e relatórios estratégicos por aqui.
                  </span>
                </div>
              </div>
            </div>

            {/* Bloco 2: Abas de Pagamento */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 sm:p-6 md:p-8 relative overflow-hidden transition-all duration-300 hover:shadow-md">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#E6A100]" />

              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#E6A100] text-white flex items-center justify-center font-black text-xs sm:text-sm">
                  2
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#003366] uppercase tracking-wide">Método de Pagamento</h2>
                  <p className="text-[10px] sm:text-xs text-[#718096] font-medium">Escolha a melhor opção. Conexão direta com processamento Asaas</p>
                </div>
              </div>

              {/* Botões das Abas de Pagamento */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 p-1 bg-[#F8FAFC] rounded-2xl mb-6 sm:mb-8 border border-[#E2E8F0]">
                {[
                  { id: 'pix', label: 'PIX QR Code', icon: Zap, badge: 'Imediato' },
                  { id: 'card', label: 'Cartão', icon: CreditCard, badge: 'Até 12x' },
                  { id: 'transfer', label: 'Fatura Boleto', icon: Landmark, badge: 'Geral' }
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`relative py-3 sm:py-4 px-1 sm:px-2 rounded-xl flex flex-col items-center justify-center gap-1 sm:gap-1.5 transition-all outline-none ${
                      paymentMethod === method.id
                      ? 'bg-white text-[#003366] shadow-md scale-[1.02] border border-[#E2E8F0]'
                      : 'text-[#718096] hover:bg-[#EDF2F7] hover:text-[#003366]'
                    }`}
                  >
                    <method.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${paymentMethod === method.id ? 'text-[#E6A100]' : 'text-[#A0AEC0]'}`} />
                    <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-wide text-center leading-tight">{method.label}</span>

                    {/* Badge */}
                    <span className={`hidden sm:inline text-[7px] sm:text-[8px] font-black uppercase px-1 sm:px-1.5 py-0.5 rounded-full scale-90 ${
                      paymentMethod === method.id
                      ? 'bg-[#FEFCBF] text-[#B7791F]'
                      : 'bg-[#EDF2F7] text-[#718096]'
                    }`}>
                      {method.badge}
                    </span>
                  </button>
                ))}
              </div>

              {/* Formulários dinâmicos de pagamento */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 min-h-[300px] sm:min-h-[360px] flex flex-col justify-between">
                <AnimatePresence mode="wait">
                  
                  {/* OPÇÃO: PIX */}
                  {paymentMethod === 'pix' && (
                    <motion.div 
                      key="pix"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6 flex-1 flex flex-col justify-between"
                    >
                      <div className="text-center space-y-4">
                        <div className="inline-flex items-center gap-2 bg-[#E6FFFA] text-[#319795] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider mx-auto">
                          <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
                          <span>Liberação do Sistema em menos de 2 minutos</span>
                        </div>
                        <h3 className="text-base font-extrabold text-[#003366] uppercase">Pagamento Instantâneo com PIX</h3>
                        <p className="text-xs text-[#718096] max-w-sm mx-auto font-medium leading-relaxed">
                          O QR Code e a chave copia e cola serão gerados automaticamente na próxima tela após você clicar no botão de gerar pagamento.
                        </p>
                      </div>

                      {/* Mockup do QR Code para ilustrar o processo */}
                      <div className="relative w-48 h-48 bg-white border border-[#CBD5E1] rounded-2xl mx-auto flex flex-col items-center justify-center shadow-inner group overflow-hidden">
                        <div className="absolute inset-0 bg-[#F1F5F9] opacity-30 group-hover:scale-105 transition-transform" />
                        <Zap className="w-12 h-12 text-[#E6A100] mb-2 z-10 animate-bounce" />
                        <span className="text-[9px] font-black uppercase text-[#A0AEC0] px-6 text-center z-10 tracking-widest leading-relaxed">
                          QR CODE REAL GERADO A SEGUIR
                        </span>
                      </div>

                      <div className="space-y-4">
                        <button 
                          onClick={handleCheckout} 
                          disabled={isProcessing} 
                          className="w-full py-5 bg-[#38A169] text-white font-extrabold rounded-xl uppercase tracking-wider text-xs hover:bg-[#2F855A] transition-all shadow-md active:scale-95 flex items-center justify-center gap-3 disabled:opacity-60"
                        >
                          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Smartphone className="w-5 h-5" />}
                          {isProcessing ? 'GERANDO PAGAMENTO...' : 'GERAR QR CODE DE PAGAMENTO'}
                        </button>

                        <div className="flex items-center justify-center gap-3 text-[10px] text-[#A0AEC0] font-black uppercase tracking-wide">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Transação 100% Criptografada e Segura</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* OPÇÃO: CARTÃO */}
                  {paymentMethod === 'card' && (
                    <motion.div 
                      key="card"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 rounded-2xl">
                        <h3 className="text-base font-extrabold text-[#003366] uppercase">Cartão de Crédito</h3>
                        <div className="flex items-center gap-1.5">
                          <div className="bg-white border border-[#CBD5E1] rounded-xl px-1.5 py-0.5 text-[10px] font-black text-[#718096]">VISA</div>
                          <div className="bg-white border border-[#CBD5E1] rounded-xl px-1.5 py-0.5 text-[10px] font-black text-[#718096]">MASTER</div>
                          <div className="bg-white border border-[#CBD5E1] rounded-xl px-1.5 py-0.5 text-[10px] font-black text-[#718096]">ELO</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="text-[10px] font-bold text-[#4A5568] block mb-1 uppercase tracking-wider">Número do Cartão</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              placeholder="0000 0000 0000 0000" 
                              className="w-full bg-white border border-[#CBD5E1] rounded-xl p-3.5 pl-11 font-black text-[#1A202C] tracking-widest focus:border-[#E6A100] outline-none transition-all shadow-sm" 
                            />
                            <CreditCard className="w-4 h-4 text-[#A0AEC0] absolute left-4 top-1/2 -translate-y-1/2" />
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-[10px] font-bold text-[#4A5568] block mb-1 uppercase tracking-wider">Nome Impresso no Cartão</label>
                          <input 
                            type="text" 
                            placeholder="JOÃO S SILVA" 
                            className="w-full bg-white border border-[#CBD5E1] rounded-xl p-3.5 font-bold text-[#1A202C] uppercase focus:border-[#E6A100] outline-none transition-all shadow-sm" 
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-[#4A5568] block mb-1 uppercase tracking-wider">Validade (MM/AA)</label>
                          <input 
                            type="text" 
                            placeholder="MM/AA" 
                            className="w-full bg-white border border-[#CBD5E1] rounded-xl p-3.5 font-bold text-[#1A202C] focus:border-[#E6A100] outline-none transition-all shadow-sm text-center" 
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-[#4A5568] block mb-1 uppercase tracking-wider">Código de Segurança (CVV)</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              placeholder="123" 
                              className="w-full bg-white border border-[#CBD5E1] rounded-xl p-3.5 font-bold text-[#1A202C] focus:border-[#E6A100] outline-none transition-all shadow-sm text-center pr-10" 
                            />
                            <Lock className="w-4 h-4 text-[#A0AEC0] absolute right-4 top-1/2 -translate-y-1/2" />
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={handleCheckout} 
                        disabled={isProcessing} 
                        className="w-full py-5 bg-[#003366] text-white font-extrabold rounded-xl uppercase tracking-wider text-xs hover:bg-[#002244] transition-all shadow-md active:scale-95 flex items-center justify-center gap-3 disabled:opacity-60"
                      >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5 text-[#E6A100]" />}
                        {isProcessing ? 'PROCESSANDO CARTÃO...' : `PAGAR R$ ${currentPlan.price} SEGURO`}
                      </button>

                      <div className="flex items-center justify-center gap-4 text-[10px] text-[#A0AEC0] font-black uppercase tracking-wide">
                        <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> SSL 256 BITS</span>
                        <span>•</span>
                        <span>APROVAÇÃO EM MINUTOS</span>
                      </div>
                    </motion.div>
                  )}

                  {/* OPÇÃO: TRANSFER / BOLETO */}
                  {paymentMethod === 'transfer' && (
                    <motion.div 
                      key="transfer"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6 flex-1 flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <h3 className="text-base font-extrabold text-[#003366] uppercase">Boleto ou Fatura Digital</h3>
                        <div className="bg-[#EBF8FF] text-[#2B6CB0] border-l-4 border-[#3182CE] p-4 rounded-r-xl text-xs font-semibold leading-relaxed">
                          Geramos uma fatura oficial do Asaas. Ao clicar no botão, criaremos o boleto digital que você poderá pagar via internet banking, lotéricas ou PIX.
                        </div>
                        <p className="text-[11px] text-[#718096] font-medium leading-relaxed">
                          * A ativação por boleto bancário tradicional pode levar de 1 a 2 dias úteis para compensação bancária. Se precisa de acesso imediato, recomendamos PIX ou Cartão.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <button 
                          onClick={handleCheckout} 
                          disabled={isProcessing} 
                          className="w-full py-5 bg-[#003366] text-white font-extrabold rounded-xl uppercase tracking-wider text-xs hover:bg-[#002244] transition-all shadow-md active:scale-95 flex items-center justify-center gap-3 disabled:opacity-60"
                        >
                          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Landmark className="w-5 h-5 text-[#E6A100]" />}
                          {isProcessing ? 'GERANDO BOLETO...' : 'GERAR FATURA / BOLETO BANCÁRIO'}
                        </button>
                        
                        <div className="text-center">
                          <span className="text-[9px] font-black uppercase text-[#A0AEC0] tracking-wider">PROCESSAMENTO RÁPIDO VIA ASAAS INTERMEDIAÇÃO</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Seção de Erro */}
              {checkoutError && (
                <div className="mt-4 bg-[#FFF5F5] border-l-4 border-[#E53E3E] p-4 rounded-r-xl text-[#C53030] font-bold text-xs flex items-start gap-2 shadow-sm animate-shake">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{checkoutError}</span>
                </div>
              )}
            </div>

            {/* Tela de Sucesso Asaas (Resultado do Pagamento) */}
            {checkoutResult && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="bg-white border-4 border-[#38A169] rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-[#38A169]" />
                
                <div className="w-16 h-16 rounded-full bg-[#E6FFFA] text-[#38A169] flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                
                <div>
                  <h3 className="text-2xl font-black text-[#003366] uppercase tracking-wide">Assinatura Criada com Sucesso!</h3>
                  <p className="text-xs text-[#718096] font-medium mt-1">Sua conta do Sistema Eleitoral foi vinculada e está aguardando apenas o recebimento.</p>
                </div>

                {checkoutResult.pixQrCode && (
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6 max-w-sm mx-auto space-y-4 shadow-inner">
                    <p className="text-xs font-extrabold text-[#003366] uppercase tracking-wider">Escaneie o QR Code para pagar:</p>
                    
                    {checkoutResult.pixQrCodeImage && (
                      <img 
                        src={`data:image/png;base64,${checkoutResult.pixQrCodeImage}`} 
                        alt="QR Code PIX" 
                        className="w-44 h-44 mx-auto border-4 border-white rounded-xl shadow-md transition-all hover:scale-105" 
                      />
                    )}
                    
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-[#A0AEC0] tracking-widest">Ou utilize o Pix Copia e Cola:</p>
                      <div className="flex items-center gap-2 bg-white border border-[#CBD5E1] rounded-xl p-3 text-xs font-semibold text-[#4A5568] break-all relative">
                        <span className="flex-1 text-left truncate pr-8">{checkoutResult.pixQrCode}</span>
                        <button 
                          onClick={() => copyToClipboard(checkoutResult.pixQrCode)} 
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#EDF2F7] transition-all text-[#38A169]"
                          title="Copiar Pix"
                        >
                          {copied ? <BadgeCheck className="w-5 h-5 text-[#38A169]" /> : <Copy className="w-5 h-5 text-[#718096]" />}
                        </button>
                      </div>
                      {copied && (
                        <span className="text-[10px] text-[#38A169] font-black uppercase block tracking-wider animate-pulse">
                          Copiado para área de transferência!
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {checkoutResult.invoiceUrl && (
                  <div className="py-2">
                    <a 
                      href={checkoutResult.invoiceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-2 px-8 py-4 bg-[#003366] hover:bg-[#002244] text-white font-extrabold uppercase text-xs tracking-wider rounded-xl shadow-md transition-all hover:scale-105"
                    >
                      <Landmark className="w-4 h-4 text-[#E6A100]" />
                      <span>ABRIR FATURA / BOLETO OFICIAL</span>
                    </a>
                  </div>
                )}

                <div className="pt-4 border-t border-[#E2E8F0] max-w-sm mx-auto rounded-2xl">
                  <p className="text-xs text-[#718096] font-medium italic mb-4">
                    Importante: Ao realizar o pagamento, nosso sistema identificará automaticamente seu e-mail e ativará suas permissões de Administrador Master.
                  </p>
                  <button 
                    onClick={onBack}
                    className="text-xs font-black uppercase text-[#003366] hover:underline hover:text-[#E6A100] transition-colors"
                  >
                    Voltar para a página inicial
                  </button>
                </div>
              </motion.div>
            )}

          </div>

          {/* Coluna Direita: Resumo do Pedido, Mudar Plano e Depoimentos */}
          <div className="space-y-6">

            {/* Selo de Garantia e Satisfação */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 text-center space-y-4 transition-all duration-300 hover:shadow-md">
              <div className="w-12 h-12 bg-[#FEFCBF] text-[#B7791F] flex items-center justify-center rounded-full mx-auto shadow-sm">
                <Sparkles className="w-6 h-6 fill-current animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#003366]">Garantia de Satisfação Incondicional</h4>
                <p className="text-[11px] text-[#718096] font-medium leading-relaxed mt-1.5 uppercase">
                  Experimente o app. Se em até 7 dias você entender que a ferramenta não faz sentido para a sua estratégia eleitoral, nós devolveremos 100% do seu dinheiro, sem burocracias.
                </p>
              </div>
            </div>

            {/* Suporte Badge */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 flex items-center gap-4 transition-all duration-300 hover:shadow-md">
              <div className="w-10 h-10 bg-[#EDF2F7] rounded-xl flex items-center justify-center text-[#003366] shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-[#003366] tracking-wide">Precisa de Ajuda?</h4>
                <p className="text-[10px] text-[#718096] font-medium uppercase mt-0.5 tracking-tight leading-relaxed">
                  Fale com nosso suporte dedicado via WhatsApp a qualquer momento para tirar suas dúvidas de faturamento ou ativação.
                </p>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Footer do Checkout */}
      <footer className="bg-white border-t border-[#E2E8F0] py-8 text-center text-[10px] text-[#A0AEC0] font-black uppercase tracking-widest mt-20 px-6">
        <div className="max-w-6xl mx-auto space-y-2">
          <p>© {new Date().getFullYear()} Sistema de Gestão Eleitoral Inteligente. Todos os direitos reservados.</p>
          <p>Operação e processamento financeiro seguro integrados via Asaas IP S.A.</p>
        </div>
      </footer>

      </div>

      {/* Formulário de cadastro após pagamento */}
      {showRegistration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <PostPaymentRegistration
            orgId={createdOrgId}
            onSuccess={() => {
              setShowRegistration(false);
              onBack();
            }}
            onCancel={() => setShowRegistration(false)}
          />
        </div>
      )}
    </>
  );
}
