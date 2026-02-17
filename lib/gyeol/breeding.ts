import type { SupabaseClient } from '@supabase/supabase-js';
import type { PersonalityParams } from './types';

export interface BreedingResult {
  success: boolean;
  childId: string | null;
  childName: string;
  traits: PersonalityParams;
  dominantParent: 'parent1' | 'parent2' | 'balanced';
  mutationOccurred: boolean;
  mutatedTrait: string | null;
  message: string;
}

const BREEDING_COOLDOWN_HOURS = 72;
const MIN_GEN_FOR_BREEDING = 2;
const MIN_INTIMACY_FOR_BREEDING = 50;
const BREEDING_SUCCESS_RATE = 70;
const MUTATION_CHANCE = 15;

function inheritTrait(p1Val: number, p2Val: number): number {
  const ratio = 0.3 + Math.random() * 0.4;
  const base = p1Val * ratio + p2Val * (1 - ratio);
  const variance = (Math.random() - 0.5) * 10;
  return Math.max(0, Math.min(100, Math.round(base + variance)));
}

function generateChildName(parent1Name: string, parent2Name: string): string {
  const p1Prefix = parent1Name.slice(0, Math.ceil(parent1Name.length / 2));
  const p2Suffix = parent2Name.slice(Math.floor(parent2Name.length / 2));
  return `${p1Prefix}${p2Suffix}`;
}

