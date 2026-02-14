import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

export function createGyeolServerClient() {
  if (serviceKey) return createClient(url, serviceKey);
  return createClient(url, anonKey);
}
