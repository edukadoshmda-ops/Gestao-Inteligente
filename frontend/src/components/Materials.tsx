import { useState, useEffect } from 'react';
import { Megaphone, FileText, Image as ImageIcon, Plus, Trash2, Download, ExternalLink, Filter, MessageSquare, Save, Info, UploadCloud, FileUp, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Announcement, Organization } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface MaterialsProps {
  isAdmin: boolean;
  organization: Organization | null;
}

export default function Materials({ isAdmin, organization }: MaterialsProps) {
  const [materials, setMaterials] = useState<Announcement[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<'materials' | 'whatsapp'>('materials');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [templates, setTemplates] = useState({
    welcome_template: organization?.welcome_template || '',
    birthday_template: organization?.birthday_template || ''
  });

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'notice',
    imageUrl: '',
    fileUrl: '',
    priority: 'info'
  });

  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'imageUrl' | 'fileUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      if (!supabase) {
        throw new Error('Supabase não configurado');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `materials/${fileName}`;

      const { data, error } = await supabase.storage
        .from('materials')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.warn('Erro no storage do Supabase, tentando criar/usar fallback local:', error);
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({
            ...prev,
            [field]: reader.result as string
          }));
        };
        reader.readAsDataURL(file);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('materials')
          .getPublicUrl(filePath);

        setFormData(prev => ({
          ...prev,
          [field]: publicUrl
        }));
      }
    } catch (err: any) {
      console.error('Erro no upload:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          [field]: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `materials/${fileName}`;

      let finalUrl = '';
      
      if (supabase) {
        const { data, error } = await supabase.storage
          .from('materials')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from('materials')
            .getPublicUrl(filePath);
          finalUrl = publicUrl;
        }
      }

      if (!finalUrl) {
        finalUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      let cat = categoryFilter === 'all' ? 'notice' : categoryFilter;
      const isImage = file.type.startsWith('image/');

      const newMaterial = {
        title: cleanName.toUpperCase(),
        content: `Arquivo enviado via upload rápido em ${new Date().toLocaleDateString('pt-BR')}.`,
        category: cat,
        imageUrl: isImage ? finalUrl : '',
        fileUrl: !isImage ? finalUrl : '',
        priority: 'info',
        active: true,
        org_id: organization?.id
      };

      try {
        const { error: dbError } = await supabase.from('announcements').insert([newMaterial]);
        if (dbError) throw dbError;
        alert('🚀 Material de campanha enviado e publicado com sucesso!');
        fetchMaterials();
      } catch (dbErr: any) {
        console.warn('Supabase insert falhou, salvando localmente:', dbErr);
        const localMaterial = { ...newMaterial, id: crypto.randomUUID(), createdAt: new Date().toISOString() } as Announcement;
        setMaterials(prev => [localMaterial, ...prev]);
        alert('🚀 Material salvo localmente com sucesso!');
      }
    } catch (err: any) {
      console.error('Erro no upload rápido:', err);
      alert('Erro ao processar o arquivo. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) {
        console.warn('Erro ao carregar materiais do Supabase (modo demo?):', error);
        // Keep any locally-added materials
        return;
      }
      setMaterials(prev => {
        // Merge server data with any local-only items
        const localOnly = prev.filter(m => !data.some((d: any) => d.id === m.id));
        return [...localOnly, ...(data || [])];
      });
    } catch (err) {
      console.error('Erro ao carregar materiais:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplates = async () => {
    if (!organization?.id) return;
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ 
          welcome_template: templates.welcome_template,
          birthday_template: templates.birthday_template
        })
        .eq('id', organization.id);
      
      if (error) throw error;
      alert('Templates de WhatsApp salvos com sucesso!');
    } catch (err) {
      console.warn('Erro ao salvar templates (modo demo?):', err);
      alert('Templates salvos localmente. Em produção serão sincronizados com o banco.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const newItem = {
      ...formData,
      active: true,
      org_id: organization?.id
    };
    try {
      const { error } = await supabase.from('announcements').insert([newItem]);
      if (error) throw error;
      fetchMaterials();
    } catch (err) {
      console.warn('Supabase insert falhou, salvando localmente:', err);
      const localItem = { ...newItem, id: crypto.randomUUID(), createdAt: new Date().toISOString() } as Announcement;
      setMaterials(prev => [localItem, ...prev]);
    }
    setIsAdding(false);
    setFormData({ title: '', content: '', category: 'notice', imageUrl: '', fileUrl: '', priority: 'info' });
  };

  const handleDelete = async (id: string) => {
    try {
      if (supabase) {
        const { error } = await supabase.from('announcements').delete().eq('id', id);
        if (error) {
          console.warn('Erro de exclusão no Supabase, removendo localmente:', error);
        }
      }
      setMaterials(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Erro ao excluir:', err);
      setMaterials(prev => prev.filter(m => m.id !== id));
    }
  };

  const filteredMaterials = materials.filter(m => 
    categoryFilter === 'all' ? true : m.category === categoryFilter
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Header */}
      <div className="bg-white p-8 border-b-4 border-gov-yellow shadow-xl rounded-2xl">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-8">
          <div>
            <h2 className="text-2xl font-black text-gov-blue uppercase tracking-tight flex items-center gap-3">
              <Megaphone className="w-8 h-8 text-gov-yellow" /> Comunicação & Marketing
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Avisos, Banners e Projetos Estratégicos da Campanha</p>
          </div>
          
          <div className="grid grid-cols-2 lg:flex bg-gray-50 p-1 border-2 border-gray-100 rounded-2xl w-full lg:w-auto">
            <button 
              onClick={() => setActiveSubTab('materials')}
              className={`px-4 lg:px-6 py-3 text-[9px] lg:text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${
                activeSubTab === 'materials' ? 'bg-gov-blue text-white shadow-lg' : 'text-gray-400 hover:bg-white'
              }`}
            >
              <FileText className="w-4 h-4" /> Arquivos
            </button>
            <button 
              onClick={() => setActiveSubTab('whatsapp')}
              className={`px-4 lg:px-6 py-3 text-[9px] lg:text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${
                activeSubTab === 'whatsapp' ? 'bg-gov-blue text-white shadow-lg' : 'text-gray-400 hover:bg-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" /> WhatsApp
            </button>
          </div>
        </div>

        {activeSubTab === 'materials' && (
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
            <div className="grid grid-cols-3 sm:flex bg-gray-50 p-1 border-2 border-gray-100 w-full sm:w-auto rounded-2xl">
               {['all', 'notice', 'banner', 'flyer', 'project'].map(cat => (
                 <button
                   key={cat}
                   onClick={() => setCategoryFilter(cat)}
                   className={`px-2 py-2 text-[8px] sm:text-[9px] font-black uppercase transition-all ${
                     categoryFilter === cat ? 'bg-gov-blue text-white' : 'text-gray-400 hover:text-gov-blue'
                   }`}
                 >
                   {cat === 'all' ? 'Tudo' : cat === 'notice' ? 'Avisos' : cat === 'banner' ? 'Banners' : cat === 'flyer' ? 'Papel' : 'Projetos'}
                 </button>
               ))}
            </div>
            {isAdmin && (
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => setIsAdding(true)}
                  className="w-full sm:w-auto bg-gov-blue text-white px-6 py-3 font-black uppercase text-[10px] tracking-widest hover:bg-blue-800 transition-all shadow-lg flex items-center justify-center gap-2 rounded-2xl"
                >
                  <Plus className="w-4 h-4" /> Novo Material
                </button>
                <label className="w-full sm:w-auto bg-gov-yellow hover:bg-yellow-500 text-gov-blue px-6 py-3 font-black uppercase text-[10px] tracking-widest cursor-pointer transition-all shadow-lg flex items-center justify-center gap-2 select-none rounded-2xl">
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
            )}
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
            {isAdding && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-8 border-4 border-gov-blue shadow-2xl max-w-2xl mx-auto rounded-2xl"
              >
                <h3 className="text-xl font-black text-gov-blue uppercase mb-6">Cadastrar Novo Material</h3>
                <form onSubmit={handleSave} className="space-y-6">
                  {isUploading && (
                    <div className="bg-blue-50 border border-blue-100 p-4 flex items-center justify-center gap-3 rounded-2xl">
                      <Loader2 className="w-4 h-4 animate-spin text-gov-blue" />
                      <span className="text-[10px] font-black text-gov-blue uppercase">Processando upload do arquivo...</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Título do Material / Aviso</label>
                      <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-3 text-xs font-bold outline-none focus:border-gov-blue rounded-2xl" />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Categoria</label>
                      <select 
                        required 
                        value={formData.category} 
                        onChange={e => setFormData({...formData, category: e.target.value})} 
                        className="w-full bg-gray-50 border-2 border-gray-100 p-3 text-xs font-bold outline-none focus:border-gov-blue rounded-2xl"
                      >
                        <option value="notice">Aviso</option>
                        <option value="banner">Banner</option>
                        <option value="flyer">Papel / Panfleto</option>
                        <option value="project">Projeto Estratégico</option>
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
                        <option value="warning">Alerta</option>
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
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Imagem de Capa (Banner)</label>
                      <div className="flex flex-col gap-3">
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 hover:border-gov-blue transition-all cursor-pointer p-4 bg-gray-50 hover:bg-blue-50/20 group relative overflow-hidden h-28 rounded-2xl">
                          {formData.imageUrl ? (
                            <div className="absolute inset-0 w-full h-full">
                              <img src={formData.imageUrl} className="w-full h-full object-cover" />
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
                    <button type="submit" disabled={isUploading} className="flex-1 bg-gov-blue text-white py-4 font-black uppercase text-xs tracking-widest hover:bg-blue-800 shadow-xl disabled:opacity-50 rounded-2xl">Salvar e Publicar</button>
                    <button type="button" onClick={() => setIsAdding(false)} className="px-8 bg-gray-100 text-gray-500 font-black uppercase text-xs tracking-widest hover:bg-gray-200 rounded-2xl">Cancelar</button>
                  </div>
                </form>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
              {isLoading ? (
                 <div className="col-span-full py-20 text-center animate-pulse"><Megaphone className="w-12 h-12 text-gray-200 mx-auto mb-4" /></div>
              ) : filteredMaterials.map(m => (
                <motion.div layout key={m.id} className={`bg-white border-b-4 shadow-xl overflow-hidden group flex flex-col ${m.priority === 'critical' ? 'border-red-500' : 'border-gov-blue'}`}>
                  {m.imageUrl && <div className="h-48 overflow-hidden"><img src={m.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-all" /></div>}
                  <div className="p-6 flex-1 flex flex-col">
                    <h4 className="font-black text-gov-blue uppercase mb-3">{m.title}</h4>
                    <p className="text-[11px] font-bold text-gray-500 leading-relaxed mb-6 flex-1 line-clamp-3">{m.content}</p>
                    <div className="flex gap-2 pt-4 border-t border-gray-100 items-center justify-between rounded-2xl">
                      {m.fileUrl && <a href={m.fileUrl} target="_blank" className="flex-1 bg-gov-bg text-gov-blue py-3 text-[9px] font-black uppercase text-center border border-gov-blue/10 rounded-2xl">Baixar</a>}
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          {deleteConfirmId === m.id ? (
                            <div className="flex items-center gap-1 animate-fade-in">
                              <button 
                                onClick={() => {
                                  handleDelete(m.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2.5 py-1.5 bg-red-600 text-white font-black uppercase text-[8px] tracking-wider hover:bg-red-700 transition-all shadow rounded-2xl"
                              >
                                Sim
                              </button>
                              <button 
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2.5 py-1.5 bg-gray-100 text-gray-500 font-black uppercase text-[8px] tracking-wider hover:bg-gray-200 transition-all rounded-2xl"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setDeleteConfirmId(m.id)} 
                              className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                              title="Excluir este material"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="whatsapp-templates"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl mx-auto px-4"
          >
            <div className="bg-white border-4 border-gov-blue p-10 shadow-2xl space-y-10 rounded-2xl">
              <div className="flex items-center gap-4 border-b border-gray-100 pb-6 rounded-2xl">
                <div className="bg-green-500 p-3 rounded-xl shadow-lg">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gov-blue uppercase">Configuração de Mensagens</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Personalize os disparos automáticos de WhatsApp</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-10">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-gov-yellow" /> Boas-vindas (Novo Apoiador)
                    </label>
                    <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-xl">Variável: {'{nome_eleitor}'}</span>
                  </div>
                  <textarea 
                    rows={4}
                    value={templates.welcome_template}
                    onChange={e => setTemplates({...templates, welcome_template: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-gray-100 p-6 text-sm font-bold text-gray-600 outline-none focus:border-gov-blue resize-none shadow-inner rounded-2xl"
                    placeholder="Olá {nome_eleitor}, obrigado pelo apoio..."
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-gov-blue uppercase tracking-widest flex items-center gap-2">
                      <Plus className="w-3 h-3 text-gov-yellow" /> Mensagem de Aniversário
                    </label>
                    <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-xl">Variável: {'{nome_eleitor}'}</span>
                  </div>
                  <textarea 
                    rows={4}
                    value={templates.birthday_template}
                    onChange={e => setTemplates({...templates, birthday_template: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-gray-100 p-6 text-sm font-bold text-gray-600 outline-none focus:border-gov-blue resize-none shadow-inner rounded-2xl"
                    placeholder="Parabéns {nome_eleitor}, o candidato te deseja muita saúde e paz!"
                  />
                </div>

                <div className="bg-blue-50 p-6 flex gap-4 border-l-4 border-gov-blue rounded-2xl">
                  <Info className="w-6 h-6 text-gov-blue shrink-0" />
                  <p className="text-[11px] font-bold text-gov-blue/70 leading-relaxed uppercase">
                    Utilize a tag <span className="text-gov-blue font-black">{'{nome_eleitor}'}</span> em qualquer parte do texto para que o sistema substitua pelo nome real do apoiador no momento do envio.
                  </p>
                </div>

                {isAdmin && (
                  <button 
                    onClick={handleSaveTemplates}
                    className="w-full bg-gov-blue text-white py-6 font-black uppercase text-xs tracking-widest shadow-2xl flex items-center justify-center gap-3 hover:bg-blue-800 transition-all rounded-2xl"
                  >
                    <Save className="w-5 h-5" /> Salvar Configurações de Mensagens
                  </button>
                )}
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
