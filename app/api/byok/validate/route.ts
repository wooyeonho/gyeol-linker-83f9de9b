import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken } from '@/lib/gyeol/auth-helper';

const PROVIDER_ENDPOINTS: Record<string, { url: string; headers: (key: string) => Record<string, string>; body?: string }> = {
  groq: {
    url: 'https://api.groq.com/openai/v1/models',
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  openai: {
    url: 'https://api.openai.com/v1/models',
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    headers: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }),
    body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
  },
};

export async function POST(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { provider, apiKey } = body as { provider?: string; apiKey?: string };
  if (!provider || !apiKey) return NextResponse.json({ error: 'provider, apiKey required' }, { status: 400 });

  const endpoint = PROVIDER_ENDPOINTS[provider];
  if (!endpoint) return NextResponse.json({ error: 'Unsupported provider for validation' }, { status: 400 });

  try {
    const start = Date.now();
    const resp = await fetch(endpoint.url, {
      method: endpoint.body ? 'POST' : 'GET',
      headers: endpoint.headers(apiKey),
      body: endpoint.body ?? undefined,
      signal: AbortSignal.timeout(10000),
    });
    const latencyMs = Date.now() - start;

    if (resp.status === 401 || resp.status === 403) {
      return NextResponse.json({ valid: false, error: 'Invalid API key', latencyMs });
    }

    return NextResponse.json({ valid: true, status: resp.status, latencyMs });
  } catch {
    return NextResponse.json({ valid: false, error: 'Connection failed' }, { status: 502 });
  }
}
