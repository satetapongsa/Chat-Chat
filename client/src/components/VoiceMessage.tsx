/**
 * VoiceMessage Component
 * 
 * Design Philosophy: Warm Conversational Design
 * - Displays voice message with play button
 * - Shows duration of the voice message
 * - Responsive audio player
 */

import { cn } from "@/lib/utils";
import { Play, Pause, Volume2 } from "lucide-react";
import { useRef, useState } from "react";

interface VoiceMessageProps {
  src: string;
  isSent: boolean;
  timestamp?: string;
  duration?: number;
}

export function VoiceMessage({
  src,
  isSent,
  timestamp,
  duration = 0,
}: VoiceMessageProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setTotalDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const displayDuration = totalDuration > 0 ? totalDuration : duration / 1000;

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
            ? "bg-primary/90 rounded-br-none"
            : "bg-secondary/80 rounded-bl-none"
        )}
      >
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          className="hidden"
        />

        <div className="flex items-center gap-3">
          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            className={cn(
              "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all",
              isSent
                ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
                : "bg-secondary-foreground/20 hover:bg-secondary-foreground/30 text-secondary-foreground"
            )}
          >
            {isPlaying ? (
              <Pause size={20} />
            ) : (
              <Play size={20} className="ml-0.5" />
            )}
          </button>

          {/* Duration/Progress */}
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex items-center gap-2">
              <Volume2
                size={16}
                className={cn(
                  isSent
                    ? "text-primary-foreground/70"
                    : "text-secondary-foreground/70"
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium",
                  isSent
                    ? "text-primary-foreground"
                    : "text-secondary-foreground"
                )}
              >
                {formatTime(currentTime)} / {formatTime(displayDuration)}
              </span>
            </div>

            {/* Progress Bar */}
            <div
              className={cn(
                "h-1 rounded-full bg-opacity-30 cursor-pointer",
                isSent
                  ? "bg-primary-foreground"
                  : "bg-secondary-foreground"
              )}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                if (audioRef.current) {
                  audioRef.current.currentTime =
                    percent * audioRef.current.duration;
                }
              }}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isSent
                    ? "bg-primary-foreground"
                    : "bg-secondary-foreground"
                )}
                style={{
                  width: `${
                    totalDuration > 0
                      ? (currentTime / totalDuration) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>

        {timestamp && (
          <p
            className={cn(
              "timestamp text-xs mt-2 opacity-70",
              isSent
                ? "text-primary-foreground"
                : "text-secondary-foreground"
            )}
          >
            {timestamp}
          </p>
        )}
      </div>
    </div>
  );
}
