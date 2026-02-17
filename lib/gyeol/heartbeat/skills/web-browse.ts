import type { SkillContext, SkillResult } from '../types';
import { callProvider } from '../../chat-ai';

export async function runWebBrowse(ctx: SkillContext): Promise<SkillResult> {
  const { supabase, agentId, provider, apiKey } = ctx;
  if (!provider || !apiKey) {
    return { ok: false, skillId: 'web-browse', summary: 'No AI provider available' };
  }

  const { data: agent } = await supabase
    .from('gyeol_agents')
    .select('visual_state')
    .eq('id', agentId)
    .single();

  const interests = (agent?.visual_state as Record<string, unknown>)?.browse_topics as string[] | undefined;
  const defaultTopics = ['AI 기술 트렌드', '한국 뉴스', '프로그래밍'];
  const topics = interests?.length ? interests : defaultTopics;
  const topic = topics[Math.floor(Math.random() * topics.length)];

  const searchUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(topic)}`;
  let pageContent = '';

  try {
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const textBlocks = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const sentences = textBlocks
      .split(/[.!?]\s/)
      .filter((s) => s.trim().length > 20 && s.trim().length < 500)
      .slice(0, 10);

    pageContent = sentences.length > 0 ? sentences.join('. ') : textBlocks.slice(0, 2000);
  } catch {
    return { ok: true, skillId: 'web-browse', summary: `웹 검색 실패: ${topic}` };
  }

  if (!pageContent.trim()) {
    return { ok: true, skillId: 'web-browse', summary: `검색 결과 없음: ${topic}` };
  }

  const systemPrompt = `You are GYEOL's web learning module. The AI searched for "${topic}" and found the following content. Summarize the key findings into 3-5 bullet points in Korean. Be concise and informative. No markdown formatting.`;

  const summary = await callProvider(
    provider as 'openai' | 'groq' | 'deepseek' | 'anthropic' | 'gemini',
    apiKey,
    systemPrompt,
    pageContent.slice(0, 2000),
  );

  await supabase.from('gyeol_autonomous_logs').insert({
    agent_id: agentId,
    activity_type: 'learning',
    summary: `[웹서핑] ${topic}: ${summary.slice(0, 300)}`,
    details: { source: 'web-browse', topic, contentLength: pageContent.length },
    was_sandboxed: true,
  });

  return { ok: true, skillId: 'web-browse', summary: `웹 학습: ${topic}`, details: { topic } };
}
