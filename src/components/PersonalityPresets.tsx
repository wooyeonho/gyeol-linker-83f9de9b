import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, RotateCcw, Lock, Unlock, Lightbulb, History, ArrowLeftRight } from 'lucide-react';
import type { PersonalityParams } from '@/lib/gyeol/types';

const DEFAULT_PERSONALITY: PersonalityParams = { warmth: 50, logic: 50, creativity: 50, energy: 50, humor: 50 };

interface Preset {
  name: string;
  params: PersonalityParams;
  icon: string;
}

const PRESETS: Preset[] = [
  { name: 'Balanced', params: { warmth: 50, logic: 50, creativity: 50, energy: 50, humor: 50 }, icon: '⚖️' },
  { name: 'Warm Friend', params: { warmth: 85, logic: 30, creativity: 60, energy: 70, humor: 65 }, icon: '🤗' },
  { name: 'Logic Expert', params: { warmth: 30, logic: 90, creativity: 40, energy: 50, humor: 20 }, icon: '🧠' },
  { name: 'Creative Artist', params: { warmth: 60, logic: 30, creativity: 95, energy: 75, humor: 50 }, icon: '🎨' },
  { name: 'Energetic Coach', params: { warmth: 65, logic: 50, creativity: 55, energy: 95, humor: 70 }, icon: '⚡' },
];

export function PersonalityPresetSelector({ current, onApply }: {
  current: PersonalityParams;
  onApply: (p: PersonalityParams) => void;
}) {
  const [savedPresets, setSavedPresets] = useState<Preset[]>(() => {
    try { return JSON.parse(localStorage.getItem('gyeol_personality_presets') ?? '[]'); } catch { return []; }
  });
  const [saveName, setSaveName] = useState('');
  const [showSave, setShowSave] = useState(false);

  const savePreset = () => {
    if (!saveName.trim()) return;
    const preset: Preset = { name: saveName.trim(), params: { ...current }, icon: '💫' };
    const updated = [...savedPresets, preset];
    setSavedPresets(updated);
    localStorage.setItem('gyeol_personality_presets', JSON.stringify(updated));
    setSaveName('');
    setShowSave(false);
  };

  const deletePreset = (idx: number) => {
    const updated = savedPresets.filter((_, i) => i !== idx);
    setSavedPresets(updated);
    localStorage.setItem('gyeol_personality_presets', JSON.stringify(updated));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-bold text-foreground">Personality Presets</h4>
        <button onClick={() => setShowSave(!showSave)}
          className="flex items-center gap-1 text-[9px] text-primary hover:text-primary/80 transition">
          <Save className="w-3 h-3" /> Save Current
        </button>
      </div>

      <AnimatePresence>
        {showSave && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex gap-1 overflow-hidden">
            <input type="text" value={saveName} onChange={e => setSaveName(e.target.value)}
              placeholder="Preset name" maxLength={20}
              className="flex-1 bg-muted/10 border border-border/20 rounded-lg px-2 py-1 text-[10px] text-foreground outline-none" />
            <button onClick={savePreset} className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-[10px]">Save</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-1.5">
        {[...PRESETS, ...savedPresets].map((preset, i) => (
          <button
            key={`${preset.name}-${i}`}
            onClick={() => onApply(preset.params)}
            className="flex items-center gap-2 p-2 rounded-xl glass-card hover:bg-primary/5 transition text-left group"
          >
            <span className="text-sm">{preset.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-medium text-foreground truncate">{preset.name}</p>
              <p className="text-[7px] text-muted-foreground">W{preset.params.warmth} L{preset.params.logic} C{preset.params.creativity}</p>
            </div>
            {i >= PRESETS.length && (
              <button onClick={e => { e.stopPropagation(); deletePreset(i - PRESETS.length); }}
                className="opacity-0 group-hover:opacity-100 text-destructive/50 hover:text-destructive text-[8px] transition">×</button>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PersonalityLock({ locked, onToggle }: { locked: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium transition ${
        locked ? 'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]' : 'glass-card text-muted-foreground hover:text-foreground'
      }`}>
      {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
      {locked ? 'Personality Locked' : 'Lock Personality'}
    </button>
  );
}

export function PersonalityBalanceScore({ params }: { params: PersonalityParams }) {
  const values = [params.warmth, params.logic, params.creativity, params.energy, params.humor];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / values.length;
  const maxVariance = 2500;
  const score = Math.round(Math.max(0, 100 - (variance / maxVariance) * 100));

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted/20 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          className={`h-full rounded-full ${score > 70 ? 'bg-primary' : score > 40 ? 'bg-[hsl(var(--warning))]' : 'bg-destructive'}`}
        />
      </div>
      <span className="text-[10px] font-medium text-foreground/70">Balance: {score}</span>
    </div>
  );
}

export function PersonalityAdvice({ params }: { params: PersonalityParams }) {
  const getAdvice = () => {
    const low = Object.entries(params).filter(([, v]) => v < 30);
    const high = Object.entries(params).filter(([, v]) => v > 80);
    const parts: string[] = [];
    if (high.length > 0) parts.push(`${high.map(([k]) => k).join(', ')} is strongly developed`);
    if (low.length > 0) parts.push(`Try increasing ${low.map(([k]) => k).join(', ')} through related conversations`);
    if (parts.length === 0) return 'Well-balanced personality! Keep engaging in diverse conversations.';
    return parts.join('. ') + '.';
  };

  return (
    <div className="flex gap-2 p-3 rounded-xl glass-card">
      <Lightbulb className="w-4 h-4 text-[hsl(var(--warning))] flex-shrink-0 mt-0.5" />
      <p className="text-[10px] text-foreground/70 leading-relaxed">{getAdvice()}</p>
    </div>
  );
}

export function PersonalityReset({ onReset }: { onReset: () => void }) {
  const [confirm, setConfirm] = useState(false);

  return confirm ? (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
      <p className="text-[10px] text-destructive">Reset all personality axes to 50?</p>
      <button onClick={() => { onReset(); setConfirm(false); }}
        className="px-2 py-1 rounded-lg bg-destructive/10 text-destructive text-[9px]">Yes</button>
      <button onClick={() => setConfirm(false)}
        className="px-2 py-1 rounded-lg bg-muted/10 text-muted-foreground text-[9px]">No</button>
    </motion.div>
  ) : (
    <button onClick={() => setConfirm(true)}
      className="flex items-center gap-1 text-[10px] text-destructive/60 hover:text-destructive transition">
      <RotateCcw className="w-3 h-3" /> Reset Personality
    </button>
  );
}
