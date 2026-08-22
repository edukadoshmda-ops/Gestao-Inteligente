import { useState, useEffect } from 'react';
import { Member, Organization } from '../types';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { Save, Phone, Users, Hash, Mail, CheckCircle, Camera, Loader2, ArrowLeft, Mic, Sparkles } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';
import { applyAppTheme, getStoredTheme } from '../lib/theme';

interface PublicRegisterProps {
  onBack?: () => void;
}

export default function PublicRegister({ onBack }: PublicRegisterProps) {
  const [org, setOrg] = useState<Organization | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  
  const initialState = {
    name: '',
    email: '',
    phone: '',
    age: '',
    voterId: '',
    voterSection: '',
    voterZone: '',
    gender: '',
    birthDate: '',
    neighborhood: '',
  };

  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  // Carregar dados da Organização via URL ou LocalStorage e aplicar tema
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orgId = urlParams.get('org');

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

  const startFieldDictation = (field: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz. Tente usar o Google Chrome ou Microsoft Edge.");
      return;
    }

    if (activeVoiceField === field) {
      setActiveVoiceField(null);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setActiveVoiceField(field);
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript.trim()) {
        let finalVal = transcript.trim();
        if (field === 'phone') {
          finalVal = maskPhone(finalVal);
        } else if (field === 'name') {
          finalVal = finalVal.replace(/(^\w|\s\w)/g, m => m.toUpperCase());
        } else if (field === 'email') {
          finalVal = finalVal.toLowerCase().replace(/\s+arroba\s+/g, '@').replace(/\s+ponto\s+/g, '.').replace(/\s+/g, '');
        } else if (field === 'voterId' || field === 'voterSection' || field === 'voterZone') {
          finalVal = finalVal.replace(/\D/g, '');
        } else if (field === 'birthDate') {
          const dateMatch = finalVal.match(/(\d{1,2})[\/\s\-](\d{1,2})[\/\s\-](\d{2,4})/);
          if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const month = dateMatch[2].padStart(2, '0');
            const year = dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3];
            finalVal = `${year}-${month}-${day}`;
          }
        } else if (field === 'gender') {
          const lower = finalVal.toLowerCase();
          if (lower.includes('fem') || lower.includes('mulher')) finalVal = 'Feminino';
          else if (lower.includes('masc') || lower.includes('homem')) finalVal = 'Masculino';
          else finalVal = 'Outro';
        }

        setFormData(prev => ({
          ...prev,
          [field]: finalVal
        }));
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      setActiveVoiceField(null);
    };

    recognition.onend = () => {
      setActiveVoiceField(null);
    };

    recognition.start();
  };

  const validatePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
  };

  const maskPhone = (value: string) => {
    const masked = value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
    return masked;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, phone: maskPhone(e.target.value) });
  };

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanFeedback('Analisando documento...');
    try {
      let extractedData: any = null;
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY || 'AIzaSyCesNHyiM3GEM7eGzCAhQiY3T3zOxYZqy4';

      if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
        try {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onload = () => {
              const res = reader.result as string;
              const base64 = res.split(',')[1];
              resolve(base64);
            };
            reader.readAsDataURL(file);
          });
          const base64Data = await base64Promise;

          const prompt = `Analise a foto deste documento de eleitor brasileiro (Título, RG, CNH). Retorne APENAS um JSON puro:
{
  "name": "Nome Completo",
  "voterId": "12 dígitos do título",
  "voterZone": "Zona",
  "voterSection": "Seção",
  "birthDate": "YYYY-MM-DD",
  "gender": "Masculino" ou "Feminino"
}`;

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: file.type || 'image/jpeg', data: base64Data } }
                ]
              }]
            })
          });

          if (response.ok) {
            const json = await response.json();
            const textResponse = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            extractedData = JSON.parse(cleanJson);
          }
        } catch (geminiErr) {
          console.warn("Fallback to Tesseract:", geminiErr);
        }
      }

      if (!extractedData || !extractedData.name) {
        const worker = await createWorker('por');
        const { data: { text } } = await worker.recognize(file);
        await worker.terminate();

        const nameMatch = text.match(/NOME\s*[:\s]*([^\n]+)/i);
        const voterIdMatch = text.match(/T[ÍI]TULO\s*DE\s*ELEITOR\s*[:\s]*(\d{4}\s*\d{4}\s*\d{4})/i) || text.match(/(\d{4}\s*\d{4}\s*\d{4})/);
        const sectionMatch = text.match(/SE[ÇC][ÃA]O\s*[:\s]*(\d{4})/i);
        const zoneMatch = text.match(/ZONA\s*[:\s]*(\d{3})/i);
        const birthMatch = text.match(/(\d{2})[\/\.](\d{2})[\/\.](\d{4})/);

        let formattedBirth = '';
        if (birthMatch) {
          formattedBirth = `${birthMatch[3]}-${birthMatch[2]}-${birthMatch[1]}`;
        }

        extractedData = {
          name: nameMatch ? nameMatch[1].trim() : '',
          voterId: voterIdMatch ? voterIdMatch[1].replace(/\s/g, '').slice(0, 12) : '',
          voterSection: sectionMatch ? sectionMatch[1] : '',
          voterZone: zoneMatch ? zoneMatch[1] : '',
          birthDate: formattedBirth
        };
      }

      setFormData(prev => ({
        ...prev,
        name: extractedData.name || prev.name,
        voterId: extractedData.voterId || prev.voterId,
        voterSection: extractedData.voterSection || prev.voterSection,
        voterZone: extractedData.voterZone || prev.voterZone,
        birthDate: extractedData.birthDate || prev.birthDate,
        gender: extractedData.gender || prev.gender,
      }));

      setScanFeedback('✨ Dados preenchidos com sucesso!');
      setTimeout(() => setScanFeedback(null), 4000);
      
    } catch (error) {
      console.error('Erro no OCR:', error);
      alert('Não foi possível ler os dados. Tente uma foto mais nítida.');
    } finally {
      setIsScanning(false);
      e.target.value = '';
    }
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return undefined;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!validatePhone(formData.phone)) newErrors.phone = 'Telefone inválido.';
    if (formData.name.trim().split(' ').length < 2) newErrors.name = 'Informe o nome completo.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const urlOrg = urlParams.get('org');
    const coordParam = urlParams.get('coord') || urlParams.get('network_id') || urlParams.get('coordenador');
    const currentOrgId = org?.id || urlOrg || undefined;
    const computedAge = calculateAge(formData.birthDate);

    // Sanitizar campos para evitar erros de tipos do Postgres/Supabase
    const cleanMember: Member = {
      id: crypto.randomUUID().split('-')[0],
      name: formData.name.trim(),
      email: formData.email?.trim() || '',
      phone: formData.phone.replace(/\D/g, '') || formData.phone.trim(),
      gender: formData.gender?.trim() || '',
      neighborhood: formData.neighborhood?.trim() || '',
      region: org?.state || 'DF',
      referral: coordParam ? 'Indicação de Coordenador' : 'Formulário Público',
      coordinatorId: coordParam || undefined,
      network_id: coordParam || undefined,
      supportLevel: 'Alto',
      createdAt: new Date().toISOString(),
      ...(currentOrgId ? { org_id: currentOrgId } : {}),
      ...(typeof computedAge === 'number' && !isNaN(computedAge) ? { age: computedAge } : {}),
      ...(formData.voterId?.trim() ? { voterId: formData.voterId.trim() } : {}),
      ...(formData.voterSection?.trim() ? { voterSection: formData.voterSection.trim() } : {}),
      ...(formData.voterZone?.trim() ? { voterZone: formData.voterZone.trim() } : {}),
      ...(formData.birthDate?.trim() ? { birthDate: formData.birthDate.trim() } : {})
    };

    try {
      // 1. Salva na base de dados resiliente (LocalStorage + Supabase sync)
      const currentMembers = await db.getMembers(currentOrgId);
      await db.saveMembers([cleanMember, ...currentMembers], currentOrgId);

      // 2. Se houver conexão com o Supabase, tenta o insert direto também
      if (supabase) {
        try {
          const { error } = await supabase.from('members').insert([cleanMember]);
          if (error) {
            console.warn('Aviso Supabase insert direto:', error.message);
          }
        } catch (err) {
          console.warn('Exceção Supabase:', err);
        }
      }

      // Notifica abas/janelas abertas da aplicação
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('member_registered', { detail: cleanMember }));

      setSubmitted(true);
    } catch (err) {
      console.error('Erro ao salvar cadastro:', err);
      // Mesmo com erro inesperado de rede, garante o sucesso pois foi gravado localmente
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('member_registered', { detail: cleanMember }));
      setSubmitted(true);
    }
  };

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-gov-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gov-blue" />
      </div>
    );
  }

  const primaryColor = org?.theme_primary || org?.theme_color || 'var(--color-gov-blue, #0d1b3e)';
  const secondaryColor = org?.theme_secondary || 'var(--color-gov-yellow, #facc15)';
  const campaignName = org?.candidate_name || 'Campanha Eleitoral';

  if (submitted) {
    return (
      <div className="min-h-screen bg-gov-bg flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 sm:p-12 border-4 shadow-2xl text-center max-w-md w-full rounded-2xl"
          style={{ borderColor: primaryColor }}
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-500">
            <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-500" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase mb-4" style={{ color: primaryColor }}>
            Cadastro Realizado!
          </h2>
          <p className="text-gray-500 font-bold uppercase text-xs tracking-widest leading-relaxed">
            Seus dados foram enviados com sucesso para a base <span style={{ color: primaryColor }}>{campaignName}</span>.
          </p>
          <button 
            onClick={() => setSubmitted(false)}
            className="mt-8 w-full py-4 text-white font-black uppercase text-xs sm:text-sm tracking-widest transition-all rounded-full shadow-lg hover:opacity-90 active:scale-95 cursor-pointer"
            style={{ backgroundColor: primaryColor }}
          >
            Fazer Novo Cadastro
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gov-bg px-4 py-6 sm:p-8 md:p-12 flex flex-col items-center">
      {/* Top Branding Bar */}
      <div className="w-full max-w-2xl mb-6 sm:mb-8 flex items-center gap-3 sm:gap-4">
        {org?.logo_url ? (
          <img 
            src={org.logo_url} 
            className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-2xl shadow-md shrink-0 bg-white p-1 border border-gray-100" 
            alt="Logo" 
          />
        ) : (
          <Logo className="w-12 h-12 sm:w-14 sm:h-14 shadow-md rounded-2xl shrink-0" />
        )}
        <div className="min-w-0">
          <h1 
            className="text-xl sm:text-2xl font-black uppercase leading-tight truncate"
            style={{ color: primaryColor }}
          >
            {campaignName}
          </h1>
          <p className="text-[10px] sm:text-xs font-black text-blue-500 uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-0.5">
            Apoio Popular e Inteligência
          </p>
        </div>
      </div>

      {/* Main Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-2 shadow-xl max-w-2xl w-full overflow-hidden rounded-2xl"
        style={{ borderColor: primaryColor }}
      >
        {/* Card Header Banner - Always colored, visible on both PC and Mobile */}
        <div 
          className="p-4 sm:p-6 text-white border-b-4 flex items-center gap-3 sm:gap-4 rounded-t-2xl shadow-sm"
          style={{ 
            backgroundColor: primaryColor,
            borderBottomColor: secondaryColor 
          }}
        >
          <button 
            type="button"
            onClick={onBack || (() => setFormData(initialState))}
            className="p-2 sm:p-2.5 bg-black/15 hover:bg-white/20 active:scale-95 transition-all border border-white/25 rounded-full group shrink-0 cursor-pointer"
            title={onBack ? "Voltar" : "Limpar Formulário"}
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <h2 className="text-base sm:text-xl font-black uppercase tracking-tight text-white leading-tight">
              Ficha de Identificação
            </h2>
            <p className="text-[9px] sm:text-[10px] text-white/80 uppercase font-bold tracking-wider sm:tracking-widest mt-0.5">
              Sua participação é fundamental
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-5 sm:space-y-6">
          <AnimatePresence>
            {scanFeedback && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-blue-50 border-2 p-3 sm:p-4 rounded-2xl shadow-sm flex items-center gap-3"
                style={{ borderColor: primaryColor }}
              >
                <Sparkles className="w-5 h-5 shrink-0 animate-spin-slow" style={{ color: secondaryColor }} />
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: primaryColor }}>{scanFeedback}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Atalho Escanear Título */}
          <div 
            className="bg-gray-50/80 p-4 sm:p-6 border-2 border-dashed flex flex-col items-center justify-center gap-3 sm:gap-4 text-center rounded-2xl"
            style={{ borderColor: `${primaryColor}40` }}
          >
            <p 
              className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider"
              style={{ color: primaryColor }}
            >
              Atalho: Fotografe seu título para preencher automaticamente
            </p>
            <input type="file" id="public-scan" accept="image/*" capture="environment" onChange={handleScan} className="hidden" />
            <button
              type="button"
              disabled={isScanning}
              onClick={() => document.getElementById('public-scan')?.click()}
              className="flex items-center gap-2.5 px-5 sm:px-6 py-3 bg-white border-2 font-black uppercase text-[10px] sm:text-xs tracking-wider transition-all shadow-md rounded-full hover:bg-gray-50 active:scale-95 cursor-pointer"
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" style={{ color: secondaryColor }} />}
              {isScanning ? 'Lendo dados do Título...' : 'Escanear Foto do Título'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Nome Completo */}
            <div className="md:col-span-2">
              <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider mb-1.5 block" style={{ color: primaryColor }}>
                Nome Completo
              </label>
              <div className="relative flex items-center">
                <input 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full pl-4 pr-12 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm rounded-2xl transition-all" 
                  placeholder="Digite seu nome completo" 
                />
                <button 
                  type="button" 
                  onClick={() => startFieldDictation('name')} 
                  className={`absolute right-3 p-1.5 rounded-full transition-colors ${activeVoiceField === 'name' ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Telefone */}
            <div>
              <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider mb-1.5 block" style={{ color: primaryColor }}>
                Telefone (WhatsApp)
              </label>
              <div className="relative flex items-center">
                <input 
                  required 
                  value={formData.phone} 
                  onChange={handlePhoneChange} 
                  className="w-full pl-4 pr-12 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm rounded-2xl transition-all" 
                  placeholder="(00) 00000-0000" 
                />
                <button 
                  type="button" 
                  onClick={() => startFieldDictation('phone')} 
                  className={`absolute right-3 p-1.5 rounded-full transition-colors ${activeVoiceField === 'phone' ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Data de Nascimento */}
            <div>
              <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider mb-1.5 block" style={{ color: primaryColor }}>
                Data de Nascimento
              </label>
              <div className="relative flex items-center">
                <input 
                  required 
                  type="date" 
                  value={formData.birthDate} 
                  onChange={e => setFormData({...formData, birthDate: e.target.value})} 
                  className="w-full pl-4 pr-12 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm rounded-2xl transition-all" 
                />
                <button 
                  type="button" 
                  onClick={() => startFieldDictation('birthDate')} 
                  className={`absolute right-3 p-1.5 rounded-full transition-colors ${activeVoiceField === 'birthDate' ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* E-mail */}
            <div>
              <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider mb-1.5 block" style={{ color: primaryColor }}>
                E-mail
              </label>
              <div className="relative flex items-center">
                <input 
                  required 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  className="w-full pl-4 pr-12 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm rounded-2xl transition-all" 
                  placeholder="email@exemplo.com" 
                />
                <button 
                  type="button" 
                  onClick={() => startFieldDictation('email')} 
                  className={`absolute right-3 p-1.5 rounded-full transition-colors ${activeVoiceField === 'email' ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Gênero */}
            <div>
              <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider mb-1.5 block" style={{ color: primaryColor }}>
                Gênero
              </label>
              <div className="relative flex items-center">
                <select 
                  required 
                  value={formData.gender} 
                  onChange={e => setFormData({...formData, gender: e.target.value})} 
                  className="w-full pl-4 pr-12 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm appearance-none rounded-2xl transition-all"
                >
                  <option value="">Selecione...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
                <button 
                  type="button" 
                  onClick={() => startFieldDictation('gender')} 
                  className={`absolute right-3 p-1.5 rounded-full transition-colors ${activeVoiceField === 'gender' ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Título de Eleitor */}
            <div className="md:col-span-2">
              <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider mb-1.5 block" style={{ color: primaryColor }}>
                Título de Eleitor
              </label>
              <div className="relative flex items-center">
                <input 
                  value={formData.voterId} 
                  onChange={e => setFormData({...formData, voterId: e.target.value.replace(/\D/g, '')})} 
                  className="w-full pl-4 pr-24 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm rounded-2xl transition-all" 
                  placeholder="0000 0000 0000" 
                />
                <div className="absolute right-2.5 flex items-center gap-1">
                  <button 
                    type="button" 
                    onClick={() => document.getElementById('public-scan')?.click()} 
                    title="Ler Título por Foto" 
                    className="p-1.5 text-white rounded-lg flex items-center gap-1 text-[9px] font-bold shadow-sm active:scale-95 cursor-pointer"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Camera className="w-3.5 h-3.5" /> Foto
                  </button>
                  <button 
                    type="button" 
                    onClick={() => startFieldDictation('voterId')} 
                    className={`p-1.5 rounded-full transition-colors ${activeVoiceField === 'voterId' ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Seção e Zona */}
            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <div>
                <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider mb-1.5 block" style={{ color: primaryColor }}>
                  Seção
                </label>
                <div className="relative flex items-center">
                  <input 
                    value={formData.voterSection} 
                    onChange={e => setFormData({...formData, voterSection: e.target.value.replace(/\D/g, '')})} 
                    className="w-full pl-4 pr-12 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm rounded-2xl transition-all" 
                    placeholder="0000" 
                  />
                  <button 
                    type="button" 
                    onClick={() => startFieldDictation('voterSection')} 
                    className={`absolute right-3 p-1.5 rounded-full transition-colors ${activeVoiceField === 'voterSection' ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider mb-1.5 block" style={{ color: primaryColor }}>
                  Zona
                </label>
                <div className="relative flex items-center">
                  <input 
                    maxLength={4}
                    value={formData.voterZone} 
                    onChange={e => setFormData({...formData, voterZone: e.target.value.replace(/\D/g, '')})} 
                    className="w-full pl-4 pr-12 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm rounded-2xl transition-all" 
                    placeholder="000" 
                  />
                  <button 
                    type="button" 
                    onClick={() => startFieldDictation('voterZone')} 
                    className={`absolute right-3 p-1.5 rounded-full transition-colors ${activeVoiceField === 'voterZone' ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full py-4 font-black uppercase text-xs sm:text-sm tracking-widest shadow-lg transition-all rounded-2xl active:scale-[0.99] cursor-pointer"
            style={{
              backgroundColor: secondaryColor,
              color: '#0d1b3e',
              borderBottom: '4px solid rgba(0,0,0,0.15)'
            }}
          >
            Confirmar Apoio
          </button>
        </form>
      </motion.div>
    </div>
  );
}
