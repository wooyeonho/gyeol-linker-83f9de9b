import type { Agent, Message, PersonalityParams, VisualState } from './types';
import { callProvider } from './chat-ai';

const BASE_EVOLUTION_RATES: Record<number, number> = {
  1: 60,
  2: 40,
  3: 20,
  4: 5,
};

const MUTATION_RATES: Record<number, number> = {
  2: 5,
  3: 3,
  4: 2,
  5: 1,
};

const MUTATION_TYPES = [
  'empathy_master',
  'logic_genius',
  'creative_burst',
  'energy_overflow',
  'humor_king',
  'balanced_sage',
] as const;

type MutationType = (typeof MUTATION_TYPES)[number];

const PERSONALITY_COLORS: Record<keyof PersonalityParams, string> = {
  warmth: '#F59E0B',
  logic: '#06B6D4',
  creativity: '#A855F7',
  energy: '#22C55E',
  humor: '#EAB308',
};

const DEFAULT_VISUAL: VisualState = {
  color_primary: '#FFFFFF',
  color_secondary: '#4F46E5',
  glow_intensity: 0.3,
  particle_count: 10,
  form: 'point',
};

export function calculateVisualState(personality: PersonalityParams): VisualState {
  const dominant = (Object.entries(personality) as [keyof PersonalityParams, number][]).sort(
    (a, b) => b[1] - a[1]
  )[0];
  const secondary = (Object.entries(personality) as [keyof PersonalityParams, number][]).sort(
    (a, b) => b[1] - a[1]
  )[1];
  const primaryColor = dominant ? PERSONALITY_COLORS[dominant[0]] : '#FFFFFF';
  const secondaryColor = secondary ? PERSONALITY_COLORS[secondary[0]] : '#4F46E5';
  const avg = (personality.warmth + personality.logic + personality.creativity + personality.energy + personality.humor) / 5;
  const glow = 0.2 + (avg / 100) * 0.4;
  const particles = 10 + Math.floor((avg / 100) * 40);
  const form = avg < 30 ? 'point' : avg < 50 ? 'sphere' : avg < 70 ? 'orb' : avg < 90 ? 'complex' : 'abstract';
  return {
    color_primary: primaryColor,
    color_secondary: secondaryColor,
    glow_intensity: Math.min(1, glow),
    particle_count: Math.min(50, particles),
    form,
  };
}

export function calculateEvolutionProbability(agent: {
  gen: number;
  warmth: number;
  logic: number;
  creativity: number;
  energy: number;
  humor: number;
  total_conversations: number;
  evolution_progress: number;
}): number {
  const baseRate = BASE_EVOLUTION_RATES[agent.gen] ?? 0;
  if (baseRate === 0) return 0;
  const avg = (agent.warmth + agent.logic + agent.creativity + agent.energy + agent.humor) / 5;
  const personalityBonus = Math.floor(avg / 20);
  const conversationBonus = Math.min(10, Math.floor(agent.total_conversations / 50));
  const progressMultiplier = Math.min(1, agent.evolution_progress / 100);
  return Math.min(95, Math.floor((baseRate + personalityBonus + conversationBonus) * progressMultiplier));
}

export interface EvolutionResult {
  success: boolean;
  newGen: number;
  probability: number;
  isMutation: boolean;
  mutationType: MutationType | null;
  personalityBonus: number;
  message: string;
}

