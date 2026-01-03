import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: any }) =>
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

