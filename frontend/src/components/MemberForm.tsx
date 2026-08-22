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
  geminiApiKey?: string; // Chave Gemini exclusiva da campanha (multi-tenant)
}

export default function MemberForm({ onSave, onCancel, initialData, coordinators = [], networkId, geminiApiKey }: MemberFormProps) {
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
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);

  // Reconhecimento de voz dedicado para qualquer campo individual
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

        if (errors[field]) {
          setErrors(prev => {
            const copy = { ...prev };
            delete copy[field];
            return copy;
          });
        }
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

    if (isListening) return;

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
          const apiKey = geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY || 'AIzaSyCesNHyiM3GEM7eGzCAhQiY3T3zOxYZqy4';
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
    
    setTimeout(() => {
      try { recognition.stop(); } catch(e) {}
    }, 15000);
  };

  // Leitura inteligente de foto do Título de Eleitor (Engine Principal: Tesseract OCR Local)
  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input para permitir nova leitura do mesmo arquivo
    e.target.value = '';

    setIsScanning(true);
    setScanFeedback('Otimizando imagem do documento...');

    try {
      // ETAPA 1: Comprimir e pré-processar imagem no Canvas com alto contraste
      const { base64Data, dataUrl } = await new Promise<{ base64Data: string; dataUrl: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDim = 1800;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // Desenha com filtro de nitidez para documentos
              ctx.filter = 'contrast(1.3) brightness(1.05)';
              ctx.drawImage(img, 0, 0, width, height);
              const url = canvas.toDataURL('image/jpeg', 0.92);
              resolve({ base64Data: url.split(',')[1], dataUrl: url });
            } else {
              const raw = readerEvent.target?.result as string;
              resolve({ base64Data: raw.split(',')[1], dataUrl: raw });
            }
          };
          img.onerror = reject;
          img.src = readerEvent.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      let extractedData: any = null;

      // ETAPA 2: Gemini Vision AI (SOMENTE se usuário configurou sua própria chave válida)
      const userApiKey = geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY;
      const isValidKey = userApiKey && userApiKey.length > 20 && !userApiKey.includes('MY_GEMINI') && !userApiKey.includes('AIzaSyCesNHy');

      if (isValidKey) {
        setScanFeedback('IA analisando documento...');
        const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash'];
        const prompt = `Analise a foto deste documento brasileiro (Título de Eleitor, e-Título, RG ou CNH).
Extraia os dados e retorne APENAS um JSON puro sem crases ou markdown:
{"name":"Nome Completo","voterId":"12 dígitos do título","voterZone":"número da zona","voterSection":"número da seção","birthDate":"YYYY-MM-DD","neighborhood":"Município","gender":"Masculino ou Feminino"}`;

        for (const model of modelsToTry) {
          if (extractedData?.name) break;
          try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${userApiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: base64Data } }] }] })
            });
            if (response.ok) {
              const json = await response.json();
              const txt = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
              const m = txt.match(/\{[\s\S]*\}/);
              if (m) extractedData = JSON.parse(m[0]);
            }
          } catch (err) {
            console.warn(`Gemini ${model} falhou:`, err);
          }
        }
      }

      // ETAPA 3: Tesseract OCR Local (Engine principal — funciona offline, sem API)
      if (!extractedData || !extractedData.name) {
        setScanFeedback('Lendo documento com OCR...');
        try {
          let worker;
          try {
            worker = await createWorker('por');
          } catch {
            worker = await createWorker('eng');
          }

          const { data: { text } } = await worker.recognize(dataUrl);
          await worker.terminate();

          console.log('[OCR Raw Text]:', text);

          const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
          let name = '';
          let voterId = '';
          let voterZone = '';
          let voterSection = '';
          let birthDate = '';
          let neighborhood = '';

          const IGNORE = ['REPUBLICA','REPÚBLICA','FEDERATIVA','BRASIL','JUSTIÇA','JUSTICA',
            'ELEITORAL','TÍTULO','TITULO','ELEITOR','TRIBUNAL','SUPERIOR','PODER',
            'JUDICIÁRIO','JUDICIARIO','DOCUMENTO','IDENTIFICAÇÃO','IDENTIFICACAO',
            'VALE','COMO','PROVA','QUITAÇÃO','QUITACAO','ASSINATURA','PORTADOR','VIA','DIGITAL'];

          // Busca Nome (linha abaixo de "NOME" ou "NOME DO ELEITOR")
          for (let i = 0; i < lines.length; i++) {
            const up = lines[i].toUpperCase().replace(/[^A-Z\s]/g, '').trim();
            if (up === 'NOME' || up === 'NOME DO ELEITOR' || lines[i].toUpperCase().startsWith('NOME:')) {
              const candidate = lines[i].includes(':') ? lines[i].split(':').slice(1).join(':').trim() : (lines[i + 1] || '');
              if (candidate && candidate.length > 3 && /[A-ZÀ-Ú]/i.test(candidate)) {
                name = candidate.trim();
              }
              break;
            }
          }

          // Fallback nome: linha maiúscula com 2-6 palavras que não seja cabeçalho
          if (!name) {
            for (const line of lines) {
              const words = line.trim().split(/\s+/);
              const isHeader = words.some(w => IGNORE.includes(w.toUpperCase().replace(/[^A-Z]/g, '')));
              const isAllAlpha = /^[A-ZÀ-Ú\s\.]+$/i.test(line.trim());
              if (!isHeader && isAllAlpha && words.length >= 2 && words.length <= 6 && line.trim().length > 4) {
                name = line.trim();
                break;
              }
            }
          }

          // Busca número do Título (12 dígitos, podendo ter espaços entre grupos de 4)
          const voterIdMatch = text.match(/\b(\d{4})\s*(\d{4})\s*(\d{4})\b/);
          if (voterIdMatch) {
            voterId = (voterIdMatch[1] + voterIdMatch[2] + voterIdMatch[3]).slice(0, 12);
          } else {
            // Busca 10-13 dígitos consecutivos como fallback
            const longNum = text.match(/\b(\d{10,13})\b/);
            if (longNum) voterId = longNum[1].slice(0, 12);
          }

          // Busca Data de Nascimento DD/MM/YYYY
          const bMatch = text.match(/\b(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{4})\b/);
          if (bMatch) {
            const [, d, m, y] = bMatch;
            const di = parseInt(d), mi = parseInt(m), yi = parseInt(y);
            if (di >= 1 && di <= 31 && mi >= 1 && mi <= 12 && yi >= 1920 && yi <= 2026) {
              birthDate = `${y}-${m}-${d}`;
            }
          }

          // Busca Zona e Seção juntas (formato e-Título: "ZONA SEÇÃO\n015 0456")
          for (let i = 0; i < lines.length; i++) {
            const up = lines[i].toUpperCase();
            if (up.includes('ZONA') && (up.includes('SEÇÃO') || up.includes('SECAO') || up.includes('SEÇAO'))) {
              const next = lines[i + 1] || '';
              const nums = next.match(/\b(\d{1,4})\b/g);
              if (nums && nums.length >= 2) {
                voterZone = nums[0].padStart(3, '0');
                voterSection = nums[1].padStart(4, '0');
                break;
              }
            }
          }

          if (!voterZone) {
            const zm = text.match(/ZONA\s*[:\-\s]*(\d{1,4})/i);
            if (zm) voterZone = zm[1].padStart(3, '0');
          }
          if (!voterSection) {
            const sm = text.match(/SE[ÇC][ÃA]O\s*[:\-\s]*(\d{1,4})/i);
            if (sm) voterSection = sm[1].padStart(4, '0');
          }

          // Busca Município
          for (let i = 0; i < lines.length; i++) {
            const up = lines[i].toUpperCase();
            if (up.includes('MUNIC') || up.includes('CIDADE')) {
              const val = lines[i].includes(':') ? lines[i].split(':').slice(1).join(':') : (lines[i + 1] || '');
              neighborhood = val.replace(/\/.*$/, '').trim();
              break;
            }
          }

          extractedData = { name, voterId, voterZone, voterSection, birthDate, neighborhood };
        } catch (tessErr) {
          console.error('Erro Tesseract OCR:', tessErr);
        }
      }

      // ETAPA 4: Preencher formulário com o que foi reconhecido
      const hasAnyData = extractedData && (
        extractedData.name || extractedData.voterId || extractedData.voterZone ||
        extractedData.voterSection || extractedData.birthDate
      );

      if (hasAnyData) {
        setFormData(prev => ({
          ...prev,
          name: extractedData.name ? extractedData.name.trim() : prev.name,
          voterId: extractedData.voterId ? extractedData.voterId.replace(/\D/g, '').slice(0, 12) : prev.voterId,
          voterSection: extractedData.voterSection ? extractedData.voterSection.replace(/\D/g, '').slice(0, 4) : prev.voterSection,
          voterZone: extractedData.voterZone ? extractedData.voterZone.replace(/\D/g, '').slice(0, 3) : prev.voterZone,
          birthDate: extractedData.birthDate || prev.birthDate,
          neighborhood: extractedData.neighborhood ? extractedData.neighborhood.trim() : prev.neighborhood,
          gender: extractedData.gender || prev.gender,
        }));

        const preenchidos = [
          extractedData.name && 'Nome',
          extractedData.voterId && 'Título',
          extractedData.voterZone && 'Zona',
          extractedData.voterSection && 'Seção',
          extractedData.birthDate && 'Nascimento',
        ].filter(Boolean);

        if (preenchidos.length === 5) {
          setScanFeedback('✨ Documento lido com sucesso! Todos os campos preenchidos.');
        } else {
          setScanFeedback(`📋 Leitura parcial: ${preenchidos.join(', ')} identificados. Verifique os campos em branco.`);
        }
        setTimeout(() => setScanFeedback(null), 7000);
      } else {
        setScanFeedback('⚠️ Não foi possível ler o documento. Verifique a iluminação e tente uma foto mais nítida.');
        setTimeout(() => setScanFeedback(null), 6000);
      }

    } catch (error) {
      console.error('Erro no OCR:', error);
      alert('Não foi possível processar a imagem. Certifique-se de que a foto está bem iluminada e nítida.');
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const urlOrg = new URLSearchParams(window.location.search).get('org');
              const orgParam = urlOrg ? `&org=${urlOrg}` : '';
              const coordParam = networkId ? `&coord=${networkId}` : '';
              const link = `${window.location.origin}?public=true${orgParam}${coordParam}`;
              navigator.clipboard.writeText(link);
              alert('✅ Link do formulário público copiado para a área de transferência:\n\n' + link);
            }}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-gov-yellow hover:text-white transition-all text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 rounded-xl shadow-sm"
            title="Copiar link direto para envio aos eleitores"
          >
            <Sparkles className="w-3.5 h-3.5" /> Copiar Link Público
          </button>
          <div className="text-right hidden md:block">
            <span className="text-6xl font-black text-white/10 leading-none select-none">
              {initialData ? '02' : '01'}
            </span>
          </div>
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

          <div className="bg-gray-50 p-6 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-4 group hover:border-gov-yellow transition-all rounded-2xl">
            <input
              type="file"
              id="voter-card-scan"
              accept="image/*,.jpg,.jpeg,.png,.webp,.bmp"
              onChange={handleScan}
              className="hidden"
            />
            <label
              htmlFor="voter-card-scan"
              className={`flex items-center gap-3 px-6 py-4 bg-white border-2 border-gray-300 text-gray-700 font-black uppercase text-xs tracking-widest shadow-sm hover:bg-gray-100 transition-all w-full justify-center rounded-full cursor-pointer ${isScanning ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {isScanning ? (
                <Loader2 className="w-5 h-5 animate-spin text-gov-blue" />
              ) : (
                <Camera className="w-5 h-5 text-gov-blue" />
              )}
              {isScanning ? 'Lendo Título de Eleitor...' : 'Escanear Foto do Título'}
            </label>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center px-4">
              Carregue ou fotografe o Título de Eleitor para preencher Nome, Título, Seção e Data.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-y-6 gap-x-6">
          {/* Nome Completo */}
          <div className="col-span-12 md:col-span-8">
            <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${errors.name ? 'text-red-500' : 'text-gov-blue'}`}>
              Nome Completo
            </label>
            <div className="relative group flex items-center">
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
                className={`block w-full pl-12 pr-12 py-3.5 border-2 rounded-2xl focus:bg-white outline-none transition-all font-medium placeholder:text-gray-300 ${
                  errors.name ? 'border-red-200 bg-red-50 focus:border-red-500' : 'border-gray-100 focus:border-gov-yellow bg-gray-50'
                }`}
                placeholder="Digite o nome completo"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={() => startFieldDictation('name')}
                  title={activeVoiceField === 'name' ? 'Ouvindo... Fale o nome' : 'Preencher Nome por voz'}
                  className={`p-2 rounded-full transition-all ${
                    activeVoiceField === 'name' ? 'bg-red-500 text-white animate-pulse shadow-md' : 'text-gray-400 hover:text-gov-blue hover:bg-gray-200/50'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>
            {errors.name && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter italic">{errors.name}</p>}
          </div>

          {/* Telefone */}
          <div className="col-span-12 md:col-span-4">
            <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${errors.phone ? 'text-red-500' : 'text-gov-blue'}`}>
              Telefone
            </label>
            <div className="relative group flex items-center">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className={`h-4 w-4 ${errors.phone ? 'text-red-300' : 'text-gov-blue/30 group-focus-within:text-gov-blue'} transition-colors`} />
              </div>
              <input
                required
                type="tel"
                maxLength={15}
                value={formData.phone}
                onChange={handlePhoneChange}
                className={`block w-full pl-12 pr-12 py-3.5 border-2 rounded-2xl focus:bg-white outline-none transition-all font-medium placeholder:text-gray-300 ${
                  errors.phone ? 'border-red-200 bg-red-50 focus:border-red-500' : 'border-gray-100 focus:border-gov-yellow bg-gray-50'
                }`}
                placeholder="(00) 00000-0000"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={() => startFieldDictation('phone')}
                  title={activeVoiceField === 'phone' ? 'Ouvindo... Fale o telefone' : 'Preencher Telefone por voz'}
                  className={`p-2 rounded-full transition-all ${
                    activeVoiceField === 'phone' ? 'bg-red-500 text-white animate-pulse shadow-md' : 'text-gray-400 hover:text-gov-blue hover:bg-gray-200/50'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>
            {errors.phone && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter italic">{errors.phone}</p>}
          </div>

          {/* E-mail */}
          <div className="col-span-12 md:col-span-8">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-1.5 block">
              E-mail
            </label>
            <div className="relative group flex items-center">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="block w-full pl-12 pr-12 py-3.5 border-2 border-gray-100 rounded-2xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium placeholder:text-gray-300"
                placeholder="email@exemplo.com"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={() => startFieldDictation('email')}
                  title={activeVoiceField === 'email' ? 'Ouvindo... Fale o email' : 'Preencher E-mail por voz'}
                  className={`p-2 rounded-full transition-all ${
                    activeVoiceField === 'email' ? 'bg-red-500 text-white animate-pulse shadow-md' : 'text-gray-400 hover:text-gov-blue hover:bg-gray-200/50'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Bairro */}
          <div className="col-span-12 md:col-span-8">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-1.5 block">
              Bairro
            </label>
            <div className="relative group flex items-center">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MapPin className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <input
                required
                type="text"
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                className="block w-full pl-12 pr-12 py-3.5 border-2 border-gray-100 rounded-2xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium placeholder:text-gray-300"
                placeholder="Ex: Centro, Bairro Sul, etc."
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={() => startFieldDictation('neighborhood')}
                  title={activeVoiceField === 'neighborhood' ? 'Ouvindo... Fale o bairro' : 'Preencher Bairro por voz'}
                  className={`p-2 rounded-full transition-all ${
                    activeVoiceField === 'neighborhood' ? 'bg-red-500 text-white animate-pulse shadow-md' : 'text-gray-400 hover:text-gov-blue hover:bg-gray-200/50'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Data de Nascimento */}
          <div className="col-span-12 md:col-span-4">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-1.5 block">
              Data de Nascimento
            </label>
            <div className="relative group flex items-center">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <input
                required
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="block w-full pl-12 pr-12 py-3.5 border-2 border-gray-100 rounded-2xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={() => startFieldDictation('birthDate')}
                  title={activeVoiceField === 'birthDate' ? 'Ouvindo... Diga dia, mês e ano' : 'Preencher Data por voz'}
                  className={`p-2 rounded-full transition-all ${
                    activeVoiceField === 'birthDate' ? 'bg-red-500 text-white animate-pulse shadow-md' : 'text-gray-400 hover:text-gov-blue hover:bg-gray-200/50'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Título de Eleitor (com Foto e Voz) */}
          <div className="col-span-12 md:col-span-6">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest block">
                Título de Eleitor
              </label>
              <button
                type="button"
                onClick={() => document.getElementById('voter-card-scan')?.click()}
                className="text-[9px] font-black text-gov-blue hover:text-blue-700 uppercase flex items-center gap-1 bg-gov-blue/10 px-2 py-0.5 rounded-lg transition-all"
              >
                <Camera className="w-3 h-3" /> Auto-preencher por Foto
              </button>
            </div>
            <div className="relative group flex items-center">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Hash className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <input
                type="text"
                maxLength={12}
                value={formData.voterId}
                onChange={(e) => setFormData({ ...formData, voterId: e.target.value.replace(/\D/g, '') })}
                className="block w-full pl-12 pr-20 py-3.5 border-2 border-gray-100 rounded-2xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium placeholder:text-gray-300"
                placeholder="0000 0000 0000"
              />
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => document.getElementById('voter-card-scan')?.click()}
                  title="Tirar foto do Título para ler automaticamente"
                  className="p-1.5 bg-gov-blue text-white hover:bg-blue-800 rounded-lg transition-all flex items-center gap-1 text-[9px] font-black uppercase"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Foto</span>
                </button>
                <button
                  type="button"
                  onClick={() => startFieldDictation('voterId')}
                  title={activeVoiceField === 'voterId' ? 'Ouvindo... Fale os números do título' : 'Preencher Título por voz'}
                  className={`p-2 rounded-full transition-all ${
                    activeVoiceField === 'voterId' ? 'bg-red-500 text-white animate-pulse shadow-md' : 'text-gray-400 hover:text-gov-blue hover:bg-gray-200/50'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Seção */}
          <div className="col-span-12 md:col-span-3">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-1.5 block">
              Seção
            </label>
            <div className="relative group flex items-center">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Hash className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <input
                type="text"
                maxLength={4}
                value={formData.voterSection}
                onChange={(e) => setFormData({ ...formData, voterSection: e.target.value.replace(/\D/g, '') })}
                className="block w-full pl-12 pr-12 py-3.5 border-2 border-gray-100 rounded-2xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium placeholder:text-gray-300"
                placeholder="0000"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={() => startFieldDictation('voterSection')}
                  title={activeVoiceField === 'voterSection' ? 'Ouvindo... Fale o número da seção' : 'Preencher Seção por voz'}
                  className={`p-2 rounded-full transition-all ${
                    activeVoiceField === 'voterSection' ? 'bg-red-500 text-white animate-pulse shadow-md' : 'text-gray-400 hover:text-gov-blue hover:bg-gray-200/50'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Zona */}
          <div className="col-span-12 md:col-span-3">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-1.5 block">
              Zona
            </label>
            <div className="relative group flex items-center">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Hash className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <input
                type="text"
                maxLength={4}
                value={formData.voterZone}
                onChange={(e) => setFormData({ ...formData, voterZone: e.target.value.replace(/\D/g, '') })}
                className="block w-full pl-12 pr-12 py-3.5 border-2 border-gray-100 rounded-2xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium placeholder:text-gray-300"
                placeholder="000"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={() => startFieldDictation('voterZone')}
                  title={activeVoiceField === 'voterZone' ? 'Ouvindo... Fale o número da zona' : 'Preencher Zona por voz'}
                  className={`p-2 rounded-full transition-all ${
                    activeVoiceField === 'voterZone' ? 'bg-red-500 text-white animate-pulse shadow-md' : 'text-gray-400 hover:text-gov-blue hover:bg-gray-200/50'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Gênero */}
          <div className="col-span-12 md:col-span-6">
            <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest mb-1.5 block">
              Gênero
            </label>
            <div className="relative group flex items-center">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Users className="h-4 w-4 text-gov-blue/30 group-focus-within:text-gov-blue transition-colors" />
              </div>
              <select
                required
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="block w-full pl-12 pr-12 py-3.5 border-2 border-gray-100 rounded-2xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium appearance-none cursor-pointer"
              >
                <option value="">Selecione...</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={() => startFieldDictation('gender')}
                  title={activeVoiceField === 'gender' ? 'Ouvindo... Diga Masculino ou Feminino' : 'Preencher Gênero por voz'}
                  className={`p-2 rounded-full transition-all ${
                    activeVoiceField === 'gender' ? 'bg-red-500 text-white animate-pulse shadow-md' : 'text-gray-400 hover:text-gov-blue hover:bg-gray-200/50'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Coordenador */}
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
                className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 rounded-2xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium appearance-none cursor-pointer"
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
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 border-2 border-gov-blue bg-white font-black uppercase text-[10px] tracking-widest text-gov-blue hover:bg-gov-blue hover:text-white transition-all rounded-2xl ${isGettingLocation ? 'opacity-50' : ''}`}
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

          {/* Observações de Campo */}
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
                className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-100 rounded-2xl focus:border-gov-yellow focus:bg-white outline-none bg-gray-50 transition-all font-medium placeholder:text-gray-300 resize-none"
                placeholder={isListening ? "Fale agora que a IA vai digitar tudo..." : "Anotações sobre a visita ao eleitor, demandas solicitadas, etc..."}
              />
            </div>
          </div>

        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-100 rounded-2xl">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 sm:px-8 py-3 text-gov-blue/50 font-black hover:text-gov-blue transition-all uppercase tracking-widest text-xs rounded-xl text-center"
          >
            Voltar para Lista
          </button>
          
          <div className="flex w-full sm:w-auto gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setFormData(initialState)}
              className="flex-1 sm:flex-initial px-4 sm:px-8 py-3 text-gov-blue font-black border-2 border-gov-blue rounded-xl hover:bg-gov-bg transition-all uppercase tracking-widest text-xs text-center"
            >
              Limpar
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-initial px-6 sm:px-10 py-3 bg-gov-yellow text-gov-blue font-black rounded-xl shadow-md hover:bg-yellow-300 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs shrink-0"
            >
              <Save className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{initialData ? 'Atualizar Registro' : 'Salvar Registro'}</span>
            </button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
