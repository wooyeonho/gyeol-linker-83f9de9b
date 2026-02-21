import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';

export interface EvolutionEvent {
  id: string;
  agent_id: string;
  from_gen: number;
  to_gen: number;
  trigger: string;
  visual_state_before: any;
  visual_state_after: any;
  created_at: string;
}

export interface MutationRecord {
  id: string;
  agent_id: string;
  type: string;
  effect: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  created_at: string;
}

export interface DailyEvent {
  id: string;
  title: string;
  description: string;
  type: 'bonus_exp' | 'bonus_coins' | 'special_mutation' | 'evolution_boost';
  multiplier: number;
  starts_at: string;
  ends_at: string;
  active: boolean;
}

export function useEvolutionSystem(agentId?: string) {
  const [evolutionHistory, setEvolutionHistory] = useState<EvolutionEvent[]>([]);
  const [mutations, setMutations] = useState<MutationRecord[]>([]);
  const [dailyEvents, setDailyEvents] = useState<DailyEvent[]>([]);
  const [evolutionThreshold, setEvolutionThreshold] = useState(100);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [hasProtection, setHasProtection] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!agentId) return;
    const { data } = await supabase.from('gyeol_evolution_logs' as any).select('*').eq('agent_id', agentId).order('created_at', { ascending: false });
    if (data) setEvolutionHistory(data as any);
  }, [agentId]);

  const loadMutations = useCallback(async () => {
    if (!agentId) return;
    const { data } = await supabase.from('gyeol_mutations' as any).select('*').eq('agent_id', agentId).order('created_at', { ascending: false });
    if (data) setMutations(data as any);
  }, [agentId]);

  const loadEvents = useCallback(async () => {
    const { data } = await supabase.from('gyeol_daily_events' as any).select('*').gte('ends_at', new Date().toISOString()).order('starts_at', { ascending: true });
    if (data) setDailyEvents(data as any);
  }, []);

  useEffect(() => { loadHistory(); loadMutations(); loadEvents(); }, [loadHistory, loadMutations, loadEvents]);

  const setCustomThreshold = useCallback(async (threshold: number) => {
    if (!agentId) return;
    setEvolutionThreshold(threshold);
    const { data: current } = await supabase.from('gyeol_agents').select('settings').eq('id', agentId).single();
    const existingSettings = (current as any)?.settings ?? {};
    await supabase.from('gyeol_agents').update({
      settings: { ...existingSettings, evolution_threshold: threshold },
    } as any).eq('id', agentId);
  }, [agentId]);

  const toggleProtection = useCallback(async () => {
    if (!agentId) return;
    const newVal = !hasProtection;
    setHasProtection(newVal);
    const { data: current } = await supabase.from('gyeol_agents').select('settings').eq('id', agentId).single();
    const existingSettings = (current as any)?.settings ?? {};
    await supabase.from('gyeol_agents').update({
      settings: { ...existingSettings, evolution_protection: newVal },
    } as any).eq('id', agentId);
  }, [agentId, hasProtection]);

  const conversationsToNextEvolution = Math.max(0, evolutionThreshold - currentProgress);

  return {
    evolutionHistory, mutations, dailyEvents,
    evolutionThreshold, setCustomThreshold,
    currentProgress, conversationsToNextEvolution,
    hasProtection, toggleProtection,
    reload: () => { loadHistory(); loadMutations(); loadEvents(); },
  };
}
