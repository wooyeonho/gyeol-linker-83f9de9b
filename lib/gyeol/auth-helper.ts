import { NextRequest } from 'next/server';
import { createGyeolServerClient } from './supabase-server';

export function getUserIdFromToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const payload = JSON.parse(atob(auth.replace('Bearer ', '').split('.')[1]));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function getAgentForUser(agentId: string, userId: string) {
  const supabase = createGyeolServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from('gyeol_agents')
    .select('*')
    .eq('id', agentId)
    .single();
  if (!data || data.user_id !== userId) return null;
  return data;
}

export async function getAgentIdForUser(userId: string): Promise<string | null> {
  const supabase = createGyeolServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from('gyeol_agents')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}
