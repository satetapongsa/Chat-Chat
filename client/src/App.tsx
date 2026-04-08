import { useEffect, useRef, useState } from "react";
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from "framer-motion";
import { Send, Cat, Paperclip, Smile, CheckCheck, FileText, X, Timer, Settings, UserCircle, Edit3 } from "lucide-react";

/**
 * 🐱 CATGRAM PRO - DARK PROFESSIONAL SETTINGS
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
    { label: '1m', value: 60000 },
    { label: '2m', value: 120000 }
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
  const [currentLifetime, setCurrentLifetime] = useState(() => Number(localStorage.getItem('catgram_lifetime')) || 10000);
  const [showSettings, setShowSettings] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<any>(null);

  const [myId] = useState(() => {
    let id = localStorage.getItem('catgram_user_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('catgram_user_id', id);
    }
    return id;
  });

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function initChat() {
      if (!supabaseUrl || !userName) return;
      const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
      if (data) setMessages(data);
      setIsLoaded(true);
      const channel = supabase.channel('public:messages').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      }).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
    initChat();
  }, [userName]);

  const saveName = () => {
    if (tempName.trim()) {
      localStorage.setItem('catgram_user_name', tempName.trim());
      setUserName(tempName.trim());
      setTempName("");
    }
  };

  const startLongPress = () => { longPressTimer.current = setTimeout(() => setShowSettings(true), 800); };
  const cancelLongPress = () => clearTimeout(longPressTimer.current);

  const handleSend = async (content: string, type = 'text', fileUrl?: string, fileName?: string) => {
    if (!content.trim() && !fileUrl) return;
    await supabase.from('messages').insert([{ 
        content, sender_id: myId, sender_name: userName, type, file_url: fileUrl, file_name: fileName,
        expires_in: currentLifetime 
    }]);
    setInputValue("");
    setShowEmojis(false);
  };

  const setLifetime = (val: number) => {
    setCurrentLifetime(val);
    localStorage.setItem('catgram_lifetime', String(val));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const fileName = `${Math.random()}.${file.name.split('.').pop()}`;
    try {
      await supabase.storage.from('chat-files').upload(`uploads/${fileName}`, file);
      const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(`uploads/${fileName}`);
      await handleSend(file.name, file.type.startsWith('image/') ? 'image' : 'file', publicUrl, file.name);
    } catch (error: any) { alert(`Upload failed: ${error.message}`); } finally { setIsUploading(false); }
  };

  const CountdownCircle = ({ createdAt, lifetime = 10000, color = "currentColor", size = 12 }) => {
    const age = currentTime - new Date(createdAt).getTime();
    const progress = Math.max(0, (lifetime - age) / lifetime);
    return (
      <div style={{ width: size, height: size }}>
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="3" />
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${progress * 100}, 100`} />
        </svg>
      </div>
    );
  };

  if (!userName) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#121212] via-[#2D2D2D] to-[#121212] font-sans p-6 text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("/cat-pattern.png")', backgroundSize: '160px', filter: 'invert(1)' }} />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm bg-[#1A1A1A] border border-white/10 p-10 rounded-[4rem] shadow-2xl flex flex-col items-center">
            <div className="w-20 h-20 bg-gradient-to-tr from-[#6A1B9A] to-[#9C27B0] rounded-full flex items-center justify-center text-white mb-8 shadow-lg shadow-purple-500/20"><Cat size={40} /></div>
            <h1 className="text-3xl font-black mb-10 tracking-widest uppercase italic">CatGram</h1>
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveName()} placeholder="Who are you?" className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 px-6 text-center text-xl outline-none placeholder:text-white/10 mb-6 focus:border-purple-500/50 transition-all font-medium" />
            <button onClick={saveName} className="w-full bg-[#6A1B9A] text-white font-black py-5 rounded-3xl shadow-xl hover:bg-[#7B1FA2] active:scale-95 transition-all text-sm uppercase tracking-[0.2em]">Launch Project</button>
        </motion.div>
      </div>
    );
  }

  const activeMessages = messages.filter(msg => (currentTime - new Date(msg.created_at).getTime()) < (msg.expires_in || 10000));

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0F0F0F] overflow-hidden font-sans relative">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("/cat-pattern.png")', backgroundSize: '180px', filter: 'invert(1)' }} />

      <AnimatePresence>
          {showSettings && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="w-full max-w-sm bg-[#1E1E1E] border border-white/10 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden">
                    <button onClick={() => setShowSettings(false)} className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors"><X size={24} /></button>
                    
                    <div className="space-y-8">
                        <div>
                            <div className="flex items-center gap-2 text-white/30 font-black uppercase text-[10px] tracking-[0.3em] mb-4">Identity</div>
                            <div className="flex items-center justify-between bg-white/[0.03] p-5 rounded-3xl border border-white/5">
                                <span className="font-bold text-white text-lg tracking-tight">{userName}</span>
                                <button onClick={() => { setUserName(null); setShowSettings(false); }} className="p-2 text-purple-400 hover:bg-purple-500/10 rounded-xl transition-all"><Edit3 size={18} /></button>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 text-white/30 font-black uppercase text-[10px] tracking-[0.3em] mb-4">Vault Timer</div>
                            <div className="grid grid-cols-3 gap-2">
                                {LIFETIME_OPTIONS.map(opt => (
                                    <button key={opt.label} onClick={() => setLifetime(opt.value)} className={`py-3.5 rounded-2xl font-black text-[11px] transition-all border uppercase tracking-widest ${currentLifetime === opt.value ? 'bg-purple-600 border-purple-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/10'}`}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={() => setShowSettings(false)} className="w-full border-2 border-white/10 text-white hover:bg-white/5 py-5 rounded-3xl font-black uppercase tracking-[0.3em] active:scale-95 transition-all text-[11px]">Save & Resume</button>
                    </div>
                </motion.div>
            </motion.div>
          )}
      </AnimatePresence>

      <div className="w-full max-w-lg h-full sm:h-[90vh] flex flex-col bg-[#141414] sm:rounded-[3rem] shadow-2xl relative overflow-hidden border border-white/5">
        <main className="flex-1 overflow-y-auto p-6 space-y-6 z-10 scrollbar-hide pt-10">
          <AnimatePresence mode="popLayout">
            {activeMessages.map((msg, i) => {
              const isMe = msg.sender_id === myId;
              return (
                <motion.div key={msg.id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className={`flex w-full flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className={`text-[9px] font-black text-white/20 mb-1.5 ${isMe ? 'mr-3' : 'ml-3'} uppercase tracking-[0.3em]`}>{msg.sender_name}</span>
                  <div className={`relative p-3 rounded-2xl shadow-xl max-w-[85%] ${isMe ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-[#1E1E1E] text-white border border-white/5 rounded-tl-none'}`}>
                    {msg.type === 'image' && msg.file_url && <img src={msg.file_url} alt="Vault" onClick={() => setExpandedImage(msg.id)} className="rounded-xl mb-2 max-w-full cursor-zoom-in brightness-90 hover:brightness-100 transition-all" />}
                    {msg.type === 'file' && msg.file_url && <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl mb-2"><FileText size={18} className="text-purple-400"/><p className="text-[10px] font-bold truncate opacity-80">{msg.file_name}</p></div>}
                    <p className="px-2 pt-1 pb-4 leading-relaxed font-medium text-[15px]">{msg.content}</p>
                    <div className="absolute bottom-2.5 right-3 opacity-30">
                      <CountdownCircle createdAt={msg.created_at} lifetime={msg.expires_in} color="#FFF" size={14} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </main>

        <footer className="px-5 py-5 bg-[#1A1A1A] border-t border-white/5 relative z-20 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center bg-[#252525] rounded-3xl px-5 py-2 border border-white/5 relative transition-all focus-within:border-purple-500/30">
              <button type="button" onClick={() => setShowEmojis(!showEmojis)} className={`transition-colors ${showEmojis ? 'text-purple-400' : 'text-white/20'}`}><Smile size={24} /></button>
              <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)} placeholder="Enter classified data..." className="flex-1 bg-transparent border-none outline-none py-3 px-3 text-white text-[15px] placeholder:text-white/10" />
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-white/20 rotate-45 hover:text-purple-400 transition-colors"><Paperclip size={24} /></button>
              <div className="absolute right-12 top-[-10px] bg-purple-600 text-[8px] px-2.5 py-0.5 rounded-full font-black text-white uppercase tracking-widest border border-purple-400/50 shadow-lg">
                   {LIFETIME_OPTIONS.find(o => o.value === currentLifetime)?.label}
              </div>
            </div>
            <button onMouseDown={startLongPress} onMouseUp={cancelLongPress} onMouseLeave={cancelLongPress} onTouchStart={startLongPress} onTouchEnd={cancelLongPress} onClick={() => { if (!showSettings) handleSend(inputValue); }} type="button" className="w-14 h-14 rounded-3xl bg-purple-600 flex items-center justify-center text-white shadow-xl hover:bg-purple-500 active:scale-90 transition-all">
              <Send size={24} className="ml-1" />
            </button>
          </div>
        </footer>

        {showEmojis && (
            <AnimatePresence>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="grid grid-cols-6 gap-2 p-6 bg-[#1E1E1E] border-t border-white/5 select-none">
                {CAT_EMOJIS.map(emoji => (
                    <button key={emoji} type="button" onClick={() => setInputValue(prev => prev + emoji)} className="text-2xl hover:scale-125 transition-transform p-3 active:scale-90">{emoji}</button>
                ))}
                </motion.div>
            </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {expandedImage && activeMessages.find(m => m.id === expandedImage) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/98 flex flex-col items-center justify-center p-6 cursor-pointer" onClick={() => setExpandedImage(null)}>
            <div className="absolute top-10 flex flex-col items-center gap-3">
               <CountdownCircle createdAt={activeMessages.find(m => m.id === expandedImage).created_at} lifetime={activeMessages.find(m => m.id === expandedImage).expires_in} color="#FFF" size={40} />
               <p className="text-white/10 text-[10px] uppercase font-black tracking-[0.5em]">Classified Preview</p>
            </div>
            <motion.img initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} src={activeMessages.find(m => m.id === expandedImage).file_url} className="max-w-full max-h-[75vh] rounded-3xl shadow-2xl border border-white/10" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
