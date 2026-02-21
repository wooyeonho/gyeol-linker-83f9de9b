import { createGyeolServerClient } from './supabase-server';

const INACTIVITY_DAYS_THRESHOLD = 14;

export interface DevolutionResult {
  devolved: boolean;
  newGen?: number;
  reason?: string;
}

export async function checkDevolution(agentId: string): Promise<DevolutionResult> {
  const supabase = createGyeolServerClient();
  if (!supabase) return { devolved: false };

  const { data: agent } = await supabase
    .from('gyeol_agents')
    .select('id, gen, last_active')
    .eq('id', agentId)
    .single();

  if (!agent) return { devolved: false };
  if (agent.gen <= 1) return { devolved: false, reason: 'Already Gen 1' };

  const lastActive = new Date(agent.last_active);
  const daysSinceActive = Math.floor((Date.now() - lastActive.getTime()) / 86400_000);

  if (daysSinceActive < INACTIVITY_DAYS_THRESHOLD) {
    return { devolved: false, reason: `Active ${daysSinceActive} days ago (threshold: ${INACTIVITY_DAYS_THRESHOLD})` };
  }

  const newGen = Math.max(1, agent.gen - 1);
  await supabase.from('gyeol_agents').update({
    gen: newGen,
    evolution_progress: 50,
  }).eq('id', agentId);

  return { devolved: true, newGen, reason: `Inactive for ${daysSinceActive} days` };
}
