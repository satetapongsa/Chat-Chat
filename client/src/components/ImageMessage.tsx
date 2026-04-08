/**
 * ImageMessage Component
 * 
 * Design Philosophy: Warm Conversational Design
 * - Displays images in chat with rounded corners
 * - Shows image preview with caption
 * - Responsive sizing for different screen sizes
 */

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useState } from "react";

interface ImageMessageProps {
  src: string;
  alt?: string;
  isSent: boolean;
  timestamp?: string;
  caption?: string;
}

export function ImageMessage({
  src,
  alt = "Chat image",
  isSent,
  timestamp,
  caption,
}: ImageMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <div
        className={cn(
          "flex mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
          isSent ? "justify-end" : "justify-start"
        )}
      >
        <div
          className={cn(
            "max-w-xs lg:max-w-md rounded-2xl shadow-md transition-all hover:shadow-lg overflow-hidden backdrop-blur-sm",
            isSent
              ? "bg-primary/90 rounded-br-none"
              : "bg-secondary/80 rounded-bl-none"
          )}
        >
          <img
            src={src}
            alt={alt}
            className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setIsExpanded(true)}
          />
          {caption && (
            <div className="px-4 py-2">
              <p className={cn(
                "text-sm leading-relaxed break-words",
                isSent ? "text-primary-foreground" : "text-secondary-foreground"
              )}>
                {caption}
              </p>
            </div>
          )}
          {timestamp && (
            <div className={cn(
              "px-4 pb-2",
              !caption && "pt-2"
            )}>
              <p className={cn(
                "timestamp text-xs opacity-70",
                isSent ? "text-primary-foreground" : "text-secondary-foreground"
              )}>
                {timestamp}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Image Modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="relative max-w-2xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={src}
              alt={alt}
              className="w-full h-auto rounded-lg"
            />
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
