'use client';

import { useRef, useState, useCallback, forwardRef } from 'react';

export interface VoiceInputProps {
  onResult: (text: string) => void;
  disabled?: boolean;
}

export const VoiceInput = forwardRef<HTMLButtonElement, VoiceInputProps>(function VoiceInput({ onResult, disabled }, _ref) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    if (disabled) return;
    const SpeechRecognitionAPI =
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SpeechRecognitionAPI) { onResult(''); return; }
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'ko-KR';
    recognition.onresult = (e: any) => {
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
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    setIsListening(false);
  }, []);

  return (
    <button
      type="button"
      onClick={isListening ? stopListening : startListening}
      disabled={disabled}
      className={`p-2 rounded-full flex items-center justify-center transition ${
        isListening
          ? 'bg-destructive/10 text-destructive'
          : 'text-muted-foreground hover:bg-secondary'
      } disabled:opacity-40 disabled:pointer-events-none`}
      aria-label={isListening ? '녹음 중지' : '음성 입력'}
      title={isListening ? 'Stop recording' : 'Voice input'}
    >
      <span className="material-icons-round text-[22px]">
        {isListening ? 'stop' : 'mic'}
      </span>
    </button>
  );
});
