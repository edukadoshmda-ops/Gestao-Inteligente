import { useState, useEffect, useRef } from 'react';
import { Send, Clock, Camera, Mic, MicOff, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ChatMessage } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ChatProps {
  currentUser: { id: string; name: string };
  org_id?: string;
}

export default function Chat({ currentUser, org_id }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingMedia, setPendingMedia] = useState<{ type: 'image' | 'audio', data: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const mimeType = mediaRecorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            setPendingMedia({ type: 'audio', data: base64Audio });
          };
          stream.getTracks().forEach(track => track.stop()); // release mic
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Microfone não autorizado", err);
        alert("Ative a permissão do microfone no seu celular ou navegador para enviar áudio.");
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const base64Image = canvas.toDataURL('image/jpeg', 0.6); // Compress to 60% quality
        setPendingMedia({ type: 'image', data: base64Image });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const isDemo = currentUser.id.startsWith('demo-') || currentUser.id === 'admin' || currentUser.id === 'anon';

  const sendMediaMessage = async (mediaData: string, type: 'image' | 'audio') => {
    setIsLoading(true);
    const messageData: Omit<ChatMessage, 'id' | 'createdAt'> = {
      content: type === 'image' ? '📷 Imagem enviada' : '🎤 Áudio enviado',
      senderId: currentUser.id,
      senderName: currentUser.name,
      imageUrl: type === 'image' ? mediaData : undefined,
      audioUrl: type === 'audio' ? mediaData : undefined,
      org_id: org_id,
    };

    if (isDemo) {
      const newMsg: ChatMessage = {
        ...messageData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, newMsg]);
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.from('messages').insert([messageData]);
      if (error) {
        if (error.code === '42703' || error.message?.includes('column')) {
          console.warn("Colunas de mídia não encontradas. Usando Payload Embutido no texto.");
          const fallbackData = {
            content: `[PAYLOAD_${type.toUpperCase()}]:${mediaData}`,
            senderId: currentUser.id,
            senderName: currentUser.name,
            org_id: org_id,
          };
          const { error: fallbackError } = await supabase.from('messages').insert([fallbackData]);
          if (fallbackError) throw fallbackError;
        } else {
          throw error;
        }
      }
    } catch (err) {
      console.error('Erro ao enviar mídia:', err);
      alert('Não foi possível enviar o arquivo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Inscrição Realtime
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: any) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    if (isDemo) {
      setMessages([{
        id: 'demo-msg-1',
        content: '👋 Olá! Este é o Chat dos Coordenadores. Envie mensagens de texto, fotos e áudios para sua equipe.',
        senderId: 'system',
        senderName: 'Sistema',
        createdAt: new Date().toISOString(),
        org_id: org_id
      }]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('createdAt', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Erro ao carregar chat:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newMessage.trim() && !pendingMedia) return;

    if (pendingMedia) {
      await sendMediaMessage(pendingMedia.data, pendingMedia.type);
      setPendingMedia(null);
      setNewMessage('');
      return;
    }

    const messageData = {
      content: newMessage.trim(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      org_id: org_id,
    };

    setNewMessage('');

    if (isDemo) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), ...messageData, createdAt: new Date().toISOString() }]);
      return;
    }

    try {
      const { error } = await supabase.from('messages').insert([messageData]);
      if (error) throw error;
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      alert('Não foi possível enviar a mensagem: ' + JSON.stringify(err));
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] bg-white border-4 border-gov-blue shadow-2xl overflow-hidden rounded-2xl">
      {/* Header */}
      <div className="bg-gov-blue p-4 text-white border-b-4 border-gov-yellow flex items-center justify-between rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-gov-yellow/20 p-2 rounded-full">
            <Send className="w-5 h-5 text-gov-yellow" />
          </div>
          <div>
            <h3 className="font-black uppercase text-sm tracking-widest">Chat dos Coordenadores</h3>
            <p className="text-[10px] text-blue-200 font-bold uppercase">Tempo Real Ativado</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-[9px] font-black uppercase text-green-400">Online</span>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 rounded-2xl"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gov-blue"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
               <Send className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Nenhuma mensagem ainda</p>
            <p className="text-[10px] text-gray-300 font-bold uppercase mt-1">Seja o primeiro a dar um oi para a equipe!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {!isMe && (
                    <span className="text-[9px] font-black text-gov-blue uppercase ml-1">{msg.senderName}</span>
                  )}
                  <div
                    className={`p-3 rounded-xl border-b-2 shadow-sm ${
                      isMe
                        ? 'bg-white text-gov-blue border-gov-blue rounded-l-2xl rounded-tr-2xl border-r-4'
                        : 'bg-gray-100 text-gray-700 border-gray-200 rounded-r-2xl rounded-tl-2xl'
                    }`}
                  >
                    {(msg.imageUrl || msg.content.startsWith('[PAYLOAD_IMAGE]:')) && (
                      <img src={msg.imageUrl || msg.content.replace('[PAYLOAD_IMAGE]:', '')} alt="Anexo" className="w-full max-w-xs rounded-xl border border-gray-200 mb-2 shadow-sm" />
                    )}
                    {(msg.audioUrl || msg.content.startsWith('[PAYLOAD_AUDIO]:')) && (
                      <audio src={msg.audioUrl || msg.content.replace('[PAYLOAD_AUDIO]:', '')} controls className="w-full max-w-xs mb-2 h-10" />
                    )}
                    <p className="text-xs font-black leading-relaxed">
                      {msg.content.startsWith('[PAYLOAD_IMAGE]:') ? '📷 Imagem enviada' : 
                       msg.content.startsWith('[PAYLOAD_AUDIO]:') ? '🎤 Áudio enviado' : 
                       msg.content}
                    </p>
                    <div className={`flex items-center gap-1 mt-1 ${isMe ? 'text-blue-400' : 'text-gray-400'}`}>
                      <Clock className="w-2.5 h-2.5" />
                      <span className="text-[8px] font-black">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t-4 border-gov-bg relative flex flex-col gap-2 rounded-2xl">
        {pendingMedia && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-4 relative shadow-sm"
          >
            <button 
              type="button" 
              onClick={() => setPendingMedia(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:scale-110 shadow-lg transition-transform"
            >
              <X className="w-4 h-4" />
            </button>
            {pendingMedia.type === 'image' && (
              <img src={pendingMedia.data} alt="Preview" className="h-20 rounded-xl border border-blue-200 object-cover" />
            )}
            {pendingMedia.type === 'audio' && (
              <audio src={pendingMedia.data} controls className="h-10 w-full max-w-sm" />
            )}
            <span className="text-xs font-black text-gov-blue uppercase">Arquivo Pronto! Digite algo ou envie direto.</span>
          </motion.div>
        )}
        <div className="flex gap-2 items-center">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-3 transition-all ${showEmojiPicker ? 'bg-gov-yellow text-gov-blue' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              title="Inserir Emoji"
            >
              😊
            </button>
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute bottom-full left-0 mb-4 bg-white border-2 border-gov-blue p-3 shadow-2xl grid grid-cols-5 gap-2 w-48 z-[100] rounded-xl"
                >
                  {['😊', '🚀', '✅', '🗳️', '👍', '🔥', '👏', '📢', '⚠️', '🎉', '💪', '🙏', '🇧🇷', '🎯', '✨'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setNewMessage(prev => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="p-2 hover:bg-gray-100 text-xl flex items-center justify-center rounded-full"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <input
            type="file"
            id="chat-image-upload"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => document.getElementById('chat-image-upload')?.click()}
            className="p-3 bg-gray-100 text-gray-500 hover:bg-gov-blue hover:text-white transition-all shadow-sm rounded-full"
            title="Enviar Imagem"
          >
            <Camera className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={toggleRecording}
            className={`p-3 transition-all shadow-sm rounded-full ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gov-blue hover:text-white'}`}
            title={isRecording ? "Parar Gravação" : "Gravar Áudio"}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem para a equipe..."
            className="flex-1 bg-gray-50 border-2 border-gray-100 p-3 text-xs font-bold outline-none focus:border-gov-blue transition-all rounded-xl"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() && !pendingMedia}
            className="bg-gov-blue text-white px-6 py-3 font-black uppercase text-[10px] tracking-widest hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-md rounded-xl"
          >
            <Send className="w-4 h-4" />
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}
