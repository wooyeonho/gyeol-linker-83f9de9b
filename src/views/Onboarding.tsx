import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import { useGyeolStore } from '@/store/gyeol-store';
import { AnimatedCharacter } from '@/src/components/AnimatedCharacter';
import { OnboardingDeep } from '@/src/components/OnboardingDeep';

const PRESETS = [
  { label: '🌊 Calm', warmth: 70, logic: 40, creativity: 50, energy: 30, humor: 40 },
  { label: '⚡ Energetic', warmth: 50, logic: 40, creativity: 60, energy: 80, humor: 70 },
  { label: '🧠 Analytical', warmth: 40, logic: 80, creativity: 50, energy: 50, humor: 30 },
  { label: '🎨 Creative', warmth: 50, logic: 30, creativity: 80, energy: 60, humor: 60 },
];

const CHARACTERS = [
  { key: null, emoji: '✉️', label: 'Text Only' },
  { key: 'void', emoji: '●', label: 'Void' },
  { key: 'jelly', emoji: '🫧', label: 'Jelly' },
  { key: 'cat', emoji: '🐱', label: 'Cat' },
  { key: 'flame', emoji: '🔥', label: 'Flame' },
  { key: 'cloud', emoji: '☁️', label: 'Cloud' },
];

const PERSONA_TRAITS: Record<string, string[]> = {
  void: ['EMPATHETIC', 'WARM'],
  jelly: ['CREATIVE', 'SPIRITED'],
  cat: ['OBSERVANT', 'CALM'],
  flame: ['LOGICAL', 'PRECISE'],
  cloud: ['GENTLE', 'SUPPORTIVE'],
};

interface Props {
  userId: string;
  onComplete: () => void;
}

const TOTAL_STEPS = 3;

