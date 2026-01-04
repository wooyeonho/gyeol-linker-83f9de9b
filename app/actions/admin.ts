'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { checkAdminAccess } from '@/lib/utils/auth';

/**
 * 사용자 역할 변경
 */
export async function changeUserRole(
  userId: string,
  newRole: 'user' | 'seller' | 'admin'
) {
  // 관리자 권한 확인
  const { authorized, error } = await checkAdminAccess();
  if (!authorized) {
    return { error: error || '관리자 권한이 필요합니다.' };
  }

  const supabase = await createClient();

  // 3. 역할 변경
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId);

  if (updateError) {
    console.error('역할 변경 오류:', updateError);
    return { error: '역할 변경에 실패했습니다.' };
  }

  // 4. 페이지 캐시 무효화
  revalidatePath('/admin/users', 'page');

  return { success: true };
}

/**
 * 출금 요청 완료 처리 (관리자 전용)
 */
export async function completePayout(payoutId: string) {
  // 관리자 권한 확인
  const { authorized, error } = await checkAdminAccess();
  if (!authorized) {
    return { error: error || '관리자 권한이 필요합니다.' };
  }

  const supabase = await createClient();

  // 4. 출금 요청 조회 및 검증
  const { data: payout, error: fetchError } = await supabase
    .from('payouts')
    .select('id, status, seller_id, amount')
    .eq('id', payoutId)
    .single();

  if (fetchError || !payout) {
    return { error: '출금 요청을 찾을 수 없습니다.' };
  }

  if (payout.status !== 'pending') {
    return { error: `이미 처리된 출금 요청입니다. (현재 상태: ${payout.status})` };
  }

  // 5. 출금 상태 업데이트 (pending -> completed)
  const { error: updateError } = await supabase
    .from('payouts')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', payoutId)
    .eq('status', 'pending'); // 안전장치: pending 상태만 완료 가능

  if (updateError) {
    console.error('출금 완료 오류:', updateError);
    return { error: '출금 처리에 실패했습니다.' };
  }

  // 6. 페이지 캐시 무효화
  revalidatePath('/admin/payouts', 'page');
  revalidatePath('/seller/payout', 'page');

  return { success: true };
}
