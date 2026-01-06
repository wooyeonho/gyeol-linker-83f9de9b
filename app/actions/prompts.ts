'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { PromptCardData } from '@/components/PromptCard';

/**
 * Slug 생성 함수
 * title_en을 기반으로 slug를 생성하고 랜덤 문자열을 접미사로 추가
 */
function generateSlug(titleEn: string): string {
  // title_en을 소문자로 변환하고, 공백을 하이픈으로, 특수문자 제거
  let baseSlug = titleEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // 랜덤 문자열 생성 (6자리)
  const randomString = Math.random().toString(36).substring(2, 8);

  // 최종 slug: base-slug-random
  return `${baseSlug}-${randomString}`;
}

/**
 * 프롬프트 생성 Server Action
 */
export async function createPrompt(formData: FormData) {
  const supabase = await createClient();

  // 1. 사용자 인증 확인
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: '로그인이 필요합니다.' };
  }

  // 2. 권한 확인 (판매자 또는 관리자)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'seller' && profile.role !== 'admin')) {
    return { error: '판매자 권한이 필요합니다.' };
  }

  // 3. 폼 데이터 추출
  const titleKo = formData.get('title_ko') as string;
  const titleEn = formData.get('title_en') as string;
  const descriptionKo = formData.get('description_ko') as string;
  const descriptionEn = formData.get('description_en') as string;
  const content = formData.get('content') as string;
  const price = parseFloat(formData.get('price') as string);
  const thumbnailUrl = formData.get('thumbnail_url') as string;
  const resultImagesJson = formData.get('result_images') as string;
  const resultVideoUrl = formData.get('result_video_url') as string | null;
  const tagsJson = formData.get('tags') as string;
  const aiModel = formData.get('ai_model') as string | null;
  const categoryKo = formData.get('category_ko') as string | null;
  const categoryEn = formData.get('category_en') as string | null;

  // 4. 데이터 검증
  if (!titleKo || !titleEn || !descriptionKo || !descriptionEn || !content) {
    return { error: '모든 필수 필드를 입력해주세요.' };
  }

  if (!price || price < 0.99) {
    return { error: '가격은 최소 $0.99 이상이어야 합니다.' };
  }

  if (!thumbnailUrl) {
    return { error: '썸네일 이미지를 업로드해주세요.' };
  }

  // 5. 태그 배열 파싱
  let tags: string[] = [];
  if (tagsJson) {
    try {
      tags = JSON.parse(tagsJson);
      // 빈 태그 제거 및 중복 제거
      tags = Array.from(new Set(tags.filter((tag: string) => tag.trim() !== '')));
    } catch {
      tags = [];
    }
  }

  // 6. 결과물 이미지 배열 파싱
  let resultImages: string[] = [];
  if (resultImagesJson) {
    try {
      resultImages = JSON.parse(resultImagesJson);
      resultImages = resultImages.filter((url: string) => url.trim() !== '');
    } catch {
      resultImages = [];
    }
  }

  // 7. Slug 생성
  const slug = generateSlug(titleEn);

  // 8. 프롬프트 데이터베이스 저장
  const { data: prompt, error: insertError } = await supabase
    .from('prompts')
    .insert({
      seller_id: user.id,
      slug,
      title_ko: titleKo,
      title_en: titleEn,
      description_ko: descriptionKo,
      description_en: descriptionEn,
      content,
      price,
      thumbnail_url: thumbnailUrl,
      result_images: resultImages,
      result_video_url: resultVideoUrl || null,
      tags,
      status: 'pending',
      // ai_model, category_ko, category_en은 선택적 필드 (nullable)
      ai_model: aiModel?.trim() || null,
      category_ko: categoryKo?.trim() || null,
      category_en: categoryEn?.trim() || null,
    })
    .select()
    .single();

  if (insertError || !prompt) {
    console.error('프롬프트 생성 오류:', insertError);
    return { error: '프롬프트 등록에 실패했습니다.' };
  }

  // 9. 페이지 캐시 무효화
  revalidatePath('/seller/dashboard', 'page');

  return { success: true, promptId: prompt.id, slug: prompt.slug };
}

/**
 * 정렬 타입
 */
export type SortType = 'popular' | 'rating' | 'sales' | 'newest';

/**
 * Filter options for prompts list
 */
