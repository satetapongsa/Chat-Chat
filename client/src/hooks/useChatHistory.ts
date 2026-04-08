/**
 * useChatHistory Hook
 * 
 * Custom hook สำหรับจัดการประวัติการแชทโดยใช้ localStorage
 * - บันทึกข้อความลงใน localStorage อัตโนมัติ
 * - โหลดข้อความจาก localStorage เมื่อเปิดหน้า
 * - ลบประวัติแชท
 */

import { useEffect, useState } from "react";

export interface ChatMessage {
  id: string;
  content: string;
  isSent: boolean;
  timestamp: string;
  type?: "text" | "image" | "voice";
  imageData?: string;
  voiceData?: string;
  caption?: string;
  duration?: number;
}

const STORAGE_KEY = "chat_messages";

export function useChatHistory() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // โหลดข้อความจาก localStorage เมื่อ component mount
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem(STORAGE_KEY);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
      setIsLoaded(true);
    } catch (error) {
      console.error("Error loading messages from localStorage:", error);
      setIsLoaded(true);
    }
  }, []);

  // บันทึกข้อความลงใน localStorage เมื่อ messages เปลี่ยน
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch (error) {
        console.error("Error saving messages to localStorage:", error);
      }
    }
  }, [messages, isLoaded]);

  const addMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const clearHistory = () => {
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing messages from localStorage:", error);
    }
  };

  return {
    messages,
    addMessage,
    clearHistory,
    isLoaded,
  };
}
