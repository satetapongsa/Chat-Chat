import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface ChatMessage {
  id: string;
  createdAt: string;
  content: string;
  isSent: boolean;
  timestamp: string;
  type: "text" | "image" | "voice";
  imageData?: string;
  voiceData?: string;
  caption?: string;
  duration?: number;
}

export function useSupabaseChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to map DB record to UI object
  const mapMessage = (msg: any): ChatMessage => ({
    id: msg.id,
    createdAt: msg.created_at,
    content: msg.content,
    isSent: msg.is_sent,
    timestamp: new Date(msg.created_at).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    type: msg.type || "text",
    imageData: msg.image_data,
    voiceData: msg.voice_data,
    caption: msg.caption,
    duration: msg.duration,
  });

  // Fetch initial messages
  useEffect(() => {
    async function fetchMessages() {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        setMessages((data || []).map(mapMessage));
      }
      setIsLoading(false);
    }

    fetchMessages();

    // Subscribe to REALTIME changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          setMessages((prev) => [...prev, mapMessage(payload.new)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addMessage = async (message: Omit<ChatMessage, 'id' | 'createdAt' | 'timestamp'>) => {
    const dbMessage = {
      content: message.content,
      is_sent: message.isSent,
      type: message.type,
      image_data: message.imageData,
      voice_data: message.voiceData,
      caption: message.caption,
      duration: message.duration,
      // created_at will be handled by DB default
    };

    const { error } = await supabase.from('messages').insert([dbMessage]);
    if (error) {
      console.error('Error inserting message:', error);
      throw error;
    }
  };

  const clearHistory = async () => {
    const { error } = await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) console.error('Error clearing:', error);
    else setMessages([]);
  };

  return {
    messages,
    addMessage,
    clearHistory,
    isLoaded: !isLoading,
  };
}
