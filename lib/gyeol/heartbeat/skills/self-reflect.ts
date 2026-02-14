import type { SkillContext, SkillResult } from '../types';
import { callProvider } from '../../chat-ai';
import { applyPersonalityDelta, calculateVisualState } from '../../evolution-engine';
import type { PersonalityParams } from '../../types';

export async function runSelfReflect(ctx: SkillContext): Promise<SkillResult> {
  const { supabase, agentId, provider, apiKey } = ctx;
  if (!provider || !apiKey) {
    return { ok: false, skillId: 'self-reflect', summary: 'No AI provider available for reflection' };
  }

  const { data: conversations } = await supabase
    .from('gyeol_conversations')
    .select('role, content, created_at')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (!conversations || conversations.length < 4) {
    return { ok: true, skillId: 'self-reflect', summary: 'Not enough conversations to reflect on' };
  }

  const conversationText = conversations
    .reverse()
    .map((c) => `${c.role}: ${c.content}`)
    .join('\n')
    .slice(0, 2000);

  const systemPrompt = `You are GYEOL's self-reflection module. Analyze recent conversations and return ONLY a JSON object with personality adjustments. Each value should be between -3 and +3.
Format: {"warmth":0,"logic":0,"creativity":0,"energy":0,"humor":0,"insight":"one sentence reflection in Korean"}
Rules:
- Positive values if the trait was exercised/requested
- Negative values if the trait was underused
- 0 if no change needed
- insight should be a brief Korean sentence about what you learned`;

  const raw = await callProvider(
    provider as 'openai' | 'groq' | 'deepseek' | 'anthropic' | 'gemini',
    apiKey,
    systemPrompt,
    conversationText,
  );

  let delta: Partial<PersonalityParams> = {};
  let insight = '';
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      delta = {
        warmth: Math.max(-3, Math.min(3, Number(parsed.warmth) || 0)),
        logic: Math.max(-3, Math.min(3, Number(parsed.logic) || 0)),
        creativity: Math.max(-3, Math.min(3, Number(parsed.creativity) || 0)),
        energy: Math.max(-3, Math.min(3, Number(parsed.energy) || 0)),
        humor: Math.max(-3, Math.min(3, Number(parsed.humor) || 0)),
      };
      insight = typeof parsed.insight === 'string' ? parsed.insight : '';
    }
  } catch {
    return { ok: false, skillId: 'self-reflect', summary: 'Failed to parse reflection result' };
  }

  const { data: agent } = await supabase
    .from('gyeol_agents')
    .select('warmth, logic, creativity, energy, humor')
    .eq('id', agentId)
    .single();

  if (agent) {
    const current: PersonalityParams = {
      warmth: agent.warmth,
      logic: agent.logic,
      creativity: agent.creativity,
      energy: agent.energy,
      humor: agent.humor,
    };
    const next = applyPersonalityDelta(current, delta);
    const newVisualState = calculateVisualState(next);
    await supabase
      .from('gyeol_agents')
      .update({
        warmth: next.warmth,
        logic: next.logic,
        creativity: next.creativity,
        energy: next.energy,
        humor: next.humor,
        visual_state: newVisualState,
      })
      .eq('id', agentId);
  }

  const summary = insight || '자기 사색 완료';
  await supabase.from('gyeol_autonomous_logs').insert({
    agent_id: agentId,
    activity_type: 'reflection',
    summary,
    details: { delta, insight },
    was_sandboxed: true,
  });

  return { ok: true, skillId: 'self-reflect', summary, details: { delta } };
}
