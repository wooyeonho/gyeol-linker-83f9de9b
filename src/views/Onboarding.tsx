import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import { useGyeolStore } from '@/store/gyeol-store';
import { AnimatedCharacter } from '@/src/components/AnimatedCharacter';

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

interface Props {
  userId: string;
  onComplete: () => void;
}

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

  // Step flow:
  // Simple:   0(mode) → 1(name) → 2(character) → finish
  // Advanced: 0(mode) → 1(name) → 3(personality) → finish
  const getNextStep = () => {
    if (step === 0) return 1;
    if (step === 1) return selectedMode === 'simple' ? 2 : 3;
    return -1; // finish
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

  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-display">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[120px] bg-primary/[0.04]" />
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm px-6 relative z-10"
      >
        {/* Step 0: Mode Selection */}
        {step === 0 && (
          <div className="flex flex-col items-center gap-8">
            <div className="void-dot mb-2" />
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold text-foreground/90">GYEOL</h1>
              <p className="text-sm text-white/30">Choose your experience</p>
            </div>

            <div className="w-full grid grid-cols-2 gap-3">
              {[
                { key: 'simple' as const, icon: '💬', label: 'Simple', desc: 'Just Talk' },
                { key: 'advanced' as const, icon: '🧬', label: 'Advanced', desc: 'Full Experience' },
              ].map(m => (
                <button key={m.key} onClick={() => setSelectedMode(m.key)}
                  className={`p-5 rounded-xl border text-center transition-all ${
                    selectedMode === m.key
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}>
                  <span className="text-2xl block mb-2">{m.icon}</span>
                  <p className="text-sm font-medium text-foreground/80">{m.label}</p>
                  <p className="text-[10px] text-white/25 mt-1">{m.desc}</p>
                </button>
              ))}
            </div>

            <p className="text-[10px] text-white/20">You can switch anytime in Settings</p>

            <button onClick={handleNext}
              className="w-full py-3.5 bg-primary/80 hover:bg-primary text-white font-medium rounded-xl transition-all active:scale-[0.98] text-sm">
              Next
            </button>
          </div>
        )}

        {/* Step 1: Name */}
        {step === 1 && (
          <div className="flex flex-col items-center gap-8">
            <div className="void-dot mb-2" />
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold text-foreground/90">Welcome to GYEOL</h1>
              <p className="text-sm text-white/30">Your AI companion that evolves with you</p>
            </div>

            <div className="w-full space-y-3">
              <label className="text-[10px] text-white/30 uppercase tracking-wider">Name your companion</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="GYEOL" maxLength={20}
                className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-foreground/90 placeholder:text-white/20 focus:border-primary/30 transition-all outline-none text-sm"
              />
            </div>

            <div className="flex gap-3 w-full">
              <button onClick={handleBack}
                className="flex-1 py-3 text-white/30 hover:text-white/60 text-sm transition">Back</button>
              <button onClick={handleNext}
                className="flex-1 py-3.5 bg-primary/80 hover:bg-primary text-white font-medium rounded-xl transition-all active:scale-[0.98] text-sm">
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Character Selection (Simple only) */}
        {step === 2 && (
          <div className="flex flex-col items-center gap-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-foreground/90">Choose a character</h2>
              <p className="text-xs text-white/30">Optional — you can use text-only mode</p>
            </div>

            {/* Preview */}
            {selectedChar && (
              <div className="w-24 h-24">
                <AnimatedCharacter mood="happy" isThinking={false} characterPreset={selectedChar} gen={1} size="lg" />
              </div>
            )}

            <div className="w-full grid grid-cols-3 gap-2">
              {CHARACTERS.map(c => (
                <button key={String(c.key)} onClick={() => setSelectedChar(c.key)}
                  className={`flex flex-col items-center p-3 rounded-xl border transition ${
                    selectedChar === c.key
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}>
                  <span className="text-lg">{c.emoji}</span>
                  <span className="text-[9px] text-white/30 mt-1">{c.label}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3 w-full">
              <button onClick={handleBack}
                className="flex-1 py-3 text-white/30 hover:text-white/60 text-sm transition">Back</button>
              <button onClick={handleFinish} disabled={saving}
                className="flex-1 py-3.5 bg-primary/80 hover:bg-primary text-white font-medium rounded-xl transition-all active:scale-[0.98] text-sm disabled:opacity-30">
                {saving ? 'Creating...' : 'Start'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Personality (Advanced only) */}
        {step === 3 && (
          <div className="flex flex-col items-center gap-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-foreground/90">
                Choose {name.trim() || 'GYEOL'}'s Personality
              </h2>
              <p className="text-xs text-white/30">This can evolve over time through conversation</p>
            </div>

            <div className="w-full grid grid-cols-2 gap-3">
              {PRESETS.map((p, i) => (
                <button key={p.label} onClick={() => setPreset(i)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    preset === i
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}>
                  <p className="text-sm font-medium text-foreground/80">{p.label}</p>
                  <p className="text-[10px] text-white/25 mt-1">
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
                className="flex-1 py-3 text-white/30 hover:text-white/60 text-sm transition">Back</button>
              <button onClick={handleFinish} disabled={saving}
                className="flex-1 py-3.5 bg-primary/80 hover:bg-primary text-white font-medium rounded-xl transition-all active:scale-[0.98] text-sm disabled:opacity-30">
                {saving ? 'Creating...' : 'Start Journey'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
