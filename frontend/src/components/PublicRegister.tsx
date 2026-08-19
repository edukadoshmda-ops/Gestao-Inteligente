import { useState, useEffect } from 'react';
import { Member, Organization } from '../types';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { Save, Phone, Users, Hash, Mail, CheckCircle, Camera, Loader2, ArrowLeft, Mic, Sparkles } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';

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
  };

  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  // Carregar dados da Organização via URL
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
          if (data) setOrg(data);
          setOrgLoading(false);
        });
    } else {
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

    const newMember: Member = {
      ...formData,
      age: calculateAge(formData.birthDate),
      id: crypto.randomUUID().split('-')[0],
      createdAt: new Date().toISOString(),
      org_id: org?.id
    };

    if (supabase) {
      const { error } = await supabase.from('members').insert([newMember]);
      if (error) {
        console.error('Erro ao salvar no Supabase:', error);
        alert('Erro ao enviar cadastro. Tente novamente.');
        return;
      }
    } else {
      const currentMembers = await db.getMembers();
      await db.saveMembers([newMember, ...currentMembers]);
    }
    
    setSubmitted(true);
  };

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-gov-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gov-blue" />
      </div>
    );
  }

  const campaignName = org?.candidate_name || 'Campanha Eleitoral';

  if (submitted) {
    return (
      <div className="min-h-screen bg-gov-bg flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 border-4 border-gov-blue shadow-2xl text-center max-w-md w-full rounded-2xl"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-500">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-black text-gov-blue uppercase mb-4">Cadastro Realizado!</h2>
          <p className="text-gray-500 font-bold uppercase text-xs tracking-widest leading-relaxed">
            Seus dados foram enviados com sucesso para a base <span className="text-gov-blue">{campaignName}</span>.
          </p>
          <button 
            onClick={() => setSubmitted(false)}
            className="mt-8 w-full py-4 bg-gov-blue text-white font-black uppercase text-sm tracking-widest hover:bg-blue-800 transition-all rounded-full"
          >
            Fazer Novo Cadastro
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gov-bg p-6 md:p-12 flex flex-col items-center">
      <div className="w-full max-w-2xl mb-8 flex items-center gap-4">
        {org?.logo_url ? (
          <img src={org.logo_url} className="w-16 h-16 object-contain" alt="Logo" />
        ) : (
          <Logo className="w-12 h-12 shadow-lg rounded-2xl" />
        )}
        <div>
          <h1 className="text-2xl font-black text-gov-blue uppercase leading-none">{campaignName}</h1>
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-1">Apoio Popular e Inteligência</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-2 border-gov-blue shadow-xl max-w-2xl w-full overflow-hidden rounded-2xl"
      >
        <div className="bg-gov-blue p-6 text-white border-b-4 border-gov-yellow flex items-center gap-4 rounded-2xl">
          <button 
            type="button"
            onClick={onBack || (() => setFormData(initialState))}
            className="p-2 hover:bg-white/10 transition-all border border-white/20 rounded-full group"
            title={onBack ? "Voltar" : "Limpar Formulário"}
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h2 className="text-xl font-black uppercase">Ficha de Identificação</h2>
            <p className="text-[10px] opacity-70 uppercase font-bold tracking-widest mt-1">Sua participação é fundamental</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <AnimatePresence>
            {scanFeedback && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-blue-50 border-2 border-gov-blue text-gov-blue p-4 rounded-2xl shadow-md flex items-center gap-3"
              >
                <Sparkles className="w-5 h-5 text-gov-yellow shrink-0 animate-spin-slow" />
                <p className="text-xs font-black uppercase tracking-wider">{scanFeedback}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-gray-50 p-6 border-2 border-dashed border-gov-blue/20 flex flex-col items-center justify-center gap-4 text-center rounded-2xl">
            <p className="text-[9px] font-black uppercase text-gov-blue/50 tracking-widest">Atalho: Fotografe seu título para preencher automaticamente</p>
            <input type="file" id="public-scan" accept="image/*" capture="environment" onChange={handleScan} className="hidden" />
            <button
              type="button"
              disabled={isScanning}
              onClick={() => document.getElementById('public-scan')?.click()}
              className="flex items-center gap-3 px-6 py-3 bg-white border-2 border-gov-blue font-black uppercase text-[10px] tracking-widest hover:bg-gov-blue hover:text-white transition-all shadow-md rounded-full"
            >
              {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-gov-yellow" />}
              {isScanning ? 'Lendo dados do Título...' : 'Escanear Foto do Título'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nome Completo */}
            <div className="md:col-span-2">
              <label className="text-[9px] font-black uppercase text-gov-blue tracking-widest mb-1.5 block">Nome Completo</label>
              <div className="relative flex items-center">
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full pl-4 pr-12 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm rounded-2xl" placeholder="Digite seu nome completo" />
                <button type="button" onClick={() => startFieldDictation('name')} className={`absolute right-3 p-1.5 rounded-full ${activeVoiceField === 'name' ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-gov-blue'}`}>
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Telefone */}
            <div>
              <label className="text-[9px] font-black uppercase text-gov-blue tracking-widest mb-1.5 block">Telefone (WhatsApp)</label>
              <div className="relative flex items-center">
                <input required value={formData.phone} onChange={handlePhoneChange} className="w-full pl-4 pr-12 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm rounded-2xl" placeholder="(00) 00000-0000" />
                <button type="button" onClick={() => startFieldDictation('phone')} className={`absolute right-3 p-1.5 rounded-full ${activeVoiceField === 'phone' ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-gov-blue'}`}>
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Data de Nascimento */}
            <div>
              <label className="text-[9px] font-black uppercase text-gov-blue tracking-widest mb-1.5 block">Data de Nascimento</label>
              <div className="relative flex items-center">
                <input required type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="w-full pl-4 pr-12 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm rounded-2xl" />
                <button type="button" onClick={() => startFieldDictation('birthDate')} className={`absolute right-3 p-1.5 rounded-full ${activeVoiceField === 'birthDate' ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-gov-blue'}`}>
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* E-mail */}
            <div>
              <label className="text-[9px] font-black uppercase text-gov-blue tracking-widest mb-1.5 block">E-mail</label>
              <div className="relative flex items-center">
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-4 pr-12 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm rounded-2xl" placeholder="email@exemplo.com" />
                <button type="button" onClick={() => startFieldDictation('email')} className={`absolute right-3 p-1.5 rounded-full ${activeVoiceField === 'email' ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-gov-blue'}`}>
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Gênero */}
            <div>
              <label className="text-[9px] font-black uppercase text-gov-blue tracking-widest mb-1.5 block">Gênero</label>
              <div className="relative flex items-center">
                <select required value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full pl-4 pr-12 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm appearance-none rounded-2xl">
                  <option value="">Selecione...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
                <button type="button" onClick={() => startFieldDictation('gender')} className={`absolute right-3 p-1.5 rounded-full ${activeVoiceField === 'gender' ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-gov-blue'}`}>
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Título de Eleitor */}
            <div className="md:col-span-2">
              <label className="text-[9px] font-black uppercase text-gov-blue tracking-widest mb-1.5 block">Título de Eleitor</label>
              <div className="relative flex items-center">
                <input value={formData.voterId} onChange={e => setFormData({...formData, voterId: e.target.value.replace(/\D/g, '')})} className="w-full pl-4 pr-24 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm rounded-2xl" placeholder="0000 0000 0000" />
                <div className="absolute right-2.5 flex items-center gap-1">
                  <button type="button" onClick={() => document.getElementById('public-scan')?.click()} title="Ler Título por Foto" className="p-1.5 bg-gov-blue text-white rounded-lg flex items-center gap-1 text-[9px] font-bold">
                    <Camera className="w-3.5 h-3.5" /> Foto
                  </button>
                  <button type="button" onClick={() => startFieldDictation('voterId')} className={`p-1.5 rounded-full ${activeVoiceField === 'voterId' ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-gov-blue'}`}>
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Seção e Zona */}
            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <div>
                <label className="text-[9px] font-black uppercase text-gov-blue tracking-widest mb-1.5 block">Seção</label>
                <div className="relative flex items-center">
                  <input value={formData.voterSection} onChange={e => setFormData({...formData, voterSection: e.target.value.replace(/\D/g, '')})} className="w-full pl-4 pr-12 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm rounded-2xl" placeholder="0000" />
                  <button type="button" onClick={() => startFieldDictation('voterSection')} className={`absolute right-3 p-1.5 rounded-full ${activeVoiceField === 'voterSection' ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-gov-blue'}`}>
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-gov-blue tracking-widest mb-1.5 block">Zona</label>
                <div className="relative flex items-center">
                  <input value={formData.voterZone} onChange={e => setFormData({...formData, voterZone: e.target.value.replace(/\D/g, '')})} className="w-full pl-4 pr-12 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm rounded-2xl" placeholder="000" />
                  <button type="button" onClick={() => startFieldDictation('voterZone')} className={`absolute right-3 p-1.5 rounded-full ${activeVoiceField === 'voterZone' ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-gov-blue'}`}>
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full py-4 bg-gov-yellow text-gov-blue font-black uppercase text-xs tracking-widest shadow-md hover:bg-yellow-300 transition-all border-b-4 border-gov-blue/20 rounded-2xl">
            Confirmar Apoio
          </button>
        </form>
      </motion.div>
    </div>
  );
}
