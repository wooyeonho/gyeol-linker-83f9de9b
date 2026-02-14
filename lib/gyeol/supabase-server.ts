/**
 * GYEOL 서버용 Supabase (API 라우트에서 사용)
 * 서비스 롤 키가 있으면 사용, 없으면 anon (RLS 적용)
 */

import { createClient as createServerClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

export function createGyeolServerClient() {
  if (serviceKey) {
    return createServerClient(url, serviceKey);
  }
  return createServerClient(url, anonKey);
}

export async function createGyeolServerClientWithCookies() {
  const { createServerClient: createSSRClient } = await import('@supabase/ssr');
  const cookieStore = await cookies();
  return createSSRClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: object }>) {
        try {
          cookiesToSet.forEach((c) => cookieStore.set(c.name, c.value, c.options));
        } catch {
          // ignore
        }
      },
    },
  });
}