export async function checkBreedingEligibility(
  supabase: SupabaseClient,
  agent1Id: string,
  agent2Id: string,
): Promise<{ eligible: boolean; reason: string }> {
  const { data: agents } = await supabase
    .from('gyeol_agents')
    .select('id, gen, intimacy, name')
    .in('id', [agent1Id, agent2Id]);

  if (!agents || agents.length !== 2) {
    return { eligible: false, reason: '에이전트를 찾을 수 없습니다' };
  }

  const a1 = agents.find((a) => a.id === agent1Id);
  const a2 = agents.find((a) => a.id === agent2Id);
  if (!a1 || !a2) return { eligible: false, reason: '에이전트 데이터 오류' };

  if (a1.gen < MIN_GEN_FOR_BREEDING || a2.gen < MIN_GEN_FOR_BREEDING) {
    return { eligible: false, reason: `번식하려면 Gen ${MIN_GEN_FOR_BREEDING} 이상이어야 합니다` };
  }

  const { data: match } = await supabase
    .from('gyeol_ai_matches')
    .select('compatibility_score')
    .or(`and(agent_1_id.eq.${agent1Id},agent_2_id.eq.${agent2Id}),and(agent_1_id.eq.${agent2Id},agent_2_id.eq.${agent1Id})`)
    .limit(1)
    .maybeSingle();

  if (!match || match.compatibility_score < MIN_INTIMACY_FOR_BREEDING) {
    return { eligible: false, reason: `호환도 ${MIN_INTIMACY_FOR_BREEDING}% 이상 필요` };
  }

  const { data: recentBreeding } = await supabase
    .from('gyeol_breeding_logs')
    .select('created_at')
    .or(`parent_1_id.eq.${agent1Id},parent_1_id.eq.${agent2Id},parent_2_id.eq.${agent1Id},parent_2_id.eq.${agent2Id}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentBreeding) {
    const hoursSince = (Date.now() - new Date(recentBreeding.created_at).getTime()) / (1000 * 60 * 60);
    if (hoursSince < BREEDING_COOLDOWN_HOURS) {
      return { eligible: false, reason: `쿨다운 중 (${Math.ceil(BREEDING_COOLDOWN_HOURS - hoursSince)}시간 남음)` };
    }
  }

  return { eligible: true, reason: '번식 가능' };
}

export async function attemptBreeding(
  supabase: SupabaseClient,
  agent1Id: string,
  agent2Id: string,
  ownerUserId: string,
): Promise<BreedingResult> {
  const eligibility = await checkBreedingEligibility(supabase, agent1Id, agent2Id);
  if (!eligibility.eligible) {
    return {
      success: false,
      childId: null,
      childName: '',
      traits: { warmth: 0, logic: 0, creativity: 0, energy: 0, humor: 0 },
      dominantParent: 'balanced',
      mutationOccurred: false,
      mutatedTrait: null,
      message: eligibility.reason,
    };
  }

  const roll = Math.random() * 100;
  if (roll >= BREEDING_SUCCESS_RATE) {
    await supabase.from('gyeol_breeding_logs').insert({
      parent_1_id: agent1Id,
      parent_2_id: agent2Id,
      success: false,
      details: { roll: Math.floor(roll), threshold: BREEDING_SUCCESS_RATE },
    });
    return {
      success: false,
      childId: null,
      childName: '',
      traits: { warmth: 0, logic: 0, creativity: 0, energy: 0, humor: 0 },
      dominantParent: 'balanced',
      mutationOccurred: false,
      mutatedTrait: null,
      message: `번식 실패 (${Math.floor(roll)}/${BREEDING_SUCCESS_RATE}) - 다음에 다시 시도하세요`,
    };
  }

  const { data: parents } = await supabase
    .from('gyeol_agents')
    .select('id, name, warmth, logic, creativity, energy, humor, gen')
    .in('id', [agent1Id, agent2Id]);

  if (!parents || parents.length !== 2) {
    return {
      success: false, childId: null, childName: '',
      traits: { warmth: 0, logic: 0, creativity: 0, energy: 0, humor: 0 },
      dominantParent: 'balanced', mutationOccurred: false, mutatedTrait: null,
      message: '부모 에이전트 데이터 로드 실패',
    };
  }

  const p1 = parents.find((p) => p.id === agent1Id)!;
  const p2 = parents.find((p) => p.id === agent2Id)!;

  const traits: PersonalityParams = {
    warmth: inheritTrait(p1.warmth, p2.warmth),
    logic: inheritTrait(p1.logic, p2.logic),
    creativity: inheritTrait(p1.creativity, p2.creativity),
    energy: inheritTrait(p1.energy, p2.energy),
    humor: inheritTrait(p1.humor, p2.humor),
  };

  let mutationOccurred = false;
  let mutatedTrait: string | null = null;
  if (Math.random() * 100 < MUTATION_CHANCE) {
    const traitKeys = ['warmth', 'logic', 'creativity', 'energy', 'humor'] as const;
    mutatedTrait = traitKeys[Math.floor(Math.random() * traitKeys.length)];
    const boost = 15 + Math.floor(Math.random() * 20);
    traits[mutatedTrait] = Math.min(100, traits[mutatedTrait] + boost);
    mutationOccurred = true;
  }

  const p1Total = p1.warmth + p1.logic + p1.creativity + p1.energy + p1.humor;
  const p2Total = p2.warmth + p2.logic + p2.creativity + p2.energy + p2.humor;
  const dominantParent = Math.abs(p1Total - p2Total) < 20 ? 'balanced' as const
    : p1Total > p2Total ? 'parent1' as const : 'parent2' as const;

  const childName = generateChildName(p1.name ?? 'GYEOL', p2.name ?? 'AI');
  const childGen = Math.min(p1.gen, p2.gen);

  const { data: child } = await supabase
    .from('gyeol_agents')
    .insert({
      user_id: ownerUserId,
      name: childName,
      gen: childGen,
      warmth: traits.warmth,
      logic: traits.logic,
      creativity: traits.creativity,
      energy: traits.energy,
      humor: traits.humor,
      total_conversations: 0,
      evolution_progress: 0,
      visual_state: {
        color_primary: '#7C3AED',
        color_secondary: '#A78BFA',
        glow_intensity: 0.5,
        particle_count: 30,
        form: 'point',
      },
      intimacy: 0,
      mood: 'excited',
      consecutive_days: 0,
    })
    .select('id')
    .single();

  await supabase.from('gyeol_breeding_logs').insert({
    parent_1_id: agent1Id,
    parent_2_id: agent2Id,
    child_id: child?.id ?? null,
    success: true,
    details: {
      childName,
      traits,
      mutationOccurred,
      mutatedTrait,
      dominantParent,
    },
  });

  const message = mutationOccurred
    ? `번식 성공! ${childName} 탄생 (돌연변이: ${mutatedTrait} 강화)`
    : `번식 성공! ${childName} 탄생`;

  return {
    success: true,
    childId: child?.id ?? null,
    childName,
    traits,
    dominantParent,
    mutationOccurred,
    mutatedTrait,
    message,
  };
}
