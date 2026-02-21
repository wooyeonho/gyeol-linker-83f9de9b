import { useState, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';

export interface PersonalityAxes {
  warmth: number;
  logic: number;
  creativity: number;
  humor: number;
  energy: number;
}

export interface PersonalityPreset {
  name: string;
  axes: PersonalityAxes;
  description: string;
}

const DEFAULT_AXES: PersonalityAxes = { warmth: 50, logic: 50, creativity: 50, humor: 50, energy: 50 };

const PRESETS: PersonalityPreset[] = [
  { name: 'Balanced', axes: { warmth: 50, logic: 50, creativity: 50, humor: 50, energy: 50 }, description: 'Evenly balanced personality' },
  { name: 'Warm Friend', axes: { warmth: 85, logic: 30, creativity: 60, humor: 70, energy: 65 }, description: 'Friendly and empathetic companion' },
  { name: 'Logical Expert', axes: { warmth: 35, logic: 90, creativity: 40, humor: 20, energy: 45 }, description: 'Analytical and precise thinker' },
  { name: 'Creative Soul', axes: { warmth: 60, logic: 35, creativity: 95, humor: 55, energy: 75 }, description: 'Imaginative and artistic spirit' },
  { name: 'Energetic Coach', axes: { warmth: 70, logic: 55, creativity: 50, humor: 60, energy: 95 }, description: 'Motivating and driven leader' },
  { name: 'Calm Teacher', axes: { warmth: 75, logic: 70, creativity: 45, humor: 40, energy: 30 }, description: 'Patient and knowledgeable guide' },
  { name: 'Witty Poet', axes: { warmth: 55, logic: 40, creativity: 85, humor: 90, energy: 60 }, description: 'Clever wordsmith with charm' },
];

export function usePersonalitySystem(agentId?: string) {
  const [axes, setAxes] = useState<PersonalityAxes>(DEFAULT_AXES);
  const [locked, setLocked] = useState(false);
  const [history, setHistory] = useState<{ date: string; axes: PersonalityAxes }[]>([]);
  const [savedPresets, setSavedPresets] = useState<PersonalityPreset[]>(() => {
    try { return JSON.parse(localStorage.getItem('gyeol_personality_presets') ?? '[]'); } catch { return []; }
  });

  const balanceScore = useCallback((a: PersonalityAxes) => {
    const vals = Object.values(a);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
    return Math.max(0, Math.round(100 - Math.sqrt(variance)));
  }, []);

  const applyPreset = useCallback(async (preset: PersonalityPreset) => {
    if (locked) return;
    setAxes(preset.axes);
    if (agentId) {
      await supabase.from('gyeol_agents' as any).update({
        personality: preset.axes,
        settings: { personality_locked: locked },
      } as any).eq('id', agentId);
    }
  }, [agentId, locked]);

  const updateAxis = useCallback(async (axis: keyof PersonalityAxes, value: number) => {
    if (locked) return;
    const newAxes = { ...axes, [axis]: Math.min(100, Math.max(0, value)) };
    setAxes(newAxes);
    if (agentId) {
      await supabase.from('gyeol_agents' as any).update({ personality: newAxes } as any).eq('id', agentId);
    }
  }, [axes, agentId, locked]);

  const toggleLock = useCallback(async () => {
    const newLocked = !locked;
    setLocked(newLocked);
    if (agentId) {
      await supabase.from('gyeol_agents' as any).update({
        settings: { personality_locked: newLocked },
      } as any).eq('id', agentId);
    }
  }, [locked, agentId]);

  const resetPersonality = useCallback(async () => {
    setAxes(DEFAULT_AXES);
    if (agentId) {
      await supabase.from('gyeol_agents' as any).update({ personality: DEFAULT_AXES } as any).eq('id', agentId);
    }
  }, [agentId]);

  const saveCurrentAsPreset = useCallback((name: string) => {
    const preset: PersonalityPreset = { name, axes: { ...axes }, description: 'Custom preset' };
    const newPresets = [...savedPresets, preset];
    setSavedPresets(newPresets);
    localStorage.setItem('gyeol_personality_presets', JSON.stringify(newPresets));
  }, [axes, savedPresets]);

  const getAdvice = useCallback((a: PersonalityAxes) => {
    const lowest = Object.entries(a).sort(([, v1], [, v2]) => v1 - v2)[0];
    const highest = Object.entries(a).sort(([, v1], [, v2]) => v2 - v1)[0];
    const adviceMap: Record<string, string> = {
      warmth: 'Try having more emotional conversations to increase warmth.',
      logic: 'Engage in analytical discussions to boost logical thinking.',
      creativity: 'Share creative ideas and brainstorm together.',
      humor: 'Tell jokes and have fun conversations!',
      energy: 'Be more enthusiastic in your interactions.',
    };
    return `Strong in ${highest[0]} (${highest[1]}). ${adviceMap[lowest[0]]}`;
  }, []);

  return {
    axes, setAxes, locked, toggleLock, history,
    presets: PRESETS, savedPresets, saveCurrentAsPreset,
    applyPreset, updateAxis, resetPersonality,
    balanceScore: balanceScore(axes),
    advice: getAdvice(axes),
  };
}
