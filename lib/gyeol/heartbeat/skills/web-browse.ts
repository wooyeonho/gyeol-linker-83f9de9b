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

/** 네이버 뉴스 RSS */
async function fetchNaverNewsRSS(): Promise<SearchResult[]> {
  try {
    const res = await fetch('https://news.google.com/rss/search?q=site:news.naver.com&hl=ko&gl=KR&ceid=KR:ko', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const text = await res.text();
    const items: SearchResult[] = [];
    const itemRegex = /<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>/g;
    let m;
    while ((m = itemRegex.exec(text)) && items.length < 5) {
      items.push({ title: m[1], description: '네이버 뉴스', url: m[2] });
    }
    // Fallback: try Naver main RSS
    if (!items.length) {
      const res2 = await fetch('https://rss.news.naver.com/headlines.xml', { signal: AbortSignal.timeout(8000) });
      if (res2.ok) {
        const text2 = await res2.text();
        const itemRegex2 = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<description>(.*?)<\/description>[\s\S]*?<\/item>/g;
        let m2;
        while ((m2 = itemRegex2.exec(text2)) && items.length < 5) {
          items.push({ title: m2[1].replace(/<!\[CDATA\[|\]\]>/g, ''), description: m2[3]?.replace(/<!\[CDATA\[|\]\]>/g, '').slice(0, 200) ?? '', url: m2[2] });
        }
      }
    }
    return items;
  } catch {
    return [];
  }
}

/** 다음 뉴스 RSS */
async function fetchDaumNewsRSS(): Promise<SearchResult[]> {
  try {
    const res = await fetch('https://news.google.com/rss/search?q=site:v.daum.net&hl=ko&gl=KR&ceid=KR:ko', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const text = await res.text();
    const items: SearchResult[] = [];
    const itemRegex = /<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>/g;
    let m;
    while ((m = itemRegex.exec(text)) && items.length < 5) {
      items.push({ title: m[1], description: '다음 뉴스', url: m[2] });
    }
    return items;
  } catch {
    return [];
  }
}

/** Reddit 공개 JSON API — 로그인/API키 불필요 */
async function fetchReddit(subreddit: string, limit = 5): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`,
      { headers: { 'User-Agent': 'GYEOL-Bot/1.0' }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return [];
    const data = await res.json() as { data?: { children?: Array<{ data: { title: string; selftext: string; url: string; permalink: string; score: number } }> } };
    return (data.data?.children ?? []).map((c) => ({
      title: c.data.title,
      description: c.data.selftext?.slice(0, 300) || `Score: ${c.data.score}`,
      url: `https://reddit.com${c.data.permalink}`,
    }));
  } catch {
    return [];
  }
}

/** HackerNews 공개 API — 완전 무료 */
async function fetchHackerNews(limit = 5): Promise<SearchResult[]> {
  try {
    const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const ids = (await res.json() as number[]).slice(0, limit);
    const items = await Promise.all(ids.map(async (id) => {
      const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal: AbortSignal.timeout(5000) });
      return r.ok ? r.json() as Promise<{ title?: string; url?: string; score?: number; by?: string }> : null;
    }));
    return items.filter(Boolean).map((item) => ({
      title: item!.title ?? '',
      description: `by ${item!.by ?? 'unknown'} | ${item!.score ?? 0} points`,
      url: item!.url ?? `https://news.ycombinator.com/item?id=${ids[0]}`,
    }));
  } catch {
    return [];
  }
}

/** YouTube 채널 RSS — API키 불필요 */
async function fetchYouTubeRSS(channelId: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return [];
    const text = await res.text();
    const entries: SearchResult[] = [];
    const entryRegex = /<entry>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link rel="alternate" href="(.*?)"[\s\S]*?<media:description>([\s\S]*?)<\/media:description>[\s\S]*?<\/entry>/g;
    let match;
    while ((match = entryRegex.exec(text)) && entries.length < 5) {
      entries.push({ title: match[1], description: match[3]?.slice(0, 200) ?? '', url: match[2] });
    }
    return entries;
  } catch {
    return [];
  }
}

