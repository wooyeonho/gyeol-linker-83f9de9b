/**
 * GYEOL 서버용 Supabase (API 라우트에서 사용)
 * 서비스 롤 키가 있으면 사용, 없으면 anon (RLS 적용)
 * 환경변수가 없으면 null 반환 → API 라우트에서 폴백 처리
 */

import { createClient as createServerClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

export function createGyeolServerClient(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (serviceKey) {
    return createServerClient(url, serviceKey);
  }
  return createServerClient(url, anonKey);
}
