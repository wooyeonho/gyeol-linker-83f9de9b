'use client';

import { useRef, useState, useCallback, forwardRef } from 'react';

export interface VoiceInputProps {
  onResult: (text: string) => void;
  disabled?: boolean;
}

export const VoiceInput = forwardRef<HTMLButtonElement, VoiceInputProps>(function VoiceInput({ onResult, disabled }, _ref) {
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const processedIndexRef = useRef(0);

  const startListening = useCallback(() => {
    if (disabled) return;
    const SpeechRecognitionAPI =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognitionAPI) { onResult(''); return; }
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'ko-KR';
    processedIndexRef.current = 0;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interimText = '';
      for (let i = processedIndexRef.current; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          const finalText = result[0].transcript.trim();
          if (finalText) {
            onResult(finalText);
          }
          processedIndexRef.current = i + 1;
        } else {
          interimText += result[0].transcript;
        }
      }
      setInterim(interimText);
    };
    recognition.onend = () => {
      setIsListening(false);
      setInterim('');
      processedIndexRef.current = 0;
    };
    recognition.onerror = () => {
      setIsListening(false);
      setInterim('');
      processedIndexRef.current = 0;
    };
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, [disabled, onResult]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    setIsListening(false);
    setInterim('');
    processedIndexRef.current = 0;
  }, []);

  return (
    <div className="flex items-center gap-2">
      {isListening && interim && (
        <span className="text-xs text-white/40 max-w-[120px] truncate">{interim}</span>
      )}
      <button
        type="button"
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        className={`p-2 rounded-full flex items-center justify-center transition ${
          isListening
            ? 'bg-red-500/20 text-red-400 animate-pulse'
            : 'text-white/40 hover:bg-white/10'
        } disabled:opacity-40 disabled:pointer-events-none`}
        aria-label={isListening ? 'Stop' : 'Voice'}
        title={isListening ? 'Stop recording' : 'Voice input'}
      >
        <span className="material-icons-round text-[22px]">
          {isListening ? 'stop' : 'mic'}
        </span>
      </button>
    </div>
  );
});
