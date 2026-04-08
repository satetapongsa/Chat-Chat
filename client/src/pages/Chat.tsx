
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Shield, Lock, Ghost, Trash2, Zap } from "lucide-react";
import { useSupabaseChat } from "@/hooks/useSupabaseChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function Chat() {
  const { messages, addMessage, clearHistory, isLoaded } = useSupabaseChat();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    try {
      await addMessage({
        content: inputValue,
        isSent: true,
        type: "text",
      });
      setInputValue("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  if (!isLoaded) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0a0a0f] text-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Zap className="text-purple-500 w-10 h-10" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#0a0a0f] text-slate-200 flex flex-col items-center overflow-hidden font-sans relative">
      {/* วงกลมเรืองแสง Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Glass Header */}
      <header className="w-full max-w-4xl mt-6 px-4 py-4 flex items-center justify-between border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl z-20 mx-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-xl">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">SECRET VAULT</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">End-to-End Encrypted</span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={clearHistory}
          className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-all"
        >
          <Trash2 className="w-5 h-5" />
        </Button>
      </header>

      {/* Messages Area */}
      <main className="flex-1 w-full max-w-4xl overflow-y-auto px-6 py-8 space-y-6 z-10 scrollbar-hide">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="p-6 bg-white/5 rounded-full border border-white/5">
                <Ghost className="w-12 h-12 text-slate-600" />
              </div>
              <p className="text-slate-400 font-medium">ยังไม่มีความลับถูกฝากไว้ที่นี่...</p>
            </motion.div>
          ) : (
            messages.map((msg, idx) => (
              <motion.div
                key={msg.id || idx}
                initial={{ opacity: 0, x: msg.isSent ? 20 : -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                className={cn(
                  "flex flex-col max-w-[85%] sm:max-w-[70%]",
                  msg.isSent ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div className={cn(
                  "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-lg border",
                  msg.isSent
                    ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white border-purple-500/30"
                    : "bg-white/5 backdrop-blur-md text-slate-200 border-white/10"
                )}>
                  {msg.content}
                </div>
                <span className="text-[10px] text-slate-500 mt-1.5 px-1 font-mono uppercase">
                  {msg.timestamp}
                </span>
              </motion.div>
            ))
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="w-full max-w-4xl p-6 z-20">
        <form
          onSubmit={handleSend}
          className="relative flex items-center bg-white/5 border border-white/10 p-1.5 rounded-2xl backdrop-blur-2xl focus-within:border-purple-500/50 transition-all shadow-2xl"
        >
          <div className="pl-3 text-slate-500">
            <Lock className="w-4 h-4" />
          </div>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="พิมพ์ความลับของคุณที่นี่..."
            className="border-0 bg-transparent focus-visible:ring-0 text-white placeholder:text-slate-600 h-12 text-base shadow-none"
          />
          <Button
            type="submit"
            className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl h-11 px-5 gap-2 transition-all shadow-lg active:scale-95"
          >
            <span className="hidden sm:inline">Send</span>
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-[10px] text-center text-slate-600 mt-4 uppercase tracking-[0.2em] pointer-events-none">
          E-2-E Secured Hub • Built with React & Supabase
        </p>
      </footer>
    </div>
  );
}
