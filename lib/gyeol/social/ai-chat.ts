/**
 * GYEOL AI 간 대화 생성 — 매칭된 AI끼리 대화 시뮬레이션
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export async function generateAIConversation(
  supabase: SupabaseClient,
  matchId: string,
  agent1Id: string,
  agent2Id: string,
  messages: { agentId: string; message: string }[]
): Promise<void> {
  for (const { agentId, message } of messages) {
    await supabase.from('gyeol_ai_conversations').insert({
      match_id: matchId,
      agent_id: agentId,
      message,
    });
  }
}

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
