import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ChevronDown, Share2, Star, History, GitCompare, Copy } from 'lucide-react';

interface Persona {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const PERSONA_PRESETS: Persona[] = [
  { id: 'expert', name: 'Expert', description: 'Professional and knowledgeable advisor', icon: '🎓', color: 'text-blue-400' },
  { id: 'friend', name: 'Friend', description: 'Casual and supportive companion', icon: '👋', color: 'text-[hsl(var(--success,142_71%_45%))]' },
  { id: 'teacher', name: 'Teacher', description: 'Patient and educational guide', icon: '📚', color: 'text-amber-400' },
  { id: 'coach', name: 'Coach', description: 'Motivating and goal-oriented', icon: '💪', color: 'text-red-400' },
  { id: 'poet', name: 'Poet', description: 'Creative and expressive soul', icon: '✒️', color: 'text-purple-400' },
];

export function PersonaSelector({ current, onSelect }: { current: string; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const active = PERSONA_PRESETS.find(p => p.id === current) ?? PERSONA_PRESETS[1];

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-card text-[10px] hover:bg-muted/20 transition">
        <span>{active.icon}</span>
        <span className="text-foreground/70">{active.name}</span>
        <ChevronDown className={`w-2.5 h-2.5 text-muted-foreground transition ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute top-full mt-1 left-0 z-50 w-52 glass-card rounded-xl p-1.5 shadow-xl">
            {PERSONA_PRESETS.map(p => (
              <button key={p.id} onClick={() => { onSelect(p.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition ${
                  current === p.id ? 'bg-primary/10' : 'hover:bg-muted/20'
                }`}>
                <span className="text-sm">{p.icon}</span>
                <div className="min-w-0">
                  <p className={`text-[10px] font-medium ${p.color}`}>{p.name}</p>
                  <p className="text-[8px] text-muted-foreground truncate">{p.description}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PersonaEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] text-foreground/70 font-medium">Custom Persona</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Describe your AI's personality and behavior..."
        rows={3}
        maxLength={500}
        className="w-full bg-muted/10 border border-border/20 rounded-xl px-3 py-2 text-[10px] text-foreground outline-none resize-none"
      />
      <p className="text-[8px] text-muted-foreground text-right">{value.length}/500</p>
    </div>
  );
}

export function PersonaShare({ persona }: { persona: string }) {
  const [copied, setCopied] = useState(false);
  const code = btoa(persona).slice(0, 32);

  return (
    <div className="flex items-center gap-2">
      <input type="text" readOnly value={code}
        className="flex-1 bg-muted/10 border border-border/20 rounded-lg px-2 py-1 text-[9px] text-foreground/60 font-mono" />
      <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-[9px]">
        <Copy className="w-3 h-3" /> {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

export function PersonaRating({ onRate }: { onRate: (rating: number) => void }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => { setRating(star); onRate(star); }}
          className="text-sm transition-transform hover:scale-125"
        >
          {star <= (hover || rating) ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  );
}

export function PersonaHistory({ history }: { history: { date: string; from: string; to: string }[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <History className="w-3.5 h-3.5 text-primary" /> Persona History
      </h4>
      {history.length === 0 ? (
        <p className="text-[10px] text-muted-foreground/50">No persona changes yet</p>
      ) : (
        <div className="space-y-1">
          {history.map((h, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg glass-card text-[9px]">
              <span className="text-muted-foreground/50">{h.date}</span>
              <span className="text-foreground/60">{h.from}</span>
              <span className="text-muted-foreground/30">→</span>
              <span className="text-primary">{h.to}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PersonaABTest({ onSelect }: { onSelect: (winner: 'a' | 'b') => void }) {
  const [question, setQuestion] = useState('');
  const [resultA, setResultA] = useState('');
  const [resultB, setResultB] = useState('');
  const [testing, setTesting] = useState(false);

  const runTest = async () => {
    if (!question.trim()) return;
    setTesting(true);
    setResultA('Generating response with Persona A...');
    setResultB('Generating response with Persona B...');
    await new Promise(r => setTimeout(r, 1500));
    setResultA(`[Expert] ${question} - Here is a professional, detailed analysis...`);
    setResultB(`[Friend] ${question} - Hey! Let me break this down for you...`);
    setTesting(false);
  };

  return (
    <div className="space-y-3">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <GitCompare className="w-3.5 h-3.5 text-primary" /> A/B Test
      </h4>
      <input type="text" value={question} onChange={e => setQuestion(e.target.value)}
        placeholder="Enter a question to test both personas..."
        className="w-full bg-muted/10 border border-border/20 rounded-xl px-3 py-2 text-[10px] text-foreground outline-none" />
      <button onClick={runTest} disabled={testing || !question.trim()}
        className="w-full py-2 rounded-xl bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition disabled:opacity-40">
        {testing ? 'Testing...' : 'Run A/B Test'}
      </button>
      {(resultA || resultB) && (
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-xl glass-card space-y-2">
            <span className="text-[8px] text-primary font-bold">Persona A</span>
            <p className="text-[9px] text-foreground/70 line-clamp-4">{resultA}</p>
            <button onClick={() => onSelect('a')}
              className="w-full py-1 rounded-lg bg-primary/10 text-primary text-[9px]">Choose A</button>
          </div>
          <div className="p-3 rounded-xl glass-card space-y-2">
            <span className="text-[8px] text-secondary font-bold">Persona B</span>
            <p className="text-[9px] text-foreground/70 line-clamp-4">{resultB}</p>
            <button onClick={() => onSelect('b')}
              className="w-full py-1 rounded-lg bg-secondary/10 text-secondary text-[9px]">Choose B</button>
          </div>
        </div>
      )}
    </div>
  );
}
