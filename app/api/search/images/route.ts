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

  const cached = await getCachedSearch(query, 'image');
  if (cached) return NextResponse.json({ results: cached, cached: true });

  try {
    const resp = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&iax=images&ia=images`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await resp.json();
    const results = (data.RelatedTopics ?? [])
      .filter((t: Record<string, unknown>) => t.Icon && (t.Icon as Record<string, unknown>).URL)
      .slice(0, 10)
      .map((t: Record<string, unknown>) => ({
        title: String(t.Text ?? '').slice(0, 200),
        url: (t.Icon as Record<string, unknown>).URL,
        thumbnail: (t.Icon as Record<string, unknown>).URL,
      }));

    await setCachedSearch(query, 'image', results);
    return NextResponse.json({ results, cached: false });
  } catch {
    return NextResponse.json({ error: 'Image search failed' }, { status: 502 });
  }
}
