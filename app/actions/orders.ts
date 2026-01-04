'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * 주문 생성 및 가상 결제 처리
 * @param promptId 프롬프트 ID
 * @param amount 결제 금액
 */
export async function createOrder(promptId: string, amount: number) {
  const supabase = await createClient();

  // 1. 사용자 인증 확인
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: '로그인이 필요합니다.' };
  }

  const buyerId = user.id;

  // 2. 중복 구매 체크
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('buyer_id', buyerId)
    .eq('prompt_id', promptId)
    .eq('status', 'completed')
    .single();

  if (existingOrder) {
    return { error: '이미 구매한 프롬프트입니다.' };
  }

  // 3. 수수료 및 판매자 수익 계산
  const commission = amount * 0.2; // 플랫폼 수수료 20%
  const sellerRevenue = amount * 0.8; // 판매자 수익 80%

  // 4. 주문 생성 (pending 상태)
  const { data: order, error: insertError } = await supabase
    .from('orders')
    .insert({
      buyer_id: buyerId,
      prompt_id: promptId,
      amount: amount,
      commission: commission,
      seller_revenue: sellerRevenue,
      status: 'pending',
    })
    .select()
    .single();

  if (insertError || !order) {
    console.error('주문 생성 오류:', insertError);
    return { error: '주문 생성에 실패했습니다.' };
  }

  // 5. 가상 결제 시뮬레이션: 상태를 completed로 업데이트
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'completed' })
    .eq('id', order.id);

  if (updateError) {
    console.error('주문 상태 업데이트 오류:', updateError);
    return { error: '결제 처리에 실패했습니다.' };
  }

  // 6. 트리거가 자동 실행됨:
  // - orders_update_seller_balance: 판매자 balance += sellerRevenue
  // - orders_increment_purchase_count: 프롬프트 purchase_count += 1

  // 7. 프롬프트 slug 조회 (리다이렉트용)
  const { data: prompt } = await supabase
    .from('prompts')
    .select('slug')
    .eq('id', promptId)
    .single();

  // 8. 페이지 캐시 무효화 (상세 페이지 갱신)
  revalidatePath('/prompts/[slug]', 'page');
  revalidatePath('/library', 'page');

  return { success: true, orderId: order.id, slug: prompt?.slug || null };
}


