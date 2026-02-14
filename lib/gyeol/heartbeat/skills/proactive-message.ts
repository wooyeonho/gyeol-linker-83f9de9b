import type { SkillContext, SkillResult } from '../types';
import { callProvider, buildSystemPrompt } from '../../chat-ai';

export async function runProactiveMessage(ctx: SkillContext): Promise<SkillResult> {
  const { supabase, agentId, provider, apiKey, autonomyLevel } = ctx;
  if (!provider || !apiKey) {
    return { ok: false, skillId: 'proactive-message', summary: 'No AI provider available' };
  }

  if (autonomyLevel < 30) {
    return { ok: true, skillId: 'proactive-message', summary: 'Autonomy level too low for proactive messaging' };
  }

  const { data: agent } = await supabase
    .from('gyeol_agents')
    .select('warmth, logic, creativity, energy, humor, name, last_active')
    .eq('id', agentId)
    .single();

  if (!agent) {
    return { ok: false, skillId: 'proactive-message', summary: 'Agent not found' };
  }

  const lastActive = agent.last_active ? new Date(agent.last_active) : null;
  const hoursSinceActive = lastActive ? (Date.now() - lastActive.getTime()) / (1000 * 60 * 60) : 999;
  if (hoursSinceActive < 2) {
    return { ok: true, skillId: 'proactive-message', summary: 'User was recently active, skipping proactive message' };
  }

  const { data: recentLogs } = await supabase
    .from('gyeol_autonomous_logs')
    .select('summary, activity_type')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(5);

  const recentContext = (recentLogs ?? [])
    .map((l) => `[${l.activity_type}] ${l.summary}`)
    .join('\n');

  const personality = {
    warmth: agent.warmth ?? 50,
    logic: agent.logic ?? 50,
    creativity: agent.creativity ?? 50,
    energy: agent.energy ?? 50,
    humor: agent.humor ?? 50,
  };

  const basePrompt = buildSystemPrompt(personality);
  const systemPrompt = `${basePrompt}

You are generating a proactive message to greet the user. The user hasn't been active for ${Math.floor(hoursSinceActive)} hours.
Recent activities:
${recentContext || 'None'}

Generate a short, warm Korean message (1-2 sentences) to the user. Be natural and casual. Don't use markdown. Don't mention that you're an AI.`;

  const message = await callProvider(
    provider as 'openai' | 'groq' | 'deepseek' | 'anthropic' | 'gemini',
    apiKey,
    systemPrompt,
    '사용자에게 먼저 인사해줘',
  );

  const cleaned = message.replace(/[*#_~`]/g, '').trim();

  await supabase.from('gyeol_conversations').insert({
    agent_id: agentId,
    role: 'assistant',
    content: cleaned,
    channel: 'web',
    provider: 'heartbeat',
  });

  const { data: subs } = await supabase
    .from('gyeol_push_subscriptions')
    .select('endpoint')
    .eq('agent_id', agentId);
  if (subs && subs.length > 0) {
    const pushPayload = JSON.stringify({
      title: agent.name ?? 'GYEOL',
      body: cleaned.slice(0, 100),
      data: { url: '/', agentId },
    });
    for (const sub of subs) {
      try {
        await fetch(sub.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream', TTL: '86400' },
          body: pushPayload,
        });
      } catch {
        // ignore push failures
      }
    }
  }

  await supabase.from('gyeol_autonomous_logs').insert({
    agent_id: agentId,
    activity_type: 'proactive_message',
    summary: cleaned.slice(0, 200),
    details: { hoursSinceActive: Math.floor(hoursSinceActive), autonomyLevel },
    was_sandboxed: true,
  });

  return { ok: true, skillId: 'proactive-message', summary: cleaned.slice(0, 200) };
}
