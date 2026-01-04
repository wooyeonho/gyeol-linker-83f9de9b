import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
 * 서버용 Supabase 클라이언트
 * Server Components와 Server Actions에서 사용
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          type CookieItem = { name: string; value: string; options?: CookieOptions };
          try {
            cookiesToSet.forEach(({ name, value, options }: CookieItem) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 쿠키 설정 실패 시 무시 (미들웨어에서 처리)
          }
        },
      },
    }
  );
}

