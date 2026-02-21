import { createGyeolServerClient } from './supabase-server';
import { createHash } from 'crypto';

const CACHE_TTL_MS = 3600_000;

function hashQuery(query: string, type: string): string {
  return createHash('sha256').update(`${type}:${query.toLowerCase().trim()}`).digest('hex');
}

export async function getCachedSearch(query: string, type: 'web' | 'image'): Promise<unknown[] | null> {
  const supabase = createGyeolServerClient();
  if (!supabase) return null;
  const hash = hashQuery(query, type);
  const { data } = await supabase
    .from('gyeol_search_cache')
    .select('results')
    .eq('query_hash', hash)
    .eq('search_type', type)
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .maybeSingle();
  return data?.results ?? null;
}

export async function setCachedSearch(query: string, type: 'web' | 'image', results: unknown[]): Promise<void> {
  const supabase = createGyeolServerClient();
  if (!supabase) return;
  const hash = hashQuery(query, type);
  await supabase.from('gyeol_search_cache').upsert({
    query_hash: hash,
    search_type: type,
    results,
    expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
  }, { onConflict: 'query_hash,search_type' }).then(() => {});
}

export async function cleanExpiredCache(): Promise<number> {
  const supabase = createGyeolServerClient();
  if (!supabase) return 0;
  const { count } = await supabase
    .from('gyeol_search_cache')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('*', { count: 'exact', head: true });
  return count ?? 0;
}
