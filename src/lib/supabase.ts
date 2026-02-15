/**
 * Safe Supabase client wrapper — handles missing env vars gracefully
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : '') || 'https://ambadtjrwwaaobrbzjar.supabase.co';
const SUPABASE_KEY = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : '') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtYmFkdGpyd3dhYW9icmJ6amFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNjYwMjMsImV4cCI6MjA4NjY0MjAyM30.iVbn5zt5rWe2UdEsGd11dTX1JxjyWPKt_iPHoWdfhmQ';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const supabaseUrl = SUPABASE_URL;
export const supabaseKey = SUPABASE_KEY;
