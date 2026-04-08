/**
 * ChatMessage Component
 * 
 * Design Philosophy: Warm Conversational Design
 * - Rounded message bubbles with soft shadows
 * - Asymmetric alignment (sent right, received left)
 * - Warm color palette (blue for sent, peach for received)
 * - Gentle animations on appearance
 */

import { cn } from "@/lib/utils";

interface ChatMessageProps {
  content: string;
  isSent: boolean;
  timestamp?: string;
}

export function ChatMessage({ content, isSent, timestamp }: ChatMessageProps) {
  return (
    <div
      className={cn(
        "flex mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isSent ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-md transition-all hover:shadow-lg backdrop-blur-sm",
          isSent
            ? "bg-primary/90 text-primary-foreground rounded-br-none"
            : "bg-secondary/80 text-secondary-foreground rounded-bl-none"
        )}
      >
        <p className="text-sm leading-relaxed break-words">{content}</p>
        {timestamp && (
          <p className="timestamp text-xs mt-1 opacity-70">{timestamp}</p>
        )}
      </div>
    </div>
  );
}
