'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/app/actions/notifications';

/**
 * 관리자 이메일 (환경 변수로 설정 가능)
 * 프로덕션에서는 환경 변수 사용 권장
 */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';

/**
 * 관리자 권한 확인
 */
async function checkAdminAccess(): Promise<{ authorized: boolean; error?: string }> {
  const supabase = await createClient();

  // 1. 사용자 인증 확인
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { authorized: false, error: '로그인이 필요합니다.' };
  }

  // 2. 이메일 기반 접근 제어
  if (user.email !== ADMIN_EMAIL) {
    return { authorized: false, error: '관리자 권한이 없습니다.' };
  }

  // 3. role='admin' 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { authorized: false, error: '관리자 권한이 필요합니다.' };
  }

  return { authorized: true };
}

/**
 * 정산 완료 처리 Server Action
 */
export async function completePayout(payoutId: string) {
  // 1. 관리자 권한 확인
  const { authorized, error } = await checkAdminAccess();
  if (!authorized) {
    return { error: error || '권한이 없습니다.' };
  }

  const supabase = await createClient();

  // 2. 출금 요청 조회 및 검증
  const { data: payout, error: fetchError } = await supabase
    .from('payouts')
    .select('id, status, seller_id, amount, payout_method')
    .eq('id', payoutId)
    .single();

  if (fetchError || !payout) {
    return { error: '출금 요청을 찾을 수 없습니다.' };
  }

  if (payout.status !== 'pending') {
    return { error: '이미 처리된 출금 요청입니다.' };
  }

  // 3. 상태 업데이트 (pending -> completed)
  const { error: updateError } = await supabase
    .from('payouts')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', payoutId)
    .eq('status', 'pending'); // 안전장치: pending 상태만 완료 가능

  if (updateError) {
    console.error('정산 완료 처리 오류:', updateError);
    return { error: '정산 처리에 실패했습니다.' };
  }

  // 4. 판매자에게 알림 발송
  await createNotification({
    userId: payout.seller_id,
    type: 'payout',
    title: '정산이 완료되었습니다',
    content: `$${parseFloat(payout.amount).toFixed(2)} 출금이 완료되었습니다`,
    linkUrl: '/seller/payout',
  });

  // 5. 페이지 캐시 무효화
  revalidatePath('/admin/payouts', 'page');
  revalidatePath('/seller/payout', 'page');

  return { success: true };
}

