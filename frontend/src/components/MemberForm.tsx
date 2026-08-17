import { useState } from 'react';
import { Member, Coordinator } from '../types';
import { Save, Phone, Users, Hash, Mail, Camera, Loader2, ArrowLeft, Calendar, ShieldCheck, MapPin, Navigation, Mic, MicOff, FileText, Brain, Sparkles, RefreshCw } from 'lucide-react';

import { createWorker } from 'tesseract.js';
import { motion, AnimatePresence } from 'motion/react';

interface MemberFormProps {
  onSave: (member: Omit<Member, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  initialData?: Member | null;
  coordinators?: Coordinator[];
  networkId?: string; // ID da rede para coerência
}

export default function MemberForm({ onSave, onCancel, initialData, coordinators = [], networkId }: MemberFormProps) {
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
    coordinatorId: '',
    observations: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  };


  const [formData, setFormData] = useState({
    name: initialData?.name || initialState.name,
    email: initialData?.email || initialState.email,
    phone: initialData?.phone || initialState.phone,
    age: initialData?.age?.toString() || initialState.age,
    voterId: initialData?.voterId || initialState.voterId,
    voterSection: initialData?.voterSection || initialState.voterSection,
    voterZone: initialData?.voterZone || initialState.voterZone,
    gender: initialData?.gender || initialState.gender,
    birthDate: initialData?.birthDate || initialState.birthDate,
    neighborhood: initialData?.neighborhood || initialState.neighborhood,
    coordinatorId: initialData?.coordinatorId || initialState.coordinatorId,
    observations: (initialData as any)?.observations || initialState.observations,
    latitude: (initialData as any)?.latitude || initialState.latitude,
    longitude: (initialData as any)?.longitude || initialState.longitude,
  });


  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Seu navegador não suporta geolocalização nativa.");
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Erro no GPS:", error);
        alert("Não foi possível obter a localização. Verifique as permissões de GPS no seu dispositivo.");
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta digitação por voz. Tente usar o Google Chrome no Android ou Safari no iOS.");
      return;
    }

    if (isListening) return; // Prevent multiple instances

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        setFormData(prev => ({
          ...prev,
          observations: prev.observations ? prev.observations + ' ' + finalTranscript.trim() : finalTranscript.trim()
        }));
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Erro no reconhecimento de voz:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    
    // Auto stop after 15 seconds to prevent keeping mic on forever
    setTimeout(() => {
      try { recognition.stop(); } catch(e) {}
    }, 15000);
  };

  const [isMagicListening, setIsMagicListening] = useState(false);
  const [isMagicProcessing, setIsMagicProcessing] = useState(false);

  const handleMagicDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta digitação por voz. Tente usar o Google Chrome no Android ou Safari no iOS.");
      return;
    }

    if (isMagicListening || isMagicProcessing) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsMagicListening(true);
    };

    recognition.onresult = async (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript.trim()) {
        setIsMagicProcessing(true);
        try {
          const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY || 'AIzaSyCesNHyiM3GEM7eGzCAhQiY3T3zOxYZqy4';
          if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
            alert("A Chave da API do Gemini não está configurada para processar a IA.");
            return;
          }

          const prompt = `Extraia as seguintes informações do texto ditado para um cadastro eleitoral. Retorne APENAS um JSON válido e puro com as chaves exatas em inglês (use null se não encontrar a informação).
          { "name": string, "phone": string, "neighborhood": string, "age": string, "gender": "Masculino" | "Feminino" | "Outro" }
          Texto: "${finalTranscript.trim()}"`;

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });

          if (!response.ok) throw new Error("Erro na API");
          const json = await response.json();
          const textResponse = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
          
          const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);

          setFormData(prev => ({
            ...prev,
            name: parsed.name || prev.name,
            phone: parsed.phone ? maskPhone(parsed.phone) : prev.phone,
            neighborhood: parsed.neighborhood || prev.neighborhood,
            age: parsed.age || prev.age,
            gender: parsed.gender || prev.gender,
            observations: prev.observations ? prev.observations + '\n\n[Dictation Original]: ' + finalTranscript.trim() : '[Dictation Original]: ' + finalTranscript.trim()
          }));

        } catch (e) {
          console.error("Erro no processamento mágico:", e);
          alert("Não foi possível entender os dados falados. Fale mais claramente e tente novamente.");
        } finally {
          setIsMagicProcessing(false);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Erro no reconhecimento de voz:", event.error);
      setIsMagicListening(false);
      setIsMagicProcessing(false);
    };

    recognition.onend = () => {
      setIsMagicListening(false);
    };

    recognition.start();
    
    // Auto stop after 15 seconds
    setTimeout(() => {
      try { recognition.stop(); } catch(e) {}
    }, 15000);
  };

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const worker = await createWorker('por');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      // Simple regex extraction for Brazilian Voter Card
      const nameMatch = text.match(/NOME\s*[:\s]*([^\n]+)/i);
      const voterIdMatch = text.match(/T[ÍI]TULO\s*DE\s*ELEITOR\s*[:\s]*(\d{4}\s*\d{4}\s*\d{4})/i) || text.match(/(\d{4}\s*\d{4}\s*\d{4})/);
      const sectionMatch = text.match(/SE[ÇC][ÃA]O\s*[:\s]*(\d{4})/i);
      const zoneMatch = text.match(/ZONA\s*[:\s]*(\d{3})/i);

      setFormData(prev => ({
        ...prev,
        name: nameMatch ? nameMatch[1].trim() : prev.name,
        voterId: voterIdMatch ? voterIdMatch[1].replace(/\s/g, '') : prev.voterId,
        voterSection: sectionMatch ? sectionMatch[1] : prev.voterSection,
        voterZone: zoneMatch ? zoneMatch[1] : prev.voterZone,
      }));
      
    } catch (error) {
      console.error('Erro no OCR:', error);
      alert('Não foi possível ler os dados da imagem. Tente uma foto mais nítida.');
    } finally {
      setIsScanning(false);
      e.target.value = '';
    }
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

    if (errors.phone) {
      const clean = masked.replace(/\D/g, '');
      if (clean.length >= 10) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.phone;
          return newErrors;
        });
      }
    }
    return masked;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, phone: maskPhone(e.target.value) });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Telefone inválido (mínimo 10 dígitos).';
    }

    if (formData.name.trim().split(' ').length < 2) {
      newErrors.name = 'Informe o nome completo (nome e sobrenome).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const dataToSave: Omit<Member, 'id' | 'createdAt'> = {
        ...formData,
        age: calculateAge(formData.birthDate),
        // Garante que o network_id seja incluído para validação de permissões
        network_id: networkId,
      };

      onSave(dataToSave);
      
      if (!initialData) {
        setFormData(initialState);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-gov-blue max-w-3xl mx-auto w-full"
    >
      <div className="bg-gov-blue p-4 sm:p-8 text-white flex items-center justify-between border-b-4 border-gov-yellow rounded-2xl">
        <div className="flex items-center gap-4 sm:gap-6">
          <button 
            type="button"
            onClick={onCancel}
            className="p-2 sm:p-3 hover:bg-white/10 transition-all border border-white/20 rounded-xl group"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h2 className="text-xl sm:text-3xl font-black uppercase leading-none">
              {initialData ? 'Editar Cadastro' : 'Novo Registro'}
            </h2>
            <p className="text-blue-200 mt-1 font-medium italic text-[10px] sm:text-xs">Gestão de Base Eleitoral 2026</p>
          </div>
        </div>
        <div className="text-right hidden md:block">
          <span className="text-6xl font-black text-white/10 leading-none select-none">
            {initialData ? '02' : '01'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-10 space-y-6 sm:space-y-8">
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="bg-green-50 border-l-4 border-green-500 p-4 overflow-hidden rounded-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="bg-green-500 p-1 rounded-full">
                  <Save className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-green-800 font-black uppercase text-xs tracking-widest">Registro Salvo com Sucesso</p>
                  <p className="text-green-600 font-bold text-[10px] uppercase tracking-tighter">O formulário foi limpo e os dados estão seguros.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gov-blue/5 p-6 border-2 border-dashed border-gov-blue/20 flex flex-col items-center justify-center gap-4 group hover:border-gov-blue transition-all relative overflow-hidden rounded-2xl">
            {isMagicProcessing && (
              <div className="absolute inset-0 bg-gov-blue/10 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                <RefreshCw className="w-6 h-6 text-gov-blue animate-spin mb-2" />
                <span className="text-[10px] font-black text-gov-blue uppercase tracking-widest">A IA está preenchendo...</span>
              </div>
            )}
            <button
              type="button"
              disabled={isMagicListening || isMagicProcessing}
              onClick={handleMagicDictation}
              className={`flex items-center gap-3 px-6 py-4 bg-gov-blue text-white font-black uppercase text-xs tracking-widest shadow-xl hover:bg-blue-800 transition-all w-full justify-center rounded-full ${isMagicListening ? 'animate-pulse bg-red-600 border-red-700' : ''}`}
            >
              {isMagicListening ? <Mic className="w-5 h-5 text-white" /> : <Brain className="w-5 h-5 text-gov-yellow" />}
              {isMagicListening ? 'Escutando você...' : 'Preenchimento Mágico (Voz)'}
            </button>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest text-center px-4">
              Clique, diga os dados do eleitor (ex: Nome, Bairro e Telefone) e a IA preencherá o formulário.
            </p>
          </div>

          <div className="bg-gray-50 p-6 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-4 group hover:border-gov-yellow transition-all rounded-xl">
            <input
              type="file"
              id="voter-card-scan"
              accept="image/*"
              capture="environment"
              onChange={handleScan}
              className="hidden"
            />
            <button
              type="button"
              disabled={isScanning}
              onClick={() => document.getElementById('voter-card-scan')?.click()}
              className={`flex items-center gap-3 px-6 py-4 bg-white border-2 border-gray-300 text-gray-600 font-black uppercase text-xs tracking-widest shadow-sm hover:bg-gray-100 transition-all w-full justify-center rounded-full ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isScanning ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-gov-blue" />
              )}
              {isScanning ? 'Processando Imagem...' : 'Escanear Título (Foto)'}
            </button>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center px-4">
              Tire uma foto nítida do Título de Eleitor para preencher automaticamente.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-y-6 gap-x-6">
          <div className="col-span-12 md:col-span-8">
            <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${errors.name ? 'text-red-500' : 'text-gov-blue'}`}>
              Nome Completo
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Users className={`h-4 w-4 ${errors.name ? 'text-red-300' : 'text-gov-blue/30 group-focus-within:text-gov-blue'} transition-colors`} />
              </div>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors(prev => {
                    const { name, ...rest } = prev;
                    return rest;
                  });
                }}
                className={`block w-full pl-12 pr-4 py-3.5 border-2 rounded-full focus:bg-white outline-none transition-all font-medium placeholder:text-gray-300 ${
                  errors.name ? 'border-red-200 bg-red-50 focus:border-red-500' : 'border-gray-100 focus:border-gov-yellow bg-gray-50'
                }`}
                placeholder="Digite o nome completo"
              />
            </div>
            {errors.name && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter italic">{errors.name}</p>}
          </div>

          <div className="col-span-12 md:col-span-4">
            <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${errors.phone ? 'text-red-500' : 'text-gov-blue'}`}>
              Telefone
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className={`h-4 w-4 ${errors.phone ? 'text-red-300' : 'text-gov-blue/30 group-focus-within:text-gov-blue'} transition-colors`} />
              </div>
              <input
                required
                type="tel"
                maxLength={15}
                value={formData.phone}
                onChange={handlePhoneChange}
                className={`block w-full pl-12 pr-4 py-3.5 border-2 rounded-full focus:bg-white outline-none transition-all font-medium placeholder:text-gray-300 ${
                  errors.phone ? 'border-red-200 bg-red-50 focus:border-red-500' : 'border-gray-100 focus:border-gov-yellow bg-gray-50'
                }`}
                placeholder="(00) 00000-0000"
              />
            </div>
            {errors.phone && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter italic">{errors.phone}</p>}
          </div>

          <div className="col-span-12 md:col-span-8">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-1.5 block">
              E-mail
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 rounded-xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium placeholder:text-gray-300"
                placeholder="email@exemplo.com"
              />
            </div>
          </div>
          <div className="col-span-12 md:col-span-8">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-1.5 block">
              Bairro
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MapPin className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <input
                required
                type="text"
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 rounded-xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium placeholder:text-gray-300"
                placeholder="Ex: Centro, Bairro Sul, etc."
              />
            </div>
          </div>

          <div className="col-span-12 md:col-span-4">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-1.5 block">
              Data de Nascimento
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <input
                required
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 rounded-xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium"
              />
            </div>
          </div>

          <div className="col-span-12 md:col-span-6">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-1.5 block">
              Título de Eleitor
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Hash className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <input
                type="text"
                maxLength={12}
                value={formData.voterId}
                onChange={(e) => setFormData({ ...formData, voterId: e.target.value.replace(/\D/g, '') })}
                className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 rounded-xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium placeholder:text-gray-300"
                placeholder="0000 0000 0000"
              />
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-1.5 block">
              Seção
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Hash className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <input
                type="text"
                maxLength={4}
                value={formData.voterSection}
                onChange={(e) => setFormData({ ...formData, voterSection: e.target.value.replace(/\D/g, '') })}
                className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 rounded-xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium placeholder:text-gray-300"
                placeholder="0000"
              />
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-1.5 block">
              Zona
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Hash className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <input
                type="text"
                maxLength={3}
                value={formData.voterZone}
                onChange={(e) => setFormData({ ...formData, voterZone: e.target.value.replace(/\D/g, '') })}
                className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 rounded-xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium placeholder:text-gray-300"
                placeholder="000"
              />
            </div>
          </div>

          <div className="col-span-12 md:col-span-6">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-1.5 block">
              Gênero
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Users className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <select
                required
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 rounded-xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium appearance-none cursor-pointer"
              >
                <option value="">Selecione...</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>
          <div className="col-span-12 md:col-span-6">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-1.5 block">
              Coordenador Responsável
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <ShieldCheck className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <select
                value={formData.coordinatorId}
                onChange={(e) => setFormData({ ...formData, coordinatorId: e.target.value })}
                className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 rounded-xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium appearance-none cursor-pointer"
              >
                <option value="">Selecione o Coordenador...</option>
                {coordinators.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.neighborhood})</option>
                ))}
              </select>
            </div>
          </div>

          {/* GPS Location Capture */}
          <div className="col-span-12 md:col-span-6">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-1.5 block">
              Localização da Abordagem (GPS)
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isGettingLocation}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 border-2 border-gov-blue bg-white font-black uppercase text-[10px] tracking-widest text-gov-blue hover:bg-gov-blue hover:text-white transition-all rounded-full ${isGettingLocation ? 'opacity-50' : ''}`}
              >
                {isGettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                {formData.latitude && formData.longitude ? 'GPS Capturado' : 'Capturar Meu GPS'}
              </button>
              {formData.latitude && formData.longitude && (
                <div className="flex-1 flex flex-col justify-center px-4 bg-green-50 border-2 border-green-200 rounded-2xl">
                  <span className="text-[8px] font-black text-green-600 uppercase">Coordenadas Salvas</span>
                  <span className="text-[10px] font-bold text-green-700">{formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Audio to Text Observations */}
          <div className="col-span-12">
            <label className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black text-gov-blue uppercase tracking-widest">Observações de Campo</span>
              <button
                type="button"
                onClick={handleDictation}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                  isListening ? 'bg-red-100 text-red-600 border border-red-200 animate-pulse' : 'bg-gov-yellow/20 text-yellow-700 border border-gov-yellow hover:bg-gov-yellow/40'
                }`}
              >
                {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                {isListening ? 'Gravando...' : 'Digitar por Voz'}
              </button>
            </label>
            <div className="relative group">
              <div className="absolute top-4 left-0 pl-4 pointer-events-none">
                <FileText className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <textarea
                rows={3}
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 rounded-xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium placeholder:text-gray-300 resize-none"
                placeholder={isListening ? "Fale agora que a IA vai digitar tudo..." : "Anotações sobre a visita ao eleitor, demandas solicitadas, etc..."}
              />
            </div>
          </div>

        </div>

        <div className="flex justify-between items-center pt-6 border-t border-gray-100 rounded-2xl">
          <button
            type="button"
            onClick={onCancel}
            className="px-8 py-3 text-gov-blue/50 font-black hover:text-gov-blue transition-all uppercase tracking-widest text-xs"
          >
            Voltar para Lista
          </button>
          
          <div className="flex gap-6">
            <button
              type="button"
              onClick={() => setFormData(initialState)}
              className="px-8 py-3 text-gov-blue font-black border-2 border-gov-blue rounded-full hover:bg-gov-bg transition-all uppercase tracking-widest text-xs"
            >
              Limpar
            </button>
            <button
              type="submit"
              className="px-12 py-3 bg-gov-yellow text-gov-blue font-black rounded-full shadow-md hover:bg-yellow-300 transition-all flex items-center gap-2 uppercase tracking-widest text-xs"
            >
              <Save className="w-4 h-4" />
              {initialData ? 'Atualizar Registro' : 'Salvar Registro'}
            </button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
