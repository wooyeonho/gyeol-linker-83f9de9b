import createMiddleware from 'next-intl/middleware';
import { updateSession } from './lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

// next-intl 미들웨어 생성
// i18n/routing.ts의 설정 사용
const intlMiddleware = createMiddleware(routing);

/**
 * 메인 미들웨어
 * 언어 감지 및 Supabase 세션 갱신 처리
 */
export async function middleware(request: NextRequest) {
  // Supabase 세션 갱신
  const supabaseResponse = await updateSession(request);

  // next-intl 미들웨어 실행
  const response = intlMiddleware(request);

  // Supabase 쿠키를 응답에 포함
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    const { name, value } = cookie;
    response.cookies.set(name, value);
  });

  return response;
}

export const config = {
  // 제외할 경로 (정적 파일, API 등)
  matcher: [
    // 모든 경로 포함, 단 제외:
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};

