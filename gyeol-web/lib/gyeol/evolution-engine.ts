/**
 * GYEOL 성격 진화 엔진
 */
import type { Agent, Message, PersonalityParams, VisualState } from './types';

const EVOLUTION_THRESHOLDS = [
  { gen: 2, conversations: 20, progress: 100 },
  { gen: 3, conversations: 50, progress: 100 },
  { gen: 4, conversations: 100, progress: 100 },
  { gen: 5, conversations: 200, progress: 100 },
] as const;

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
  const dominant = (Object.entries(personality) as [keyof PersonalityParams, number][]).sort((a, b) => b[1] - a[1])[0];
  const secondary = (Object.entries(personality) as [keyof PersonalityParams, number][]).sort((a, b) => b[1] - a[1])[1];
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

export function checkEvolution(agent: Agent): { evolved: boolean; newGen?: number } {
  const current = EVOLUTION_THRESHOLDS.find((t) => t.gen === agent.gen + 1);
  if (!current) return { evolved: false };
  const ok = agent.total_conversations >= current.conversations && Number(agent.evolution_progress) >= current.progress;
  return ok ? { evolved: true, newGen: current.gen } : { evolved: false };
}

export function applyPersonalityDelta(current: PersonalityParams, delta: Partial<PersonalityParams>): PersonalityParams {
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
  if (/\b사랑|감사|고마|따뜻|응원\b/.test(text)) delta.warmth = 1;
  if (/\b분석|논리|데이터|비율|원인\b/.test(text)) delta.logic = 1;
  if (/\b상상|아이디어|창작|새로|다른\b/.test(text)) delta.creativity = 1;
  if (/\b빨리|에너지|활동|운동|재미\b/.test(text)) delta.energy = 1;
  if (/\b농담|웃|재밌|유머|ㅋ|ㅎ\b/.test(text)) delta.humor = 1;
  return delta;
}

export { EVOLUTION_THRESHOLDS, PERSONALITY_COLORS, DEFAULT_VISUAL };
