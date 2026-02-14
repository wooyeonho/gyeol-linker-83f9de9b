import type { SupabaseClient } from '@supabase/supabase-js';

export function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, normA = 0, normB = 0;
  keys.forEach((k) => {
    const va = a[k] ?? 0;
    const vb = b[k] ?? 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  });
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function calculateCompatibility(
  agent1: { warmth: number; logic: number; creativity: number; energy: number; humor: number },
  agent2: { warmth: number; logic: number; creativity: number; energy: number; humor: number },
  tasteSimilarity: number
): number {
  const diff =
    Math.abs(agent1.warmth - agent2.warmth) +
    Math.abs(agent1.logic - agent2.logic) +
    Math.abs(agent1.creativity - agent2.creativity) +
    Math.abs(agent1.energy - agent2.energy) +
    Math.abs(agent1.humor - agent2.humor);
  const personalityBonus = diff < 100 ? 10 : 0;
  return Math.min(100, Math.round(tasteSimilarity * 80 + personalityBonus));
}

export async function findTopMatches(
  supabase: SupabaseClient,
  agentId: string,
  limit = 10
): Promise<{ agentId: string; compatibilityScore: number }[]> {
  const { data: me } = await supabase
    .from('gyeol_agents')
    .select('id, warmth, logic, creativity, energy, humor')
    .eq('id', agentId)
    .single();
  if (!me) return [];

  const { data: myTaste } = await supabase
    .from('gyeol_taste_vectors')
    .select('interests, topics')
    .eq('agent_id', agentId)
    .single();

  const { data: agents } = await supabase
    .from('gyeol_agents')
    .select('id, warmth, logic, creativity, energy, humor')
    .neq('id', agentId);

  if (!agents?.length) return [];

  const myInterests = (myTaste?.interests as Record<string, number>) ?? {};
  const results: { agentId: string; compatibilityScore: number }[] = [];

  for (const other of agents) {
    const { data: otherTaste } = await supabase
      .from('gyeol_taste_vectors')
      .select('interests')
      .eq('agent_id', other.id)
      .single();
    const otherInterests = (otherTaste?.interests as Record<string, number>) ?? {};
    const sim = cosineSimilarity(myInterests, otherInterests);
    const score = calculateCompatibility(
      me as { warmth: number; logic: number; creativity: number; energy: number; humor: number },
      other as { warmth: number; logic: number; creativity: number; energy: number; humor: number },
      sim
    );
    results.push({ agentId: other.id, compatibilityScore: score });
  }

  results.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  return results.slice(0, limit);
}
