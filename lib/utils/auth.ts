/**
 * 인증 관련 유틸리티
 */

import { createClient } from '@/lib/supabase/server';

/**
 * 관리자 권한 확인
 * @returns 관리자 여부 및 사용자 정보
 */
export async function checkAdminAccess(): Promise<{
  authorized: boolean;
  user: { id: string; email: string | null } | null;
  error?: string;
}> {
  const supabase = await createClient();
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

  // 1. 사용자 인증 확인
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { authorized: false, user: null, error: '로그인이 필요합니다.' };
  }

  // 2. ADMIN_EMAIL 환경변수 확인
  if (!ADMIN_EMAIL) {
    console.error('ADMIN_EMAIL 환경변수가 설정되지 않았습니다.');
    return {
      authorized: false,
      user: null,
      error: '관리자 설정이 올바르지 않습니다.',
    };
  }

  // 3. 이메일 기반 접근 제어
  if (!user.email || user.email.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase().trim()) {
    console.warn(`관리자 페이지 접근 시도: ${user.email} (허용된 이메일: ${ADMIN_EMAIL})`);
    return { authorized: false, user: null, error: '관리자 권한이 없습니다.' };
  }

  // 4. role='admin' 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    console.warn(`관리자 페이지 접근 시도: ${user.email} (role: ${profile?.role || 'none'})`);
    return { authorized: false, user: null, error: '관리자 권한이 필요합니다.' };
  }

  // 5. 이중 검증: 프로필의 이메일도 확인
  if (profile.email && profile.email.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase().trim()) {
    console.warn(`프로필 이메일 불일치: ${profile.email} (허용된 이메일: ${ADMIN_EMAIL})`);
    return { authorized: false, user: null, error: '관리자 권한이 없습니다.' };
  }

  return { authorized: true, user: { id: user.id, email: user.email } };
}

/**
 * 판매자 권한 확인
 * @param userId 사용자 ID
 * @returns 판매자 여부
 */
export async function checkSellerAccess(
  userId: string
): Promise<{ authorized: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (!profile) {
    return { authorized: false, error: '프로필을 찾을 수 없습니다.' };
  }

  if (profile.role !== 'seller' && profile.role !== 'admin') {
    return { authorized: false, error: '판매자 권한이 필요합니다.' };
  }

  return { authorized: true };
}




