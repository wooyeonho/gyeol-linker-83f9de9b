import type { TasteVector } from './types';

export function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, magA = 0, magB = 0;
  for (const k of keys) {
    const va = a[k] ?? 0;
    const vb = b[k] ?? 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export function computeCompatibility(t1: TasteVector, t2: TasteVector): number {
  const interestScore = cosineSimilarity(t1.interests, t2.interests);
  const topicScore = cosineSimilarity(t1.topics, t2.topics);
  const styleScore = cosineSimilarity(t1.communication_style, t2.communication_style);
  return Math.round((interestScore * 0.4 + topicScore * 0.35 + styleScore * 0.25) * 100);
}
