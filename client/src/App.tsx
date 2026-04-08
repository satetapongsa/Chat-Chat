import { useEffect, useRef, useState } from "react";
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from "framer-motion";
import { Send, Cat, Paperclip, Smile, CheckCheck, FileText, X, Timer, Settings, UserCircle } from "lucide-react";

/**
 * 🐱 CATGRAM PRO - GHOST UI (KEEP DB, HIDE WEB)
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

  // Tick timer to update UI (Hiding expired messages in real-time)
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function initChat() {
      if (!supabaseUrl || !userName) return;
      
      // ดึงข้อมูลทั้งหมดมาไว้ใน State (เพื่อความรวดเร็วในการแสดงผล)
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
        })
        // ยกเลิกการดักฟัง Delete เพราะเราจะไม่ลบจาก DB แล้ว
        .subscribe();
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

  const startLongPress = () => {
    longPressTimer.current = setTimeout(() => { setShowSettings(true); }, 800);
  };

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
    const remaining = lifetime - age;
    const progress = Math.max(0, remaining / lifetime);
    return (
      <div style={{ width: size, height: size }}>
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="3" />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={`${progress * 100}, 100`}
          />
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

  // 🕵️‍♂️ กรองข้อความที่ยังไม่หมดอายุมาแสดงผล (Ghost Logic)
  const activeMessages = messages.filter(msg => {
    const lifetime = msg.expires_in || 10000;
    const age = currentTime - new Date(msg.created_at).getTime();
    return age < lifetime;
  });

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#6A1B9A] via-[#EF6C00] to-[#FBC02D] overflow-hidden font-sans relative">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("/cat-pattern.png")', backgroundSize: '180px', filter: 'invert(1)' }} />

      <AnimatePresence>
          {showSettings && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
                <motion.div initial={{ y: 50, scale: 0.9 }} animate={{ y: 0, scale: 1 }} exit={{ y: 50, scale: 0.9 }} className="w-full max-w-sm bg-white rounded-[40px] p-8 shadow-2xl relative overflow-hidden">
                    <button onClick={() => setShowSettings(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-600 transition-colors"><X size={24} /></button>
                    <div className="flex flex-col gap-8">
                        <div>
                            <div className="flex items-center gap-2 text-slate-400 font-black uppercase text-[11px] tracking-widest mb-4"><UserCircle size={14} /> My Identity</div>
                            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <span className="font-bold text-slate-800 text-lg">{userName}</span>
                                <button onClick={() => { setUserName(null); setShowSettings(false); }} className="text-[#6A1B9A] text-xs font-black uppercase hover:underline">Change Alias</button>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-slate-400 font-black uppercase text-[11px] tracking-widest mb-4"><Timer size={14} /> Explosion Timer</div>
                            <div className="grid grid-cols-2 gap-2">
                                {LIFETIME_OPTIONS.map(opt => (
                                    <button 
                                        key={opt.label} onClick={() => setLifetime(opt.value)}
                                        className={`py-3 rounded-2xl font-bold transition-all text-sm ${currentLifetime === opt.value ? 'bg-[#6A1B9A] text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={() => setShowSettings(false)} className="w-full bg-[#6A1B9A] text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all text-sm">Apply & Return</button>
                    </div>
                </motion.div>
            </motion.div>
          )}
      </AnimatePresence>

      <div className="w-full max-w-lg h-full sm:h-[90vh] flex flex-col bg-white/5 backdrop-blur-3xl sm:rounded-3xl shadow-2xl relative overflow-hidden border border-white/20">
        <main className="flex-1 overflow-y-auto p-4 space-y-6 z-10 scrollbar-hide pt-10 px-6">
          <AnimatePresence mode="popLayout">
            {activeMessages.map((msg, i) => {
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
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </main>

        <footer className="px-3 py-3 bg-white/5 backdrop-blur-md relative z-20">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-white rounded-full px-4 py-1.5 shadow-lg relative">
              <button type="button" onClick={() => setShowEmojis(!showEmojis)} className={`transition-colors ${showEmojis ? 'text-[#6A1B9A]' : 'text-slate-400'}`}><Smile size={24} /></button>
              <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)} placeholder="Classified message..." className="flex-1 bg-transparent border-none outline-none py-2 px-3 text-slate-800 text-[16px]" />
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-slate-400 rotate-45 hover:text-[#6A1B9A] transition-colors"><Paperclip size={22} /></button>
              <div className="absolute right-10 top-[-25px] bg-[#6A1B9A] text-white text-[8px] px-2 py-0.5 rounded-full font-black flex items-center gap-1 uppercase opacity-80 backdrop-blur-md border border-white/20">
                   <Timer size={8} /> {LIFETIME_OPTIONS.find(o => o.value === currentLifetime)?.label}
              </div>
            </div>
            <button 
              onMouseDown={startLongPress} onMouseUp={cancelLongPress} onMouseLeave={cancelLongPress} onTouchStart={startLongPress} onTouchEnd={cancelLongPress}
              onClick={() => { if (!showSettings) handleSend(inputValue); }} 
              type="button" 
              className="w-12 h-12 rounded-full bg-[#6A1B9A] flex items-center justify-center text-white shadow-xl active:scale-90 transition-all"
            >
              <Send size={20} className="ml-0.5" />
            </button>
          </div>
        </footer>

        {showEmojis && (
            <AnimatePresence>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="grid grid-cols-6 gap-2 p-4 bg-white/95 backdrop-blur-md border-t border-white/10 select-none">
                {CAT_EMOJIS.map(emoji => (
                    <button key={emoji} type="button" onClick={() => setInputValue(prev => prev + emoji)} className="text-2xl hover:scale-125 transition-transform p-3 active:scale-90">{emoji}</button>
                ))}
                </motion.div>
            </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {expandedImage && activeMessages.find(m => m.id === expandedImage) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 cursor-pointer" onClick={() => setExpandedImage(null)}>
            <div className="absolute top-6 flex flex-col items-center gap-2">
               <CountdownCircle createdAt={activeMessages.find(m => m.id === expandedImage).created_at} lifetime={activeMessages.find(m => m.id === expandedImage).expires_in} color="#FFF" size={32} />
               <p className="text-white/30 text-[10px] uppercase font-bold tracking-[0.3em]">Confidential Sight...</p>
            </div>
            <motion.img initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} src={activeMessages.find(m => m.id === expandedImage).file_url} className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
