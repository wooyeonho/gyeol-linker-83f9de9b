import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { MoodType } from '@/lib/gyeol/types';

const MOODS: { mood: MoodType; emoji: string; label: string }[] = [
  { mood: 'happy', emoji: '😊', label: 'Happy' },
  { mood: 'sad', emoji: '😢', label: 'Sad' },
  { mood: 'excited', emoji: '✨', label: 'Excited' },
  { mood: 'tired', emoji: '😴', label: 'Tired' },
  { mood: 'curious', emoji: '🤔', label: 'Thinking' },
  { mood: 'neutral', emoji: '😐', label: 'Neutral' },
];

interface Props {
  currentMood: MoodType;
  onChange: (mood: MoodType) => void;
}

export function MoodSelector({ currentMood, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const current = MOODS.find(m => m.mood === currentMood) ?? MOODS[5];

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 rounded-full glass-card text-[10px] hover:bg-muted/20 transition">
        <span>{current.emoji}</span>
        <span className="text-foreground/70">{current.label}</span>
        <ChevronDown className={`w-2.5 h-2.5 text-muted-foreground transition ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute top-full mt-1 left-0 z-50 glass-card rounded-xl p-1 shadow-xl">
            {MOODS.map(m => (
              <button key={m.mood} onClick={() => { onChange(m.mood); setOpen(false); }}
                className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-[10px] transition ${
                  currentMood === m.mood ? 'bg-primary/10 text-primary' : 'text-foreground/60 hover:bg-muted/20'
                }`}>
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MoodNotification({ mood, agentName }: { mood: MoodType; agentName: string }) {
  const info = MOODS.find(m => m.mood === mood);
  if (!info) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] glass-card rounded-full px-4 py-2 shadow-xl">
      <p className="text-[10px] text-foreground/80">
        {agentName}의 기분이 &apos;{info.label} {info.emoji}&apos;으로 바뀌었어요!
      </p>
    </motion.div>
  );
}
