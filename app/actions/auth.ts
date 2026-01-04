'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Google OAuth 로그인 시작
 * PKCE flow 사용
 */
export async function signInWithGoogle(redirectUrl?: string) {
  const supabase = await createClient();

  // 현재 도메인을 동적으로 참조
  // 환경변수를 최우선으로 사용하여 localhost 문제 완전 차단
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL 
    || (redirectUrl ? new URL(redirectUrl).origin : 'http://localhost:3000');
  
  // 절대 경로로 콜백 URL 생성 (Supabase 요구사항)
  const callbackUrl = `${baseUrl}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('Google 로그인 오류:', error);
    return { error: error.message };
  }

  // 리다이렉트 URL 반환
  if (data.url) {
    return { url: data.url };
  }

  return { error: '로그인 URL을 생성할 수 없습니다.' };
}

/**
 * 로그아웃
 */
export async function signOut() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('로그아웃 오류:', error);
    return { error: error.message };
  }

  // 페이지 캐시 무효화
  revalidatePath('/', 'layout');

  return { success: true };
}


