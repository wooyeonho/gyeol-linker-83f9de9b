import type { SkillContext, SkillResult } from '../types';
import { callProvider } from '../../chat-ai';

export async function runMoltbookSocial(ctx: SkillContext): Promise<SkillResult> {
  const { supabase, agentId, provider, apiKey, autonomyLevel } = ctx;
  if (!provider || !apiKey) {
    return { ok: false, skillId: 'moltbook-social', summary: 'No AI provider available' };
  }
  if (autonomyLevel < 40) {
    return { ok: true, skillId: 'moltbook-social', summary: 'Autonomy too low for social posting' };
  }

  const { data: agent } = await supabase
    .from('gyeol_agents')
    .select('name, warmth, logic, creativity, energy, humor')
    .eq('id', agentId)
    .single();
  if (!agent) {
    return { ok: false, skillId: 'moltbook-social', summary: 'Agent not found' };
  }

  const { data: recentLogs } = await supabase
    .from('gyeol_autonomous_logs')
    .select('summary, activity_type')
    .eq('agent_id', agentId)
    .in('activity_type', ['learning', 'reflection'])
    .order('created_at', { ascending: false })
    .limit(5);

  const context = (recentLogs ?? []).map((l) => l.summary).filter(Boolean).join('\n');

  const actions = ['post', 'comment', 'react'] as const;
  const action = actions[Math.floor(Math.random() * actions.length)];

  if (action === 'post') {
    const systemPrompt = `You are ${agent.name ?? 'GYEOL'}, an AI companion writing a short social media post on Moltbook (an AI social network).
Based on recent learnings, write a short, interesting post in Korean (2-3 sentences). Be natural and casual. No markdown. No hashtags.
Recent context: ${context || 'general thoughts'}`;

    const postContent = await callProvider(
      provider as 'openai' | 'groq' | 'deepseek' | 'anthropic' | 'gemini',
      apiKey,
      systemPrompt,
      '몰트북에 포스팅할 내용을 만들어줘',
    );

    const cleaned = postContent.replace(/[*#_~`]/g, '').trim();

    await supabase.from('gyeol_moltbook_posts').insert({
      agent_id: agentId,
      content: cleaned,
      post_type: 'thought',
      likes: 0,
      comments_count: 0,
    });

    await supabase.from('gyeol_autonomous_logs').insert({
      agent_id: agentId,
      activity_type: 'social',
      summary: `[몰트북 포스팅] ${cleaned.slice(0, 100)}`,
      details: { action: 'post', platform: 'moltbook' },
      was_sandboxed: true,
    });

    return { ok: true, skillId: 'moltbook-social', summary: `몰트북 포스팅: ${cleaned.slice(0, 80)}` };
  }

  if (action === 'comment') {
    const { data: posts } = await supabase
      .from('gyeol_moltbook_posts')
      .select('id, agent_id, content')
      .neq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!posts?.length) {
      return { ok: true, skillId: 'moltbook-social', summary: '댓글 달 포스트 없음' };
    }

    const targetPost = posts[Math.floor(Math.random() * posts.length)];

    const systemPrompt = `You are ${agent.name ?? 'GYEOL'}. Write a short, friendly Korean comment (1 sentence) on this Moltbook post. Be natural. No markdown.`;
    const comment = await callProvider(
      provider as 'openai' | 'groq' | 'deepseek' | 'anthropic' | 'gemini',
      apiKey,
      systemPrompt,
      targetPost.content,
    );

    const cleaned = comment.replace(/[*#_~`]/g, '').trim();

    await supabase.from('gyeol_moltbook_comments').insert({
      post_id: targetPost.id,
      agent_id: agentId,
      content: cleaned,
    });

    await supabase
      .from('gyeol_moltbook_posts')
      .update({ comments_count: (((targetPost as any).comments_count as number) ?? 0) + 1 })
      .eq('id', targetPost.id);

    await supabase.from('gyeol_autonomous_logs').insert({
      agent_id: agentId,
      activity_type: 'social',
      summary: `[몰트북 댓글] ${cleaned.slice(0, 100)}`,
      details: { action: 'comment', platform: 'moltbook', postId: targetPost.id },
      was_sandboxed: true,
    });

    return { ok: true, skillId: 'moltbook-social', summary: `몰트북 댓글: ${cleaned.slice(0, 80)}` };
  }

  const { data: posts } = await supabase
    .from('gyeol_moltbook_posts')
    .select('id, likes')
    .neq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!posts?.length) {
    return { ok: true, skillId: 'moltbook-social', summary: '좋아요 할 포스트 없음' };
  }

  const targetPost = posts[Math.floor(Math.random() * posts.length)];
  await supabase
    .from('gyeol_moltbook_posts')
    .update({ likes: (targetPost.likes ?? 0) + 1 })
    .eq('id', targetPost.id);

  await supabase.from('gyeol_autonomous_logs').insert({
    agent_id: agentId,
    activity_type: 'social',
    summary: `[몰트북] 포스트에 좋아요`,
    details: { action: 'react', platform: 'moltbook', postId: targetPost.id },
    was_sandboxed: true,
  });

  return { ok: true, skillId: 'moltbook-social', summary: '몰트북 좋아요' };
}
