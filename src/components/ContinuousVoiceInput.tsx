import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Languages } from 'lucide-react';

const VOICE_LANGS = [
  { code: 'ko-KR', label: '한국어' },
  { code: 'en-US', label: 'English' },
  { code: 'ja-JP', label: '日本語' },
  { code: 'zh-CN', label: '中文' },
];

interface Props {
  onResult: (text: string) => void;
  onInterim?: (text: string) => void;
  disabled?: boolean;
}

export function ContinuousVoiceInput({ onResult, onInterim, disabled }: Props) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [lang, setLang] = useState('ko-KR');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const recognitionRef = useRef<any>(null);

  const start = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (e: any) => {
      let interimText = '';
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }
      if (finalText) onResult(finalText);
      setInterim(interimText);
      onInterim?.(interimText);
    };

    recognition.onerror = () => {
      setListening(false);
      setInterim('');
    };

    recognition.onend = () => {
      setListening(false);
      setInterim('');
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [lang, onResult, onInterim]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
    setInterim('');
  }, []);

  return (
    <div className="relative flex items-center gap-1">
      <button
        onClick={() => setShowLangPicker(!showLangPicker)}
        className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition"
        title="Voice language"
      >
        <Languages className="w-3.5 h-3.5" />
      </button>
      <AnimatePresence>
        {showLangPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-full left-0 mb-1 glass-card rounded-xl p-1 shadow-xl z-50"
          >
            {VOICE_LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setShowLangPicker(false); }}
                className={`block w-full text-left px-3 py-1.5 rounded-lg text-[9px] transition ${
                  lang === l.code ? 'bg-primary/10 text-primary' : 'text-foreground/60 hover:bg-muted/20'
                }`}
              >
                {l.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={listening ? stop : start}
        disabled={disabled}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
          listening
            ? 'bg-destructive/20 text-destructive animate-pulse'
            : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
        } disabled:opacity-40`}
      >
        {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {interim && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-full left-8 mb-1 px-3 py-1.5 rounded-xl glass-card text-[10px] text-foreground/60 max-w-[200px] truncate"
          >
            {interim}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TTSVoiceSelector({ onVoiceChange, onRateChange, onPitchChange }: {
  onVoiceChange?: (voice: SpeechSynthesisVoice) => void;
  onRateChange?: (rate: number) => void;
  onPitchChange?: (pitch: number) => void;
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);

  useState(() => {
    const loadVoices = () => {
      const v = speechSynthesis.getVoices();
      setVoices(v);
      const saved = localStorage.getItem('gyeol_tts_voice');
      if (saved) setSelectedVoice(saved);
    };
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  });

  const handlePreview = () => {
    const utterance = new SpeechSynthesisUtterance('안녕하세요, 결이에요!');
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = pitch;
    speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] text-foreground/70 font-medium block mb-1">TTS Voice</label>
        <select
          value={selectedVoice}
          onChange={e => {
            setSelectedVoice(e.target.value);
            localStorage.setItem('gyeol_tts_voice', e.target.value);
            const voice = voices.find(v => v.name === e.target.value);
            if (voice) onVoiceChange?.(voice);
          }}
          className="w-full bg-muted/10 border border-border/20 rounded-xl px-3 py-2 text-[10px] text-foreground outline-none"
        >
          {voices.map(v => (
            <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
          ))}
        </select>
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <label className="text-[10px] text-foreground/70 font-medium">Speed</label>
          <span className="text-[9px] text-primary font-mono">{rate.toFixed(1)}x</span>
        </div>
        <input type="range" min={0.5} max={2} step={0.1} value={rate}
          onChange={e => { const v = Number(e.target.value); setRate(v); onRateChange?.(v); }}
          className="w-full h-1 rounded-full bg-muted/20 accent-primary appearance-none cursor-pointer" />
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <label className="text-[10px] text-foreground/70 font-medium">Pitch</label>
          <span className="text-[9px] text-primary font-mono">{pitch.toFixed(1)}</span>
        </div>
        <input type="range" min={0.5} max={2} step={0.1} value={pitch}
          onChange={e => { const v = Number(e.target.value); setPitch(v); onPitchChange?.(v); }}
          className="w-full h-1 rounded-full bg-muted/20 accent-primary appearance-none cursor-pointer" />
      </div>
      <button onClick={handlePreview}
        className="w-full py-2 rounded-xl bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition">
        🔊 Preview Voice
      </button>
    </div>
  );
}
