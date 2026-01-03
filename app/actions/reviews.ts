'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/app/actions/notifications';

/**
 * 리뷰 Upsert Server Action
 * 기존 리뷰가 있으면 수정, 없으면 생성
 */
export async function upsertReview(
  orderId: string,
  rating: number,
  comment?: string
) {
  const supabase = await createClient();

  // 1. 사용자 인증 확인
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: '로그인이 필요합니다.' };
  }

  const userId = user.id;

  // 2. 주문 소유권 검증 (프롬프트 및 판매자 정보 포함)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      `
      id, 
      buyer_id, 
      prompt_id, 
      status,
      prompt:prompts!orders_prompt_id_fkey(
        seller_id,
        slug,
        title_ko,
        title_en
      )
    `
    )
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return { error: '주문을 찾을 수 없습니다.' };
  }

  // buyer_id 일치 확인
  if (order.buyer_id !== userId) {
    return { error: '권한이 없습니다.' };
  }

  // status가 completed인지 확인
  if (order.status !== 'completed') {
    return { error: '완료된 주문에만 리뷰를 작성할 수 있습니다.' };
  }

  // 3. 데이터 검증
  if (!rating || rating < 1 || rating > 5) {
    return { error: '평점은 1-5점 사이여야 합니다.' };
  }

  // 4. 기존 리뷰 확인
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('order_id', orderId)
    .single();

  // 5. Upsert 실행
  if (existingReview) {
    // 기존 리뷰 수정
    const { error: updateError } = await supabase
      .from('reviews')
      .update({
        rating,
        comment: comment || null,
      })
      .eq('id', existingReview.id);

    if (updateError) {
      console.error('리뷰 수정 오류:', updateError);
      return { error: '리뷰 수정에 실패했습니다.' };
    }
  } else {
    // 새 리뷰 생성
    const { error: insertError } = await supabase
      .from('reviews')
      .insert({
        prompt_id: order.prompt_id,
        user_id: userId,
        order_id: orderId,
        rating,
        comment: comment || null,
      });

    if (insertError) {
      console.error('리뷰 생성 오류:', insertError);
      return { error: '리뷰 작성에 실패했습니다.' };
    }

    // 6. 판매자에게 알림 발송 (새 리뷰 생성 시에만)
    if (order.prompt) {
      const prompt = order.prompt as any;
      const sellerId = prompt.seller_id;
      const promptSlug = prompt.slug;

      // 구매자 이름 조회
      const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single();

      const buyerName = buyerProfile?.name || '구매자';

      // 알림 생성
      await createNotification({
        userId: sellerId,
        type: 'review',
        title: '새 리뷰가 등록되었습니다',
        content: `${buyerName}님이 리뷰를 남겼습니다`,
        linkUrl: `/prompts/${promptSlug}`,
      });
    }
  }

  // 7. DB 트리거가 자동 실행됨:
  // - reviews_update_average_rating: 해당 프롬프트의 average_rating 재계산

  // 8. 페이지 캐시 무효화
  revalidatePath('/library', 'page');
  revalidatePath('/prompts/[slug]', 'page');
  revalidatePath('/', 'page'); // 메인 페이지 랭킹 갱신

  return { success: true };
}

