'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/app/actions/notifications';

/**
 * 관리자 이메일 (환경 변수로 설정 가능)
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

  // 2. ADMIN_EMAIL 환경변수 확인
  if (!process.env.ADMIN_EMAIL) {
    console.error('ADMIN_EMAIL 환경변수가 설정되지 않았습니다.');
    return { authorized: false, error: '관리자 설정이 올바르지 않습니다.' };
  }

  // 3. 이메일 기반 접근 제어 (엄격한 검증)
  if (!user.email || user.email.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase().trim()) {
    console.warn(`관리자 액션 접근 시도: ${user.email} (허용된 이메일: ${ADMIN_EMAIL})`);
    return { authorized: false, error: '관리자 권한이 없습니다.' };
  }

  // 4. role='admin' 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    console.warn(`관리자 액션 접근 시도: ${user.email} (role: ${profile?.role || 'none'})`);
    return { authorized: false, error: '관리자 권한이 필요합니다.' };
  }

  // 5. 이중 검증: 프로필의 이메일도 확인
  if (profile.email && profile.email.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase().trim()) {
    console.warn(`프로필 이메일 불일치: ${profile.email} (허용된 이메일: ${ADMIN_EMAIL})`);
    return { authorized: false, error: '관리자 권한이 없습니다.' };
  }

  return { authorized: true };
}

/**
 * 대기 중인 프롬프트 조회
 */
export async function getPendingPrompts() {
  // 관리자 권한 확인
  const { authorized, error } = await checkAdminAccess();
  if (!authorized) {
    return { error: error || '권한이 없습니다.', prompts: [] };
  }

  const supabase = await createClient();

  // 대기 중인 프롬프트 조회 (판매자 정보 포함)
  const { data: prompts, error: fetchError } = await supabase
    .from('prompts')
    .select(
      `
      id,
      slug,
      title_ko,
      title_en,
      description_ko,
      description_en,
      price,
      thumbnail_url,
      status,
      created_at,
      seller:profiles!prompts_seller_id_fkey(id, name, email)
    `
    )
    .eq('status', 'pending')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('대기 중인 프롬프트 조회 오류:', fetchError);
    return { error: '프롬프트 조회에 실패했습니다.', prompts: [] };
  }

  return { prompts: prompts || [] };
}

/**
 * 프롬프트 승인
 */
export async function approvePrompt(promptId: string) {
  // 관리자 권한 확인
  const { authorized, error } = await checkAdminAccess();
  if (!authorized) {
    return { error: error || '권한이 없습니다.' };
  }

  const supabase = await createClient();

  // 최대 3회 재시도 로직
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      // 1. 프롬프트 조회 및 검증
      const { data: prompt, error: fetchError } = await supabase
        .from('prompts')
        .select('id, status, seller_id, title_ko, title_en')
        .eq('id', promptId)
        .single();

      if (fetchError || !prompt) {
        return { error: '프롬프트를 찾을 수 없습니다.' };
      }

      if (prompt.status !== 'pending') {
        return { error: `이미 처리된 프롬프트입니다. (현재 상태: ${prompt.status})` };
      }

      // 2. 상태 업데이트 (pending -> approved)
      const { error: updateError } = await supabase
        .from('prompts')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', promptId)
        .eq('status', 'pending'); // 안전장치: pending 상태만 승인 가능

      if (updateError) {
        retryCount++;
        if (retryCount >= maxRetries) {
          console.error('프롬프트 승인 오류 (최대 재시도 초과):', updateError);
          return { error: '프롬프트 승인에 실패했습니다. 잠시 후 다시 시도해주세요.' };
        }
        // 재시도 전 대기 (지수 백오프)
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 100));
        continue;
      }

      // 3. 판매자에게 알림 발송
      try {
        await createNotification({
          userId: prompt.seller_id,
          type: 'prompt_approved',
          title: '프롬프트가 승인되었습니다',
          content: `"${prompt.title_ko || prompt.title_en}" 프롬프트가 승인되었습니다.`,
          linkUrl: `/seller/dashboard`,
        });
      } catch (notificationError) {
        // 알림 실패는 치명적이지 않으므로 로그만 남김
        console.warn('알림 발송 실패:', notificationError);
      }

      // 4. 페이지 캐시 무효화
      revalidatePath('/admin/prompts', 'page');
      revalidatePath('/seller/dashboard', 'page');
      revalidatePath('/prompts', 'page');

      return { success: true };
    } catch (error) {
      retryCount++;
      if (retryCount >= maxRetries) {
        console.error('프롬프트 승인 예외 (최대 재시도 초과):', error);
        return { error: '프롬프트 승인 중 오류가 발생했습니다.' };
      }
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 100));
    }
  }

  return { error: '프롬프트 승인에 실패했습니다.' };
}

/**
 * 프롬프트 반려
 */
export async function rejectPrompt(promptId: string, reason?: string) {
  // 관리자 권한 확인
  const { authorized, error } = await checkAdminAccess();
  if (!authorized) {
    return { error: error || '권한이 없습니다.' };
  }

  const supabase = await createClient();

  // 최대 3회 재시도 로직
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      // 1. 프롬프트 조회 및 검증
      const { data: prompt, error: fetchError } = await supabase
        .from('prompts')
        .select('id, status, seller_id, title_ko, title_en')
        .eq('id', promptId)
        .single();

      if (fetchError || !prompt) {
        return { error: '프롬프트를 찾을 수 없습니다.' };
      }

      if (prompt.status !== 'pending') {
        return { error: `이미 처리된 프롬프트입니다. (현재 상태: ${prompt.status})` };
      }

      // 2. 상태 업데이트 (pending -> rejected)
      const { error: updateError } = await supabase
        .from('prompts')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', promptId)
        .eq('status', 'pending'); // 안전장치: pending 상태만 반려 가능

      if (updateError) {
        retryCount++;
        if (retryCount >= maxRetries) {
          console.error('프롬프트 반려 오류 (최대 재시도 초과):', updateError);
          return { error: '프롬프트 반려에 실패했습니다. 잠시 후 다시 시도해주세요.' };
        }
        // 재시도 전 대기 (지수 백오프)
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 100));
        continue;
      }

      // 3. 판매자에게 알림 발송
      try {
        await createNotification({
          userId: prompt.seller_id,
          type: 'prompt_rejected',
          title: '프롬프트가 반려되었습니다',
          content: `"${prompt.title_ko || prompt.title_en}" 프롬프트가 반려되었습니다.${reason ? ` 사유: ${reason}` : ''}`,
          linkUrl: `/seller/dashboard`,
        });
      } catch (notificationError) {
        // 알림 실패는 치명적이지 않으므로 로그만 남김
        console.warn('알림 발송 실패:', notificationError);
      }

      // 4. 페이지 캐시 무효화
      revalidatePath('/admin/prompts', 'page');
      revalidatePath('/seller/dashboard', 'page');

      return { success: true };
    } catch (error) {
      retryCount++;
      if (retryCount >= maxRetries) {
        console.error('프롬프트 반려 예외 (최대 재시도 초과):', error);
        return { error: '프롬프트 반려 중 오류가 발생했습니다.' };
      }
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 100));
    }
  }

  return { error: '프롬프트 반려에 실패했습니다.' };
}

