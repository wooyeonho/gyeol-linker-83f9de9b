import type { SupabaseClient } from '@supabase/supabase-js';

export async function getAIConversation(
  supabase: SupabaseClient,
  matchId: string
): Promise<{ agent_id: string; message: string; created_at: string }[]> {
  const { data } = await supabase
    .from('gyeol_ai_conversations')
    .select('agent_id, message, created_at')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });
  return data ?? [];
}
