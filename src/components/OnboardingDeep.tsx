import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Sparkles, Lightbulb } from 'lucide-react';
import type { PersonalityParams } from '@/lib/gyeol/types';

export function NameDuplicateCheck({ name, onCheck }: { name: string; onCheck: (available: boolean) => void }) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const check = async () => {
    if (!name.trim()) return;
    setStatus('checking');
    await new Promise(r => setTimeout(r, 800));
    const available = name.length > 2;
    setStatus(available ? 'available' : 'taken');
    onCheck(available);
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={check} disabled={!name.trim() || status === 'checking'}
        className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition disabled:opacity-40">
        {status === 'checking' ? 'Checking...' : 'Check'}
      </button>
      {status === 'available' && (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-0.5 text-[9px] text-primary">
          <Check className="w-3 h-3" /> Available
        </motion.span>
      )}
      {status === 'taken' && (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-0.5 text-[9px] text-destructive">
          <X className="w-3 h-3" /> Already taken
        </motion.span>
      )}
    </div>
  );
}

export function CharacterCreationWizard({ onComplete }: { onComplete: (config: any) => void }) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({
    name: '',
    color: '#8b5cf6',
    personality: 'balanced',
    description: '',
  });

  const steps = [
    {
      title: 'Name Your Agent',
      content: (
        <div className="space-y-3">
          <input type="text" value={config.name} onChange={e => setConfig({ ...config, name: e.target.value })}
            placeholder="Enter agent name..." maxLength={20}
            className="w-full bg-muted/10 border border-border/20 rounded-xl px-4 py-3 text-sm text-foreground outline-none text-center" />
          <NameDuplicateCheck name={config.name} onCheck={() => {}} />
        </div>
      ),
    },
    {
      title: 'Choose Color',
      content: (
        <div className="flex flex-wrap gap-3 justify-center">
          {['#8b5cf6', '#06b6d4', '#f43f5e', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6'].map(c => (
            <button key={c} onClick={() => setConfig({ ...config, color: c })}
              className={`w-12 h-12 rounded-full border-2 transition ${config.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
              style={{ background: c }} />
          ))}
        </div>
      ),
    },
    {
      title: 'Describe Your Agent',
      content: (
        <textarea value={config.description} onChange={e => setConfig({ ...config, description: e.target.value })}
          placeholder="What kind of personality should your agent have?"
          rows={3} maxLength={200}
          className="w-full bg-muted/10 border border-border/20 rounded-xl px-4 py-3 text-[11px] text-foreground outline-none resize-none" />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-1 justify-center">
        {steps.map((_, i) => (
          <div key={i} className={`h-1 rounded-full transition-all ${
            i <= step ? 'w-8 bg-primary' : 'w-4 bg-muted/20'
          }`} />
        ))}
      </div>
      <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
        className="text-center space-y-4">
        <h3 className="text-sm font-bold text-foreground">{steps[step].title}</h3>
        {steps[step].content}
      </motion.div>
      <div className="flex gap-2">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)}
            className="flex-1 py-2.5 rounded-xl glass-card text-[11px] text-foreground/70">Back</button>
        )}
        <button onClick={() => step < steps.length - 1 ? setStep(step + 1) : onComplete(config)}
          disabled={step === 0 && !config.name.trim()}
          className="flex-1 py-2.5 rounded-xl bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition disabled:opacity-40">
          {step < steps.length - 1 ? 'Next' : 'Create Agent'}
        </button>
      </div>
    </div>
  );
}

export function PersonalitySliders({ params, onChange }: { params: PersonalityParams; onChange: (p: PersonalityParams) => void }) {
  const axes: { key: keyof PersonalityParams; label: string; emoji: string; low: string; high: string }[] = [
    { key: 'warmth', label: 'Warmth', emoji: '❤️', low: 'Cool', high: 'Warm' },
    { key: 'logic', label: 'Logic', emoji: '🧠', low: 'Creative', high: 'Logical' },
    { key: 'creativity', label: 'Creativity', emoji: '🎨', low: 'Practical', high: 'Creative' },
    { key: 'energy', label: 'Energy', emoji: '⚡', low: 'Calm', high: 'Energetic' },
    { key: 'humor', label: 'Humor', emoji: '😄', low: 'Serious', high: 'Humorous' },
  ];

  return (
    <div className="space-y-3">
      {axes.map(axis => (
        <div key={axis.key} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-foreground/70">
              {axis.emoji} {axis.label}
            </span>
            <span className="text-[9px] text-primary font-mono">{params[axis.key]}</span>
          </div>
          <input type="range" min={0} max={100} value={params[axis.key]}
            onChange={e => onChange({ ...params, [axis.key]: Number(e.target.value) })}
            className="w-full h-1.5 rounded-full bg-muted/20 accent-primary appearance-none cursor-pointer" />
          <div className="flex justify-between text-[7px] text-muted-foreground/40">
            <span>{axis.low}</span>
            <span>{axis.high}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PersonalityPresetCards({ onSelect }: { onSelect: (params: PersonalityParams) => void }) {
  const presets: { name: string; emoji: string; desc: string; params: PersonalityParams }[] = [
    { name: 'Warm Friend', emoji: '🤗', desc: 'Empathetic and supportive', params: { warmth: 85, logic: 30, creativity: 60, energy: 70, humor: 65 } },
    { name: 'Smart Expert', emoji: '🎓', desc: 'Analytical and precise', params: { warmth: 40, logic: 90, creativity: 50, energy: 50, humor: 30 } },
    { name: 'Fun Creator', emoji: '🎪', desc: 'Playful and imaginative', params: { warmth: 70, logic: 25, creativity: 95, energy: 80, humor: 85 } },
    { name: 'Balanced', emoji: '⚖️', desc: 'Well-rounded personality', params: { warmth: 50, logic: 50, creativity: 50, energy: 50, humor: 50 } },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {presets.map(p => (
        <motion.button key={p.name} whileTap={{ scale: 0.97 }} onClick={() => onSelect(p.params)}
          className="p-3 rounded-xl glass-card hover:bg-primary/5 transition text-center space-y-1">
          <span className="text-2xl">{p.emoji}</span>
          <p className="text-[10px] font-medium text-foreground">{p.name}</p>
          <p className="text-[8px] text-muted-foreground">{p.desc}</p>
        </motion.button>
      ))}
    </div>
  );
}

export function AIPersonalityRecommendation({ description, onApply }: { description: string; onApply: (params: PersonalityParams) => void }) {
  const [recommended, setRecommended] = useState<PersonalityParams | null>(null);
  const [loading, setLoading] = useState(false);

  const getRecommendation = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    const words = description.toLowerCase();
    const params: PersonalityParams = {
      warmth: words.includes('warm') || words.includes('friend') ? 80 : 50,
      logic: words.includes('smart') || words.includes('logic') ? 80 : 50,
      creativity: words.includes('creative') || words.includes('art') ? 80 : 50,
      energy: words.includes('energy') || words.includes('active') ? 80 : 50,
      humor: words.includes('fun') || words.includes('humor') ? 80 : 50,
    };
    setRecommended(params);
    setLoading(false);
  };

  return (
    <div className="space-y-2">
      <button onClick={getRecommendation} disabled={loading || !description.trim()}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition disabled:opacity-40">
        <Sparkles className="w-3.5 h-3.5" />
        {loading ? 'Analyzing...' : 'AI Recommend Personality'}
      </button>
      {recommended && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl glass-card space-y-2">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-[hsl(var(--warning))]" />
            <span className="text-[10px] font-medium text-foreground">AI Recommendation</span>
          </div>
          <div className="grid grid-cols-5 gap-1 text-center">
            {Object.entries(recommended).map(([k, v]) => (
              <div key={k}>
                <p className="text-[10px] font-bold text-primary">{v}</p>
                <p className="text-[7px] text-muted-foreground capitalize">{k}</p>
              </div>
            ))}
          </div>
          <button onClick={() => onApply(recommended)}
            className="w-full py-1.5 rounded-lg bg-primary/10 text-primary text-[10px]">Apply</button>
        </motion.div>
      )}
    </div>
  );
}

export function PresetComparison({ presetA, presetB }: {
  presetA: { name: string; params: PersonalityParams };
  presetB: { name: string; params: PersonalityParams };
}) {
  const traits = ['warmth', 'logic', 'creativity', 'energy', 'humor'] as const;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] font-medium">
        <span className="text-primary">{presetA.name}</span>
        <span className="text-muted-foreground">vs</span>
        <span className="text-secondary">{presetB.name}</span>
      </div>
      {traits.map(t => (
        <div key={t} className="space-y-0.5">
          <div className="flex justify-between text-[8px] text-muted-foreground capitalize">
            <span>{presetA.params[t]}</span>
            <span>{t}</span>
            <span>{presetB.params[t]}</span>
          </div>
          <div className="flex h-1.5 rounded-full bg-muted/20 overflow-hidden">
            <div className="h-full bg-primary/60" style={{ width: `${presetA.params[t] / 2}%` }} />
            <div className="flex-1" />
            <div className="h-full bg-secondary/60" style={{ width: `${presetB.params[t] / 2}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
