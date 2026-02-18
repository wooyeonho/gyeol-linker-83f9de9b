import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import { useGyeolStore } from '@/store/gyeol-store';

const PRESETS = [
  { label: '🌊 Calm', warmth: 70, logic: 40, creativity: 50, energy: 30, humor: 40 },
  { label: '⚡ Energetic', warmth: 50, logic: 40, creativity: 60, energy: 80, humor: 70 },
  { label: '🧠 Analytical', warmth: 40, logic: 80, creativity: 50, energy: 50, humor: 30 },
  { label: '🎨 Creative', warmth: 50, logic: 30, creativity: 80, energy: 60, humor: 60 },
];

interface Props {
  userId: string;
  onComplete: () => void;
}

export default function Onboarding({ userId, onComplete }: Props) {
  const { setAgent } = useGyeolStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [preset, setPreset] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    const chosen = PRESETS[preset];
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('gyeol_agents' as any)
        .upsert({
          user_id: userId,
          name: name.trim() || 'GYEOL',
          warmth: chosen.warmth,
          logic: chosen.logic,
          creativity: chosen.creativity,
          energy: chosen.energy,
          humor: chosen.humor,
        } as any, { onConflict: 'user_id', ignoreDuplicates: false })
        .select()
        .single();
      if (!error && data) {
        setAgent(data as any);
      }
      onComplete();
    } catch {
      onComplete();
    } finally {
      setSaving(false);
    }
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
        {step === 0 && (
          <div className="flex flex-col items-center gap-8">
            <div className="void-dot mb-2" />
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold text-foreground/90">Welcome to GYEOL</h1>
              <p className="text-sm text-white/30">Your AI companion that evolves with you</p>
            </div>

            <div className="w-full space-y-3">
              <label className="text-[10px] text-white/30 uppercase tracking-wider">Name your companion</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="GYEOL"
                maxLength={20}
                className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-foreground/90 placeholder:text-white/20 focus:border-primary/30 transition-all outline-none text-sm"
              />
            </div>

            <button
              onClick={() => setStep(1)}
              className="w-full py-3.5 bg-primary/80 hover:bg-primary text-white font-medium rounded-xl transition-all active:scale-[0.98] text-sm"
            >
              Next
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col items-center gap-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-foreground/90">
                Choose {name.trim() || 'GYEOL'}'s Personality
              </h2>
              <p className="text-xs text-white/30">This can evolve over time through conversation</p>
            </div>

            <div className="w-full grid grid-cols-2 gap-3">
              {PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => setPreset(i)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    preset === i
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
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
              <button
                onClick={() => setStep(0)}
                className="flex-1 py-3 text-white/30 hover:text-white/60 text-sm transition"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex-1 py-3.5 bg-primary/80 hover:bg-primary text-white font-medium rounded-xl transition-all active:scale-[0.98] text-sm disabled:opacity-30"
              >
                {saving ? 'Creating...' : 'Start Journey'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
