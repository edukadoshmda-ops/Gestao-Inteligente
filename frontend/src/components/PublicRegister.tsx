import { useState, useEffect } from 'react';
import { Member, Organization } from '../types';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { Save, Phone, Users, Hash, Mail, CheckCircle, Camera, Loader2, ArrowLeft } from 'lucide-react';
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
    try {
      const worker = await createWorker('por');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

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
      org_id: org?.id // Vinculo automático com a campanha
    };

    // Salvar no Supabase (Multi-tenant)
    if (supabase) {
      const { error } = await supabase.from('members').insert([newMember]);
      if (error) {
        console.error('Erro ao salvar no Supabase:', error);
        alert('Erro ao enviar cadastro. Tente novamente.');
        return;
      }
    } else {
      // Fallback para Offline (IndexedDB)
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
          <div className="bg-gray-50 p-6 border-2 border-dashed border-gov-blue/20 flex flex-col items-center justify-center gap-4 text-center rounded-xl">
             <p className="text-[9px] font-black uppercase text-gov-blue/50 tracking-widest">Atalhão: Fotografe seu título para preencher sozinho</p>
            <input type="file" id="public-scan" accept="image/*" capture="environment" onChange={handleScan} className="hidden" />
            <button
              type="button"
              disabled={isScanning}
              onClick={() => document.getElementById('public-scan')?.click()}
              className="flex items-center gap-3 px-6 py-3 bg-white border-2 border-gov-blue font-black uppercase text-[10px] tracking-widest hover:bg-gov-blue hover:text-white transition-all shadow-md rounded-full"
            >
              {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-gov-yellow" />}
              {isScanning ? 'Lendo dados...' : 'Escanear Título'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-[9px] font-black uppercase text-gov-blue tracking-widest mb-1.5 block">Nome Completo</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm rounded-2xl" />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-gov-blue tracking-widest mb-1.5 block">Telefone (WhatsApp)</label>
              <input required value={formData.phone} onChange={handlePhoneChange} className="w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm rounded-full" />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-gov-blue tracking-widest mb-1.5 block">Data de Nascimento</label>
              <input required type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm rounded-full" />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-gov-blue tracking-widest mb-1.5 block">E-mail</label>
              <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm rounded-2xl" />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-gov-blue tracking-widest mb-1.5 block">Gênero</label>
              <select required value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm appearance-none rounded-full">
                <option value="">Selecione...</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-gov-blue tracking-widest mb-1.5 block">Título de Eleitor</label>
              <input value={formData.voterId} onChange={e => setFormData({...formData, voterId: e.target.value.replace(/\D/g, '')})} className="w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase text-gov-blue tracking-widest mb-1.5 block">Seção</label>
                <input value={formData.voterSection} onChange={e => setFormData({...formData, voterSection: e.target.value.replace(/\D/g, '')})} className="w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm rounded-full" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-gov-blue tracking-widest mb-1.5 block">Zona</label>
                <input value={formData.voterZone} onChange={e => setFormData({...formData, voterZone: e.target.value.replace(/\D/g, '')})} className="w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 outline-none focus:border-gov-yellow font-bold text-sm rounded-full" />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full py-4 bg-gov-yellow text-gov-blue font-black uppercase text-xs tracking-widest shadow-md hover:bg-yellow-300 transition-all border-b-4 border-gov-blue/20 rounded-full">
            Confirmar Apoio
          </button>
        </form>
        </motion.div>
      </div>
    );
  }
