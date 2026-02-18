/**
 * GYEOL 취향 벡터 — AI 매칭용 관심사/토픽 분석
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export async function analyzeAndUpdateVector(
  supabase: SupabaseClient,
  agentId: string,
  interests: Record<string, number>,
  topics: Record<string, number>,
  communicationStyle: Record<string, number>
): Promise<void> {
  await supabase.from('gyeol_taste_vectors').upsert({
    agent_id: agentId,
    interests,
    topics,
    communication_style: communicationStyle,
    updated_at: new Date().toISOString(),
  });
}

export function cosineSimilarity(
  a: Record<string, number>,
  b: Record<string, number>
): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0,
    normA = 0,
    normB = 0;
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
  // Personality similarity: how close are the 5 traits (max diff per trait = 100, total max = 500)
  const diff =
    Math.abs(agent1.warmth - agent2.warmth) +
    Math.abs(agent1.logic - agent2.logic) +
    Math.abs(agent1.creativity - agent2.creativity) +
    Math.abs(agent1.energy - agent2.energy) +
    Math.abs(agent1.humor - agent2.humor);
  // personalityScore: 0-100 (0 = max difference, 100 = identical)
  const personalityScore = Math.round((1 - diff / 500) * 100);

  // Complementary bonus: opposite traits can complement each other
  const complementary =
    (agent1.warmth > 60 && agent2.logic > 60) || (agent1.logic > 60 && agent2.warmth > 60) ||
    (agent1.creativity > 60 && agent2.energy > 60) || (agent1.energy > 60 && agent2.creativity > 60);
  const complementaryBonus = complementary ? 8 : 0;

  // Weight: personality 50%, taste 40%, complementary 10%
  const hasTaste = tasteSimilarity > 0;
  if (hasTaste) {
    return Math.min(100, Math.round(personalityScore * 0.5 + tasteSimilarity * 100 * 0.4 + complementaryBonus));
  }
  // No taste data: rely more on personality
  return Math.min(100, Math.round(personalityScore * 0.85 + complementaryBonus + 5));
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
