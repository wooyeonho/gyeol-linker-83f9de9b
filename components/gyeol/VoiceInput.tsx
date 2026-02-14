'use client';

/**
 * GYEOL 음성 인식 — Web Speech API, 한국어 기본
 */

import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

export interface VoiceInputProps {
  onResult: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onResult, disabled }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startListening = useCallback(() => {
    if (disabled) return;
    const SpeechRecognitionAPI =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: SpeechRecognition }).webkitSpeechRecognition);
    if (!SpeechRecognitionAPI) {
      onResult('');
      return;
    }
    const recognition = new SpeechRecognitionAPI() as SpeechRecognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'ko-KR';
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const result = e.results[e.results.length - 1];
      const text = result[0].transcript;
      if (text) onResult(text);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, [disabled, onResult]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  return (
    <motion.button
      type="button"
      onClick={isListening ? stopListening : startListening}
      disabled={disabled}
      className={`rounded-full p-2 flex items-center justify-center transition ${
        isListening
          ? 'bg-red-500/20 text-red-400'
          : 'text-indigo-400 hover:bg-indigo-500/20'
      } disabled:opacity-40 disabled:pointer-events-none`}
      aria-label={isListening ? '녹음 중지' : '음성 입력'}
      whileTap={{ scale: 0.95 }}
    >
      {isListening ? (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      )}
    </motion.button>
  );
}