export default function Onboarding({ userId, onComplete }: Props) {
  const { setAgent } = useGyeolStore();
  const [step, setStep] = useState(0);
  const [selectedMode, setSelectedMode] = useState<'simple' | 'advanced'>('simple');
  const [name, setName] = useState('');
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [preset, setPreset] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    setSaving(true);
    try {
      const settingsData: any = { mode: selectedMode };
      if (selectedMode === 'simple') {
        settingsData.autoTTS = true;
        settingsData.fontSize = 18;
        settingsData.characterPreset = selectedChar;
      } else {
        settingsData.characterPreset = 'void';
      }
      const chosen = PRESETS[preset];
      const agentData: any = {
        user_id: userId,
        name: name.trim() || 'GYEOL',
        settings: settingsData,
        ...(selectedMode === 'advanced'
          ? { warmth: chosen.warmth, logic: chosen.logic, creativity: chosen.creativity, energy: chosen.energy, humor: chosen.humor }
          : { warmth: 60, logic: 40, creativity: 50, energy: 50, humor: 50 }),
      };
      const { data, error } = await supabase
        .from('gyeol_agents' as any)
        .upsert(agentData as any, { onConflict: 'user_id', ignoreDuplicates: false })
        .select()
        .single();
      if (!error && data) setAgent(data as any);
      onComplete();
    } catch {
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const getNextStep = () => {
    if (step === 0) return 1;
    if (step === 1) return selectedMode === 'simple' ? 2 : 3;
    return -1;
  };

  const handleNext = () => {
    const next = getNextStep();
    if (next === -1) handleFinish();
    else setStep(next);
  };

  const handleBack = () => {
    if (step === 2 || step === 3) setStep(1);
    else if (step === 1) setStep(0);
  };

  const currentStepNum = step === 0 ? 1 : step === 1 ? 2 : 3;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center font-display relative">
      <div className="aurora-bg" />

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm px-6 relative z-10"
      >
        {/* Progress bar */}
        <div className="mb-8">
          <p className="text-[10px] text-slate-400 mb-2 text-center">Step {currentStepNum} of {TOTAL_STEPS}</p>
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                i < currentStepNum
                  ? 'bg-gradient-to-r from-primary to-secondary shadow-[0_0_8px_rgba(120,78,218,0.5)]'
                  : 'bg-white/[0.06]'
              }`} />
            ))}
          </div>
        </div>

        {/* Step 0: Mode Selection */}
        {step === 0 && (
          <div className="flex flex-col items-center gap-8">
            <div className="void-dot mb-2" />
            <div className="text-center space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-400">GYEOL</h1>
              <p className="text-sm text-slate-400">Choose your experience</p>
            </div>

            <div className="w-full grid grid-cols-2 gap-3">
              {[
                { key: 'simple' as const, icon: '💬', label: 'Simple', desc: 'Just Talk' },
                { key: 'advanced' as const, icon: '🧬', label: 'Advanced', desc: 'Full Experience' },
              ].map(m => (
                <button key={m.key} onClick={() => setSelectedMode(m.key)}
                  className={`p-5 rounded-2xl text-center transition-all hover:border-white/15 hover:-translate-y-1 ${
                    selectedMode === m.key
                      ? 'glass-card-selected'
                      : 'glass-card'
                  }`}>
                  <span className="text-2xl block mb-2">{m.icon}</span>
                  <p className="text-sm font-medium text-foreground/80">{m.label}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{m.desc}</p>
                </button>
              ))}
            </div>

            <p className="text-[10px] text-slate-500">You can switch anytime in Settings</p>

              <button onClick={handleNext}
                className="w-full py-4 rounded-xl btn-glow bg-gradient-to-r from-primary to-secondary text-white font-bold flex items-center justify-center gap-2 text-sm">
                Continue
                <span className="material-icons-round text-lg">arrow_forward</span>
              </button>
          </div>
        )}

        {/* Step 1: Name */}
        {step === 1 && (
          <div className="flex flex-col items-center gap-8">
            <div className="void-dot mb-2" />
            <div className="text-center space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-400">Welcome to GYEOL</h1>
              <p className="text-sm text-slate-400">Your AI companion that evolves with you</p>
            </div>

            <div className="w-full space-y-3">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Name your companion</label>
              <div className="input-glow rounded-full border border-white/[0.06] bg-[#1f1d25] transition-all">
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="GYEOL" maxLength={20}
                  className="w-full px-5 py-3.5 bg-transparent rounded-full text-foreground/90 placeholder:text-slate-600 outline-none text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <button onClick={handleBack}
                className="flex-1 py-3 text-slate-400 hover:text-white flex items-center justify-center gap-2 text-sm transition">
                <span className="material-icons-round text-sm">arrow_back</span> Back
              </button>
              <button onClick={handleNext}
                className="flex-1 py-3.5 btn-glow bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-full transition-all active:scale-[0.98] text-sm">
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Character Selection (Simple only) */}
        {step === 2 && (
          <div className="flex flex-col items-center gap-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground text-center">
                Who resonates with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">you</span>?
              </h2>
              <p className="text-sm text-slate-400 text-center mt-2">Select the persona that best matches your energy and goals.</p>
            </div>

            {selectedChar && (
              <div className="w-24 h-24">
                <AnimatedCharacter mood="happy" isThinking={false} characterPreset={selectedChar} gen={1} size="lg" />
              </div>
            )}

            <div className="w-full grid grid-cols-3 gap-2">
              {CHARACTERS.map(c => (
                <button key={String(c.key)} onClick={() => setSelectedChar(c.key)}
                  className={`flex flex-col items-center p-3 rounded-2xl transition-all hover:border-white/15 hover:-translate-y-1 ${
                    selectedChar === c.key
                      ? 'glass-card-selected scale-105'
                      : 'glass-card'
                  }`}>
                  <span className="text-lg">{c.emoji}</span>
                  <span className="text-[9px] text-slate-500 mt-1">{c.label}</span>
                  {c.key && PERSONA_TRAITS[c.key] && (
                    <div className="flex flex-wrap gap-0.5 mt-1.5 justify-center">
                      {PERSONA_TRAITS[c.key].map(trait => (
                        <span key={trait} className="text-[7px] px-1.5 py-0.5 rounded-full bg-secondary/10 text-secondary font-bold uppercase tracking-wider">
                          {trait}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3 w-full">
              <button onClick={handleBack}
                className="flex-1 py-3 text-slate-400 hover:text-white flex items-center justify-center gap-2 text-sm transition">
                <span className="material-icons-round text-sm">arrow_back</span> Back
              </button>
              <button onClick={handleFinish} disabled={saving}
                className="flex-1 py-3.5 btn-glow bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-full transition-all active:scale-[0.98] text-sm disabled:opacity-30">
                {saving ? 'Creating...' : 'Start'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Personality (Advanced only) */}
        {step === 3 && (
          <div className="flex flex-col items-center gap-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-400">
                Choose {name.trim() || 'GYEOL'}'s Personality
              </h2>
              <p className="text-xs text-slate-400">This can evolve over time through conversation</p>
            </div>

            <div className="w-full grid grid-cols-2 gap-3">
              {PRESETS.map((p, i) => (
                <button key={p.label} onClick={() => setPreset(i)}
                  className={`p-4 rounded-2xl text-left transition-all hover:border-white/15 hover:-translate-y-1 ${
                    preset === i
                      ? 'glass-card-selected'
                      : 'glass-card'
                  }`}>
                  <p className="text-sm font-medium text-foreground/80">{p.label}</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {Object.entries(p).filter(([k]) => k !== 'label')
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .slice(0, 2)
                      .map(([k]) => k)
                      .join(', ')}
                  </p>
                </button>
              ))}
            </div>

            <div className="flex gap-3 w-full">
              <button onClick={handleBack}
                className="flex-1 py-3 text-slate-400 hover:text-white flex items-center justify-center gap-2 text-sm transition">
                <span className="material-icons-round text-sm">arrow_back</span> Back
              </button>
              <button onClick={handleFinish} disabled={saving}
                className="flex-1 py-3.5 btn-glow bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-full transition-all active:scale-[0.98] text-sm disabled:opacity-30">
                {saving ? 'Creating...' : 'Start Journey'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
