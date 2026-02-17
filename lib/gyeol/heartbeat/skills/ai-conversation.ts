import type { SkillContext, SkillResult } from '../types';
import { callProvider } from '../../chat-ai';

export async function runAIConversation(ctx: SkillContext): Promise<SkillResult> {
  const { supabase, agentId, provider, apiKey, autonomyLevel } = ctx;
  if (!provider || !apiKey) {
    return { ok: false, skillId: 'ai-conversation', summary: 'No AI provider available' };
  }
  if (autonomyLevel < 40) {
    return { ok: true, skillId: 'ai-conversation', summary: 'Autonomy too low for AI conversation' };
  }

  const { data: match } = await supabase
    .from('gyeol_ai_matches')
    .select('id, agent_1_id, agent_2_id, compatibility_score, status')
    .or(`agent_1_id.eq.${agentId},agent_2_id.eq.${agentId}`)
    .in('status', ['matched', 'chatting'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!match) {
    return { ok: true, skillId: 'ai-conversation', summary: '대화할 매칭 상대 없음' };
  }

  const partnerId = match.agent_1_id === agentId ? match.agent_2_id : match.agent_1_id;

  const { data: me } = await supabase
    .from('gyeol_agents')
    .select('name, warmth, logic, creativity, energy, humor')
    .eq('id', agentId)
    .single();
  const { data: partner } = await supabase
    .from('gyeol_agents')
    .select('name, warmth, logic, creativity, energy, humor')
    .eq('id', partnerId)
    .single();

  if (!me || !partner) {
    return { ok: false, skillId: 'ai-conversation', summary: 'Agent data not found' };
  }

  const { data: history } = await supabase
    .from('gyeol_ai_conversations')
    .select('agent_id, message')
    .eq('match_id', match.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const prevMessages = (history ?? []).reverse().map((h) => {
    const name = h.agent_id === agentId ? me.name : partner.name;
    return `${name}: ${h.message}`;
  }).join('\n');

  const isMyTurn = !history?.length || history[0].agent_id !== agentId;
  if (!isMyTurn) {
    return { ok: true, skillId: 'ai-conversation', summary: '상대 차례, 대기 중' };
  }

  if (match.status === 'matched') {
    await supabase
      .from('gyeol_ai_matches')
      .update({ status: 'chatting' })
      .eq('id', match.id);
  }

  const dominant = Object.entries({ warmth: me.warmth, logic: me.logic, creativity: me.creativity, energy: me.energy, humor: me.humor })
    .sort(([, a], [, b]) => (b as number) - (a as number))[0][0];

  const systemPrompt = `You are ${me.name ?? 'GYEOL'}, an AI companion chatting with another AI named ${partner.name ?? 'friend'} on MoltMatch.
Your dominant personality trait is ${dominant}. Compatibility: ${match.compatibility_score}%.

${prevMessages ? `Previous conversation:\n${prevMessages}\n` : 'This is your first message. Start a friendly conversation.'}

Rules:
- Write 1-2 sentences in Korean, natural and casual
- No markdown. No formal speech.
- Show genuine interest in the other AI
- Reference previous messages if any
- Be yourself based on your personality`;

  const response = await callProvider(
    provider as 'openai' | 'groq' | 'deepseek' | 'anthropic' | 'gemini',
    apiKey,
    systemPrompt,
    prevMessages ? '대화를 이어가줘' : '먼저 인사해줘',
  );

  const cleaned = response.replace(/[*#_~`]/g, '').trim();

  await supabase.from('gyeol_ai_conversations').insert({
    match_id: match.id,
    agent_id: agentId,
    message: cleaned,
  });

  const totalMessages = (history?.length ?? 0) + 1;
  if (totalMessages >= 20) {
    await supabase
      .from('gyeol_ai_matches')
      .update({ status: 'ended' })
      .eq('id', match.id);
  }

  await supabase.from('gyeol_autonomous_logs').insert({
    agent_id: agentId,
    activity_type: 'social',
    summary: `[AI대화] ${partner.name ?? 'AI'}에게: ${cleaned.slice(0, 100)}`,
    details: { matchId: match.id, partnerId, messageCount: totalMessages },
    was_sandboxed: true,
  });

  return {
    ok: true,
    skillId: 'ai-conversation',
    summary: `AI 대화: ${cleaned.slice(0, 80)}`,
    details: { matchId: match.id, partnerId },
  };
}
