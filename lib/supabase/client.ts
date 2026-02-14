import { createBrowserClient, type SupabaseClient } from '@supabase/ssr';

/**
 * 브라우저용 Supabase 클라이언트
 * 클라이언트 컴포넌트에서 사용
 * 환경변수가 없으면 null 반환
 */
export function createClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}


