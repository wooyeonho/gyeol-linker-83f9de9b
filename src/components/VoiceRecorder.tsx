import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onRecorded: (audioUrl: string, duration: number) => void;
  disabled?: boolean;
}

export function VoiceRecorder({ onRecorded, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        onRecorded(url, duration);
        stream.getTracks().forEach(t => t.stop());
        setDuration(0);
      };
      mediaRef.current = recorder;
      recorder.start();
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (e) {
      console.error('Microphone access denied', e);
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
    clearInterval(timerRef.current);
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <AnimatePresence mode="wait">
      {recording ? (
        <motion.button key="stop" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
          onClick={stopRecording}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/20 text-destructive text-[11px] font-medium">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          {fmtTime(duration)}
          <span aria-hidden="true" className="material-icons-round text-sm">stop</span>
        </motion.button>
      ) : (
        <motion.button key="start" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
          onClick={startRecording}
          disabled={disabled}
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition disabled:opacity-40">
          <span aria-hidden="true" className="material-icons-round text-[20px]">mic</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export function AudioMessage({ src, duration }: { src: string; duration: number }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <button onClick={toggle}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition">
      <span aria-hidden="true" className="material-icons-round text-primary text-base">{playing ? 'pause' : 'play_arrow'}</span>
      <div className="flex-1 h-1 rounded-full bg-primary/20 relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-primary/50 rounded-full" style={{ width: playing ? '100%' : '0%', transition: playing ? `width ${duration}s linear` : 'none' }} />
      </div>
      <span className="text-[10px] text-primary/60">{fmtTime(duration)}</span>
    </button>
  );
}
