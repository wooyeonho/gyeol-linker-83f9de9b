import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken } from '@/lib/gyeol/auth-helper';
import { getCachedSearch, setCachedSearch } from '@/lib/gyeol/search-cache';

export async function GET(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const query = req.nextUrl.searchParams.get('q');
  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Query too short' }, { status: 400 });
  }

  const cached = await getCachedSearch(query, 'web');
  if (cached) return NextResponse.json({ results: cached, cached: true });

  try {
    const resp = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await resp.json();
    const results = (data.RelatedTopics ?? [])
      .filter((t: Record<string, unknown>) => t.Text && t.FirstURL)
      .slice(0, 10)
      .map((t: Record<string, unknown>) => ({
        title: String(t.Text).slice(0, 200),
        url: t.FirstURL,
        snippet: String(t.Text).slice(0, 300),
      }));

    if (data.AbstractText) {
      results.unshift({ title: data.Heading ?? query, url: data.AbstractURL ?? '', snippet: data.AbstractText.slice(0, 500) });
    }

    await setCachedSearch(query, 'web', results);
    return NextResponse.json({ results, cached: false });
  } catch {
    return NextResponse.json({ error: 'Search failed' }, { status: 502 });
  }
}
