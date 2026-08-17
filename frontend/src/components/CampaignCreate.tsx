import { useState } from 'react';
import { motion } from 'motion/react';
import { Building2, Mail, Phone, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CampaignCreateProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CampaignCreate({ onSuccess, onCancel }: CampaignCreateProps) {
  const [formData, setFormData] = useState({
    candidate_name: '',
    contact_email: '',
    contact_phone: '',
    city: '',
    party: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validar campos
      if (!formData.candidate_name || !formData.contact_email || !formData.contact_phone) {
        setError('Por favor, preencha todos os campos obrigatórios.');
        setLoading(false);
        return;
      }

      // Criar organização com status pending
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert([{
          candidate_name: formData.candidate_name,
          subscription_status: 'pending',
          subdomain: formData.candidate_name.toLowerCase().replace(/\s+/g, '-').substring(0, 20)
        }])
        .select()
        .single();

      if (orgError) throw orgError;

      // Enviar notificação por WhatsApp
      await sendWhatsAppNotification(orgData);

      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 3000);
    } catch (err: any) {
      console.error('Erro ao criar campanha:', err);
      setError('Erro ao criar campanha. Tente novamente ou entre em contato pelo WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppNotification = async (org: any) => {
    const message = `🚀 *NOVA CAMPANHA CRIADA*\n\n` +
      `📛 *Candidato:* ${org.candidate_name}\n` +
      `📧 *Email:* ${formData.contact_email}\n` +
      `📱 *Telefone:* ${formData.contact_phone}\n` +
      `🏙️ *Cidade:* ${formData.city || 'Não informado'}\n` +
      `🎯 *Partido:* ${formData.party || 'Não informado'}\n` +
      `🆔 *ID:* ${org.id}\n` +
      `📅 *Data:* ${new Date().toLocaleString('pt-BR')}\n\n` +
      `⚠️ *Aguardando ativação manual*`;

    const whatsappUrl = `https://wa.me/5591993837093?text=${encodeURIComponent(message)}`;

    // Abrir WhatsApp em nova aba
    window.open(whatsappUrl, '_blank');
  };

  if (success) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md mx-auto text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </motion.div>
        <h2 className="text-2xl font-black text-green-600 uppercase mb-4">Campanha Criada!</h2>
        <p className="text-sm font-bold text-gray-600 mb-6">
          Sua campanha foi criada com sucesso e uma notificação foi enviada para ativação.
        </p>
        <p className="text-xs font-bold text-gray-400 mb-4">
          Você receberá um email quando a campanha for ativada.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="bg-green-600 text-white font-black py-3 rounded-xl uppercase text-sm hover:bg-green-700 transition-all"
        >
          Criar Outra Campanha
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md mx-auto">
      <div className="text-center mb-6">
        <Building2 className="w-12 h-12 text-gov-blue mx-auto mb-3" />
        <h2 className="text-2xl font-black text-gov-blue uppercase">Criar Nova Campanha</h2>
        <p className="text-xs font-bold text-gray-400 mt-2">Preencha os dados abaixo para solicitar sua campanha</p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-red-50 text-red-700 p-3 rounded-xl border-l-4 border-red-500 text-xs font-bold uppercase mb-4 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
            Nome do Candidato *
          </label>
          <input
            type="text"
            required
            value={formData.candidate_name}
            onChange={(e) => setFormData({...formData, candidate_name: e.target.value})}
            className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-gov-blue outline-none font-bold text-sm"
            placeholder="Nome completo do candidato"
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
            Email de Contato *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              required
              value={formData.contact_email}
              onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
              className="w-full pl-10 pr-3 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-gov-blue outline-none font-bold text-sm"
              placeholder="email@exemplo.com"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
            Telefone *
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="tel"
              required
              value={formData.contact_phone}
              onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
              className="w-full pl-10 pr-3 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-gov-blue outline-none font-bold text-sm"
              placeholder="(91) 99999-9999"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
            Cidade
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({...formData, city: e.target.value})}
            className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-gov-blue outline-none font-bold text-sm"
            placeholder="Cidade da campanha"
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
            Partido
          </label>
          <input
            type="text"
            value={formData.party}
            onChange={(e) => setFormData({...formData, party: e.target.value})}
            className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-gov-blue outline-none font-bold text-sm"
            placeholder="Sigla do partido"
          />
        </div>

        <div className="pt-4 space-y-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gov-blue text-white font-black py-3 rounded-xl uppercase text-sm hover:bg-blue-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">Processando...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Solicitar Campanha
              </>
            )}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full bg-gray-100 text-gray-500 font-black py-3 rounded-xl uppercase text-sm hover:bg-gray-200 transition-all"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <p className="text-[10px] font-bold text-gray-400 text-center mt-4">
        Após criar, você receberá notificação para ativação
      </p>
    </div>
  );
}
