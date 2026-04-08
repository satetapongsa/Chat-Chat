import { useEffect, useRef, useState } from "react";
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from "framer-motion";
import { Send, Cat, Paperclip, Smile, CheckCheck, FileText, X, Timer, Settings, UserCircle, Edit3, Reply, PlayCircle } from "lucide-react";

/**
 * 🐱 CATGRAM PRO - DOUBLE TAP TO REPLY UPDATE
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ALL_EMOJIS = [
    "🐱", "😸", "😹", "😻", "😼", "😽", "😾", "😿", "🙀", "🐾", 
    "😀", "😂", "🤣", "😊", "😍", "😘", "😜", "🤨", "🤤", "😎", "🥳", "🥺", "💀", "💩", "👻", "🤡",
    "😈", "👿", "👹", "👺", 
    "😠", "😡", "🤬", "💢", "😤", 
    "💦", "☔", "🌊", 
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝",
    "🔥", "✨", "🚀", "💯", "✅", "🎉", "🌈", "☀️", "❄️", "🍀", "💎", "💸", "👑", "🫦", "👀", "👋", "🙏"
];

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
  const [expandedMedia, setExpandedMedia] = useState<any | null>(null);
  const [currentLifetime, setCurrentLifetime] = useState(() => Number(localStorage.getItem('catgram_lifetime')) || 10000);
  const [showSettings, setShowSettings] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  
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

  const startLongPress = (callback: () => void) => { longPressTimer.current = setTimeout(callback, 800); };
  const cancelLongPress = () => clearTimeout(longPressTimer.current);

  const handleSend = async (content: string, type = 'text', fileUrl?: string, fileName?: string) => {
    if (!content.trim() && !fileUrl) return;
    
    const payload: any = { 
        content, sender_id: myId, sender_name: userName, type, file_url: fileUrl, file_name: fileName,
        expires_in: currentLifetime 
    };

    if (replyingTo) {
        payload.reply_to_id = replyingTo.id;
        payload.reply_to_name = replyingTo.sender_name;
        if (replyingTo.type === 'image') payload.reply_to_content = 'Sent a photo 📸';
        else if (replyingTo.type === 'video') payload.reply_to_content = 'Sent a video 📽️';
        else payload.reply_to_content = replyingTo.content;
        
        payload.reply_to_image_url = (replyingTo.type === 'image' || replyingTo.type === 'video') ? replyingTo.file_url : null;
    }

    await supabase.from('messages').insert([payload]);
    setInputValue("");
    setShowEmojis(false);
    setReplyingTo(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const fileName = `${Math.random()}.${file.name.split('.').pop()}`;
    const fileType = file.type;
    
    try {
      await supabase.storage.from('chat-files').upload(`uploads/${fileName}`, file);
      const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(`uploads/${fileName}`);
      
      let type = 'file';
      if (fileType.startsWith('image/')) type = 'image';
      else if (fileType.startsWith('video/')) type = 'video';
      
      await handleSend(file.name, type, publicUrl, file.name);
    } catch (error: any) { alert(`Upload failed: ${error.message}`); } finally { setIsUploading(false); }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!userName) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br from-[#6A1B9A] via-[#EF6C00] to-[#FBC02D] font-sans p-6 text-white overflow-hidden relative text-center">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("/cat-pattern.png")', backgroundSize: '160px', filter: 'invert(1)' }} />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm bg-white/20 backdrop-blur-3xl p-10 rounded-[4rem] shadow-2xl border border-white/20 flex flex-col items-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-[#6A1B9A] mb-8"><Cat size={40} /></div>
            <h1 className="text-3xl font-black mb-10 italic uppercase tracking-tighter">CatGram</h1>
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveName()} placeholder="Nickname?" className="w-full bg-white/10 border border-white/20 rounded-3xl py-5 px-6 text-center text-xl outline-none placeholder:text-white/30 mb-6 font-medium" />
            <button onClick={saveName} className="w-full bg-white text-[#6A1B9A] font-black py-5 rounded-3xl shadow-xl hover:scale-105 active:scale-95 transition-all text-sm uppercase italic">Enter Vault</button>
        </motion.div>
      </div>
    );
  }

  const activeMessages = messages.filter(msg => (currentTime - new Date(msg.created_at).getTime()) < (msg.expires_in || 10000));

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-gradient-to-br from-[#6A1B9A] via-[#EF6C00] to-[#FBC02D] overflow-hidden font-sans relative">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("/cat-pattern.png")', backgroundSize: '180px', filter: 'invert(1)' }} />

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
                                    <button key={opt.label} onClick={() => { setCurrentLifetime(opt.value); localStorage.setItem('catgram_lifetime', String(opt.value)); }} className={`py-3.5 rounded-2xl font-black text-[11px] transition-all border uppercase tracking-widest ${currentLifetime === opt.value ? 'bg-purple-600 border-purple-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/10'}`}>
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

      <div className="flex-1 flex flex-col bg-white/5 backdrop-blur-3xl shadow-2xl overflow-hidden relative">
        <main className="flex-1 overflow-y-auto px-1 sm:px-4 py-6 space-y-4">
          <AnimatePresence mode="popLayout">
            {activeMessages.map((msg, i) => {
              const isMe = msg.sender_id === myId;
              return (
                <motion.div 
                    key={msg.id || i} initial={{ opacity: 0, scale: 0.9, x: isMe ? 20 : -20 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.5 }} className={`flex w-full flex-col mb-4 ${isMe ? 'items-end' : 'items-start'}`}
                    onDoubleClick={() => !isMe && setReplyingTo(msg)}
                >
                  <span className={`text-[10px] font-black text-white/40 mb-1 ${isMe ? 'mr-1' : 'ml-1'} uppercase tracking-widest`}>{msg.sender_name}</span>
                  <div className={`relative p-2 rounded-2xl shadow-xl max-w-[90%] sm:max-w-xl ${isMe ? 'bg-[#E1FEC6] text-[#1a3a14] rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none'}`}>
                    
                    {msg.reply_to_name && (
                        <div className="bg-black/5 rounded-xl p-2 mb-2 border-l-4 border-purple-500 text-[11px] opacity-70 italic flex items-center gap-3 justify-between overflow-hidden">
                            <div className="truncate">
                                <span className="font-bold block mb-1">@{msg.reply_to_name}</span>
                                <span className="truncate block text-xs">{msg.reply_to_content}</span>
                            </div>
                            {msg.reply_to_image_url && (
                                <div className="relative w-10 h-10 shrink-0">
                                     <img src={msg.reply_to_image_url} className="w-full h-full rounded-lg object-cover opacity-60" alt="replied" />
                                     {msg.reply_to_content.includes('video') && <div className="absolute inset-0 flex items-center justify-center text-white/50"><PlayCircle size={14}/></div>}
                                </div>
                            )}
                        </div>
                    )}

                    {msg.type === 'image' && msg.file_url && <img src={msg.file_url} alt="Vault" onClick={() => setExpandedMedia(msg)} className="rounded-xl mb-1 max-w-full cursor-zoom-in" />}
                    
                    {msg.type === 'video' && msg.file_url && (
                        <div className="relative rounded-xl overflow-hidden mb-1 cursor-zoom-in" onClick={() => setExpandedMedia(msg)}>
                            <video src={msg.file_url} className="max-w-full rounded-xl" muted playsInline />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                                <PlayCircle size={40} className="opacity-80" />
                            </div>
                        </div>
                    )}

                    {msg.type === 'file' && msg.file_url && <div className="flex items-center gap-2 p-2 bg-black/5 rounded-xl mb-1"><FileText size={16} /><p className="text-[10px] truncate max-w-[100px]">{msg.file_name}</p></div>}
                    <p className="px-2 pt-1 pb-4 leading-snug font-medium whitespace-pre-wrap break-words">{msg.content}</p>
                    
                    <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5 opacity-30 text-[10px]">
                      <div style={{ width: 14, height: 14 }}>
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="3" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={isMe ? "#4CAD3E" : "#6A1B9A"} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${Math.max(0, (msg.expires_in - (currentTime - new Date(msg.created_at).getTime())) / msg.expires_in) * 100}, 100`} />
                        </svg>
                      </div>
                      {isMe && <CheckCheck size={12} />}
                    </div>
                    <div className={`absolute top-0 w-3 h-3 ${isMe ? 'right-[-5px] bg-[#E1FEC6]' : 'left-[-5px] bg-white'}`} style={{ clipPath: isMe ? 'polygon(0 0, 0 100%, 100% 0)' : 'polygon(100% 0, 100% 100%, 0 0)' }} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </main>

        <AnimatePresence>
            {replyingTo && (
                <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="px-4 py-3 bg-white/30 backdrop-blur-3xl border-t border-white/10 flex items-center justify-between gap-4 z-50">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <Reply size={16} className="text-white shrink-0" />
                        <div className="text-white text-xs truncate">
                            <span className="font-bold opacity-60">Replying to {replyingTo.sender_name}</span>
                            <p className="truncate italic opacity-80">{replyingTo.type === 'video' ? 'Sent a video 📽️' : replyingTo.type === 'image' ? 'Sent a photo 📸' : replyingTo.content}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {(replyingTo.type === 'image' || replyingTo.type === 'video') && (
                            <div className="relative w-10 h-10">
                                {replyingTo.type === 'image' ? (
                                    <img src={replyingTo.file_url} className="w-full h-full rounded-lg object-cover border border-white/20 opacity-80" alt="preview" />
                                ) : (
                                    <video src={replyingTo.file_url} className="w-full h-full rounded-lg object-cover border border-white/20 opacity-80" />
                                )}
                                {replyingTo.type === 'video' && <PlayCircle size={14} className="absolute inset-0 m-auto text-white/50" />}
                            </div>
                        )}
                        <button onClick={() => setReplyingTo(null)} className="p-1.5 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"><X size={14} /></button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <footer className="px-2 py-4 bg-white/10 backdrop-blur-xl border-t border-white/10 w-full flex justify-center z-50">
          <div className="w-full max-w-5xl flex items-center gap-2">
            <div className="flex-1 flex items-center bg-white rounded-3xl px-4 py-2 shadow-xl relative">
              <button type="button" onClick={() => setShowEmojis(!showEmojis)} className={`transition-colors ${showEmojis ? 'text-[#6A1B9A]' : 'text-slate-400'}`}><Smile size={24} /></button>
              <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)} placeholder="Message..." className="flex-1 bg-transparent border-none outline-none py-2 px-2 text-slate-800 text-[15px]" />
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,video/*" className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-slate-400 rotate-45 hover:text-[#6A1B9A] transition-all"><Paperclip size={24} /></button>
              <div className="absolute right-12 top-[-10px] bg-[#6A1B9A] text-[8px] px-2 py-0.5 rounded-full font-black text-white uppercase tracking-widest border border-white/20 shadow-lg">
                   {LIFETIME_OPTIONS.find(o => o.value === currentLifetime)?.label}
              </div>
            </div>
            <button onMouseDown={() => startLongPress(() => setShowSettings(true))} onMouseUp={cancelLongPress} onMouseLeave={cancelLongPress} onTouchStart={() => startLongPress(() => setShowSettings(true))} onTouchEnd={cancelLongPress} onClick={() => { if (!showSettings) handleSend(inputValue); }} type="button" className="w-12 h-12 rounded-full bg-[#6A1B9A] flex-shrink-0 flex items-center justify-center text-white shadow-xl hover:bg-[#4A148C] active:scale-90 transition-all">
              <Send size={22} className="ml-1" />
            </button>
          </div>
        </footer>

        {showEmojis && (
            <AnimatePresence>
                <div className="w-full flex justify-center bg-white border-t border-white/10 z-[60] overflow-y-auto max-h-[250px]">
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="w-full max-w-5xl grid grid-cols-6 sm:grid-cols-12 gap-1 p-4 select-none">
                    {ALL_EMOJIS.map(emoji => (
                        <button key={emoji} type="button" onClick={() => setInputValue(prev => prev + emoji)} className="text-3xl hover:scale-125 transition-transform p-3 active:scale-90">{emoji}</button>
                    ))}
                    </motion.div>
                </div>
            </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {expandedMedia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-6 cursor-pointer" onClick={() => setExpandedMedia(null)}>
            <div className="absolute top-10 flex flex-col items-center gap-3">
               <div style={{ width: 40, height: 40 }}>
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#FFF" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${Math.max(0, (expandedMedia.expires_in - (currentTime - new Date(expandedMedia.created_at).getTime())) / expandedMedia.expires_in) * 100}, 100`} />
                </svg>
               </div>
               <p className="text-white/20 text-[10px] uppercase font-black tracking-[0.5em]">Secret File Preview</p>
            </div>
            
            <div onClick={(e) => e.stopPropagation()}>
                {expandedMedia.type === 'image' ? (
                    <motion.img initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} src={expandedMedia.file_url} className="max-w-full max-h-[75vh] rounded-[3rem] shadow-2xl" />
                ) : (
                    <motion.video initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} src={expandedMedia.file_url} controls autoPlay className="max-w-full max-h-[75vh] rounded-[3rem] shadow-2xl" />
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
