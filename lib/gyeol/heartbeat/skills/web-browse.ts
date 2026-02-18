import type { SkillContext, SkillResult } from '../types';
import { callProvider } from '../../chat-ai';

const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL ?? '';
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? '';
const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY ?? '';

interface SearchResult {
  title: string;
  description: string;
  url: string;
}

async function searchViaBrave(query: string): Promise<SearchResult[]> {
  if (!BRAVE_API_KEY) return [];
  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
      {
        headers: { 'Accept': 'application/json', 'X-Subscription-Token': BRAVE_API_KEY },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return [];
    const data = await res.json() as { web?: { results?: Array<{ title: string; description: string; url: string }> } };
    return (data.web?.results ?? []).map((r) => ({
      title: r.title ?? '',
      description: r.description ?? '',
      url: r.url ?? '',
    }));
  } catch {
    return [];
  }
}

async function searchViaGateway(query: string): Promise<SearchResult[]> {
  if (!OPENCLAW_URL) return [];
  const base = OPENCLAW_URL.replace(/\/$/, '');
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (OPENCLAW_TOKEN) h['Authorization'] = `Bearer ${OPENCLAW_TOKEN}`;
  try {
    const res = await fetch(`${base}/api/search?q=${encodeURIComponent(query)}&limit=5`, {
      headers: h,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json() as { results?: SearchResult[] };
    return data.results ?? [];
  } catch {
    return [];
  }
}

async function searchDuckDuckGoApi(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return [];
    const data = await res.json() as {
      AbstractText?: string;
      AbstractSource?: string;
      AbstractURL?: string;
      RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
    };
    const results: SearchResult[] = [];
    if (data.AbstractText) {
      results.push({ title: data.AbstractSource ?? query, description: data.AbstractText, url: data.AbstractURL ?? '' });
    }
    for (const topic of (data.RelatedTopics ?? []).slice(0, 5)) {
      if (topic.Text) {
        results.push({ title: topic.Text.slice(0, 80), description: topic.Text, url: topic.FirstURL ?? '' });
      }
    }
    return results;
  } catch {
    return [];
  }
}

async function search(query: string): Promise<SearchResult[]> {
  let results = await searchViaBrave(query);
  if (results.length) return results;
  results = await searchViaGateway(query);
  if (results.length) return results;
  return searchDuckDuckGoApi(query);
}

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

  const results = await search(topic);
  if (!results.length) {
    return { ok: true, skillId: 'web-browse', summary: `검색 결과 없음: ${topic}` };
  }

  const pageContent = results
    .map((r, i) => `${i + 1}. ${r.title}\n${r.description}`)
    .join('\n\n');

  const systemPrompt = `You are GYEOL's web learning module. The AI searched for "${topic}" and found the following results. Summarize the key findings into 3-5 bullet points in Korean. Be concise and informative. No markdown formatting.`;

  const summary = await callProvider(
    provider as 'openai' | 'groq' | 'deepseek' | 'anthropic' | 'gemini',
    apiKey,
    systemPrompt,
    pageContent.slice(0, 2000),
  );

  const method = BRAVE_API_KEY ? 'brave' : OPENCLAW_URL ? 'gateway' : 'duckduckgo-api';
  await supabase.from('gyeol_autonomous_logs').insert({
    agent_id: agentId,
    activity_type: 'learning',
    summary: `[웹서핑] ${topic}: ${summary.slice(0, 300)}`,
    details: { source: 'web-browse', topic, resultCount: results.length, method },
    was_sandboxed: true,
  });

  return { ok: true, skillId: 'web-browse', summary: `웹 학습: ${topic}`, details: { topic } };
}
