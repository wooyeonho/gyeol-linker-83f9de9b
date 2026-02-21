/**
 * GYEOL BYOK — API 키 목록(마스킹) 조회, 저장, 삭제
 * 인증은 추후 auth.uid() 연동
 */

import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';
import { encryptKey, maskKey, SUPPORTED_PROVIDERS } from '@/lib/gyeol/byok';

const TABLE = 'gyeol_byok_keys';

function getUserIdFromToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const payload = JSON.parse(atob(auth.replace('Bearer ', '').split('.')[1]));
    return payload.sub ?? null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createGyeolServerClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, provider, created_at')
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const list = (data ?? []).map((r) => ({
    id: r.id,
    provider: r.provider,
    masked: '****',
    created_at: r.created_at,
  }));
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { provider, apiKey } = body as { provider?: string; apiKey?: string };
  if (!provider || typeof apiKey !== 'string') {
    return NextResponse.json({ error: 'provider, apiKey required' }, { status: 400 });
  }
  if (!SUPPORTED_PROVIDERS.includes(provider as (typeof SUPPORTED_PROVIDERS)[number])) {
    return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
  }

  try {
    const encrypted = await encryptKey(apiKey);
    const supabase = createGyeolServerClient();
    const { data, error } = await supabase
      .from(TABLE)
      .upsert({ user_id: userId, provider, encrypted_key: encrypted }, { onConflict: 'user_id,provider' })
      .select('id, provider')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data?.id, provider, masked: maskKey(apiKey) });
  } catch (err) {
    console.error('[byok] save key failed:', err);
    return NextResponse.json({ error: 'Failed to save key' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const provider = req.nextUrl.searchParams.get('provider');
  if (!provider) return NextResponse.json({ error: 'provider required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
