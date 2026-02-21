import type { PersonalityParams } from './types';

const STYLE_MAP: Record<string, { low: string; high: string }> = {
  warmth: { low: '논리적이고 객관적으로', high: '따뜻하고 공감하며' },
  logic: { low: '직관적이고 감성적으로', high: '분석적이고 체계적으로' },
  creativity: { low: '실용적이고 현실적으로', high: '창의적이고 독특하게' },
  energy: { low: '차분하고 조용하게', high: '활기차고 열정적으로' },
  humor: { low: '진지하고 정중하게', high: '유머러스하고 재치있게' },
};

export function buildPersonalityDirective(params: PersonalityParams): string {
  const lines: string[] = [];
  for (const [key, { low, high }] of Object.entries(STYLE_MAP)) {
    const val = params[key as keyof PersonalityParams] ?? 50;
    lines.push(val >= 60 ? high : val <= 40 ? low : '');
  }
  const traits = lines.filter(Boolean);
  if (traits.length === 0) return '';
  return `[성격 지침] ${traits.join(', ')} 말투로 대화하세요.`;
}

export function getIntimacyPrefix(intimacy: number): string {
  if (intimacy >= 90) return '[최고 친밀도] 오랜 친구처럼 편하게, 비밀도 공유하며 대화하세요.';
  if (intimacy >= 70) return '[높은 친밀도] 친한 친구처럼 반말 섞어가며 편하게 대화하세요.';
  if (intimacy >= 50) return '[보통 친밀도] 친근하지만 예의 있게 대화하세요.';
  if (intimacy >= 30) return '[낮은 친밀도] 정중하고 예의 바르게 대화하세요.';
  return '[첫 만남] 조심스럽고 정중하게 대화하세요.';
}
