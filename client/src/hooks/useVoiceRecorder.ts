/**
 * useVoiceRecorder Hook
 * 
 * Custom hook สำหรับบันทึกเสียงโดยใช้ Web Audio API
 * - บันทึกเสียงจากไมโครโฟน
 * - แปลงเป็น Blob/Data URL
 * - จัดการสถานะการบันทึก
 */

import { useState, useRef, useCallback } from "react";

interface VoiceRecorderState {
  isRecording: boolean;
  duration: number;
  audioData: string | null;
}

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    duration: 0,
    audioData: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      setState((prev) => ({
        ...prev,
        isRecording: true,
        duration: 0,
      }));

      // Update duration every 100ms
      durationIntervalRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          duration: prev.duration + 100,
        }));
      }, 100);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("ไม่สามารถเข้าถึงไมโครโฟน กรุณาอนุญาตการใช้ไมโครโฟน");
    }
  }, []);

  const stopRecording = useCallback(
    async (): Promise<string | null> => {
      return new Promise((resolve) => {
        if (!mediaRecorderRef.current) {
          resolve(null);
          return;
        }

        const mediaRecorder = mediaRecorderRef.current;

        mediaRecorder.onstop = async () => {
          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
          }

          // Stop all tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
          }

          // Create blob and convert to data URL
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          const audioUrl = URL.createObjectURL(audioBlob);

          // Convert to base64 for storage
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            setState((prev) => ({
              ...prev,
              isRecording: false,
              audioData: base64Audio,
            }));
            resolve(base64Audio);
          };
          reader.readAsDataURL(audioBlob);
        };

        mediaRecorder.stop();
      });
    },
    []
  );

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      setState({
        isRecording: false,
        duration: 0,
        audioData: null,
      });
    }
  }, [state.isRecording]);

  const clearAudioData = useCallback(() => {
    setState((prev) => ({
      ...prev,
      audioData: null,
    }));
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    cancelRecording,
    clearAudioData,
  };
}
