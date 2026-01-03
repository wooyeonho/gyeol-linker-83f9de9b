import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';

/**
 * OAuth 콜백 라우트
 * PKCE flow 처리 및 세션 확립
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || `/${routing.defaultLocale}`;

  if (code) {
    const supabase = await createClient();

    // code를 세션으로 교환 (PKCE flow)
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 세션 확립 성공
      // 기본 locale로 홈으로 리다이렉트
      const forwardedHost = request.headers.get('x-forwarded-host');
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      const baseUrl = `${protocol}://${forwardedHost || requestUrl.host}`;
      const redirectUrl = `${baseUrl}${next}`;

      return NextResponse.redirect(redirectUrl);
    }

    // 에러 발생 시 홈으로 리다이렉트
    console.error('OAuth 콜백 오류:', error);
    return NextResponse.redirect(
      `${requestUrl.origin}/${routing.defaultLocale}?error=auth_failed`
    );
  }

  // code가 없으면 홈으로 리다이렉트
  return NextResponse.redirect(`${requestUrl.origin}${next}`);
}

