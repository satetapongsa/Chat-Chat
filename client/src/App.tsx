import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, Cat, Paperclip, Smile, CheckCheck, X, Timer, 
  Settings, UserCircle, Edit3, Reply, PlayCircle, Volume2, Camera, Palette, Eye,
  ArrowLeft, Plus, Lock, Hash, Search, Zap, Loader2, AlertCircle, CheckCircle2,
  ChevronRight, LogOut, UserMinus, RefreshCw, Database, MoreHorizontal, Trash2
} from "lucide-react";

/**
 * 🐱 CATGRAM ULTIMATE - REDESIGNED WITH LOGO & SYSTEM CHECK
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// ใช้ placeholder เพื่อไม่ให้แอปพัง (Crash) ตอนเริ่มต้น ถ้ายังไม่ได้ตั้งค่า .env
const supabase = createClient(
  supabaseUrl || 'https://your-project.supabase.co', 
  supabaseAnonKey || 'your-anon-key'
);

const GLOBAL_ROOM_ID = "catgram-global-vault";

const ALL_EMOJIS = [
    "🐱", "😸", "😹", "😻", "😼", "😽", "😾", "😀", "😂", "🤣", "😊", "😍", "😘", "😜", "🤨", "🤤", "😎", "🥳", "🥺", "💀", "💩", "😈", "💦", "❤️", "🔥", "🚀", "💯", "💎", "🫦", "👀", "👋", "🙏", "✅", "🌈", "☀️", "❄️", "🍀", "🍕", "🍔", "🍦", "🍺", "🍄"
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

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

export default function App() {
  const [userName, setUserName] = useState<string | null>(() => localStorage.getItem('catgram_user_name'));
  const [tempName, setTempName] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedMedia, setExpandedMedia] = useState<any | null>(null);
  const [wallpaper, setWallpaper] = useState('from-zinc-900 via-black to-zinc-900');
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

  const channelRef = useRef<any>(null);

  useEffect(() => {
    const itv = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(itv);
  }, []);

  useEffect(() => {
    if (!userName) return;

    const fetchMsgs = async () => {
      const { data } = await supabase.from('messages').select('*').eq('room_id', GLOBAL_ROOM_ID).order('created_at', { ascending: true });
      if (data) {
        setMessages(data);
      }
    };
    fetchMsgs();

    const channel = supabase.channel(GLOBAL_ROOM_ID)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.new.room_id === GLOBAL_ROOM_ID) {
            handleIncomingMessage(payload.new);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .on('broadcast', { event: 'new_msg' }, (payload) => {
          handleIncomingMessage(payload.payload);
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.user === userName) return;
        setTypingUsers(prev => payload.payload.isTyping ? [...new Set([...prev, payload.payload.user])] : prev.filter(u => u !== payload.payload.user));
      })
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [userName]);

  const handleIncomingMessage = (msg: any) => {
      setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          
          if (msg.sender_id === myId) {
              const tempIndex = prev.findIndex(m => String(m.id).startsWith('temp_') && m.content === msg.content);
              if (tempIndex !== -1) {
                  const next = [...prev];
                  next[tempIndex] = msg;
                  return next;
              }
          }
          return [...prev, msg];
      });
      if (msg.sender_id !== myId) playSound('received');
  };

  const toggleTyping = useCallback((isTyping: boolean) => {
    if (!userName || !channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast', event: 'typing', payload: { user: userName, isTyping }
    });
  }, [userName]);

  const startLongPress = (callback: () => void) => { longPressTimer.current = setTimeout(callback, 800); };
  const cancelLongPress = () => clearTimeout(longPressTimer.current);

  const handleReaction = async (msg: any, emoji = '❤️') => {
    const reactions = msg.reactions || [];
    const existing = reactions.find((r: any) => r.user_id === myId);
    let newReactions;
    if (existing) {
      newReactions = reactions.filter((r: any) => r.user_id !== myId);
    } else {
      newReactions = [...reactions, { user_id: myId, emoji }];
    }

    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, reactions: newReactions } : m));
    
    try {
      await supabase.from('messages').update({ reactions: newReactions }).eq('id', msg.id);
    } catch (err) {}
  };

  const handleDelete = async (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    try {
      await supabase.from('messages').delete().eq('id', id);
    } catch (err) {}
  };

  const handleEdit = async (msg: any) => {
    setEditingMessage(msg);
    setInputValue(msg.content);
  };

  const handleUpdate = async () => {
    if (!editingMessage || !inputValue.trim()) return;
    const oldMsg = editingMessage;
    setMessages(prev => prev.map(m => m.id === oldMsg.id ? { ...m, content: inputValue } : m));
    setEditingMessage(null);
    setInputValue("");
    try {
      await supabase.from('messages').update({ content: inputValue }).eq('id', oldMsg.id);
    } catch (err) {}
  };

  const handleSend = async (content: string, type = 'text', fileUrl?: string, fileName?: string) => {
    if (editingMessage) {
        handleUpdate();
        return;
    }
    if ((!content.trim() && !fileUrl)) return;
    
    const tempId = 'temp_' + Date.now();
    const payload: any = { 
        id: tempId,
        content, 
        sender_id: myId, 
        sender_name: userName, 
        type, 
        file_url: fileUrl, 
        file_name: fileName,
        reactions: [], 
        room_id: GLOBAL_ROOM_ID,
        created_at: new Date().toISOString()
    };
    
    if (replyingTo) {
        payload.reply_to_id = replyingTo.id;
        payload.reply_to_name = replyingTo.sender_name;
        payload.reply_to_content = replyingTo.type === 'image' || replyingTo.type === 'snap' ? 'Photo 📸' : replyingTo.type === 'video' ? 'Video 📽️' : replyingTo.content;
        payload.reply_to_image_url = (replyingTo.type === 'image' || replyingTo.type === 'snap' || replyingTo.type === 'video') ? replyingTo.file_url : null;
    }

    // Optimistic Update
    setMessages(prev => [...prev, payload]);
    setInputValue(""); 
    setShowEmojis(false); 
    setReplyingTo(null); 
    toggleTyping(false);
    playSound('sent');

    try {
      const { data, error } = await supabase.from('messages').insert([{
          content,
          sender_id: myId,
          sender_name: userName,
          type,
          file_url: fileUrl,
          file_name: fileName,
          room_id: GLOBAL_ROOM_ID,
          reactions: [],
          reply_to_id: payload.reply_to_id,
          reply_to_name: payload.reply_to_name,
          reply_to_content: payload.reply_to_content,
          reply_to_image_url: payload.reply_to_image_url
      }]).select();

      if (error) throw error;
      
      if (data?.[0]) {
        setMessages(prev => prev.map(m => m.id === tempId ? data[0] : m));
        channelRef.current?.send({
          type: 'broadcast',
          event: 'new_msg',
          payload: data[0]
        });
      }
    } catch (err) {
      console.error("Send Error:", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isSnap = false) => {
    const file = e.target.files?.[0];
    if (!file || !supabaseUrl) return;
    setIsUploading(true);
    const fileName = `${isSnap ? 'snap' : 'up'}_${Date.now()}.${file.name.split('.').pop()}`;
    try {
      await supabase.storage.from('chat-files').upload(`uploads/${fileName}`, file);
      const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(`uploads/${fileName}`);
      await handleSend(isSnap ? "Photo" : file.name, isSnap ? 'snap' : file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file', publicUrl, file.name);
    } catch (err) { console.error("Upload Error"); } finally { setIsUploading(false); }
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  return (
        <div className="h-[100dvh] w-full bg-background flex overflow-hidden text-foreground">
      <AnimatePresence mode="wait">
        {!userName ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            key="login" 
            className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 w-full relative"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-primary)_0%,_transparent_70%)] opacity-10 pointer-events-none" />
            
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-8 w-full max-w-md"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 bg-primary/10 rounded-[2.5rem] flex items-center justify-center premium-shadow overflow-hidden p-2">
                  <img src="/logo.png" alt="CatGram Logo" className="w-full h-full object-contain animate-float" />
                </div>
                <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-white uppercase italic">
                  CatGram
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground font-medium">Direct Messaging. Photos. Stories.</p>
              </div>

              {!isSupabaseConfigured && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-start gap-3 text-left">
                  <AlertCircle className="text-destructive shrink-0 mt-0.5" size={18} />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-destructive uppercase tracking-widest">Database Error</p>
                    <p className="text-[10px] text-destructive-foreground/60 leading-relaxed">
                      Supabase configuration is missing. Please add <b>VITE_SUPABASE_URL</b> and <b>VITE_SUPABASE_ANON_KEY</b> to your <b>.env</b> file.
                    </p>
                  </div>
                </div>
              )}

                <div className="space-y-4">
                  <input 
                    value={tempName} 
                    onChange={e=>setTempName(e.target.value)} 
                    onKeyDown={e=>{
                      if(e.key==='Enter' && tempName.trim()){
                        if(messages.some(m => m.sender_name === tempName.trim() && m.sender_id !== myId)) {
                          alert("This name is already taken by another active user.");
                        } else {
                          localStorage.setItem('catgram_user_name', tempName.trim());
                          setUserName(tempName.trim());
                        }
                      }
                    }} 
                    placeholder="Enter your alias" 
                    className="w-full glass-input p-4 sm:p-5 rounded-2xl text-center text-white font-bold text-lg sm:text-xl" 
                  />
                  <button 
                    onClick={() => { 
                      if(tempName.trim()){ 
                        if(messages.some(m => m.sender_name === tempName.trim() && m.sender_id !== myId)) {
                          alert("This name is already taken by another active user.");
                        } else {
                          localStorage.setItem('catgram_user_name', tempName.trim());
                          setUserName(tempName.trim());
                        }
                      } 
                    }} 
                    className="w-full bg-primary hover:bg-primary/90 text-white py-4 sm:py-5 rounded-2xl font-black uppercase tracking-widest active:scale-[0.98] transition-all text-base sm:text-lg shadow-xl"
                  >
                    Join the Vault
                  </button>
                </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            key="chat" 
            className="flex-1 flex h-full z-10 overflow-hidden w-full relative"
          >
            {/* Atmosphere Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${wallpaper} opacity-[0.03] pointer-events-none z-0`} />
            
            {/* Sidebar - Visible on Desktop */}
            <aside className="hidden lg:flex w-80 border-r border-white/5 bg-black/20 backdrop-blur-md flex-col p-6 space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center overflow-hidden p-1.5">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <span className="font-black text-xl tracking-tight italic uppercase">CatGram</span>
              </div>

              <div className="flex-1 space-y-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-2">Active Vault</div>
                <button className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 text-left">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">GV</div>
                  <div className="flex-1 overflow-hidden">
                    <div className="font-bold text-sm truncate">Global Vault</div>
                    <div className="text-[10px] text-muted-foreground truncate">{messages.length} messages</div>
                  </div>
                </button>
              </div>

              <div className="pt-6 border-t border-white/5 space-y-4">
                <button 
                  onClick={() => setShowSettings(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground group-hover:text-white transition-colors">
                    <Settings size={20} />
                  </div>
                  <span className="font-bold text-sm">Vault Settings</span>
                </button>
                <button 
                  onClick={() => { localStorage.removeItem('catgram_user_name'); setUserName(null); }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-destructive/10 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground group-hover:text-destructive transition-colors">
                    <LogOut size={20} />
                  </div>
                  <span className="font-bold text-sm group-hover:text-destructive transition-colors">Leave Session</span>
                </button>
              </div>
            </aside>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
              {/* Header */}
              <header className="h-16 sm:h-20 border-b border-white/5 bg-background/50 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 pt-safe z-20 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="lg:hidden w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center" onClick={() => setShowSettings(true)}>
                    <Settings size={20} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="font-black text-lg tracking-tight">Global Vault</h2>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Connection</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex flex-col items-end mr-2">
                    <span className="text-[10px] font-black text-muted-foreground uppercase">Identity</span>
                    <span className="font-bold text-sm">{userName}</span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center">
                    <UserCircle size={24} className="text-primary" />
                  </div>
                </div>
              </header>

              {/* Messages Container */}
              <main className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth custom-scrollbar relative z-10 w-full">
                <div className="max-w-4xl mx-auto w-full">
                  <AnimatePresence mode="popLayout">
                  {messages.map((msg, i) => {
                      const isMe = msg.sender_id === myId;
                      const isSnap = msg.type === 'snap';
                      const hasReaction = msg.reactions && msg.reactions.length > 0;
                      
                      return (
                      <motion.div 
                        key={msg.id || i} 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                        className={`flex w-full flex-col mb-1 ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        {!isMe && (
                          <span className="text-[10px] font-black text-muted-foreground mb-1 uppercase tracking-widest px-4 italic">
                            {msg.sender_name}
                          </span>
                        )}
                        
                        <div className={`group relative flex items-center gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div 
                            onDoubleClick={() => handleReaction(msg)}
                            className={`
                              relative p-3 sm:p-3.5 max-w-[85vw] sm:max-w-[400px] cursor-pointer transition-all duration-200
                              ${isMe 
                                ? 'ig-bubble-gradient text-white rounded-[1.25rem] rounded-tr-[0.3rem]' 
                                : 'bg-secondary text-white rounded-[1.25rem] rounded-tl-[0.3rem] border border-white/5'}
                            `}
                          >
                            {/* Reply Indicator */}
                            {msg.reply_to_name && (
                              <div className="bg-black/10 rounded-xl p-2 mb-2 border-l-2 border-white/20 text-[10px] flex gap-2 items-center opacity-80">
                                <div className="truncate">
                                  <span className="font-black">@{msg.reply_to_name}</span>
                                  <p className="truncate italic">{msg.reply_to_content}</p>
                                </div>
                              </div>
                            )}

                            {/* Media Content */}
                            {!isSnap && msg.type === 'image' && (
                              <div className="relative group/media" onClick={() => setExpandedMedia(msg)}>
                                <img src={msg.file_url} className="rounded-xl mb-1 max-w-full hover:brightness-90 transition-all shadow-lg" />
                              </div>
                            )}
                            {!isSnap && msg.type === 'video' && (
                              <div className="relative rounded-xl overflow-hidden mb-1 group/video" onClick={() => setExpandedMedia(msg)}>
                                <video src={msg.file_url} className="max-w-full" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/video:bg-black/40 transition-all">
                                  <PlayCircle size={32} className="text-white drop-shadow-lg" />
                                </div>
                              </div>
                            )}

                            {/* Text/Snap Label */}
                            {isSnap ? (
                              <div className="flex items-center gap-3 py-1" onClick={() => setExpandedMedia(msg)}>
                                <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center">
                                  <Camera size={18} />
                                </div>
                                <span className="font-black text-lg uppercase tracking-tighter italic">Photo Message</span>
                              </div>
                            ) : (
                              <p className="px-1 text-[15px] sm:text-[16px] leading-snug font-medium whitespace-pre-wrap break-words">
                                {msg.content}
                              </p>
                            )}

                            {/* Reactions */}
                            {hasReaction && (
                              <div className="absolute -bottom-2 -right-1 bg-zinc-900 border border-white/10 rounded-full px-1.5 py-0.5 shadow-xl flex items-center gap-0.5 scale-90">
                                {Array.from(new Set(msg.reactions.map((r: any) => r.emoji))).map((emoji: any) => (
                                  <span key={emoji} className="text-[10px]">{emoji}</span>
                                ))}
                                <span className="text-[8px] font-bold text-white/60 ml-0.5">{msg.reactions.length}</span>
                              </div>
                            )}
                          </div>

                            {/* IG Style Action Menu */}
                            <div className={`
                                flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity
                                ${isMe ? 'mr-1' : 'ml-1'}
                            `}>
                              <button 
                                onClick={() => setReplyingTo(msg)}
                                className="p-1.5 hover:bg-white/5 rounded-full text-muted-foreground hover:text-white transition-colors"
                                title="Reply"
                              >
                                <Reply size={14} />
                              </button>
                              
                              {isMe && (
                                <>
                                  <button 
                                    onClick={() => handleEdit(msg)} 
                                    className="p-1.5 hover:bg-white/5 rounded-full text-muted-foreground hover:text-white transition-colors"
                                    title="Edit"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(msg.id)} 
                                    className="p-1.5 hover:bg-red-500/10 rounded-full text-muted-foreground hover:text-red-400 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Timestamp */}
                          <span className={`text-[9px] font-bold text-muted-foreground/50 mt-0.5 px-2 ${isMe ? 'mr-2' : 'ml-2'}`}>
                            {formatTime(msg.created_at)}
                          </span>
                        </motion.div>
                      );
                  })}
                  </AnimatePresence>
                  <div ref={messagesEndRef} className="h-4" />
                </div>
              </main>

              {/* Input Area */}
              <footer className="pb-safe pt-2 px-3 sm:px-4 bg-background/80 backdrop-blur-2xl border-t border-white/5 relative z-20 shrink-0">
                <div className="max-w-4xl mx-auto w-full space-y-2 pb-2 sm:pb-4">
                  <div className="h-4 flex items-center justify-between px-2">
                    {typingUsers.length > 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                          <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                        <p className="text-[10px] text-primary font-black uppercase tracking-widest">Signals Detected...</p>
                      </motion.div>
                    )}
                    {isUploading && (
                      <div className="flex items-center gap-2 ml-auto">
                        <Loader2 size={10} className="animate-spin text-primary"/>
                        <span className="text-[10px] font-black uppercase text-muted-foreground">Uploading...</span>
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {replyingTo && (
                      <motion.div 
                        initial={{ y: 10, opacity: 0 }} 
                        animate={{ y: 0, opacity: 1 }} 
                        exit={{ y: 10, opacity: 0 }} 
                        className="glass-card p-3 rounded-2xl flex items-center justify-between text-[11px]"
                      >
                        <div className="truncate flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                            <Reply size={12}/>
                          </div>
                          <div className="truncate">
                            <span className="font-black text-white">@{replyingTo.sender_name}</span>
                            <p className="truncate text-muted-foreground">{replyingTo.content}</p>
                          </div>
                        </div>
                        <button onClick={() => setReplyingTo(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-muted-foreground hover:text-white">
                          <X size={14}/>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-end gap-3">
                    <div className="flex-1 glass-card rounded-[2rem] p-1.5 flex items-end gap-2 border-white/10">
                      <div className="flex gap-0.5 pb-0.5">
                        <button 
                          onClick={() => setShowEmojis(!showEmojis)} 
                          className={`p-2.5 rounded-full transition-all ${showEmojis ? 'bg-primary text-white shadow-lg' : 'hover:bg-white/5 text-muted-foreground hover:text-white'}`}
                        >
                          <Smile size={22}/>
                        </button>
                        <button 
                          onClick={() => fileInputRef.current?.click()} 
                          className="p-2.5 rounded-full hover:bg-white/5 text-muted-foreground hover:text-white transition-all"
                        >
                          <Paperclip size={22}/>
                        </button>
                      </div>
                      
                      <textarea 
                        rows={1}
                        value={inputValue} 
                        onChange={(e) => { setInputValue(e.target.value); toggleTyping(e.target.value.length > 0); }} 
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend(inputValue))} 
                        placeholder="Type a message..." 
                        className="flex-1 bg-transparent border-none outline-none py-3 px-1 text-white text-[15px] sm:text-[16px] font-medium resize-none max-h-32 min-h-[44px]" 
                      />
                    </div>
                    
                    <button 
                      onMouseDown={() => startLongPress(() => setShowSettings(true))} 
                      onMouseUp={cancelLongPress} 
                      onMouseLeave={cancelLongPress} 
                      onTouchStart={() => startLongPress(() => setShowSettings(true))} 
                      onTouchEnd={cancelLongPress} 
                      onClick={() => { if(!showSettings) handleSend(inputValue); }} 
                      className="w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full flex items-center justify-center text-white bg-primary hover:bg-primary/90 active:scale-90 transition-all shadow-xl premium-shadow shrink-0 mb-0.5"
                    >
                      <Send size={20} className="ml-0.5"/>
                    </button>
                  </div>
                </div>
              </footer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EMOJI COMPONENT */}
      <AnimatePresence>
          {showEmojis && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                exit={{ y: 20, opacity: 0 }} 
                className="fixed bottom-24 sm:bottom-32 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 glass-card z-[70] max-h-[300px] sm:max-h-[380px] overflow-y-auto rounded-3xl shadow-2xl p-4 sm:p-6"
              >
                  <div className="grid grid-cols-5 gap-2">
                      {ALL_EMOJIS.map(emoji => (
                        <button 
                          key={emoji} 
                          onClick={() => { setInputValue(prev => prev + emoji); setShowEmojis(false); }} 
                          className="text-2xl hover:scale-125 hover:bg-white/5 rounded-xl transition-all p-2 active:scale-90"
                        >
                          {emoji}
                        </button>
                      ))}
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* SETTINGS MODAL */}
      <AnimatePresence>
          {showSettings && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setShowSettings(false)}
              >
                  <motion.div 
                    initial={{ scale: 0.95, y: 20, opacity: 0 }} 
                    animate={{ scale: 1, y: 0, opacity: 1 }} 
                    exit={{ scale: 0.95, y: 20, opacity: 0 }} 
                    className="w-full max-w-md glass-card rounded-3xl overflow-hidden shadow-2xl" 
                    onClick={e=>e.stopPropagation()}
                  >
                      <div className="p-8 space-y-8">
                          <div className="text-center space-y-2">
                              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Profile Settings</h2>
                              <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em]">Manage your identity</p>
                          </div>

                          <div className="space-y-4">
                              <div className="flex items-center gap-3 px-2">
                                <UserCircle className="text-primary" size={20} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Current Alias</span>
                              </div>
                              <div className="glass-card p-5 rounded-2xl flex items-center justify-between border-primary/20">
                                  <span className="font-bold text-xl text-white">{userName}</span>
                                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                              </div>
                          </div>
                          
                          <div className="pt-6 border-t border-white/10 space-y-3">
                              <button 
                                onClick={() => { localStorage.removeItem('catgram_user_name'); setUserName(null); setShowSettings(false); }} 
                                className="w-full py-5 bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-[0.3em] rounded-2xl shadow-xl active:scale-[0.98] transition-all"
                              >
                                Change Name
                              </button>
                              <button 
                                onClick={() => setShowSettings(false)} 
                                className="w-full py-4 glass-card hover:bg-white/10 text-white/60 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all"
                              >
                                Back to Chat
                              </button>
                          </div>
                      </div>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* MEDIA PREVIEW */}
      <AnimatePresence>{expandedMedia && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 shadow-2xl" 
            onClick={() => setExpandedMedia(null)}
          >
              <div className="relative w-full max-w-4xl flex flex-col items-center" onClick={e=>e.stopPropagation()}>
                  {expandedMedia.type === 'image' || expandedMedia.type === 'snap' ? (
                    <img src={expandedMedia.file_url} className="w-full max-h-[80vh] object-contain rounded-3xl shadow-2xl border border-white/5" />
                  ) : (
                    <video src={expandedMedia.file_url} controls autoPlay className="w-full rounded-3xl" />
                  )}
                  
                  <div className="mt-8 flex items-center gap-6">
                    <button 
                      onClick={()=>setExpandedMedia(null)} 
                      className="bg-white text-black px-10 py-4 rounded-full font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-105 transition-all"
                    >
                      Return to Chat
                    </button>
                  </div>
              </div>
          </motion.div>
      )}</AnimatePresence>

      <input type="file" ref={cameraInputRef} onChange={(e)=>handleFileUpload(e, true)} accept="image/*" capture="environment" className="hidden" />
      <input type="file" ref={fileInputRef} onChange={(e)=>handleFileUpload(e)} accept="image/*,video/*" className="hidden" />
    </div>

  );
}
