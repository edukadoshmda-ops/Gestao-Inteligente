import { useState, useEffect } from 'react';
import { Megaphone, FileText, Image as ImageIcon, Plus, Trash2, Download, ExternalLink, Filter, MessageSquare, Save, Info, UploadCloud, FileUp, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { Announcement, Organization } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface MaterialsProps {
  isAdmin?: boolean;
  organization: Organization | null;
  org_id?: string;
}

const DEFAULT_MATERIALS: Announcement[] = [
  {
    id: 'mat-proj-1',
    title: 'PLANO DE GOVERNO & DIRETRIZES 2026',
    content: 'Diretrizes estratégicas, propostas prioritárias de saúde, educação, infraestrutura e segurança pública para a campanha eleitoral 2026.',
    category: 'project',
    priority: 'critical',
    active: true,
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    imageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
    createdAt: new Date().toISOString()
  },
  {
    id: 'mat-proj-2',
    title: 'PROJETO DE MOBILIZAÇÃO JOVEM & UNIVERSITÁRIA',
    content: 'Planejamento tático de engajamento nos polos universitários, grêmios e centros acadêmicos para ampliação da base.',
    category: 'project',
    priority: 'info',
    active: true,
    fileUrl: '',
    imageUrl: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=800&q=80',
    createdAt: new Date().toISOString()
  },
  {
    id: 'mat-ban-1',
    title: 'BANNER OFICIAL DE CAMPANHA (FEED & STORIES)',
    content: 'Kit oficial de artes em alta resolução para divulgação no Instagram, Facebook, WhatsApp e grupos de apoiadores.',
    category: 'banner',
    priority: 'info',
    active: true,
    fileUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
    createdAt: new Date().toISOString()
  },
  {
    id: 'mat-not-1',
    title: 'COMUNICADO: CRONOGRAMA DE CARREATAS E CAMINHADAS',
    content: 'Aviso urgente para toda a coordenação: concentração geral no sábado às 09h no comitê central para a grande caminhada.',
    category: 'notice',
    priority: 'warning',
    active: true,
    fileUrl: '',
    imageUrl: '',
    createdAt: new Date().toISOString()
  },
  {
    id: 'mat-fly-1',
    title: 'SANTINHO E PANFLETO DIGITAL 2026',
    content: 'Modelo de santinho oficial frente e verso pronto para impressão gráfica ou envio digital pelo WhatsApp para lideranças.',
    category: 'flyer',
    priority: 'info',
    active: true,
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    imageUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=800&q=80',
    createdAt: new Date().toISOString()
  }
];

export default function Materials({ isAdmin = true, organization, org_id }: MaterialsProps) {
  const currentOrgId = org_id || organization?.id || 'general';
  const STORAGE_KEY = `@AppGestao:materials_${currentOrgId}`;
  const TEMPLATES_KEY = `@AppGestao:whatsapp_templates_${currentOrgId}`;

  const [materials, setMaterials] = useState<Announcement[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<'materials' | 'whatsapp'>('materials');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [templates, setTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem(TEMPLATES_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      welcome_template: organization?.welcome_template || 'Olá {nome_eleitor}, seja muito bem-vindo à nossa campanha! Juntos construiremos uma cidade melhor. Conte com a gente!',
      birthday_template: organization?.birthday_template || 'Parabéns {nome_eleitor}! Toda a nossa equipe te deseja muita saúde, paz e realizações neste dia especial!'
    };
  });

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'project',
    imageUrl: '',
    fileUrl: '',
    priority: 'info'
  });

  const [isUploading, setIsUploading] = useState(false);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const saveMaterialsToLocal = (items: Announcement[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Erro ao salvar materiais no localStorage:', e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'imageUrl' | 'fileUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `materials/${fileName}`;

      let uploadedUrl = '';

      if (supabase) {
        try {
          const { data, error } = await supabase.storage
            .from('materials')
            .upload(filePath, file, { cacheControl: '3600', upsert: true });

          if (!error && data) {
            const { data: pubData } = supabase.storage.from('materials').getPublicUrl(filePath);
            uploadedUrl = pubData.publicUrl;
          }
        } catch (storageErr) {
          console.warn('Storage Supabase falhou, usando fallback Base64:', storageErr);
        }
      }

      if (!uploadedUrl) {
        uploadedUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      setFormData(prev => ({
        ...prev,
        [field]: uploadedUrl
      }));
      showFeedback('Arquivo carregado com sucesso!');
    } catch (err: any) {
      console.error('Erro no upload:', err);
      showFeedback('Não foi possível ler o arquivo. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const isImage = file.type.startsWith('image/');
      let finalUrl = '';

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `materials/${fileName}`;

      if (supabase) {
        try {
          const { error } = await supabase.storage
            .from('materials')
            .upload(filePath, file, { cacheControl: '3600', upsert: true });

          if (!error) {
            const { data: pubData } = supabase.storage.from('materials').getPublicUrl(filePath);
            finalUrl = pubData.publicUrl;
          }
        } catch {}
      }

      if (!finalUrl) {
        finalUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      let cat = categoryFilter === 'all' ? (isImage ? 'banner' : 'project') : categoryFilter;

      const newMaterial: Announcement = {
        id: crypto.randomUUID(),
        title: cleanName.toUpperCase(),
        content: `Arquivo enviado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        category: cat,
        imageUrl: isImage ? finalUrl : '',
        fileUrl: !isImage ? finalUrl : '',
        priority: 'info',
        active: true,
        org_id: organization?.id,
        createdAt: new Date().toISOString()
      };

      // 1. Atualizar state e localStorage imediatamente
      setMaterials(prev => {
        const updated = [newMaterial, ...prev];
        saveMaterialsToLocal(updated);
        return updated;
      });

      // 2. Persistir no Supabase
      try {
        const { error: dbError } = await supabase.from('announcements').insert([{
          id: newMaterial.id,
          title: newMaterial.title,
          content: newMaterial.content,
          category: newMaterial.category,
          imageUrl: newMaterial.imageUrl,
          fileUrl: newMaterial.fileUrl,
          priority: newMaterial.priority,
          active: true,
          org_id: organization?.id
        }]);

        if (dbError && supabaseAdmin && supabaseAdmin !== supabase) {
          await supabaseAdmin.from('announcements').insert([{
            id: newMaterial.id,
            title: newMaterial.title,
            content: newMaterial.content,
            category: newMaterial.category,
            imageUrl: newMaterial.imageUrl,
            fileUrl: newMaterial.fileUrl,
            priority: newMaterial.priority,
            active: true,
            org_id: organization?.id
          }]);
        }
      } catch (dbErr) {
        console.warn('Persistência Supabase falhou, mantido localmente:', dbErr);
      }

      showFeedback('🚀 Material publicado com sucesso!');
    } catch (err: any) {
      console.error('Erro no upload rápido:', err);
      alert('Erro ao processar o arquivo. Tente novamente.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [currentOrgId]);

  const fetchMaterials = async () => {
    setIsLoading(true);
    let cached: Announcement[] = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) cached = JSON.parse(saved);
    } catch {}

    try {
      let dbMaterials: any[] = [];
      if (supabase) {
        let query = supabase.from('announcements').select('*').order('createdAt', { ascending: false });
        if (organization?.id) {
          query = query.or(`org_id.eq.${organization.id},org_id.is.null`);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          dbMaterials = data;
        } else if (supabaseAdmin && supabaseAdmin !== supabase) {
          const { data: adminData } = await supabaseAdmin.from('announcements').select('*').order('createdAt', { ascending: false });
          if (adminData && adminData.length > 0) {
            dbMaterials = adminData;
          }
        }
      }

      if (dbMaterials.length > 0) {
        // Merge db com local
        const merged = [...dbMaterials];
        cached.forEach(c => {
          if (!merged.some(m => m.id === c.id)) merged.push(c);
        });
        setMaterials(merged);
        saveMaterialsToLocal(merged);
      } else if (cached.length > 0) {
        setMaterials(cached);
      } else {
        // Usa sementes padrão de campanha para não ficar vazio
        setMaterials(DEFAULT_MATERIALS);
        saveMaterialsToLocal(DEFAULT_MATERIALS);
      }
    } catch (err) {
      console.warn('Falha na busca remota de materiais, usando cache/padrão:', err);
      setMaterials(cached.length > 0 ? cached : DEFAULT_MATERIALS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplates = async () => {
    try {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));

      if (organization?.id && supabase) {
        const { error } = await supabase
          .from('organizations')
          .update({ 
            welcome_template: templates.welcome_template,
            birthday_template: templates.birthday_template
          })
          .eq('id', organization.id);
        
        if (error && supabaseAdmin && supabaseAdmin !== supabase) {
          await supabaseAdmin
            .from('organizations')
            .update({ 
              welcome_template: templates.welcome_template,
              birthday_template: templates.birthday_template
            })
            .eq('id', organization.id);
        }
      }
      showFeedback('✅ Templates de WhatsApp salvos com sucesso!');
    } catch (err) {
      console.warn('Erro ao salvar templates:', err);
      showFeedback('✅ Templates salvos na memória local!');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const newItem: Announcement = {
      id: crypto.randomUUID(),
      title: formData.title.trim().toUpperCase(),
      content: formData.content.trim(),
      category: formData.category,
      imageUrl: formData.imageUrl,
      fileUrl: formData.fileUrl,
      priority: formData.priority,
      active: true,
      org_id: organization?.id,
      createdAt: new Date().toISOString()
    };

    setMaterials(prev => {
      const updated = [newItem, ...prev];
      saveMaterialsToLocal(updated);
      return updated;
    });

    try {
      if (supabase) {
        const { error } = await supabase.from('announcements').insert([{
          id: newItem.id,
          title: newItem.title,
          content: newItem.content,
          category: newItem.category,
          imageUrl: newItem.imageUrl,
          fileUrl: newItem.fileUrl,
          priority: newItem.priority,
          active: true,
          org_id: organization?.id
        }]);

        if (error && supabaseAdmin && supabaseAdmin !== supabase) {
          await supabaseAdmin.from('announcements').insert([{
            id: newItem.id,
            title: newItem.title,
            content: newItem.content,
            category: newItem.category,
            imageUrl: newItem.imageUrl,
            fileUrl: newItem.fileUrl,
            priority: newItem.priority,
            active: true,
            org_id: organization?.id
          }]);
        }
      }
    } catch (err) {
      console.warn('Supabase insert falhou, salvo localmente:', err);
    }

    setIsAdding(false);
    setFormData({ title: '', content: '', category: 'project', imageUrl: '', fileUrl: '', priority: 'info' });
    showFeedback('🚀 Novo material cadastrado com sucesso!');
  };

  const handleDelete = async (id: string) => {
    setMaterials(prev => {
      const updated = prev.filter(m => m.id !== id);
      saveMaterialsToLocal(updated);
      return updated;
    });

    try {
      if (supabase) {
        const { error } = await supabase.from('announcements').delete().eq('id', id);
        if (error && supabaseAdmin && supabaseAdmin !== supabase) {
          await supabaseAdmin.from('announcements').delete().eq('id', id);
        }
      }
    } catch (err) {
      console.warn('Erro ao excluir material:', err);
    }
    showFeedback('🗑️ Material removido!');
  };

  const filteredMaterials = materials.filter(m => 
    categoryFilter === 'all' ? true : m.category === categoryFilter
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Toast de Feedback */}
      {feedbackMsg && (
        <div className="fixed top-6 right-6 z-50 bg-gov-blue text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-gov-yellow animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-gov-yellow shrink-0" />
          <span className="text-xs font-black uppercase tracking-wider">{feedbackMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white p-6 sm:p-8 border-b-4 border-gov-yellow shadow-xl rounded-2xl">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-8">
          <div>
            <h2 className="text-2xl font-black text-gov-blue uppercase tracking-tight flex items-center gap-3">
              <Megaphone className="w-8 h-8 text-gov-yellow" /> Comunicação & Marketing
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              Avisos, Banners e Projetos Estratégicos da Campanha
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:flex bg-gray-50 p-1 border-2 border-gray-100 rounded-2xl w-full lg:w-auto">
            <button 
              onClick={() => setActiveSubTab('materials')}
              className={`px-4 lg:px-6 py-3 text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 rounded-xl ${
                activeSubTab === 'materials' ? 'bg-gov-blue text-white shadow-lg' : 'text-gray-400 hover:bg-white'
              }`}
            >
              <FileText className="w-4 h-4" /> Arquivos
            </button>
            <button 
              onClick={() => setActiveSubTab('whatsapp')}
              className={`px-4 lg:px-6 py-3 text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 rounded-xl ${
                activeSubTab === 'whatsapp' ? 'bg-gov-blue text-white shadow-lg' : 'text-gray-400 hover:bg-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" /> WhatsApp
            </button>
          </div>
        </div>

        {activeSubTab === 'materials' && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
            <div className="flex flex-wrap gap-1.5 bg-gray-50 p-1.5 border-2 border-gray-100 w-full md:w-auto rounded-2xl">
               {[
                 { id: 'all', label: 'Tudo' },
                 { id: 'notice', label: 'Avisos' },
                 { id: 'banner', label: 'Banners' },
                 { id: 'flyer', label: 'Papel' },
                 { id: 'project', label: 'Projetos' }
               ].map(cat => (
                 <button
                   key={cat.id}
                   onClick={() => setCategoryFilter(cat.id)}
                   className={`px-3 py-2 text-[10px] font-black uppercase transition-all rounded-xl ${
                     categoryFilter === cat.id ? 'bg-gov-blue text-white shadow-md' : 'text-gray-400 hover:text-gov-blue hover:bg-white'
                   }`}
                 >
                   {cat.label}
                 </button>
               ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button 
                onClick={() => setIsAdding(true)}
                className="w-full sm:w-auto bg-gov-blue text-white px-5 py-3 font-black uppercase text-[10px] tracking-widest hover:bg-blue-800 transition-all shadow-lg flex items-center justify-center gap-2 rounded-2xl"
              >
                <Plus className="w-4 h-4 text-gov-yellow" /> Novo Material
              </button>
              <label className="w-full sm:w-auto bg-gov-yellow hover:bg-yellow-500 text-gov-blue px-5 py-3 font-black uppercase text-[10px] tracking-widest cursor-pointer transition-all shadow-lg flex items-center justify-center gap-2 select-none rounded-2xl">
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gov-blue" />
                ) : (
                  <UploadCloud className="w-4 h-4 text-gov-blue" />
                )}
                <span>{isUploading ? 'Enviando...' : 'Upload Rápido'}</span>
                <input 
                  type="file" 
                  className="hidden" 
                  disabled={isUploading} 
                  onChange={handleQuickUpload}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'materials' ? (
          <motion.div 
            key="materials-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Modal / Card de Cadastro */}
            {isAdding && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 sm:p-8 border-4 border-gov-blue shadow-2xl max-w-2xl mx-auto rounded-2xl"
              >
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-100">
                  <h3 className="text-xl font-black text-gov-blue uppercase">Cadastrar Novo Material</h3>
                  <button 
                    type="button" 
                    onClick={() => setIsAdding(false)} 
                    className="text-gray-400 hover:text-red-500 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                  {isUploading && (
                    <div className="bg-blue-50 border border-blue-100 p-4 flex items-center justify-center gap-3 rounded-2xl">
                      <Loader2 className="w-4 h-4 animate-spin text-gov-blue" />
                      <span className="text-[10px] font-black text-gov-blue uppercase">Processando arquivo...</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Título do Material / Aviso</label>
                      <input 
                        required 
                        value={formData.title} 
                        onChange={e => setFormData({...formData, title: e.target.value})} 
                        placeholder="Ex: DIRETRIZES DO PLANO DE GOVERNO 2026"
                        className="w-full bg-gray-50 border-2 border-gray-100 p-3 text-xs font-bold outline-none focus:border-gov-blue rounded-2xl" 
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Categoria</label>
                      <select 
                        required 
                        value={formData.category} 
                        onChange={e => setFormData({...formData, category: e.target.value})} 
                        className="w-full bg-gray-50 border-2 border-gray-100 p-3 text-xs font-bold outline-none focus:border-gov-blue rounded-2xl"
                      >
                        <option value="project">Projeto Estratégico</option>
                        <option value="notice">Aviso</option>
                        <option value="banner">Banner</option>
                        <option value="flyer">Papel / Panfleto</option>
                      </select>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Prioridade</label>
                      <select 
                        required 
                        value={formData.priority} 
                        onChange={e => setFormData({...formData, priority: e.target.value})} 
                        className="w-full bg-gray-50 border-2 border-gray-100 p-3 text-xs font-bold outline-none focus:border-gov-blue rounded-2xl"
                      >
                        <option value="info">Informativo (Padrão)</option>
                        <option value="warning">Alerta Importante</option>
                        <option value="critical">Crítico / Urgente</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Descrição / Conteúdo do Material</label>
                      <textarea 
                        required 
                        rows={3} 
                        value={formData.content} 
                        onChange={e => setFormData({...formData, content: e.target.value})} 
                        className="w-full bg-gray-50 border-2 border-gray-100 p-3 text-xs font-bold outline-none focus:border-gov-blue resize-none rounded-2xl" 
                        placeholder="Descreva as instruções, objetivos ou detalhes deste material..."
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Imagem de Capa (Banner/Foto)</label>
                      <div className="flex flex-col gap-3">
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 hover:border-gov-blue transition-all cursor-pointer p-4 bg-gray-50 hover:bg-blue-50/20 group relative overflow-hidden h-28 rounded-2xl">
                          {formData.imageUrl ? (
                            <div className="absolute inset-0 w-full h-full">
                              <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <UploadCloud className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          ) : (
                            <>
                              <UploadCloud className="w-6 h-6 text-gray-400 group-hover:text-gov-blue transition-colors mb-1.5" />
                              <span className="text-[9px] font-black text-gray-500 uppercase">Upload de Imagem</span>
                              <span className="text-[7px] text-gray-400 mt-0.5">PNG, JPG ou WebP</span>
                            </>
                          )}
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => handleFileUpload(e, 'imageUrl')} 
                            className="hidden" 
                            disabled={isUploading} 
                          />
                        </label>
                        {formData.imageUrl && (
                          <button 
                            type="button" 
                            onClick={() => setFormData({...formData, imageUrl: ''})} 
                            className="text-[8px] font-black text-red-500 uppercase text-left hover:underline"
                          >
                            Remover Imagem
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Arquivo para Baixar (PDF/DOC)</label>
                      <div className="flex flex-col gap-3">
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 hover:border-gov-blue transition-all cursor-pointer p-4 bg-gray-50 hover:bg-blue-50/20 group relative overflow-hidden h-28 rounded-2xl">
                          {formData.fileUrl ? (
                            <div className="flex flex-col items-center text-center">
                              <FileText className="w-6 h-6 text-gov-blue mb-1" />
                              <span className="text-[9px] font-black text-gov-blue uppercase max-w-[150px] truncate">Arquivo Carregado</span>
                              <span className="text-[7px] text-gray-400 mt-0.5">Clique para alterar</span>
                            </div>
                          ) : (
                            <>
                              <FileUp className="w-6 h-6 text-gray-400 group-hover:text-gov-blue transition-colors mb-1.5" />
                              <span className="text-[9px] font-black text-gray-500 uppercase">Upload de Arquivo</span>
                              <span className="text-[7px] text-gray-400 mt-0.5">PDF, DOC, ZIP ou Planilha</span>
                            </>
                          )}
                          <input 
                            type="file" 
                            onChange={(e) => handleFileUpload(e, 'fileUrl')} 
                            className="hidden" 
                            disabled={isUploading} 
                          />
                        </label>
                        {formData.fileUrl && (
                          <button 
                            type="button" 
                            onClick={() => setFormData({...formData, fileUrl: ''})} 
                            className="text-[8px] font-black text-red-500 uppercase text-left hover:underline"
                          >
                            Remover Arquivo
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                  <div className="flex gap-4">
                    <button type="submit" disabled={isUploading} className="flex-1 bg-gov-blue text-white py-4 font-black uppercase text-xs tracking-widest hover:bg-blue-800 shadow-xl disabled:opacity-50 rounded-2xl">
                      Salvar e Publicar
                    </button>
                    <button type="button" onClick={() => setIsAdding(false)} className="px-8 bg-gray-100 text-gray-500 font-black uppercase text-xs tracking-widest hover:bg-gray-200 rounded-2xl">
                      Cancelar
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Grid de Materiais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-1">
              {isLoading ? (
                <div className="col-span-full py-20 text-center animate-pulse">
                  <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-xs font-black uppercase text-gray-400 tracking-wider">Carregando materiais...</p>
                </div>
              ) : filteredMaterials.length === 0 ? (
                <div className="col-span-full py-16 bg-white border-2 border-dashed border-gray-200 text-center rounded-2xl p-8 space-y-4 shadow-sm">
                  <div className="w-16 h-16 bg-blue-50 text-gov-blue rounded-full flex items-center justify-center mx-auto">
                    <Megaphone className="w-8 h-8 text-gov-blue" />
                  </div>
                  <h4 className="text-base font-black text-gov-blue uppercase">
                    Nenhum material encontrado {categoryFilter !== 'all' && `nesta categoria (${categoryFilter})`}
                  </h4>
                  <p className="text-xs text-gray-400 font-bold max-w-md mx-auto">
                    Cadastre avisos, artes ou projetos estratégicos para mobilizar toda a campanha eleitoral.
                  </p>
                  <div className="flex justify-center gap-3 pt-2">
                    <button 
                      onClick={() => setIsAdding(true)} 
                      className="bg-gov-blue text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-800 shadow-md flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4 text-gov-yellow" /> Criar Material Agora
                    </button>
                  </div>
                </div>
              ) : (
                filteredMaterials.map(m => (
                  <motion.div 
                    layout 
                    key={m.id} 
                    className={`bg-white border-2 shadow-xl overflow-hidden group flex flex-col rounded-2xl transition-all hover:shadow-2xl ${
                      m.priority === 'critical' ? 'border-red-500' : m.priority === 'warning' ? 'border-yellow-500' : 'border-gov-blue/20'
                    }`}
                  >
                    {m.imageUrl && (
                      <div className="h-48 overflow-hidden relative bg-gray-100">
                        <img src={m.imageUrl} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                        <span className="absolute top-3 left-3 bg-gov-blue/90 backdrop-blur-sm text-white px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-lg">
                          {m.category === 'project' ? 'Projeto' : m.category === 'banner' ? 'Banner' : m.category === 'flyer' ? 'Papel' : 'Aviso'}
                        </span>
                      </div>
                    )}
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        {!m.imageUrl && (
                          <span className="inline-block bg-gov-blue/10 text-gov-blue px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-lg mb-3">
                            {m.category === 'project' ? 'Projeto Estratégico' : m.category === 'banner' ? 'Banner Oficial' : m.category === 'flyer' ? 'Material Impresso' : 'Aviso Geral'}
                          </span>
                        )}
                        <h4 className="font-black text-gov-blue uppercase mb-2 text-sm leading-snug">{m.title}</h4>
                        <p className="text-[11px] font-bold text-gray-500 leading-relaxed mb-6 line-clamp-3">{m.content}</p>
                      </div>

                      <div className="flex gap-2 pt-4 border-t border-gray-100 items-center justify-between">
                        {m.fileUrl ? (
                          <a 
                            href={m.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            download 
                            className="flex-1 bg-gov-blue hover:bg-blue-800 text-white py-2.5 text-[9px] font-black uppercase text-center rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5 text-gov-yellow" /> Baixar Arquivo
                          </a>
                        ) : m.imageUrl ? (
                          <a 
                            href={m.imageUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex-1 bg-gov-bg hover:bg-gray-200 text-gov-blue py-2.5 text-[9px] font-black uppercase text-center border border-gov-blue/10 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Ver Imagem
                          </a>
                        ) : (
                          <span className="text-[9px] font-black text-gray-300 uppercase py-2">Sem anexo</span>
                        )}

                        <div className="flex items-center gap-1">
                          {deleteConfirmId === m.id ? (
                            <div className="flex items-center gap-1 animate-fade-in">
                              <button 
                                onClick={() => {
                                  handleDelete(m.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2.5 py-1.5 bg-red-600 text-white font-black uppercase text-[8px] tracking-wider hover:bg-red-700 transition-all shadow rounded-xl"
                              >
                                Sim
                              </button>
                              <button 
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2.5 py-1.5 bg-gray-100 text-gray-500 font-black uppercase text-[8px] tracking-wider hover:bg-gray-200 transition-all rounded-xl"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setDeleteConfirmId(m.id)} 
                              className="p-2.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="Excluir este material"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="whatsapp-templates"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl mx-auto px-1"
          >
            <div className="bg-white border-4 border-gov-blue p-6 sm:p-10 shadow-2xl space-y-8 rounded-2xl">
              <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                <div className="bg-green-500 p-3 rounded-2xl shadow-lg">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gov-blue uppercase">Configuração de Mensagens WhatsApp</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Personalize os disparos automáticos para eleitores e lideranças</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-gov-yellow" /> Boas-vindas (Novo Apoiador Cadastrado)
                    </label>
                    <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-xl">Variável: {'{nome_eleitor}'}</span>
                  </div>
                  <textarea 
                    rows={4}
                    value={templates.welcome_template}
                    onChange={e => setTemplates({...templates, welcome_template: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-gray-100 p-5 text-sm font-bold text-gray-600 outline-none focus:border-gov-blue resize-none shadow-inner rounded-2xl"
                    placeholder="Olá {nome_eleitor}, muito obrigado por se juntar à nossa caminhada..."
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest flex items-center gap-2">
                      <Plus className="w-3.5 h-3.5 text-gov-yellow" /> Mensagem de Aniversário
                    </label>
                    <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-xl">Variável: {'{nome_eleitor}'}</span>
                  </div>
                  <textarea 
                    rows={4}
                    value={templates.birthday_template}
                    onChange={e => setTemplates({...templates, birthday_template: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-gray-100 p-5 text-sm font-bold text-gray-600 outline-none focus:border-gov-blue resize-none shadow-inner rounded-2xl"
                    placeholder="Parabéns {nome_eleitor}! O candidato e toda nossa equipe te desejam muita saúde..."
                  />
                </div>

                <div className="bg-blue-50 p-5 flex gap-4 border-l-4 border-gov-blue rounded-2xl">
                  <Info className="w-6 h-6 text-gov-blue shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-gov-blue/80 leading-relaxed uppercase">
                    Utilize a tag <span className="text-gov-blue font-black bg-blue-100/60 px-1 py-0.5 rounded">{'{nome_eleitor}'}</span> em qualquer parte do texto para que o sistema substitua automaticamente pelo primeiro nome do apoiador no momento do disparo.
                  </p>
                </div>

                <button 
                  type="button"
                  onClick={handleSaveTemplates}
                  className="w-full bg-gov-blue text-white py-5 font-black uppercase text-xs tracking-widest shadow-2xl flex items-center justify-center gap-3 hover:bg-blue-800 transition-all rounded-2xl"
                >
                  <Save className="w-5 h-5 text-gov-yellow" /> Salvar Configurações de Mensagens
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Sparkles(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
  );
}
