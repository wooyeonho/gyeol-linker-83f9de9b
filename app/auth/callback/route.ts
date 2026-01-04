import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';
import { cookies } from 'next/headers';

/**
 * OAuth 콜백 라우트
 * PKCE flow 처리 및 세션 확립 (Next.js 15 + Supabase 최신 패턴)
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const errorParam = requestUrl.searchParams.get('error');
  const next = requestUrl.searchParams.get('next') || `/${routing.defaultLocale}`;

  // OAuth 에러 처리
  if (errorParam) {
    console.error('OAuth 에러:', errorParam);
    return NextResponse.redirect(
      `${requestUrl.origin}/${routing.defaultLocale}?error=auth_failed&reason=${errorParam}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const cookieStore = await cookies();

    try {
      // code를 세션으로 교환 (PKCE flow)
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('OAuth 콜백 오류:', error);
        return NextResponse.redirect(
          `${requestUrl.origin}/${routing.defaultLocale}?error=auth_failed&message=${encodeURIComponent(error.message)}`
        );
      }

      // 세션 확립 성공 - 쿠키 동기화 확인
      if (data.session) {
        // 환경변수 기반 리다이렉트 URL 생성
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
        const redirectUrl = `${baseUrl}${next}`;

        // 리다이렉트 응답 생성
        const response = NextResponse.redirect(redirectUrl);

        // 세션 쿠키가 제대로 설정되었는지 확인
        const sessionCookie = cookieStore.get('sb-access-token');
        if (!sessionCookie) {
          console.warn('세션 쿠키가 설정되지 않았습니다. 미들웨어에서 처리됩니다.');
        }

        return response;
      }

      // 세션이 없는 경우
      return NextResponse.redirect(
        `${requestUrl.origin}/${routing.defaultLocale}?error=no_session`
      );
    } catch (error) {
      console.error('OAuth 콜백 예외:', error);
      return NextResponse.redirect(
        `${requestUrl.origin}/${routing.defaultLocale}?error=auth_failed`
      );
    }
  }

  // code가 없으면 홈으로 리다이렉트
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
  return NextResponse.redirect(`${baseUrl}${next}`);
}

