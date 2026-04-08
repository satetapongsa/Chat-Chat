import { useEffect, useRef, useState } from "react";
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from "framer-motion";
import { Send, Cat, Paperclip, Smile, CheckCheck, FileText, X, ShieldAlert, Timer } from "lucide-react";

/**
 * 🐱 CATGRAM PRO - CUSTOM TIMERS & FULL MEDIA SUPPORT
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CAT_EMOJIS = ["🐱", "😸", "😹", "😻", "😼", "😽", "😾", "😿", "🙀", "🐾", "🐟", "🧶"];
const LIFETIME_OPTIONS = [
    { label: '5s', value: 5000 },
    { label: '10s', value: 10000 },
    { label: '20s', value: 20000 },
    { label: '30s', value: 30000 },
    { label: '1m', value: 60000 }
];

export default function App() {
  const [userName, setUserName] = useState<string | null>(localStorage.getItem('catgram_user_name'));
  const [tempName, setTempName] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [isSecureBlurred, setIsSecureBlurred] = useState(false);
  const [currentLifetime, setCurrentLifetime] = useState(10000); // Default 10s
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<any>(null);
  const emojiLongPressTimer = useRef<any>(null);

  const [myId] = useState(() => {
    let id = localStorage.getItem('catgram_user_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('catgram_user_id', id);
    }
    return id;
  });

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const handleVisibilityChange = () => { if (isMobile && document.visibilityState === 'hidden') setIsSecureBlurred(true); };
    const handleFocus = () => setIsSecureBlurred(false);
    const handleBlur = () => { if (isMobile) setIsSecureBlurred(true); };
    if (isMobile) {
      document.addEventListener('contextmenu', e => e.preventDefault());
      document.body.style.userSelect = 'none';
    }
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    async function initChat() {
      if (!supabaseUrl || !userName) return;
      const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
      if (data) setMessages(data);
      setIsLoaded(true);

      const channel = supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const newMsg = payload.new;
          setMessages((prev) => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          scheduleDeletion(newMsg.id, newMsg.expires_in || 10000);
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload: any) => {
          setMessages((prev) => {
             const result = prev.filter(m => m.id !== payload.old.id);
             if (expandedImage && payload.old.id === expandedImage) setExpandedImage(null);
             return result;
          });
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
    initChat();
  }, [userName, expandedImage]);

  useEffect(() => {
    if (isLoaded && messages.length > 0) {
      messages.forEach(msg => {
        const lifetime = msg.expires_in || 10000;
        const remaining = lifetime - (Date.now() - new Date(msg.created_at).getTime());
        if (remaining > 0) scheduleDeletion(msg.id, remaining);
        else deleteMessage(msg.id);
      });
    }
  }, [isLoaded]);

  const scheduleDeletion = (id: string, delay: number) => {
    setTimeout(() => { deleteMessage(id); }, delay);
  };

  const deleteMessage = async (id: string) => {
    await supabase.from('messages').delete().eq('id', id);
  };

  const saveName = () => {
    if (tempName.trim()) {
      localStorage.setItem('catgram_user_name', tempName.trim());
      setUserName(tempName.trim());
      setTempName("");
    }
  };

  const startLongPress = (type: 'send' | 'emoji') => {
    if (type === 'send') {
        longPressTimer.current = setTimeout(() => setUserName(null), 1000);
    } else {
        emojiLongPressTimer.current = setTimeout(() => setShowTimerMenu(true), 800);
    }
  };

  const cancelLongPress = (type: 'send' | 'emoji') => {
    if (type === 'send') clearTimeout(longPressTimer.current);
    else clearTimeout(emojiLongPressTimer.current);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (content: string, type = 'text', fileUrl?: string, fileName?: string) => {
    if (!content.trim() && !fileUrl) return;
    await supabase.from('messages').insert([{ 
        content, sender_id: myId, sender_name: userName, type, file_url: fileUrl, file_name: fileName,
        expires_in: currentLifetime 
    }]);
    setInputValue("");
    setShowEmojis(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const fileName = `${Math.random()}.${file.name.split('.').pop()}`;
    try {
      await supabase.storage.from('chat-files').upload(`uploads/${fileName}`, file);
      const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(`uploads/${fileName}`);
      // Supports jpg, png, gif, webp via generic 'image' split
      const type = file.type.startsWith('image/') ? 'image' : 'file';
      await handleSend(file.name, type, publicUrl, file.name);
    } catch (error: any) { alert(`Upload failed: ${error.message}`); } finally { setIsUploading(false); }
  };

  const CountdownCircle = ({ createdAt, lifetime = 10000, color = "currentColor", size = 12 }) => {
    const remaining = lifetime - (Date.now() - new Date(createdAt).getTime());
    return (
      <div style={{ width: size, height: size }}>
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="3" />
          <motion.path initial={{ pathLength: Math.max(0, remaining / lifetime) }} animate={{ pathLength: 0 }} transition={{ duration: Math.max(0, remaining / 1000), ease: "linear" }}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
    );
  };

  if (!userName) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#6A1B9A] via-[#EF6C00] to-[#FBC02D] font-sans p-6 text-white overflow-hidden text-center relative">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("/cat-pattern.png")', backgroundSize: '160px', filter: 'invert(1)' }} />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm bg-white/20 backdrop-blur-3xl p-8 rounded-[40px] shadow-2xl border border-white/20 flex flex-col items-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-[#6A1B9A] mb-6"><Cat size={40} /></div>
            <h1 className="text-2xl font-black mb-8 italic uppercase tracking-tighter">Enter the Vault</h1>
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveName()} placeholder="Who are you?" className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 px-6 text-center text-xl outline-none placeholder:text-white/30 mb-6" />
            <button onClick={saveName} className="w-full bg-white text-[#6A1B9A] font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all text-sm uppercase italic">Go Live</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#6A1B9A] via-[#EF6C00] to-[#FBC02D] overflow-hidden font-sans relative transition-all duration-500 ${isSecureBlurred ? 'blur-3xl scale-110' : ''}`}>
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("/cat-pattern.png")', backgroundSize: '180px', filter: 'invert(1)' }} />

      {isSecureBlurred && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex flex-col items-center justify-center text-white p-8 text-center backdrop-blur-3xl">
           <ShieldAlert size={64} className="text-red-500 mb-4 animate-pulse" />
           <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter">SECURE ZONE</h2>
           <p className="text-white/60 text-sm">App visibility is restricted on mobile devices.</p>
           <button onClick={() => window.location.reload()} className="mt-8 px-6 py-3 bg-white text-black font-bold rounded-xl active:scale-90 transition-all uppercase text-[12px]">Resume Session</button>
        </div>
      )}

      <div className="w-full max-w-lg h-full sm:h-[90vh] flex flex-col bg-white/5 backdrop-blur-3xl sm:rounded-3xl shadow-2xl relative overflow-hidden border border-white/20">
        <main className="flex-1 overflow-y-auto p-4 space-y-6 z-10 scrollbar-hide pt-10 px-6">
          <AnimatePresence>
            {messages.map((msg, i) => {
              const isMe = msg.sender_id === myId;
              return (
                <motion.div key={msg.id || i} initial={{ opacity: 0, scale: 0.9, x: isMe ? 20 : -20 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.5 }} className={`flex w-full flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className={`text-[10px] font-black text-white/50 mb-1 ${isMe ? 'mr-2' : 'ml-2'} uppercase tracking-widest`}>{msg.sender_name || 'Ghost'}</span>
                  <div className={`relative p-2 rounded-2xl shadow-md max-w-[85%] ${isMe ? 'bg-[#E1FEC6] text-[#1a3a14] rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none'}`}>
                    {msg.type === 'image' && msg.file_url && <img src={msg.file_url} alt="Secret" onClick={() => setExpandedImage(msg.id)} className="rounded-xl mb-1 max-w-full cursor-zoom-in" />}
                    {msg.type === 'file' && msg.file_url && <div className="flex items-center gap-2 p-2 bg-black/5 rounded-xl mb-1"><FileText size={16} /><p className="text-[10px] truncate max-w-[100px]">{msg.file_name}</p></div>}
                    <p className="px-2 pt-1 pb-4 leading-snug">{msg.content}</p>
                    <div className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-40 text-[10px]">
                      <CountdownCircle createdAt={msg.created_at} lifetime={msg.expires_in} color={isMe ? "#4CAD3E" : "#6A1B9A"} size={14} />
                    </div>
                    <div className={`absolute top-0 w-3 h-3 ${isMe ? 'right-[-6px] bg-[#E1FEC6]' : 'left-[-6px] bg-white'}`} style={{ clipPath: isMe ? 'polygon(0 0, 0 100%, 100% 0)' : 'polygon(100% 0, 100% 100%, 0 0)' }} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </main>

        {showEmojis && (
          <div className="relative">
            {/* Timer Options Overlay */}
            <AnimatePresence>
                {showTimerMenu && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute bottom-[100%] left-0 right-0 bg-white/95 backdrop-blur-xl p-4 flex flex-col items-center gap-4 rounded-t-3xl border-t border-white/20 shadow-2xl z-[60]">
                     <div className="flex items-center gap-2 text-[#6A1B9A] font-black uppercase tracking-widest text-[12px]">
                        <Timer size={16} /> Select Message Lifetime
                     </div>
                     <div className="flex gap-2 w-full">
                        {LIFETIME_OPTIONS.map(opt => (
                            <button key={opt.label} onClick={() => { setCurrentLifetime(opt.value); setShowTimerMenu(false); }} className={`flex-1 py-3 rounded-xl font-bold transition-all ${currentLifetime === opt.value ? 'bg-[#6A1B9A] text-white' : 'bg-black/5 text-[#6A1B9A] hover:bg-black/10'}`}>
                                {opt.label}
                            </button>
                        ))}
                     </div>
                     <button onClick={() => setShowTimerMenu(false)} className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 hover:text-red-500 transition-colors">Cancel</button>
                  </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-6 gap-2 p-4 bg-white/10 backdrop-blur-md border-t border-white/10 select-none">
              {CAT_EMOJIS.map(emoji => (
                <button 
                  key={emoji} type="button" 
                  onMouseDown={() => startLongPress('emoji')} onMouseUp={() => cancelLongPress('emoji')} onMouseLeave={() => cancelLongPress('emoji')}
                  onTouchStart={() => startLongPress('emoji')} onTouchEnd={() => cancelLongPress('emoji')}
                  onClick={() => { if (!showTimerMenu) setInputValue(prev => prev + emoji); }} 
                  className="text-2xl hover:scale-125 transition-transform p-3 active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>
            {/* Indicator current lifetime */}
            <div className="absolute right-4 top-[-15px] bg-[#6A1B9A] text-white text-[9px] px-3 py-1 rounded-full font-black shadow-lg flex items-center gap-1.5 uppercase tracking-wider backdrop-blur-md">
                <Timer size={10} /> {LIFETIME_OPTIONS.find(o => o.value === currentLifetime)?.label || '10s'}
            </div>
          </div>
        )}

        <footer className="px-3 py-3 bg-white/5 backdrop-blur-md relative z-20">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-white rounded-full px-4 py-1.5 shadow-lg">
              <button type="button" onClick={() => setShowEmojis(!showEmojis)} className={`transition-colors ${showEmojis ? 'text-[#6A1B9A]' : 'text-slate-400'}`}><Smile size={24} /></button>
              <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)} placeholder="Classified message..." className="flex-1 bg-transparent border-none outline-none py-2 px-3 text-slate-800 text-[16px]" />
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-slate-400 rotate-45 hover:text-[#6A1B9A] transition-colors"><Paperclip size={22} /></button>
            </div>
            <button onMouseDown={() => startLongPress('send')} onMouseUp={() => cancelLongPress('send')} onMouseLeave={() => cancelLongPress('send')} onTouchStart={() => startLongPress('send')} onTouchEnd={() => cancelLongPress('send')} onClick={() => handleSend(inputValue)} type="button" className="w-12 h-12 rounded-full bg-[#6A1B9A] flex items-center justify-center text-white shadow-xl active:scale-90 transition-all">
              <Send size={20} className="ml-1" />
            </button>
          </div>
        </footer>
      </div>

      <AnimatePresence>
        {expandedImage && messages.find(m => m.id === expandedImage) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 cursor-pointer" onClick={() => setExpandedImage(null)}>
            <div className="absolute top-6 flex flex-col items-center gap-2">
               <CountdownCircle createdAt={messages.find(m => m.id === expandedImage).created_at} lifetime={messages.find(m => m.id === expandedImage).expires_in} color="#FFF" size={32} />
               <p className="text-white/30 text-[10px] uppercase font-bold tracking-[0.3em]">Confidential Sight...</p>
            </div>
            <motion.img initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} src={messages.find(m => m.id === expandedImage).file_url} className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
