'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Google OAuth 로그인 시작
 * PKCE flow 사용
 */
export async function signInWithGoogle() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
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


