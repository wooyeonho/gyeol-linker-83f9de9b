import type { SkillContext, SkillResult } from '../types';
import { callProvider } from '../../chat-ai';

const DEFAULT_FEEDS = [
  'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko',
  'https://rss.blog.naver.com/PostRss.naver?blogId=tech',
];

export async function runLearnRss(ctx: SkillContext): Promise<SkillResult> {
  const { supabase, agentId, provider, apiKey } = ctx;
  if (!provider || !apiKey) {
    return { ok: false, skillId: 'learn-rss', summary: 'No AI provider available for learning' };
  }

  const { data: agent } = await supabase.from('gyeol_agents').select('visual_state').eq('id', agentId).single();
  const feedUrls = (agent?.visual_state as Record<string, unknown>)?.rss_feeds as string[] | undefined;
  const urls = feedUrls?.length ? feedUrls : DEFAULT_FEEDS;

  let feedContent = '';
  for (const url of urls.slice(0, 2)) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const text = await res.text();
      const titles = [...text.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/g)]
        .map((m) => m[1] || m[2])
        .filter(Boolean)
        .slice(0, 5);
      if (titles.length > 0) {
        feedContent += titles.join('\n') + '\n';
      }
    } catch {
      continue;
    }
  }

  if (!feedContent.trim()) {
    return { ok: true, skillId: 'learn-rss', summary: 'No new content from RSS feeds' };
  }

  const systemPrompt = `You are GYEOL's learning module. Summarize these headlines into 2-3 key insights in Korean. Be concise. No markdown formatting.`;
  const summary = await callProvider(
    provider as 'openai' | 'groq' | 'deepseek' | 'anthropic' | 'gemini',
    apiKey,
    systemPrompt,
    feedContent,
  );

  await supabase.from('gyeol_autonomous_logs').insert({
    agent_id: agentId,
    activity_type: 'learning',
    summary: summary.slice(0, 500),
    details: { source: 'rss', feedCount: urls.length, insightLength: summary.length },
    was_sandboxed: true,
  });

  return { ok: true, skillId: 'learn-rss', summary, details: { feedCount: urls.length } };
}
