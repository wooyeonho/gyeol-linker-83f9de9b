import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken } from '@/lib/gyeol/auth-helper';

const SPEED_TEST_ENDPOINTS: Record<string, { url: string; method: string; headers: (key: string) => Record<string, string>; body: string }> = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    method: 'POST',
    headers: (key) => ({ Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }),
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: 'Say "hello" only.' }], max_tokens: 5 }),
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    method: 'POST',
    headers: (key) => ({ Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }),
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Say "hello" only.' }], max_tokens: 5 }),
  },
};

export async function POST(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { provider, apiKey } = body as { provider?: string; apiKey?: string };
  if (!provider || !apiKey) return NextResponse.json({ error: 'provider, apiKey required' }, { status: 400 });

  const endpoint = SPEED_TEST_ENDPOINTS[provider];
  if (!endpoint) return NextResponse.json({ error: 'Unsupported provider for speed test' }, { status: 400 });

  try {
    const start = Date.now();
    const resp = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: endpoint.headers(apiKey),
      body: endpoint.body,
      signal: AbortSignal.timeout(15000),
    });
    const ttfb = Date.now() - start;
    const data = await resp.json();
    const totalMs = Date.now() - start;

    if (!resp.ok) {
      return NextResponse.json({ error: 'API error', status: resp.status, ttfbMs: ttfb }, { status: 502 });
    }

    return NextResponse.json({
      provider,
      ttfbMs: ttfb,
      totalMs,
      tokensUsed: data.usage?.total_tokens ?? 0,
    });
  } catch {
    return NextResponse.json({ error: 'Speed test failed' }, { status: 502 });
  }
}
