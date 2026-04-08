/**
 * ChatInput Component
 * 
 * Design Philosophy: Warm Conversational Design
 * - Rounded input container with soft shadow
 * - Send button with warm orange accent
 * - Supports Enter key to send
 * - Smooth focus transitions
 * - File attachment button for images
 * - Voice recording button (hold to record)
 */

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, Mic } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onSendImage?: (imageData: string, caption?: string) => void;
  onSendVoice?: (audioData: string, duration: number) => void;
  disabled?: boolean;
}

export function ChatInput({
  onSendMessage,
  onSendImage,
  onSendVoice,
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceRecorder = useVoiceRecorder();
  const voiceButtonRef = useRef<HTMLButtonElement>(null);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onSendImage) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        onSendImage(imageData, message || undefined);
        setMessage("");
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVoiceMouseDown = async () => {
    await voiceRecorder.startRecording();
  };

  const handleVoiceMouseUp = async () => {
    const audioData = await voiceRecorder.stopRecording();
    if (audioData && onSendVoice) {
      onSendVoice(audioData, voiceRecorder.duration);
    }
  };

  const handleVoiceMouseLeave = () => {
    if (voiceRecorder.isRecording) {
      voiceRecorder.cancelRecording();
    }
  };

  return (
    <div className="border-t border-border bg-card/80 backdrop-blur-sm p-4 shadow-lg">
      <div className="flex gap-3 items-end max-w-2xl mx-auto w-full">
        {/* File attachment button */}
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || voiceRecorder.isRecording}
          className={cn(
            "rounded-full p-3 h-12 w-12 flex items-center justify-center",
            "bg-muted hover:bg-muted/80 text-muted-foreground",
            "transition-all duration-200 shadow-sm hover:shadow-md",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          title="แนบรูปภาพ"
        >
          <Paperclip size={20} />
        </Button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        {/* Text input */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={
            voiceRecorder.isRecording
              ? `บันทึกเสียง... ${Math.floor(voiceRecorder.duration / 1000)}s`
              : "พิมพ์ข้อความ..."
          }
          disabled={disabled || voiceRecorder.isRecording}
          className={cn(
            "flex-1 px-4 py-3 rounded-2xl border border-border bg-card text-card-foreground",
            "placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            "transition-all duration-200 shadow-sm hover:shadow-md",
            "max-h-32 min-h-12 font-sans text-sm leading-relaxed",
            (disabled || voiceRecorder.isRecording) && "opacity-50 cursor-not-allowed"
          )}
          rows={1}
        />

        {/* Voice recording button */}
        <Button
          ref={voiceButtonRef}
          onMouseDown={handleVoiceMouseDown}
          onMouseUp={handleVoiceMouseUp}
          onMouseLeave={handleVoiceMouseLeave}
          disabled={disabled}
          className={cn(
            "rounded-full p-3 h-12 w-12 flex items-center justify-center",
            "transition-all duration-200 shadow-sm hover:shadow-md",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            voiceRecorder.isRecording
              ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          )}
          title={
            voiceRecorder.isRecording
              ? "ปล่อยเพื่อส่งข้อความเสียง"
              : "กดค้างไว้เพื่อบันทึกเสียง"
          }
        >
          <Mic size={20} />
        </Button>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled || voiceRecorder.isRecording}
          className={cn(
            "rounded-full p-3 h-12 w-12 flex items-center justify-center",
            "bg-accent hover:bg-accent/90 text-accent-foreground",
            "transition-all duration-200 shadow-sm hover:shadow-md",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <Send size={20} />
        </Button>
      </div>
    </div>
  );
}
