'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * 출금 신청 Server Action
 * RPC 함수를 사용하여 트랜잭션 처리
 */
export async function requestPayout(amount: number, payoutMethod: string) {
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

  // 3. 데이터 검증
  if (!amount || amount < 10) {
    return { error: '최소 출금 금액은 $10입니다.' };
  }

  if (!payoutMethod || payoutMethod.trim() === '') {
    return { error: '출금 방법을 입력해주세요.' };
  }

  // 4. RPC 함수 호출 (트랜잭션 처리)
  const { data: payoutId, error: rpcError } = await supabase.rpc(
    'request_payout',
    {
      p_seller_id: user.id,
      p_amount: amount,
      p_payout_method: payoutMethod.trim(),
    }
  );

  if (rpcError) {
    console.error('출금 신청 오류:', rpcError);
    // RPC 함수에서 반환된 에러 메시지 사용
    return { error: rpcError.message || '출금 신청에 실패했습니다.' };
  }

  if (!payoutId) {
    return { error: '출금 신청에 실패했습니다.' };
  }

  // 5. 페이지 캐시 무효화
  revalidatePath('/seller/payout', 'page');
  revalidatePath('/seller/dashboard', 'page');

  return { success: true, payoutId };
}


