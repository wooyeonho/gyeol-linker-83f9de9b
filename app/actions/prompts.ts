'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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
      // ai_model, category_ko, category_en은 NULL로 저장
      ai_model: null,
      category_ko: null,
      category_en: null,
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


