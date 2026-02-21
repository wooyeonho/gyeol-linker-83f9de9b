import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Clock, Sparkles, History, Beaker, Wand2, Camera, Share2, RotateCcw, Trophy } from 'lucide-react';

export function EvolutionCountdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Ready!'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    calc();
    const timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass-card">
      <Clock className="w-4 h-4 text-primary animate-pulse" />
      <div>
        <p className="text-[10px] text-foreground/70">Next Evolution</p>
        <p className="text-[13px] font-bold text-primary font-mono">{timeLeft}</p>
      </div>
    </div>
  );
}

export function EvolutionProtection({ hasItem, onUse }: { hasItem: boolean; onUse: () => void }) {
  return (
    <button onClick={onUse} disabled={!hasItem}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-medium transition ${
        hasItem ? 'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] hover:bg-[hsl(var(--warning)/0.2)]' : 'bg-muted/10 text-muted-foreground/40'
      }`}>
      <Shield className="w-3.5 h-3.5" />
      {hasItem ? 'Protection Item Ready' : 'No Protection Item'}
    </button>
  );
}

export function CustomEvolutionCondition({ conditions, onAdd, onRemove }: {
  conditions: string[];
  onAdd: (c: string) => void;
  onRemove: (idx: number) => void;
}) {
  const [input, setInput] = useState('');

  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground">Custom Conditions</h4>
      <div className="flex gap-1">
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          placeholder="Add evolution condition..."
          className="flex-1 bg-muted/10 border border-border/20 rounded-lg px-2 py-1 text-[10px] text-foreground outline-none" />
        <button onClick={() => { if (input.trim()) { onAdd(input.trim()); setInput(''); } }}
          className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-[10px]">Add</button>
      </div>
      <div className="space-y-1">
        {conditions.map((c, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg glass-card">
            <span className="text-[9px] text-foreground/70 flex-1">{c}</span>
            <button onClick={() => onRemove(i)} className="text-destructive/50 hover:text-destructive text-[8px]">×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MutationHistory({ mutations }: { mutations: { date: string; type: string; effect: string }[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <Beaker className="w-3.5 h-3.5 text-primary" /> Mutation History
      </h4>
      {mutations.length === 0 ? (
        <p className="text-[10px] text-muted-foreground/50">No mutations recorded yet</p>
      ) : (
        <div className="space-y-1">
          {mutations.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2 p-2 rounded-xl glass-card">
              <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-medium text-foreground truncate">{m.type}</p>
                <p className="text-[8px] text-muted-foreground truncate">{m.effect}</p>
              </div>
              <span className="text-[8px] text-muted-foreground/50 flex-shrink-0">{m.date}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MutationSynthesis({ onSynthesize }: { onSynthesize: (a: string, b: string) => void }) {
  const [slotA, setSlotA] = useState('');
  const [slotB, setSlotB] = useState('');
  return (
    <div className="space-y-3">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <Wand2 className="w-3.5 h-3.5 text-primary" /> Mutation Synthesis
      </h4>
      <div className="grid grid-cols-2 gap-2">
        <input type="text" value={slotA} onChange={e => setSlotA(e.target.value)} placeholder="Mutation A"
          className="bg-muted/10 border border-border/20 rounded-lg px-2 py-1.5 text-[10px] text-foreground outline-none" />
        <input type="text" value={slotB} onChange={e => setSlotB(e.target.value)} placeholder="Mutation B"
          className="bg-muted/10 border border-border/20 rounded-lg px-2 py-1.5 text-[10px] text-foreground outline-none" />
      </div>
      <button onClick={() => { if (slotA && slotB) onSynthesize(slotA, slotB); }}
        disabled={!slotA || !slotB}
        className="w-full py-2 rounded-xl bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition disabled:opacity-40">
        ⚗️ Synthesize Mutations
      </button>
    </div>
  );
}

export function VisualEvolutionPreview({ gen, visualState }: { gen: number; visualState: any }) {
  const particles = Array.from({ length: visualState?.particle_count ?? 5 }, (_, i) => i);
  return (
    <div className="relative w-full aspect-square max-w-[200px] mx-auto">
      <motion.div
        animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${visualState?.color_primary ?? '#8b5cf6'}40, transparent)`,
          filter: `blur(${(visualState?.glow_intensity ?? 0.5) * 20}px)`,
        }}
      />
      {particles.map(i => (
        <motion.div
          key={i}
          animate={{
            x: [0, Math.cos(i * 1.2) * 40, 0],
            y: [0, Math.sin(i * 1.2) * 40, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{ duration: 3 + i * 0.3, repeat: Infinity }}
          className="absolute w-1 h-1 rounded-full bg-primary/60"
          style={{ left: `${50 + Math.cos(i) * 30}%`, top: `${50 + Math.sin(i) * 30}%` }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-bold text-primary/80">Gen {gen}</span>
      </div>
    </div>
  );
}

export function EvolutionShareCard({ gen, agentName, onShare }: { gen: number; agentName: string; onShare: () => void }) {
  return (
    <div className="p-4 rounded-2xl glass-card text-center space-y-3">
      <div className="text-3xl">🌟</div>
      <h3 className="text-sm font-bold text-foreground">{agentName} evolved to Gen {gen}!</h3>
      <p className="text-[10px] text-muted-foreground">A new chapter begins with enhanced abilities.</p>
      <div className="flex gap-2 justify-center">
        <button onClick={onShare}
          className="flex items-center gap-1 px-4 py-2 rounded-xl bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition">
          <Share2 className="w-3 h-3" /> Share
        </button>
        <button onClick={() => {}}
          className="flex items-center gap-1 px-4 py-2 rounded-xl glass-card text-[10px] text-foreground/70 hover:text-foreground transition">
          <Camera className="w-3 h-3" /> Screenshot
        </button>
      </div>
    </div>
  );
}

export function EvolutionRanking({ rankings }: { rankings: { name: string; gen: number; evolutions: number }[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <Trophy className="w-3.5 h-3.5 text-primary" /> Evolution Ranking
      </h4>
      {rankings.map((r, i) => (
        <div key={i} className="flex items-center gap-2 p-2 rounded-xl glass-card">
          <span className={`text-[11px] font-bold w-5 text-center ${i < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-foreground truncate">{r.name}</p>
            <p className="text-[8px] text-muted-foreground">Gen {r.gen} · {r.evolutions} evolutions</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DailyEventSchedule({ events }: { events: { time: string; title: string; type: string }[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground">Today's Events</h4>
      {events.length === 0 ? (
        <p className="text-[10px] text-muted-foreground/50">No events scheduled</p>
      ) : (
        <div className="space-y-1">
          {events.map((ev, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg glass-card">
              <span className="text-[9px] text-primary font-mono w-10 flex-shrink-0">{ev.time}</span>
              <span className="text-[10px] text-foreground/70">{ev.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DailyEventCountdown({ nextEvent }: { nextEvent: { title: string; time: string } | null }) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (!nextEvent) return;
    const calc = () => {
      const diff = new Date(nextEvent.time).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Now!'); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}m ${s}s`);
    };
    calc();
    const timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [nextEvent]);

  if (!nextEvent) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass-card">
      <Clock className="w-3.5 h-3.5 text-[hsl(var(--warning))]" />
      <div className="flex-1">
        <p className="text-[9px] text-muted-foreground">Next: {nextEvent.title}</p>
        <p className="text-[11px] font-bold text-[hsl(var(--warning))] font-mono">{timeLeft}</p>
      </div>
    </div>
  );
}
