'use server';

import { createClient } from '@/lib/supabase/server';
import { PromptCardData } from '@/components/PromptCard';

/**
 * 가중치 상수
 */
const WEIGHTS = {
  TAG_MATCH: 10,           // 공통 태그 1개당 10점
  CATEGORY_MATCH: 5,       // 카테고리 일치 5점
  RATING: 2,               // 평점 1점당 2점
  SALES: 0.1,              // 판매량 1개당 0.1점
  VIEWS: 0.01,            // 조회수 1개당 0.01점
};

/**
 * 점수 계산된 프롬프트 타입
 */
interface ScoredPrompt {
  prompt: PromptCardData;
  score: number;
}

/**
 * 사용자가 구매한 프롬프트 조회
 */
async function getPurchasedPrompts(userId: string) {
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from('orders')
    .select(
      `
      prompt_id,
      prompt:prompts!orders_prompt_id_fkey(
        id,
        tags,
        category_ko,
        category_en
      )
    `
    )
    .eq('buyer_id', userId)
    .eq('status', 'completed');

  if (error || !orders) {
    return [];
  }

  return orders
    .map((order: any) => order.prompt)
    .filter((prompt: any) => prompt !== null);
}

/**
 * 태그 빈도 계산
 */
function calculateTagFrequency(prompts: any[]): Record<string, number> {
  const frequency: Record<string, number> = {};

  prompts.forEach((prompt) => {
    const tags = prompt.tags || [];
    tags.forEach((tag: string) => {
      frequency[tag] = (frequency[tag] || 0) + 1;
    });
  });

  return frequency;
}

/**
 * 공통 태그 개수 계산
 */
function countCommonTags(tags1: string[], tags2: string[]): number {
  const set1 = new Set(tags1);
  return tags2.filter((tag) => set1.has(tag)).length;
}

/**
 * 프롬프트 점수 계산
 */
function calculateScore(
  prompt: any,
  commonTags: number,
  categoryMatch: boolean,
  locale: string
): number {
  const categoryMatchScore = categoryMatch ? WEIGHTS.CATEGORY_MATCH : 0;
  const rating = prompt.average_rating || 0;
  const purchaseCount = prompt.purchase_count || 0;
  const viewCount = prompt.view_count || 0;

  return (
    commonTags * WEIGHTS.TAG_MATCH +
    categoryMatchScore +
    rating * WEIGHTS.RATING +
    purchaseCount * WEIGHTS.SALES +
    viewCount * WEIGHTS.VIEWS
  );
}

/**
 * 인기 프롬프트 조회 (판매량 순)
 */
async function getPopularPrompts(
  locale: string,
  limit: number,
  excludeIds: string[] = []
): Promise<PromptCardData[]> {
  const supabase = await createClient();

  let query = supabase
    .from('prompts')
    .select('*')
    .eq('status', 'approved')
    .is('deleted_at', null)
    .order('purchase_count', { ascending: false })
    .limit(limit + excludeIds.length); // 제외할 개수만큼 더 가져옴

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  // 제외할 ID 필터링
  const filtered = data.filter((p: any) => !excludeIds.includes(p.id));

  // limit만큼만 반환
  return filtered.slice(0, limit).map((prompt: any) => {
    const title = locale === 'ko' ? prompt.title_ko : prompt.title_en;
    const description =
      locale === 'ko' ? prompt.description_ko : prompt.description_en;

    return {
      id: prompt.id,
      slug: prompt.slug,
      title,
      description,
      thumbnail: prompt.thumbnail_url || '',
      tags: prompt.tags || [],
      aiModel: prompt.ai_model,
      rating: prompt.average_rating || 0,
      price: parseFloat(prompt.price),
      viewCount: prompt.view_count,
      purchaseCount: prompt.purchase_count,
      createdAt: prompt.created_at,
    };
  });
}

/**
 * 사용자 맞춤형 추천 프롬프트 조회
 */
