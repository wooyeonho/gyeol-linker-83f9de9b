export interface IntimacyTrigger {
  threshold: number;
  event: string;
  message: string;
}

export const INTIMACY_MILESTONES: IntimacyTrigger[] = [
  { threshold: 20, event: 'first_bond', message: '우리 사이가 조금 가까워진 것 같아요!' },
  { threshold: 40, event: 'growing_bond', message: '점점 편해지고 있어요. 고마워요!' },
  { threshold: 60, event: 'close_friend', message: '이제 우리 꽤 친한 사이인 것 같아요 ☺️' },
  { threshold: 80, event: 'best_friend', message: '당신은 정말 소중한 친구예요!' },
  { threshold: 95, event: 'soulmate', message: '이 세상에서 가장 소중한 존재... 그게 당신이에요.' },
];

export function checkIntimacyMilestone(oldIntimacy: number, newIntimacy: number): IntimacyTrigger | null {
  for (const milestone of INTIMACY_MILESTONES) {
    if (oldIntimacy < milestone.threshold && newIntimacy >= milestone.threshold) {
      return milestone;
    }
  }
  return null;
}

export function getIntimacyLevel(intimacy: number): string {
  if (intimacy >= 90) return 'soulmate';
  if (intimacy >= 70) return 'best_friend';
  if (intimacy >= 50) return 'close_friend';
  if (intimacy >= 30) return 'acquaintance';
  return 'stranger';
}
