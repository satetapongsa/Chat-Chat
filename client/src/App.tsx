import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, Cat, Paperclip, Smile, CheckCheck, X, Timer, 
  Settings, UserCircle, Edit3, Reply, PlayCircle, Volume2, Camera, Palette, Eye,
  ArrowLeft, Plus, Lock, Hash, Search, Zap, Loader2, AlertCircle, CheckCircle2,
  ChevronRight, LogOut, UserMinus, RefreshCw
} from "lucide-react";

/**
 * 🐱 CATGRAM ULTIMATE - UNIFIED VAULT SETTINGS (SMART FIT EDITION)
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const GLOBAL_ROOM_ID = "catgram-global-vault";

const ALL_EMOJIS = [
    "🐱", "😸", "😹", "😻", "😼", "😽", "😾", "😀", "😂", "🤣", "😊", "😍", "😘", "😜", "🤨", "🤤", "😎", "🥳", "🥺", "💀", "💩", "😈", "💦", "❤️", "🔥", "🚀", "💯", "💎", "🫦", "👀", "👋", "🙏", "✅", "🌈", "☀️", "❄️", "🍀", "🍕", "🍔", "🍦", "🍺", "🍄"
];

const WALLPAPERS = [
  { name: 'Neon Dreams', class: 'from-[#FF0080] via-[#7928CA] to-[#FF0080]' },
  { name: 'Sunset Vibe', class: 'from-[#FF4D4D] via-[#F9CB28] to-[#FF4D4D]' },
  { name: 'Tropical Mix', class: 'from-[#00DFD8] via-[#007CF0] to-[#00DFD8]' },
  { name: 'Alien Aurora', class: 'from-[#a2ff00] via-[#00a2ff] to-[#a2ff00]' }
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
    if (!userName) return;

    const fetchMsgs = async () => {
      const { data } = await supabase.from('messages').select('*').eq('room_id', GLOBAL_ROOM_ID).order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMsgs();

    const channel = supabase.channel(`global_vault`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.new.room_id === GLOBAL_ROOM_ID) {
            setMessages(prev => [...prev.filter(m => m.id !== payload.new.id), payload.new]);
            if (payload.new.sender_id !== myId) playSound('received');
        }
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
    supabase.channel(`global_vault`).send({
      type: 'broadcast', event: 'typing', payload: { user: userName, isTyping }
    });
  }, [userName]);

  const startLongPress = (callback: () => void) => { longPressTimer.current = setTimeout(callback, 800); };
  const cancelLongPress = () => clearTimeout(longPressTimer.current);

  const handleSend = async (content: string, type = 'text', fileUrl?: string, fileName?: string, forcedExp?: number) => {
    if ((!content.trim() && !fileUrl)) return;
    const payload: any = { 
        content, sender_id: myId, sender_name: userName, type, file_url: fileUrl, file_name: fileName,
        expires_in: forcedExp || currentLifetime, reactions: [], room_id: GLOBAL_ROOM_ID
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
      await handleSend(isSnap ? "Photos" : file.name, isSnap ? 'snap' : file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file', publicUrl, file.name, isSnap ? 10000 : undefined);
    } catch (err) { console.error("Upload Error"); } finally { setIsUploading(false); }
  };

  const activeMessages = (messages || []).filter(msg => (currentTime - new Date(msg.created_at).getTime()) < (msg.expires_in || 10000));
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeMessages.length]);

  return (
    <div className="h-[100dvh] w-full bg-[#050505] flex items-center justify-center font-sans overflow-hidden">
      
      {/* UNIVERSAL MASTER FRAME */}
      <div 
        className={`relative w-full h-[100dvh] sm:max-w-xl bg-zinc-950 flex flex-col overflow-hidden transition-all shadow-2xl z-10 sm:border-x border-white/5`}
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
      >
        
        {/* GLOBAL DYNAMIC ATMOSPHERE */}
        <div className={`absolute inset-0 bg-gradient-to-br ${wallpaper} opacity-30 pointer-events-none z-0`} />

        <AnimatePresence mode="wait">
          {!userName ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="login" className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-12 z-10 w-full relative">
                <h1 className="text-5xl sm:text-7xl font-black italic tracking-tighter text-white uppercase whitespace-nowrap">CatGram</h1>
                <div className="w-full max-w-sm space-y-4">
                    <input value={tempName} onChange={e=>setTempName(e.target.value)} onKeyDown={e=>e.key==='Enter' && tempName.trim() && (localStorage.setItem('catgram_user_name', tempName.trim()), setUserName(tempName.trim()))} placeholder="Choose Identity" className="w-full bg-white/5 border border-white/10 p-6 rounded-[3rem] text-center text-white font-bold outline-none text-xl" />
                    <button onClick={() => { if(tempName.trim()){ localStorage.setItem('catgram_user_name', tempName.trim()); setUserName(tempName.trim()); } }} className="w-full bg-white text-black py-6 rounded-[3rem] font-black uppercase tracking-widest active:scale-95 transition-all text-lg shadow-2xl">Enter Chat</button>
                </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="chat" className="flex-1 flex flex-col h-full z-10 overflow-hidden w-full relative">
                <main className="flex-1 overflow-y-auto px-2 pt-10 pb-6 space-y-6 custom-scrollbar relative z-10 w-full">
                    <AnimatePresence mode="popLayout">
                    {activeMessages.map((msg, i) => {
                        const isMe = msg.sender_id === myId;
                        const isSnap = msg.type === 'snap';
                        return (
                        <motion.div key={msg.id || i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.5 }} className={`flex w-full flex-col mb-4 ${isMe ? 'items-end' : 'items-start'}`} onDoubleClick={() => setReplyingTo(msg)}>
                            <span className="text-[10px] font-bold text-white/15 mb-1.5 uppercase tracking-widest px-5 italic">{msg.sender_name}</span>
                            <div onClick={() => isSnap && setExpandedMedia(msg)} className={`relative p-5 shadow-2xl max-w-[92%] group cursor-pointer transition-all ${isMe ? 'bg-white text-slate-900 rounded-l-[2.5rem] rounded-tr-none' : 'bg-[#D1F9B3] text-[#122A09] rounded-r-[2.5rem] rounded-tl-none'}`} style={{ marginInline: isMe ? '0 0.25rem' : '0.25rem 0' }}>
                                {msg.reply_to_name && <div className="bg-black/5 rounded-[1.2rem] p-3 mb-2 border-l-4 border-purple-500 text-[11px] opacity-70 flex gap-2 items-center"><div className="truncate"><span className="font-bold">@{msg.reply_to_name}</span><p className="truncate italic">{msg.reply_to_content}</p></div></div>}
                                {!isSnap && msg.type === 'image' && <img src={msg.file_url} className="rounded-[1.5rem] mb-1 max-w-full" />}
                                {!isSnap && msg.type === 'video' && <div className="relative rounded-[1.5rem] overflow-hidden mb-1"><video src={msg.file_url} className="max-w-full" /><div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20"><PlayCircle size={40} className="text-white/80"/></div></div>}
                                {isSnap ? <div className="flex items-center gap-3 px-1 py-1"><Eye size={24} /><span className="font-black text-2xl uppercase tracking-tighter italic">Photos</span></div> : <p className="px-2 pb-5 leading-tight font-bold text-[18px] whitespace-pre-wrap">{msg.content}</p>}
                                <div className="absolute bottom-2.5 right-4 flex items-center gap-2 opacity-20 text-[10px]">
                                    <svg viewBox="0 0 36 36" className="w-4 h-4 -rotate-90"><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="3" /><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={`${Math.max(0, (msg.expires_in - (currentTime - new Date(msg.created_at).getTime())) / msg.expires_in) * 100}, 100`} /></svg>
                                    {isMe && <CheckCheck size={11} />}
                                </div>
                            </div>
                        </motion.div>
                        );
                    })}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </main>

                <footer className="pb-10 bg-black/60 backdrop-blur-3xl border-t border-white/5 flex flex-col items-center relative z-20 shrink-0">
                    <div className="flex w-full px-6 pt-2 justify-between items-center opacity-20 h-4">
                        {typingUsers.length > 0 ? (
                            <p className="text-[9px] text-green-400 font-bold animate-pulse uppercase tracking-[0.2em]">Signals Detected...</p>
                        ) : null}
                        {isUploading && <Loader2 size={12} className="animate-spin text-white"/>}
                    </div>
                    <AnimatePresence>{replyingTo && (
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="w-full px-6 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between text-white text-[11px] mb-1">
                            <div className="truncate opacity-50 flex items-center gap-3"><Reply size={16}/> {replyingTo.sender_name}: {replyingTo.content}</div>
                            <X size={16} onClick={() => setReplyingTo(null)} className="cursor-pointer hover:text-red-400 transition-colors"/>
                        </motion.div>
                    )}</AnimatePresence>
                    <div className="w-full flex items-center gap-3 px-4 pt-4">
                        <div className="flex-1 flex items-center bg-white rounded-[3rem] px-5 py-2.5 shadow-2xl relative">
                            <button onClick={() => setShowEmojis(!showEmojis)} className={`p-1 transition-colors ${showEmojis ? 'text-purple-600' : 'text-slate-300'}`}><Smile size={32}/></button>
                            <input value={inputValue} onChange={(e) => { setInputValue(e.target.value); toggleTyping(e.target.value.length > 0); }} onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)} placeholder="Enter message..." className="flex-1 bg-transparent border-none outline-none py-2 px-2 text-slate-800 text-[17px] font-bold" />
                            <button onClick={() => cameraInputRef.current?.click()} className="p-1 text-slate-300 hover:text-purple-600 transition-all mr-1"><Camera size={28}/></button>
                            <button onClick={() => fileInputRef.current?.click()} className="p-1 text-slate-300 rotate-45 hover:text-purple-600 transition-all"><Paperclip size={28}/></button>
                        </div>
                        <button 
                            onMouseDown={() => startLongPress(() => setShowSettings(true))} 
                            onMouseUp={cancelLongPress} 
                            onMouseLeave={cancelLongPress} 
                            onTouchStart={() => startLongPress(() => setShowSettings(true))} 
                            onTouchEnd={cancelLongPress} 
                            onClick={() => { if(!showSettings) handleSend(inputValue); }} 
                            className="w-16 h-16 rounded-[1.8rem] flex items-center justify-center text-white bg-purple-600 hover:bg-purple-700 active:scale-95 transition-all shadow-xl flex-shrink-0"
                        >
                            <Send size={30} className="ml-1.5"/>
                        </button>
                    </div>
                </footer>
            </motion.div>
          )}
        </AnimatePresence>

        {/* EMOJI COMPONENT */}
        <AnimatePresence>
            {showEmojis && (
                <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="absolute bottom-36 left-4 right-4 bg-white z-[70] h-[380px] overflow-y-auto rounded-[3.5rem] shadow-2xl p-8 custom-scrollbar">
                    <div className="grid grid-cols-5 gap-3">
                        {ALL_EMOJIS.map(emoji => <button key={emoji} onClick={() => setInputValue(prev => prev + emoji)} className="text-4xl hover:scale-125 transition-transform p-3 active:scale-90">{emoji}</button>)}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* SMART FIT VAULT SETTINGS */}
        <AnimatePresence>
            {showSettings && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[110] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-4">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-[96%] max-h-[92vh] overflow-y-auto custom-scrollbar-hidden bg-[#0a0a0a] border border-white/5 p-6 sm:p-8 rounded-[3.5rem] shadow-2xl shadow-black/80" onClick={e=>e.stopPropagation()}>
                        <div className="space-y-8">
                            <div className="flex justify-between items-center px-2">
                                <span className="text-white/20 text-[9px] font-black uppercase tracking-[0.6em] italic">Vault Config</span>
                                <X size={24} onClick={()=>setShowSettings(false)} className="text-white/40 cursor-pointer hover:text-white transition-colors"/>
                            </div>

                            {/* Timer Section */}
                            <div className="space-y-5">
                                <div className="text-white/10 text-[9px] font-black uppercase tracking-[0.4em] px-2 italic">Room Timer</div>
                                <div className="grid grid-cols-3 gap-3">
                                    {LIFETIME_OPTIONS.map(opt => (
                                        <button key={opt.label} onClick={() => { setCurrentLifetime(opt.value); localStorage.setItem('catgram_lifetime', String(opt.value)); }} className={`py-4 rounded-2xl text-[10px] font-black border transition-all ${currentLifetime === opt.value ? 'bg-purple-600 border-purple-400 text-white shadow-lg' : 'bg-white/[0.03] border-white/5 text-white/30 hover:bg-white/[0.08]'}`}>{opt.label}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Atmosphere Section */}
                            <div className="space-y-5">
                                <div className="text-white/10 text-[9px] font-black uppercase tracking-[0.4em] px-2 italic">Atmosphere</div>
                                <div className="grid grid-cols-2 gap-3">
                                    {WALLPAPERS.map(wp => (
                                        <button key={wp.name} onClick={() => { setWallpaper(wp.class); localStorage.setItem('catgram_wallpaper', wp.class); }} className={`p-5 rounded-[2rem] text-[9px] bg-gradient-to-br ${wp.class} border-2 ${wallpaper === wp.class ? 'border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'border-transparent'} text-white font-black transition-all`}>{wp.name}</button>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Action Section */}
                            <div className="space-y-3 pt-4 border-t border-white/5">
                                <button onClick={() => { localStorage.removeItem('catgram_user_name'); setUserName(null); setShowSettings(false); }} className="w-full py-5 bg-white text-black font-black uppercase text-[12px] tracking-[0.6em] rounded-[2.5rem] shadow-xl active:scale-95 transition-all">rename</button>
                                <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full py-4 bg-red-600/5 text-red-500/40 font-bold uppercase text-[9px] tracking-[0.6em] rounded-[2.5rem] border border-red-500/10 active:bg-red-500 active:text-white transition-all">Destroy Signal</button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* MEDIA PREVIEW */}
        <AnimatePresence>{expandedMedia && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[120] bg-black/99 backdrop-blur-3xl flex flex-col items-center justify-center p-6 shadow-2xl" onClick={() => setExpandedMedia(null)}>
                <div className="relative w-full flex flex-col items-center" onClick={e=>e.stopPropagation()}>
                    {expandedMedia.type === 'image' || expandedMedia.type === 'snap' ? <img src={expandedMedia.file_url} className="w-full rounded-[3.5rem] shadow-[0_0_150px_rgba(0,0,0,0.8)] border border-white/5" /> : <video src={expandedMedia.file_url} controls autoPlay className="w-full rounded-[3.5rem]" />}
                    <div className="absolute top-10 right-10"><div style={{ width: 60, height: 60 }}><svg viewBox="0 0 36 36" className="w-full h-full -rotate-90"><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" /><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#FFF" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${Math.max(0, (expandedMedia.expires_in - (currentTime - new Date(expandedMedia.created_at).getTime())) / expandedMedia.expires_in) * 100}, 100`} /></svg></div></div>
                    <button onClick={()=>setExpandedMedia(null)} className="mt-16 bg-white text-black px-12 py-5 rounded-full font-black uppercase text-[12px] tracking-widest shadow-2xl hover:scale-105 transition-all">Close Scene</button>
                </div>
            </motion.div>
        )}</AnimatePresence>

        <input type="file" ref={cameraInputRef} onChange={(e)=>handleFileUpload(e, true)} accept="image/*" capture="environment" className="hidden" />
        <input type="file" ref={fileInputRef} onChange={(e)=>handleFileUpload(e)} accept="image/*,video/*" className="hidden" />
      </div>

    </div>
  );
}