/** Yahoo Finance — 주식 시세 크롤링 (공개 API) */
async function fetchStockTrends(): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v1/finance/trending/US?count=5',
      { headers: { 'User-Agent': 'GYEOL-Bot/1.0' }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return [];
    const data = await res.json() as { finance?: { result?: Array<{ quotes?: Array<{ symbol: string }> }> } };
    const symbols = data.finance?.result?.[0]?.quotes?.map(q => q.symbol) ?? [];
    return symbols.map(s => ({
      title: `${s} 주식 트렌드`,
      description: `현재 Yahoo Finance 트렌딩 종목: ${s}`,
      url: `https://finance.yahoo.com/quote/${s}`,
    }));
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

/** 다양한 실제 소스에서 콘텐츠 수집 */
type SourceType = 'reddit' | 'hackernews' | 'youtube' | 'stock' | 'naver' | 'daum' | 'search';

const YOUTUBE_CHANNELS = [
  'UCVHFbqXqoYvEWM1Ddxl0QDg', // 노마드 코더
  'UC_x5XG1OV2P6uZZ5FSM9Ttw', // Google Developers
  'UCsBjURrPoezykLs9EqgamOA', // Fireship
];

const REDDIT_SUBS = ['technology', 'worldnews', 'science', 'programming', 'kpop'];

export async function runWebBrowse(ctx: SkillContext): Promise<SkillResult> {
  const { supabase, agentId, provider, apiKey } = ctx;
  if (!provider || !apiKey) {
    return { ok: false, skillId: 'web-browse', summary: 'No AI provider available' };
  }

  // Randomly pick a REAL source to browse
  const sources: SourceType[] = ['reddit', 'hackernews', 'youtube', 'stock', 'naver', 'daum', 'search'];
  const source = sources[Math.floor(Math.random() * sources.length)];

  let results: SearchResult[] = [];
  let sourceName = '';

  switch (source) {
    case 'reddit': {
      const sub = REDDIT_SUBS[Math.floor(Math.random() * REDDIT_SUBS.length)];
      results = await fetchReddit(sub, 5);
      sourceName = `Reddit r/${sub}`;
      break;
    }
    case 'hackernews': {
      results = await fetchHackerNews(5);
      sourceName = 'HackerNews';
      break;
    }
    case 'youtube': {
      const ch = YOUTUBE_CHANNELS[Math.floor(Math.random() * YOUTUBE_CHANNELS.length)];
      results = await fetchYouTubeRSS(ch);
      sourceName = 'YouTube';
      break;
    }
    case 'stock': {
      results = await fetchStockTrends();
      sourceName = 'Yahoo Finance';
      break;
    }
    case 'naver': {
      results = await fetchNaverNewsRSS();
      sourceName = '네이버 뉴스';
      break;
    }
    case 'daum': {
      results = await fetchDaumNewsRSS();
      sourceName = '다음 뉴스';
      break;
    }
    default: {
      const { data: agent } = await supabase
        .from('gyeol_agents')
        .select('visual_state')
        .eq('id', agentId)
        .single();
      const interests = (agent?.visual_state as Record<string, unknown>)?.browse_topics as string[] | undefined;
      const defaultTopics = ['AI 기술 트렌드', '한국 뉴스', '프로그래밍'];
      const topics = interests?.length ? interests : defaultTopics;
      const topic = topics[Math.floor(Math.random() * topics.length)];
      results = await search(topic);
      sourceName = `검색: ${topic}`;
      break;
    }
  }

  if (!results.length) {
    return { ok: true, skillId: 'web-browse', summary: `${sourceName} — 결과 없음` };
  }

  const pageContent = results
    .map((r, i) => `${i + 1}. [${r.url}] ${r.title}\n${r.description}`)
    .join('\n\n');

  const systemPrompt = `You are GYEOL's web learning module. You browsed "${sourceName}" and found real content. Summarize the key findings into 3-5 bullet points in Korean. Include the actual source names and URLs. Be factual — do NOT make up information. No markdown formatting.`;

  const summary = await callProvider(
    provider as 'openai' | 'groq' | 'deepseek' | 'anthropic' | 'gemini',
    apiKey,
    systemPrompt,
    pageContent.slice(0, 2000),
  );

  // Save each result as a real learned topic
  for (const r of results.slice(0, 3)) {
    try {
      await supabase.from('gyeol_learned_topics').insert({
        agent_id: agentId,
        title: r.title.slice(0, 200),
        summary: r.description.slice(0, 500),
        source: sourceName,
        source_url: r.url || null,
      });
    } catch { /* skip duplicates */ }
  }

  await supabase.from('gyeol_autonomous_logs').insert({
    agent_id: agentId,
    activity_type: 'learning',
    summary: `[${sourceName}] ${summary.slice(0, 300)}`,
    details: { source: 'web-browse', sourceName, resultCount: results.length, urls: results.map(r => r.url) },
    was_sandboxed: true,
  });

  return { ok: true, skillId: 'web-browse', summary: `${sourceName}에서 학습`, details: { sourceName } };
}