export async function getRecommendedPrompts(
  userId: string | null,
  locale: string,
  limit: number = 8
): Promise<PromptCardData[]> {
  const supabase = await createClient();

  // 비로그인 사용자는 인기 프롬프트 반환
  if (!userId) {
    return getPopularPrompts(locale, limit);
  }

  // 1. 사용자 구매 이력 조회
  const purchasedPrompts = await getPurchasedPrompts(userId);

  // 구매 이력이 없으면 인기 프롬프트 반환
  if (purchasedPrompts.length === 0) {
    return getPopularPrompts(locale, limit);
  }

  // 2. 구매한 프롬프트 ID 목록
  const purchasedPromptIds = new Set(
    purchasedPrompts.map((p: any) => p.id).filter((id: any) => id)
  );

  // 3. 태그 빈도 계산
  const tagFrequency = calculateTagFrequency(purchasedPrompts);
  const tags = Object.keys(tagFrequency);

  // 태그가 없으면 인기 프롬프트 반환
  if (tags.length === 0) {
    return getPopularPrompts(locale, limit, Array.from(purchasedPromptIds));
  }

  // 4. 태그 기반 후보 프롬프트 검색
  // GIN 인덱스를 활용하여 태그가 하나라도 일치하는 프롬프트 검색
  let query = supabase
    .from('prompts')
    .select('*')
    .eq('status', 'approved')
    .is('deleted_at', null)
    .limit(200); // 성능을 위해 후보를 제한

  // 태그가 하나라도 겹치는 프롬프트 검색 (GIN 인덱스 활용)
  if (tags.length > 0) {
    query = query.overlaps('tags', tags);
  }

  const { data: candidates, error } = await query;

  if (error || !candidates) {
    return getPopularPrompts(locale, limit, Array.from(purchasedPromptIds));
  }

  // 5. 구매한 프롬프트 제외 필터링
  const filteredCandidates = candidates.filter(
    (prompt: any) => !purchasedPromptIds.has(prompt.id)
  );

  // 6. 점수 계산
  const scored: ScoredPrompt[] = filteredCandidates
    .map((prompt: any) => {
      const promptTags = prompt.tags || [];
      const commonTags = countCommonTags(promptTags, tags);

      // 공통 태그가 없으면 점수가 낮지만, 다른 요소로 점수 계산
      const categoryMatch = false; // 사용자 선호 카테고리는 추후 확장 가능

      const score = calculateScore(
        prompt,
        commonTags,
        categoryMatch,
        locale
      );

      return {
        prompt: {
          id: prompt.id,
          slug: prompt.slug,
          title: locale === 'ko' ? prompt.title_ko : prompt.title_en,
          description:
            locale === 'ko' ? prompt.description_ko : prompt.description_en,
          thumbnail: prompt.thumbnail_url || '',
          tags: promptTags,
          aiModel: prompt.ai_model,
          rating: prompt.average_rating || 0,
          price: parseFloat(prompt.price),
          viewCount: prompt.view_count,
          purchaseCount: prompt.purchase_count,
          createdAt: prompt.created_at,
        },
        score,
      };
    })
    .filter((item) => item.score > 0); // 점수가 0보다 큰 것만

  // 7. 정렬 및 limit 적용
  const recommended = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.prompt);

  // 8. 폴백: 부족한 경우 인기 프롬프트로 보완
  if (recommended.length < limit) {
    const excludeIds = [
      ...Array.from(purchasedPromptIds),
      ...recommended.map((p) => p.id),
    ];
    const popularPrompts = await getPopularPrompts(
      locale,
      limit - recommended.length,
      excludeIds
    );
    return [...recommended, ...popularPrompts];
  }

  return recommended;
}

/**
 * 연관 프롬프트 조회
 */
export async function getRelatedPrompts(
  promptId: string,
  locale: string,
  limit: number = 4
): Promise<PromptCardData[]> {
  const supabase = await createClient();

  // 1. 현재 프롬프트 정보 조회
  const { data: currentPrompt, error: promptError } = await supabase
    .from('prompts')
    .select('*')
    .eq('id', promptId)
    .single();

  if (promptError || !currentPrompt) {
    return getPopularPrompts(locale, limit, [promptId]);
  }

  const currentTags = currentPrompt.tags || [];
  const currentCategory =
    locale === 'ko' ? currentPrompt.category_ko : currentPrompt.category_en;

  // 태그가 없으면 인기 프롬프트 반환
  if (currentTags.length === 0) {
    return getPopularPrompts(locale, limit, [promptId]);
  }

  // 2. 공통 태그 및 카테고리 기반 검색 (본인 제외)
  let query = supabase
    .from('prompts')
    .select('*')
    .eq('status', 'approved')
    .is('deleted_at', null)
    .neq('id', promptId)
    .limit(200); // 성능을 위해 후보를 제한

  // 태그가 하나라도 겹치는 프롬프트 검색 (GIN 인덱스 활용)
  if (currentTags.length > 0) {
    query = query.overlaps('tags', currentTags);
  }

  const { data: candidates, error } = await query;

  if (error || !candidates) {
    return getPopularPrompts(locale, limit, [promptId]);
  }

  // 3. 점수 계산
  const scored: ScoredPrompt[] = candidates
    .map((prompt: any) => {
      const promptTags = prompt.tags || [];
      const commonTags = countCommonTags(promptTags, currentTags);

      const promptCategory =
        locale === 'ko' ? prompt.category_ko : prompt.category_en;
      const categoryMatch = promptCategory === currentCategory;

      const score = calculateScore(
        prompt,
        commonTags,
        categoryMatch,
        locale
      );

      return {
        prompt: {
          id: prompt.id,
          slug: prompt.slug,
          title: locale === 'ko' ? prompt.title_ko : prompt.title_en,
          description:
            locale === 'ko' ? prompt.description_ko : prompt.description_en,
          thumbnail: prompt.thumbnail_url || '',
          tags: promptTags,
          aiModel: prompt.ai_model,
          rating: prompt.average_rating || 0,
          price: parseFloat(prompt.price),
          viewCount: prompt.view_count,
          purchaseCount: prompt.purchase_count,
          createdAt: prompt.created_at,
        },
        score,
      };
    })
    .filter((item) => item.score > 0); // 점수가 0보다 큰 것만

  // 4. 정렬 및 limit 적용
  const related = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.prompt);

  // 5. 폴백: 부족한 경우 인기 프롬프트로 보완
  if (related.length < limit) {
    const excludeIds = [promptId, ...related.map((p) => p.id)];
    const popularPrompts = await getPopularPrompts(
      locale,
      limit - related.length,
      excludeIds
    );
    return [...related, ...popularPrompts];
  }

  return related;
}

