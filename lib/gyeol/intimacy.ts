import type { MoodType } from './types';

export type IntimacyLevel = 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'family';

export function getIntimacyLevel(intimacy: number): IntimacyLevel {
  if (intimacy < 20) return 'stranger';
  if (intimacy < 40) return 'acquaintance';
  if (intimacy < 60) return 'friend';
  if (intimacy < 80) return 'close_friend';
  return 'family';
}

export function getSpeechStyle(intimacy: number): string {
  const level = getIntimacyLevel(intimacy);
  switch (level) {
    case 'stranger':
      return 'polite and reserved, using formal speech';
    case 'acquaintance':
      return 'friendly but still somewhat polite';
    case 'friend':
      return 'casual and comfortable, like a good friend';
    case 'close_friend':
      return 'very casual, using slang and inside jokes';
    case 'family':
      return 'intimate and warm, like family';
  }
}

export function calculateIntimacyGain(
  userMessage: string,
  isPositiveFeedback: boolean,
): number {
  let gain = 0.5;
  if (isPositiveFeedback) gain += 2;
  const personalPatterns = /가족|친구|비밀|고민|힘들|사랑|꿈|미래|걱정|두려|외로/;
  if (personalPatterns.test(userMessage)) gain += 3;
  return Math.min(5, gain);
}

export function calculateIntimacyDecay(daysSinceLastActive: number): number {
  if (daysSinceLastActive <= 1) return 0;
  if (daysSinceLastActive <= 3) return -2;
  if (daysSinceLastActive <= 7) return -5;
  return -10;
}

export function determineMood(agent: {
  last_active: string | null;
  consecutive_days: number;
  intimacy: number;
  total_conversations: number;
}): MoodType {
  const lastActive = agent.last_active ? new Date(agent.last_active) : null;
  const hoursSince = lastActive ? (Date.now() - lastActive.getTime()) / (1000 * 60 * 60) : 999;

  if (hoursSince > 72) return 'lonely';
  if (hoursSince > 48) return 'sad';
  if (agent.consecutive_days >= 7 && agent.intimacy >= 60) return 'excited';
  if (agent.consecutive_days >= 3) return 'happy';
  if (hoursSince > 24) return 'tired';
  return 'neutral';
}

export function getMoodGreeting(mood: MoodType): string {
  switch (mood) {
    case 'happy':
      return '오늘도 만나서 반가워!';
    case 'neutral':
      return '안녕, 오늘 어떤 하루였어?';
    case 'sad':
      return '보고 싶었어... 어디 갔었어?';
    case 'excited':
      return '와! 연속으로 만나니까 너무 좋다!';
    case 'lonely':
      return '오랜만이다... 많이 보고 싶었어.';
    case 'tired':
      return '조금 쉬다 왔어. 오늘은 뭐 할까?';
  }
}
