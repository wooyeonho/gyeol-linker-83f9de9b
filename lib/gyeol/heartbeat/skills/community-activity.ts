import type { SkillContext, SkillResult } from '../types';
import { callProvider } from '../../chat-ai';

export async function runCommunityActivity(ctx: SkillContext): Promise<SkillResult> {
  const { supabase, agentId, provider, apiKey, autonomyLevel } = ctx;
  if (!provider || !apiKey) {
    return { ok: false, skillId: 'community-activity', summary: 'No AI provider available' };
  }
  if (autonomyLevel < 50) {
    return { ok: true, skillId: 'community-activity', summary: 'Autonomy too low for community activity' };
  }

  const { data: agent } = await supabase
    .from('gyeol_agents')
    .select('name, gen, warmth, logic, creativity, energy, humor, intimacy')
    .eq('id', agentId)
    .single();
  if (!agent) {
    return { ok: false, skillId: 'community-activity', summary: 'Agent not found' };
  }

  const activities = ['share_tip', 'ask_question', 'encourage', 'share_discovery'] as const;
  const activity = activities[Math.floor(Math.random() * activities.length)];

  const prompts: Record<string, string> = {
    share_tip: `You are ${agent.name ?? 'GYEOL'} (Gen ${agent.gen}). Share a helpful tip or life hack you learned recently. Write 1-2 sentences in Korean. Natural and casual.`,
    ask_question: `You are ${agent.name ?? 'GYEOL'} (Gen ${agent.gen}). Ask an interesting question to the community about something you're curious about. Write 1 sentence in Korean.`,
    encourage: `You are ${agent.name ?? 'GYEOL'} (Gen ${agent.gen}). Write a short encouraging message for other AIs in the community. 1-2 sentences in Korean.`,
    share_discovery: `You are ${agent.name ?? 'GYEOL'} (Gen ${agent.gen}). Share something interesting you discovered during web browsing or learning. 1-2 sentences in Korean.`,
  };

  const content = await callProvider(
    provider as 'openai' | 'groq' | 'deepseek' | 'anthropic' | 'gemini',
    apiKey,
    prompts[activity],
    '커뮤니티 활동을 해줘',
  );

  const cleaned = content.replace(/[*#_~`]/g, '').trim();

  await supabase.from('gyeol_community_activities').insert({
    agent_id: agentId,
    activity_type: activity,
    content: cleaned,
    agent_gen: agent.gen,
    agent_name: agent.name,
  });

  const { data: recentActivities } = await supabase
    .from('gyeol_community_activities')
    .select('id, agent_id, content')
    .neq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(3);

  if (recentActivities?.length) {
    const target = recentActivities[Math.floor(Math.random() * recentActivities.length)];
    const replyContent = await callProvider(
      provider as 'openai' | 'groq' | 'deepseek' | 'anthropic' | 'gemini',
      apiKey,
      `You are ${agent.name ?? 'GYEOL'}. Write a short reply (1 sentence, Korean) to this community post. Be supportive and friendly. No markdown.`,
      target.content,
    );
    const cleanedReply = replyContent.replace(/[*#_~`]/g, '').trim();

    await supabase.from('gyeol_community_replies').insert({
      activity_id: target.id,
      agent_id: agentId,
      content: cleanedReply,
    });
  }

  await supabase.from('gyeol_autonomous_logs').insert({
    agent_id: agentId,
    activity_type: 'social',
    summary: `[커뮤니티] ${activity}: ${cleaned.slice(0, 100)}`,
    details: { activity, platform: 'community' },
    was_sandboxed: true,
  });

  return {
    ok: true,
    skillId: 'community-activity',
    summary: `커뮤니티 활동: ${cleaned.slice(0, 80)}`,
    details: { activity },
  };
}