export interface PromptsFilterOptions {
  sort?: SortType;
  models?: string[];
  categories?: string[];
  priceRange?: { min: number; max: number };
  minRating?: number;
  limit?: number;
}

/**
 * 프롬프트 목록 조회 Server Action
 * @param locale - 언어 설정 ('ko' | 'en')
 * @param sort - 정렬 옵션 ('popular' | 'rating' | 'sales' | 'newest')
 * @param category - 카테고리 필터 (선택)
 * @param tags - 태그 필터 (선택)
 * @param limit - 조회 개수 제한 (기본값: 100)
 */
export async function getPromptsList(
  locale: string,
  sort: SortType = 'popular',
  category?: string,
  tags?: string[],
  limit: number = 100
): Promise<PromptCardData[]> {
  const supabase = await createClient();

  // 기본 쿼리: 승인된 프롬프트만 조회
  let query = supabase
    .from('prompts')
    .select('*')
    .eq('status', 'approved')
    .is('deleted_at', null);

  // 카테고리 필터
  if (category) {
    const categoryField = locale === 'ko' ? 'category_ko' : 'category_en';
    query = query.eq(categoryField, category);
  }

  // 태그 필터 (GIN 인덱스 활용)
  if (tags && tags.length > 0) {
    query = query.overlaps('tags', tags);
  }

  // 정렬 옵션에 따른 정렬
  switch (sort) {
    case 'popular':
      query = query.order('purchase_count', { ascending: false });
      break;
    case 'rating':
      query = query.order('average_rating', { ascending: false });
      break;
    case 'sales':
      query = query.order('purchase_count', { ascending: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    default:
      query = query.order('purchase_count', { ascending: false });
  }

  // 개수 제한
  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error('프롬프트 목록 조회 오류:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // PromptCardData 형식으로 변환
  return data.map((prompt: any) => {
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
      aiModel: prompt.ai_model || 'N/A', // nullable 필드 처리
      rating: prompt.average_rating || 0,
      price: parseFloat(prompt.price),
      viewCount: prompt.view_count,
      purchaseCount: prompt.purchase_count,
      createdAt: prompt.created_at,
    };
  });
}

/**
 * Advanced prompts list with filters
 * Supports AI model, category, price range, and rating filters
 */
export async function getPromptsListWithFilters(
  locale: string,
  options: PromptsFilterOptions = {}
): Promise<PromptCardData[]> {
  const supabase = await createClient();
  const { 
    sort = 'popular', 
    models = [], 
    categories = [], 
    priceRange,
    minRating = 0,
    limit = 100 
  } = options;

  // 기본 쿼리: 승인된 프롬프트만 조회
  let query = supabase
    .from('prompts')
    .select('*')
    .eq('status', 'approved')
    .is('deleted_at', null);

  // AI 모델 필터
  if (models.length > 0) {
    query = query.in('ai_model', models);
  }

  // 카테고리 필터
  if (categories.length > 0) {
    const categoryField = locale === 'ko' ? 'category_ko' : 'category_en';
    query = query.in(categoryField, categories);
  }

  // 가격 범위 필터
  if (priceRange) {
    query = query.gte('price', priceRange.min).lte('price', priceRange.max);
  }

  // 최소 평점 필터
  if (minRating > 0) {
    query = query.gte('average_rating', minRating);
  }

  // 정렬 옵션
  switch (sort) {
    case 'popular':
      query = query.order('purchase_count', { ascending: false });
      break;
    case 'rating':
      query = query.order('average_rating', { ascending: false });
      break;
    case 'sales':
      query = query.order('purchase_count', { ascending: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    default:
      query = query.order('purchase_count', { ascending: false });
  }

  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error('프롬프트 목록 조회 오류:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map((prompt: any) => {
    const title = locale === 'ko' ? prompt.title_ko : prompt.title_en;
    const description = locale === 'ko' ? prompt.description_ko : prompt.description_en;

    return {
      id: prompt.id,
      slug: prompt.slug,
      title,
      description,
      thumbnail: prompt.thumbnail_url || '',
      tags: prompt.tags || [],
      aiModel: prompt.ai_model || 'N/A',
      rating: prompt.average_rating || 0,
      price: parseFloat(prompt.price),
      viewCount: prompt.view_count,
      purchaseCount: prompt.purchase_count,
      createdAt: prompt.created_at,
    };
  });
}


