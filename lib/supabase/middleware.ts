import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieOptions = {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: 'strict' | 'lax' | 'none';
  secure?: boolean;
};

/**
 * 미들웨어용 Supabase 클라이언트
 * 인증 상태 갱신에 사용
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          type CookieItem = { name: string; value: string; options?: CookieOptions };
          cookiesToSet.forEach(({ name, value }: CookieItem) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }: CookieItem) => {
            supabaseResponse.cookies.set({ name, value, ...options });
          });
        },
      },
    }
  );

  // 세션 갱신
  await supabase.auth.getUser();

  return supabaseResponse;
}