export function attemptEvolution(agent: {
  gen: number;
  warmth: number;
  logic: number;
  creativity: number;
  energy: number;
  humor: number;
  total_conversations: number;
  evolution_progress: number;
}): EvolutionResult {
  const probability = calculateEvolutionProbability(agent);
  const avg = (agent.warmth + agent.logic + agent.creativity + agent.energy + agent.humor) / 5;
  const personalityBonus = Math.floor(avg / 20);

  if (agent.evolution_progress < 100) {
    return {
      success: false,
      newGen: agent.gen,
      probability,
      isMutation: false,
      mutationType: null,
      personalityBonus,
      message: `진화 진행도 부족 (${agent.evolution_progress}/100)`,
    };
  }

  const roll = Math.random() * 100;
  const success = roll < probability;

  let isMutation = false;
  let mutationType: MutationType | null = null;

  if (success) {
    const mutationRate = MUTATION_RATES[agent.gen + 1] ?? 0;
    if (Math.random() * 100 < mutationRate) {
      isMutation = true;
      mutationType = MUTATION_TYPES[Math.floor(Math.random() * MUTATION_TYPES.length)];
    }
  }

  const newGen = success ? agent.gen + 1 : agent.gen;
  const message = success
    ? isMutation
      ? `돌연변이 진화! Gen ${newGen} (${mutationType}) - 확률 ${probability}%`
      : `진화 성공! Gen ${newGen} - 확률 ${probability}%`
    : `진화 실패 (${Math.floor(roll)}/${probability}) - 다음에 다시 도전!`;

  return { success, newGen, probability, isMutation, mutationType, personalityBonus, message };
}

export function checkCriticalLearning(): { isCritical: boolean; multiplier: number } {
  const roll = Math.random() * 100;
  if (roll < 1) return { isCritical: true, multiplier: 10 };
  if (roll < 5) return { isCritical: true, multiplier: 3 };
  return { isCritical: false, multiplier: 1 };
}

export type DailyEventType = 'none' | 'exp_double' | 'evolution_boost' | 'rare_ticket';

export function rollDailyEvent(): DailyEventType {
  const roll = Math.random() * 100;
  if (roll < 85) return 'none';
  if (roll < 93) return 'exp_double';
  if (roll < 98) return 'evolution_boost';
  return 'rare_ticket';
}

export function applyPersonalityDelta(
  current: PersonalityParams,
  delta: Partial<PersonalityParams>
): PersonalityParams {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  return {
    warmth: clamp(current.warmth + (delta.warmth ?? 0)),
    logic: clamp(current.logic + (delta.logic ?? 0)),
    creativity: clamp(current.creativity + (delta.creativity ?? 0)),
    energy: clamp(current.energy + (delta.energy ?? 0)),
    humor: clamp(current.humor + (delta.humor ?? 0)),
  };
}

export function analyzeConversationSimple(messages: Message[]): Partial<PersonalityParams> {
  const text = messages.map((m) => m.content).join(' ').toLowerCase();
  const delta: Partial<PersonalityParams> = {};
  if (/사랑|감사|고마|따뜻|응원/.test(text)) delta.warmth = 1;
  if (/분석|논리|데이터|비율|원인/.test(text)) delta.logic = 1;
  if (/상상|아이디어|창작|새로|다른/.test(text)) delta.creativity = 1;
  if (/빨리|에너지|활동|운동|재미/.test(text)) delta.energy = 1;
  if (/농담|웃|재밌|유머|ㅋ|ㅎ/.test(text)) delta.humor = 1;
  return delta;
}

export async function analyzeConversationWithLLM(
  messages: Message[],
  provider: string,
  apiKey: string,
): Promise<Partial<PersonalityParams>> {
  const conversationText = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n')
    .slice(0, 2000);

  const systemPrompt = `Analyze this conversation and return ONLY a JSON object with personality trait adjustments.
Each value: -2 to +2. Format: {"warmth":0,"logic":0,"creativity":0,"energy":0,"humor":0}
Positive = trait exercised. Negative = trait lacking. 0 = neutral.`;

  try {
    const raw = await callProvider(
      provider as 'openai' | 'groq' | 'deepseek' | 'anthropic' | 'gemini',
      apiKey,
      systemPrompt,
      conversationText,
    );
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        warmth: Math.max(-2, Math.min(2, Number(parsed.warmth) || 0)),
        logic: Math.max(-2, Math.min(2, Number(parsed.logic) || 0)),
        creativity: Math.max(-2, Math.min(2, Number(parsed.creativity) || 0)),
        energy: Math.max(-2, Math.min(2, Number(parsed.energy) || 0)),
        humor: Math.max(-2, Math.min(2, Number(parsed.humor) || 0)),
      };
    }
  } catch {
    // fallback
  }
  return analyzeConversationSimple(messages);
}

export { PERSONALITY_COLORS, DEFAULT_VISUAL, BASE_EVOLUTION_RATES, MUTATION_RATES, MUTATION_TYPES };
