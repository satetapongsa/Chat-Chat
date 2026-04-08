import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, Cat, Paperclip, Smile, CheckCheck, FileText, X, Timer, 
  Settings, UserCircle, Edit3, Reply, PlayCircle, Volume2, Camera, Palette, Eye
} from "lucide-react";

/**
 * 🐱 CATGRAM PRO - HIDDEN SNAP (3S VIEW & EXPLODE)
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ALL_EMOJIS = ["🐱", "😸", "😹", "😻", "😼", "😽", "😾", "😀", "😂", "😊", "😍", "💀", "💩", "😈", "💦", "❤️", "🔥", "🚀", "💯", "💎"];
const REACTION_LIST = ["❤️", "👍", "🔥", "😂", "😮", "😢"];

const WALLPAPERS = [
  { name: 'Classic Purple', class: 'from-[#6A1B9A] via-[#EF6C00] to-[#FBC02D]' },
  { name: 'Midnight', class: 'from-[#0F2027] via-[#203A43] to-[#2C5364]' },
  { name: 'Emerald', class: 'from-[#11998e] via-[#38ef7d] to-[#11998e]' },
  { name: 'Sunset', class: 'from-[#e94e77] via-[#d68189] to-[#e94e77]' },
  { name: 'Deep Space', class: 'from-[#000000] via-[#434343] to-[#000000]' },
  { name: 'Ocean', class: 'from-[#2b5876] to-[#4e4376]' },
  { name: 'Neon', class: 'from-[#000000] via-[#9400d3] to-[#00ffff]' },
  { name: 'Candy', class: 'from-[#ffafbd] to-[#ffc3a0]' }
];

const LIFETIME_OPTIONS = [
    { label: '5s', value: 5000 }, { label: '10s', value: 10000 }, { label: '20s', value: 20000 },
    { label: '30s', value: 30000 }, { label: '1m', value: 60000 }, { label: '2m', value: 120000 }
];

const playSound = (type: 'sent' | 'received') => {
  const sounds = {
    sent: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
    received: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'
  };
  try {
    const audio = new Audio(sounds[type]);
    audio.volume = 0.2;
    audio.play().catch(() => {});
  } catch (e) {}
};

export default function App() {
  const [userName, setUserName] = useState<string | null>(() => localStorage.getItem('catgram_user_name'));
  const [tempName, setTempName] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [expandedMedia, setExpandedMedia] = useState<any | null>(null);
  const [currentLifetime, setCurrentLifetime] = useState(() => Number(localStorage.getItem('catgram_lifetime')) || 10000);
  const [wallpaper, setWallpaper] = useState(() => localStorage.getItem('catgram_wallpaper') || WALLPAPERS[0].class);
  const [showSettings, setShowSettings] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showEmojis, setShowEmojis] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<any>(null);

  const [myId] = useState(() => {
    let id = localStorage.getItem('catgram_user_id');
    if (!id) {
      id = 'u_' + Math.random().toString(36).substr(2, 7);
      localStorage.setItem('catgram_user_id', id);
    }
    return id;
  });

  useEffect(() => {
    const itv = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(itv);
  }, []);

  useEffect(() => {
    if (!userName || !supabaseUrl) return;
    const fetchMsgs = async () => {
      const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMsgs();
    const channel = supabase.channel('catgram_main')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        if (payload.new.sender_id !== myId) playSound('received');
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.user === userName) return;
        setTypingUsers(prev => payload.payload.isTyping ? [...new Set([...prev, payload.payload.user])] : prev.filter(u => u !== payload.payload.user));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userName]);

  const toggleTyping = useCallback((isTyping: boolean) => {
    if (!userName) return;
    supabase.channel('catgram_main').send({
      type: 'broadcast', event: 'typing', payload: { user: userName, isTyping }
    });
  }, [userName]);

  const startLongPress = (callback: () => void) => { longPressTimer.current = setTimeout(callback, 800); };
  const cancelLongPress = () => clearTimeout(longPressTimer.current);

  const handleSend = async (content: string, type = 'text', fileUrl?: string, fileName?: string, forcedExp?: number) => {
    if (!content.trim() && !fileUrl) return;
    const payload: any = { 
        content, sender_id: myId, sender_name: userName, type, file_url: fileUrl, file_name: fileName,
        expires_in: forcedExp || currentLifetime, reactions: []
    };
    if (replyingTo) {
        payload.reply_to_id = replyingTo.id;
        payload.reply_to_name = replyingTo.sender_name;
        payload.reply_to_content = replyingTo.type === 'image' || replyingTo.type === 'snap' ? 'Photo 📸' : replyingTo.type === 'video' ? 'Video 📽️' : replyingTo.content;
        payload.reply_to_image_url = (replyingTo.type === 'image' || replyingTo.type === 'snap' || replyingTo.type === 'video') ? replyingTo.file_url : null;
    }
    await supabase.from('messages').insert([payload]);
    setInputValue(""); setShowEmojis(false); setReplyingTo(null); toggleTyping(false);
    playSound('sent');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isSnap = false) => {
    const file = e.target.files?.[0];
    if (!file || !supabaseUrl) return;
    setIsUploading(true);
    const fileName = `${isSnap ? 'snap' : 'up'}_${Date.now()}.${file.name.split('.').pop()}`;
    try {
      await supabase.storage.from('chat-files').upload(`uploads/${fileName}`, file);
      const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(`uploads/${fileName}`);
      await handleSend(isSnap ? "Photos" : file.name, isSnap ? 'snap' : file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file', publicUrl, file.name, isSnap ? 3000 : undefined);
    } catch (err) { alert("Production Error: Check Vercel Logs"); } finally { setIsUploading(false); }
  };

  const activeMessages = messages.filter(msg => (currentTime - new Date(msg.created_at).getTime()) < (msg.expires_in || 10000));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length]);

  if (!userName) {
    return (
      <div className={`h-[100dvh] w-full flex items-center justify-center bg-purple-900 bg-gradient-to-br ${WALLPAPERS[0].class} p-6`}>
         <div className="w-full max-w-sm bg-white/10 backdrop-blur-3xl p-10 rounded-[4rem] shadow-2xl border border-white/10 text-center text-white">
            <h1 className="text-4xl font-black mb-10 italic tracking-tighter uppercase italic">CatGram</h1>
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setUserName(tempName)} placeholder="Nickname?" className="w-full bg-black/20 border border-white/20 rounded-3xl py-5 px-6 text-center text-xl outline-none mb-6 placeholder:text-white/20" />
            <button onClick={() => { if(tempName.trim()){ localStorage.setItem('catgram_user_name', tempName.trim()); setUserName(tempName.trim()); } }} className="w-full bg-white text-purple-900 font-black py-5 rounded-3xl hover:scale-105 transition-all uppercase italic">Enter Vault</button>
         </div>
      </div>
    );
  }

  return (
    <div className={`h-[100dvh] w-full flex flex-col bg-purple-950 bg-gradient-to-br ${wallpaper} overflow-hidden font-sans`}>
      <header className="px-6 py-4 flex justify-between items-center text-white z-20 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center border border-white/5"><Cat size={24}/></div>
              <div>
                  <h2 className="font-bold text-xs uppercase tracking-[0.2em]">{userName}</h2>
                  {typingUsers.length > 0 && <p className="text-[10px] text-green-400 font-bold animate-pulse">{typingUsers[0]} typing...</p>}
              </div>
          </div>
          <div className="flex items-center gap-2">
            {isUploading && <div className="p-2 animate-spin"><CheckCheck size={16}/></div>}
          </div>
      </header>

      <main className="flex-1 overflow-y-auto px-2 sm:px-4 py-8 space-y-4 relative z-10 scroll-smooth">
        <AnimatePresence mode="popLayout">
          {activeMessages.map((msg, i) => {
            const isMe = msg.sender_id === myId;
            const isSnap = msg.type === 'snap';
            return (
              <motion.div key={msg.id || i} initial={{ opacity: 0, scale: 0.9, x: isMe ? 20 : -20 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.5 }} className={`flex w-full flex-col mb-4 ${isMe ? 'items-end' : 'items-start'}`} onDoubleClick={() => setReplyingTo(msg)}>
                <span className="text-[9px] font-bold text-white/30 mb-1 uppercase tracking-widest">{msg.sender_name}</span>
                <div 
                    onClick={() => isSnap && setExpandedMedia(msg)}
                    className={`relative p-3 rounded-[1.5rem] shadow-xl max-w-[85%] group cursor-pointer ${isMe ? 'bg-[#D1F9B3] text-[#122A09] rounded-tr-none' : 'bg-white text-slate-900 rounded-tl-none'}`}
                >
                  {msg.reply_to_name && (
                      <div className="bg-black/5 rounded-xl p-2 mb-2 border-l-4 border-purple-400 text-[10px] opacity-60 flex gap-2 overflow-hidden items-center">
                        <div className="truncate"><span className="font-bold">@{msg.reply_to_name}</span><p className="truncate italic">{msg.reply_to_content}</p></div>
                        {msg.reply_to_image_url && <img src={msg.reply_to_image_url} className="w-8 h-8 rounded-lg object-cover opacity-60" />}
                      </div>
                  )}

                  {!isSnap && msg.type === 'image' && <img src={msg.file_url} onClick={() => setExpandedMedia(msg)} className="rounded-xl mb-1 max-w-full cursor-zoom-in" />}
                  {!isSnap && msg.type === 'video' && <div className="relative rounded-xl overflow-hidden mb-1 cursor-zoom-in" onClick={() => setExpandedMedia(msg)}><video src={msg.file_url} className="max-w-full" muted/><div className="absolute inset-0 flex items-center justify-center bg-black/10"><PlayCircle size={32} className="text-white/80"/></div></div>}
                  
                  {isSnap ? (
                      <div className="flex items-center gap-2 px-2 py-1">
                          <Eye size={16} />
                          <span className="font-extrabold text-lg uppercase tracking-tight">Photos</span>
                      </div>
                  ) : (
                      <p className="px-2 pb-4 pt-1 leading-relaxed font-medium whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                  
                  {msg.reactions?.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{msg.reactions.map((r:any, ri:number) => <span key={ri} className="bg-white/40 rounded-full px-1.5 py-0.5 text-[9px]">{r.emoji}</span>)}</div>}
                  
                  <div className="absolute -top-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 rounded-full px-2 py-1 shadow-2xl flex gap-1.5 z-50 transform -translate-y-1">
                      {REACTION_LIST.map(r => <button key={r} onClick={() => {
                        const newR = [...(msg.reactions || []), { user: userName, emoji: r }];
                        supabase.from('messages').update({ reactions: newR }).eq('id', msg.id).then();
                      }} className="hover:scale-150 transition-transform text-xs">{r}</button>)}
                  </div>

                  <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5 opacity-20 text-[9px]">
                    <svg viewBox="0 0 36 36" className="w-3 h-3 -rotate-90">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={`${Math.max(0, (msg.expires_in - (currentTime - new Date(msg.created_at).getTime())) / msg.expires_in) * 100}, 100`} />
                    </svg>
                    {isMe && <CheckCheck size={10} />}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </main>

      <footer className="px-3 py-4 bg-black/10 backdrop-blur-[30px] border-t border-white/5 w-full relative z-20 flex flex-col items-center">
        <AnimatePresence>
          {replyingTo && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="w-full max-w-5xl px-4 py-2 bg-white/5 border border-white/10 rounded-t-xl flex items-center justify-between text-white text-[10px] mb-1">
                  <div className="truncate opacity-60 flex items-center gap-2"><Reply size={12}/> {replyingTo.sender_name}: {replyingTo.content}</div>
                  <X size={12} onClick={() => setReplyingTo(null)} className="cursor-pointer hover:text-red-400 transition-colors"/>
              </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-5xl flex items-center gap-2">
          <div className="flex-1 flex items-center bg-white rounded-2xl px-4 py-2 shadow-2xl relative">
            <button onClick={() => setShowEmojis(!showEmojis)} className={`p-1 transition-colors ${showEmojis ? 'text-purple-600' : 'text-slate-300 hover:text-purple-400'}`}><Smile size={24}/></button>
            <input value={inputValue} onChange={(e) => { setInputValue(e.target.value); toggleTyping(e.target.value.length > 0); }} onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)} placeholder="Write secret..." className="flex-1 bg-transparent border-none outline-none py-2 px-2 text-slate-800 text-[14px] font-medium" />
            
            <input type="file" ref={cameraInputRef} onChange={(e)=>handleFileUpload(e, true)} accept="image/*" capture="environment" className="hidden" />
            <button onClick={() => cameraInputRef.current?.click()} className="p-1 text-slate-300 hover:text-purple-500 transition-all mr-2"><Camera size={24}/></button>
            
            <input type="file" ref={fileInputRef} onChange={(e)=>handleFileUpload(e)} accept="image/*,video/*" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="p-1 text-slate-300 rotate-45 hover:text-purple-600 transition-all"><Paperclip size={24}/></button>
            
            <div className="absolute right-12 top-[-10px] bg-purple-600 text-[8px] px-2 py-0.5 rounded-full font-black text-white uppercase border border-white/20 shadow-lg pointer-events-none">
                 {LIFETIME_OPTIONS.find(o => o.value === currentLifetime)?.label}
            </div>
          </div>
          
          <button onMouseDown={() => startLongPress(() => setShowSettings(true))} onMouseUp={cancelLongPress} onMouseLeave={cancelLongPress} onTouchStart={() => startLongPress(() => setShowSettings(true))} onTouchEnd={cancelLongPress} onClick={() => { if(!showSettings) handleSend(inputValue); }} className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-all bg-purple-600 hover:bg-purple-700 active:scale-90">
             <Send size={22} className="ml-1"/>
          </button>
        </div>

        {showEmojis && (
            <div className="absolute bottom-full left-0 right-0 bg-white border-t border-white/10 z-[60] overflow-y-auto max-h-[180px] shadow-2xl rounded-t-[2rem] flex justify-center">
                <div className="w-full max-w-5xl grid grid-cols-5 sm:grid-cols-10 gap-1 p-5">
                {ALL_EMOJIS.map(emoji => <button key={emoji} onClick={() => setInputValue(prev => prev + emoji)} className="text-2xl hover:scale-125 transition-transform p-2 active:scale-90">{emoji}</button>)}
                </div>
            </div>
        )}
      </footer>

      {/* MEDIA PREVIEW */}
      <AnimatePresence>
        {expandedMedia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-6" onClick={() => setExpandedMedia(null)}>
            <div className="max-w-full max-h-[85vh] relative" onClick={e=>e.stopPropagation()}>
                {expandedMedia.type === 'image' || expandedMedia.type === 'snap' ? <img src={expandedMedia.file_url} className="max-w-full max-h-[80vh] rounded-[2.5rem] shadow-2xl border border-white/10" /> : <video src={expandedMedia.file_url} controls autoPlay className="max-w-full max-h-[80vh] rounded-[2.5rem] shadow-2xl" />}
                <div className="absolute top-6 right-6 flex flex-col items-center gap-2">
                    <div style={{ width: 44, height: 44 }}>
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#FFF" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${Math.max(0, (expandedMedia.expires_in - (currentTime - new Date(expandedMedia.created_at).getTime())) / expandedMedia.expires_in) * 100}, 100`} />
                        </svg>
                    </div>
                </div>
                <button onClick={()=>setExpandedMedia(null)} className="absolute bottom-[-60px] left-1/2 -translate-x-1/2 text-white/50 hover:text-white uppercase font-black text-[10px] tracking-[0.5em] transition-all">Close Secret</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6" onClick={()=>setShowSettings(false)}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-sm bg-[#111] border border-white/10 rounded-[4rem] p-10 shadow-2xl" onClick={e=>e.stopPropagation()}>
                    <div className="space-y-10">
                        <div>
                            <div className="text-white/20 text-[10px] font-bold uppercase tracking-[0.5em] mb-4 flex justify-between">Vault Pulse <X size={16} onClick={()=>setShowSettings(false)} className="cursor-pointer"/></div>
                            <div className="grid grid-cols-3 gap-2">
                                {LIFETIME_OPTIONS.map(opt => <button key={opt.label} onClick={() => { setCurrentLifetime(opt.value); localStorage.setItem('catgram_lifetime', String(opt.value)); }} className={`py-4 rounded-2xl text-[10px] font-bold border transition-all ${currentLifetime === opt.value ? 'bg-purple-600 border-purple-400 text-white' : 'bg-white/[0.03] border-white/5 text-white/30 hover:bg-white/[0.08]'}`}>{opt.label}</button>)}
                            </div>
                        </div>
                        <div>
                            <div className="text-white/20 text-[10px] font-bold uppercase tracking-[0.5em] mb-4">Aesthetics</div>
                            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                {WALLPAPERS.map(wp => <button key={wp.name} onClick={() => { setWallpaper(wp.class); localStorage.setItem('catgram_wallpaper', wp.class); }} className={`p-4 rounded-2xl text-[10px] bg-gradient-to-br ${wp.class} border-2 ${wallpaper === wp.class ? 'border-white' : 'border-transparent'} text-white font-bold transition-all`}>{wp.name}</button>)}
                            </div>
                        </div>
                        <div className="pt-4">
                            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full py-5 text-red-500 font-bold border border-red-500/10 rounded-3xl text-[11px] uppercase tracking-[0.4em]">Wipe Identity</button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
