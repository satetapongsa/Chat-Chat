import { useEffect, useRef, useState } from "react";
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, Cat, Paperclip, Smile, CheckCheck, FileText, X, Timer, 
  Settings, UserCircle, Edit3, Reply, PlayCircle, Mic, StopCircle, 
  Volume2, Palette, Info, Heart, ThumbsUp, Laugh, Frown, Flame, Camera
} from "lucide-react";

/**
 * 🐱 CATGRAM ULTIMATE - SNAP & EXPLODE (3S VIEW ONCE)
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ALL_EMOJIS = ["🐱", "😸", "😹", "😻", "😼", "😽", "😾", "😀", "😂", "😊", "😍", "💀", "💩", "😈", "💦", "❤️", "🔥", "🚀", "💯", "💎"];
const REACTION_LIST = ["❤️", "👍", "🔥", "😂", "😮", "😢"];

const WALLPAPERS = [
  { name: 'Classic Purple', class: 'from-[#6A1B9A] via-[#EF6C00] to-[#FBC02D]' },
  { name: 'Midnight Blue', class: 'from-[#0F2027] via-[#203A43] to-[#2C5364]' },
  { name: 'Deep Forest', class: 'from-[#11998e] to-[#38ef7d]' },
  { name: 'Crimson Sky', class: 'from-[#e94e77] to-[#d68189]' },
  { name: 'Stealth Black', class: 'from-gray-900 to-black' }
];

const LIFETIME_OPTIONS = [
    { label: '5s', value: 5000 }, { label: '10s', value: 10000 }, { label: '20s', value: 20000 },
    { label: '30s', value: 30000 }, { label: '1m', value: 60000 }, { label: '2m', value: 120000 }
];

const playSound = (type: 'sent' | 'received' | 'shred') => {
  const sounds = {
    sent: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
    received: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
    shred: 'https://assets.mixkit.co/active_storage/sfx/2361/2361-preview.mp3'
  };
  const audio = new Audio(sounds[type]);
  audio.volume = 0.3;
  audio.play().catch(() => {});
};

export default function App() {
  const [userName, setUserName] = useState<string | null>(localStorage.getItem('catgram_user_name'));
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
  const [isRecording, setIsRecording] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
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
    if (!userName) return;
    async function initChat() {
      const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
      if (data) setMessages(data);
      
      const channel = supabase.channel('chat_room')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          setMessages(prev => [...prev, payload.new]);
          if (payload.new.sender_id !== myId) playSound('received');
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
        })
        .on('broadcast', { event: 'typing' }, (payload) => {
            const { user, isTyping } = payload.payload;
            if (user === userName) return;
            setTypingUsers(prev => isTyping ? [...new Set([...prev, user])] : prev.filter(u => u !== user));
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
    initChat();
  }, [userName]);

  const toggleTyping = (isTyping: boolean) => {
    supabase.channel('chat_room').send({
      type: 'broadcast', event: 'typing', payload: { user: userName, isTyping }
    });
  };

  const handleSend = async (content: string, type = 'text', fileUrl?: string, fileName?: string, forcedExpiry?: number) => {
    const expiry = forcedExpiry || currentLifetime;
    const payload: any = { 
        content, sender_id: myId, sender_name: userName, type, file_url: fileUrl, file_name: fileName,
        expires_in: expiry, reactions: []
    };
    if (replyingTo) {
        payload.reply_to_id = replyingTo.id;
        payload.reply_to_name = replyingTo.sender_name;
        payload.reply_to_content = replyingTo.type === 'image' ? 'Sent a photo 📸' : replyingTo.type === 'video' ? 'Sent a video 📽️' : replyingTo.content;
        payload.reply_to_image_url = (replyingTo.type === 'image' || replyingTo.type === 'video') ? replyingTo.file_url : null;
    }
    await supabase.from('messages').insert([payload]);
    setInputValue(""); setShowEmojis(false); setReplyingTo(null); toggleTyping(false);
    playSound('sent');
  };

  const addReaction = async (msgId: string, emoji: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const newReactions = [...(msg.reactions || []), { user: userName, emoji }];
    await supabase.from('messages').update({ reactions: newReactions }).eq('id', msgId);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = async () => {
        setIsUploading(true);
        const fileName = `voice_${Date.now()}.webm`;
        await supabase.storage.from('chat-files').upload(`uploads/${fileName}`, new Blob(audioChunks.current, { type: 'audio/webm' }));
        const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(`uploads/${fileName}`);
        handleSend("Voice Message 🎤", 'voice', publicUrl, fileName);
        setIsUploading(false);
      };
      mediaRecorder.current.start(); setIsRecording(true);
    } catch (e) { alert("Mic access denied"); }
  };
  const stopRecording = () => { mediaRecorder.current?.stop(); setIsRecording(false); };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isSnap = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const fileName = `${isSnap ? 'snap' : 'file'}_${Date.now()}.${file.name.split('.').pop()}`;
    try {
      await supabase.storage.from('chat-files').upload(`uploads/${fileName}`, file);
      const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(`uploads/${fileName}`);
      const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
      await handleSend(isSnap ? "Snap! 📸 (Expiring in 3s)" : file.name, type, publicUrl, file.name, isSnap ? 3000 : undefined);
    } catch (e: any) { alert(e.message); } finally { setIsUploading(false); }
  };

  const activeMessages = messages.filter(msg => (currentTime - new Date(msg.created_at).getTime()) < (msg.expires_in || 10000));

  if (!userName) {
    return (
      <div className={`h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br ${WALLPAPERS[0].class} font-sans p-6 text-white text-center`}>
         <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm bg-white/20 backdrop-blur-3xl p-10 rounded-[4rem] shadow-2xl border border-white/20">
            <h1 className="text-3xl font-black mb-10 italic uppercase tracking-tighter shadow-sm">CatGram</h1>
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setUserName(tempName)} placeholder="Nickname?" className="w-full bg-white/10 border border-white/20 rounded-3xl py-5 px-6 text-center text-xl outline-none placeholder:text-white/30 mb-6 font-medium" />
            <button onClick={() => { localStorage.setItem('catgram_user_name', tempName); setUserName(tempName); }} className="w-full bg-white text-purple-700 font-black py-5 rounded-3xl shadow-xl active:scale-95 transition-all uppercase italic">Start Secrets</button>
         </motion.div>
      </div>
    );
  }

  return (
    <div className={`h-[100dvh] w-full flex flex-col bg-gradient-to-br ${wallpaper} overflow-hidden font-sans transition-all duration-700`}>
      <header className="px-6 py-4 border-b border-white/10 flex justify-between items-center text-white z-20 backdrop-blur-md">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center border border-white/10"><Cat size={24}/></div>
              <div>
                  <h2 className="font-black text-sm uppercase tracking-widest">Vault</h2>
                  {typingUsers.length > 0 && <p className="text-[10px] text-green-400 font-bold italic animate-pulse">{typingUsers[0]} typing...</p>}
              </div>
          </div>
          <button onClick={()=>setShowSettings(true)} className="p-2 hover:bg-white/10 rounded-2xl transition-all"><Settings size={22}/></button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-4 relative z-10">
        <AnimatePresence mode="popLayout">
          {activeMessages.map((msg, i) => {
            const isMe = msg.sender_id === myId;
            return (
              <motion.div key={msg.id || i} initial={{ opacity: 0, scale: 0.9, x: isMe ? 20 : -20 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.5 }} className={`flex w-full flex-col mb-4 ${isMe ? 'items-end' : 'items-start'}`} onDoubleClick={() => setReplyingTo(msg)}>
                <span className="text-[10px] font-black text-white/30 mb-1 uppercase tracking-widest">{msg.sender_name}</span>
                <div className={`relative p-3 rounded-3xl shadow-xl max-w-[85%] group ${isMe ? 'bg-[#E1FEC6] text-[#1a3a14] rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none'}`}>
                  {msg.reply_to_name && (
                      <div className="bg-black/5 rounded-2xl p-2 mb-2 border-l-4 border-purple-500 text-[10px] opacity-60 flex gap-2 overflow-hidden"><div className="truncate"><span className="font-bold">@{msg.reply_to_name}</span><p className="truncate italic">{msg.reply_to_content}</p></div>{msg.reply_to_image_url && <img src={msg.reply_to_image_url} className="w-8 h-8 rounded-lg object-cover opacity-60" />}</div>
                  )}
                  {msg.type === 'image' && <img src={msg.file_url} onClick={() => setExpandedMedia(msg)} className="rounded-2xl mb-1 max-w-full" />}
                  {msg.type === 'video' && <div className="relative rounded-2xl overflow-hidden mb-1" onClick={() => setExpandedMedia(msg)}><video src={msg.file_url} className="max-w-full rounded-2xl" muted/><div className="absolute inset-0 flex items-center justify-center bg-black/20"><PlayCircle size={32}/></div></div>}
                  {msg.type === 'voice' && <div className="flex items-center gap-3 p-2 bg-black/5 rounded-2xl mb-1 min-w-[150px]"><Volume2 size={16}/><audio src={msg.file_url} controls className="h-8 max-w-[150px] invert grayscale"/></div>}
                  <p className="px-2 pb-4 pt-1 leading-snug font-medium whitespace-pre-wrap break-words">{msg.content}</p>
                  {msg.reactions?.length > 0 && <div className="flex flex-wrap gap-1 mt-1 -mb-1">{msg.reactions.map((r, ri) => <span key={ri} className="bg-white/50 rounded-full px-1.5 py-0.5 text-[10px]">{r.emoji}</span>)}</div>}
                  <div className="absolute -top-6 left-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full px-2 py-1 shadow-xl flex gap-1 z-50">{REACTION_LIST.map(r => <button key={r} onClick={() => addReaction(msg.id, r)} className="hover:scale-125 transition-transform text-xs">{r}</button>)}</div>
                  <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5 opacity-30 text-[10px]">
                    <svg viewBox="0 0 36 36" className="w-3.5 h-3.5 -rotate-90">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={isMe ? "#4CAD3E" : "#6A1B9A"} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${Math.max(0, (msg.expires_in - (currentTime - new Date(msg.created_at).getTime())) / msg.expires_in) * 100}, 100`} />
                    </svg>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </main>

      <footer className="px-3 py-4 bg-white/10 backdrop-blur-2xl border-t border-white/10 w-full relative z-20 flex flex-col items-center">
        <AnimatePresence>
          {replyingTo && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="w-full max-w-5xl px-4 py-2 bg-white/10 rounded-t-2xl flex items-center justify-between text-white text-[10px] mb-1">
                  <div className="truncate"><span className="font-bold opacity-60">Replying to {replyingTo.sender_name}</span></div>
                  <X size={12} onClick={() => setReplyingTo(null)} className="cursor-pointer"/>
              </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-5xl flex items-center gap-2">
          <div className="flex-1 flex items-center bg-white rounded-full px-4 py-2 shadow-xl relative">
            <button onClick={() => setShowEmojis(!showEmojis)} className={`transition-colors ${showEmojis ? 'text-purple-600' : 'text-slate-400'}`}><Smile size={24}/></button>
            <input value={inputValue} onChange={(e) => { setInputValue(e.target.value); toggleTyping(e.target.value.length > 0); }} onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)} placeholder="Write secret..." className="flex-1 bg-transparent border-none outline-none py-2 px-2 text-slate-800 text-sm" />
            
            <input type="file" ref={cameraInputRef} onChange={(e)=>handleFileUpload(e, true)} accept="image/*" capture="environment" className="hidden" />
            <button onClick={() => cameraInputRef.current?.click()} className="text-slate-400 hover:text-purple-600 transition-all mr-2"><Camera size={24}/></button>
            
            <input type="file" ref={fileInputRef} onChange={(e)=>handleFileUpload(e)} accept="image/*,video/*" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 rotate-45 hover:text-purple-600 transition-all"><Paperclip size={24}/></button>
            <div className="absolute right-12 top-[-10px] bg-purple-600 text-[8px] px-2 py-0.5 rounded-full font-black text-white uppercase border border-white/20 shadow-lg pointer-events-none">
                 {LIFETIME_OPTIONS.find(o => o.value === currentLifetime)?.label}
            </div>
          </div>
          
          <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl transition-all ${isRecording ? 'bg-red-500 scale-110 animate-pulse' : 'bg-purple-600 hover:bg-purple-700 active:scale-95'}`}>
            {isRecording ? <StopCircle size={24}/> : (inputValue.trim() ? <Send size={22} onClick={()=>handleSend(inputValue)} className="ml-1"/> : <Mic size={22}/>)}
          </button>
        </div>

        {showEmojis && (
            <div className="absolute bottom-full left-0 right-0 bg-white border-t border-white/10 z-[60] overflow-y-auto max-h-[200px] shadow-2xl rounded-t-3xl flex justify-center">
                <div className="w-full max-w-5xl grid grid-cols-5 sm:grid-cols-10 gap-1 p-4">
                {ALL_EMOJIS.map(emoji => <button key={emoji} onClick={() => setInputValue(prev => prev + emoji)} className="text-2xl hover:scale-125 transition-transform p-2">{emoji}</button>)}
                </div>
            </div>
        )}
      </footer>

      {/* MEDIA PREVIEW */}
      <AnimatePresence>
        {expandedMedia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6" onClick={() => setExpandedMedia(null)}>
            <div onClick={(e) => e.stopPropagation()} className="relative">
                {expandedMedia.type === 'image' ? <img src={expandedMedia.file_url} className="max-w-full max-h-[85vh] rounded-[2rem] shadow-2xl" /> : <video src={expandedMedia.file_url} controls autoPlay className="max-w-full max-h-[85vh] rounded-[2rem] shadow-2xl" />}
                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-white font-black text-xs uppercase tracking-widest border border-white/10">Secret Preview</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto" onClick={()=>setShowSettings(false)}>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="w-full max-w-sm bg-[#1A1A1A] border border-white/10 rounded-[3rem] p-8 shadow-2xl" onClick={e=>e.stopPropagation()}>
                    <div className="space-y-8">
                        <div>
                            <div className="text-white/30 text-[10px] font-black uppercase tracking-[0.3em] mb-4 flex justify-between">Secret Timer <X size={16} onClick={()=>setShowSettings(false)} className="cursor-pointer"/></div>
                            <div className="grid grid-cols-3 gap-2">
                                {LIFETIME_OPTIONS.map(opt => <button key={opt.label} onClick={() => { setCurrentLifetime(opt.value); localStorage.setItem('catgram_lifetime', String(opt.value)); }} className={`py-3 rounded-2xl text-[10px] font-black border uppercase transition-all ${currentLifetime === opt.value ? 'bg-purple-600 border-purple-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}>{opt.label}</button>)}
                            </div>
                        </div>
                        <div>
                            <div className="text-white/30 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Wallpapers</div>
                            <div className="grid grid-cols-2 gap-2">
                                {WALLPAPERS.map(wp => <button key={wp.name} onClick={() => { setWallpaper(wp.class); localStorage.setItem('catgram_wallpaper', wp.class); }} className={`p-4 rounded-2xl text-[10px] bg-gradient-to-br ${wp.class} border-2 ${wallpaper === wp.class ? 'border-white' : 'border-transparent'} text-white font-bold truncate`}>{wp.name}</button>)}
                            </div>
                        </div>
                        <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full py-4 text-red-500 font-bold border border-red-500/20 rounded-2xl text-xs hover:bg-red-500/10 transition-all uppercase tracking-widest">Wipe Data & Leave</button>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
