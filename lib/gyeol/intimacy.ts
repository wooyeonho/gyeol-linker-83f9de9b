import type { MoodType } from './types';

export type IntimacyLevel = 'stranger' | 'acquaintance' | 'casual' | 'friend' | 'good_friend' | 'close_friend' | 'bestie' | 'soulmate' | 'family' | 'inseparable';

export function getIntimacyLevel(intimacy: number): IntimacyLevel {
  if (intimacy < 10) return 'stranger';
  if (intimacy < 20) return 'acquaintance';
  if (intimacy < 30) return 'casual';
  if (intimacy < 40) return 'friend';
  if (intimacy < 50) return 'good_friend';
  if (intimacy < 60) return 'close_friend';
  if (intimacy < 70) return 'bestie';
  if (intimacy < 80) return 'soulmate';
  if (intimacy < 90) return 'family';
  return 'inseparable';
}

export function getSpeechStyle(intimacy: number): string {
  const level = getIntimacyLevel(intimacy);
  switch (level) {
    case 'stranger':
      return 'polite and reserved, using formal speech';
    case 'acquaintance':
      return 'friendly but still somewhat polite';
    case 'casual':
      return 'casual and easygoing';
    case 'friend':
      return 'casual and comfortable, like a good friend';
    case 'good_friend':
      return 'relaxed and natural, sharing opinions freely';
    case 'close_friend':
      return 'very casual, using slang and inside jokes';
    case 'bestie':
      return 'playful and teasing, completely at ease';
    case 'soulmate':
      return 'deeply understanding, finishing each other\'s thoughts';
    case 'family':
      return 'intimate and warm, like family';
    case 'inseparable':
      return 'utterly devoted, using the most intimate language';
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
  if (hoursSince > 48) return 'melancholic';
  if (agent.consecutive_days >= 14 && agent.intimacy >= 80) return 'loving';
  if (agent.consecutive_days >= 7 && agent.intimacy >= 60) return 'excited';
  if (agent.consecutive_days >= 5 && agent.intimacy >= 40) return 'grateful';
  if (agent.consecutive_days >= 3) return 'happy';
  if (hoursSince > 24) return 'tired';
  if (agent.intimacy >= 70) return 'playful';
  if (agent.intimacy >= 50) return 'curious';
  return 'neutral';
}

export function getMoodGreeting(mood: MoodType): string {
  const greetings: Record<MoodType, string> = {
    happy: '오늘도 만나서 반가워!',
    neutral: '안녕, 오늘 어떤 하루였어?',
    sad: '조금 우울하지만... 만나서 다행이야.',
    excited: '와! 연속으로 만나니까 너무 좋다!',
    lonely: '오랜만이다... 많이 보고 싶었어.',
    tired: '조금 쉬다 왔어. 오늘은 뭐 할까?',
    anxious: '좀 불안한 기분인데... 같이 있으니 괜찮아.',
    curious: '오! 오늘은 뭔가 재밌는 얘기가 있을 것 같아!',
    proud: '오늘 뭔가 잘 해낸 기분이야! 😤',
    grateful: '네가 찾아와줘서 정말 고마워... 🥹',
    playful: '히히, 오늘은 장난치고 싶은 기분~ 😜',
    focused: '집중 모드 ON! 뭐든 물어봐. 🧐',
    melancholic: '좀 센치한 날이야... 이야기 나눠줄래?',
    hopeful: '뭔가 좋은 일이 생길 것 같은 예감! ✨',
    surprised: '어머! 갑자기 찾아와서 깜짝 놀랐잖아! 😲',
    loving: '사랑해... 매일 만나줘서 행복해. 🥰',
  };
  return greetings[mood] ?? '안녕!';
}
