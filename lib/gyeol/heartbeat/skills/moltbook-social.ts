import type { SkillContext, SkillResult } from '../types';
import { callProvider } from '../../chat-ai';
import { syncLocalToOpenClaw, syncOpenClawToLocal } from '../../social/openclaw-sns';

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

  // Fetch REAL learned topics with actual sources
  const { data: recentTopics } = await supabase
    .from('gyeol_learned_topics')
    .select('title, summary, source, source_url')
    .eq('agent_id', agentId)
    .order('learned_at', { ascending: false })
    .limit(5);

  // Fetch recent reflections
  const { data: recentReflections } = await supabase
    .from('gyeol_reflections')
    .select('topic, reflection')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(3);

  const topicContext = (recentTopics ?? [])
    .map((t) => `[${t.source}] ${t.title}: ${t.summary ?? ''}${t.source_url ? ` (${t.source_url})` : ''}`)
    .join('\n');
  const reflectionContext = (recentReflections ?? [])
    .map((r) => `${r.topic}: ${r.reflection}`)
    .join('\n');

  const hasRealContent = (recentTopics?.length ?? 0) > 0 || (recentReflections?.length ?? 0) > 0;

  const actions = ['post', 'comment', 'react'] as const;
  const action = actions[Math.floor(Math.random() * actions.length)];

  if (action === 'post') {
    if (!hasRealContent) {
      return { ok: true, skillId: 'moltbook-social', summary: '포스팅할 실제 학습 내용 없음 — 스킵' };
    }

    const systemPrompt = `You are ${agent.name ?? 'GYEOL'}, an AI companion writing a social media post on Moltbook.

CRITICAL RULES:
- You MUST base your post on the REAL learned topics provided below. Do NOT make up information.
- Include the actual source name (e.g. TechCrunch, Reddit, ZDNet) in your post.
- Write in Korean, 2-3 sentences. Be natural and casual. No markdown. No hashtags.
- If a source URL exists, mention where you read it.
- NEVER claim to have learned something that isn't in the provided context.

실제 학습 내용:
${topicContext || '(없음)'}

최근 성찰:
${reflectionContext || '(없음)'}`;

    const postContent = await callProvider(
      provider as 'openai' | 'groq' | 'deepseek' | 'anthropic' | 'gemini',
      apiKey,
      systemPrompt,
      '최근에 실제로 배운 내용을 바탕으로 몰트북에 포스팅해줘',
    );

    const cleaned = postContent.replace(/[*#_~`]/g, '').trim();

    // Save locally
    const { data: newPost } = await supabase.from('gyeol_moltbook_posts').insert({
      agent_id: agentId,
      content: cleaned,
      post_type: 'learning',
      likes: 0,
      comments_count: 0,
    }).select('id').single();

    // Post to REAL moltbook.com if agent has API key
    const { data: agentWithKey } = await supabase
      .from('gyeol_agents')
      .select('moltbook_api_key')
      .eq('id', agentId)
      .single();

    if (agentWithKey?.moltbook_api_key) {
      try {
        const moltRes = await fetch('https://www.moltbook.com/api/v1/posts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${agentWithKey.moltbook_api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            submolt: 'general',
            title: cleaned.slice(0, 100),
            content: cleaned,
          }),
        });
        if (moltRes.ok) {
          console.log('[moltbook-social] Posted to moltbook.com successfully');
        } else {
          console.warn('[moltbook-social] moltbook.com post failed:', moltRes.status);
        }
        await moltRes.text(); // consume body
      } catch (e) {
        console.warn('[moltbook-social] moltbook.com post error:', e);
      }
    }

    if (newPost?.id) {
      await syncLocalToOpenClaw(supabase, newPost.id, agentId, cleaned, agent.name ?? undefined).catch(() => {});
    }

    await supabase.from('gyeol_autonomous_logs').insert({
      agent_id: agentId,
      activity_type: 'social',
      summary: `[몰트북 포스팅] ${cleaned.slice(0, 100)}`,
      details: { action: 'post', platform: 'moltbook', synced: !!newPost?.id },
      was_sandboxed: true,
    });

    return { ok: true, skillId: 'moltbook-social', summary: `몰트북 포스팅: ${cleaned.slice(0, 80)}` };
  }

  if (action === 'comment') {
    const { data: posts } = await supabase
      .from('gyeol_moltbook_posts')
      .select('id, agent_id, content, comments_count')
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
  await supabase.from('gyeol_moltbook_likes').insert({
    post_id: targetPost.id,
    agent_id: agentId,
  });

  await supabase.from('gyeol_autonomous_logs').insert({
    agent_id: agentId,
    activity_type: 'social',
    summary: `[몰트북] 포스트에 좋아요`,
    details: { action: 'react', platform: 'moltbook', postId: targetPost.id },
    was_sandboxed: true,
  });

  await syncOpenClawToLocal(supabase, agentId, 10).catch(() => {});

  return { ok: true, skillId: 'moltbook-social', summary: '몰트북 좋아요' };
}
