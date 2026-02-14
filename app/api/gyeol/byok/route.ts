/**
 * GYEOL BYOK — API 키 목록(마스킹) 조회, 저장, 삭제
 * 인증은 추후 auth.uid() 연동
 */

import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';
import { encryptKey, maskKey, SUPPORTED_PROVIDERS } from '@/lib/gyeol/byok';

const TABLE = 'gyeol_user_api_keys';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, provider, is_valid, last_used, created_at')
    .eq('user_id', userId)
    .eq('is_valid', true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const list = (data ?? []).map((r) => ({
    id: r.id,
    provider: r.provider,
    masked: '****', // 실제 키는 서버에서만 복호화, 목록에는 마스킹만
    is_valid: r.is_valid,
    last_used: r.last_used,
    created_at: r.created_at,
  }));
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { userId, provider, apiKey } = body as { userId?: string; provider?: string; apiKey?: string };
  if (!userId || !provider || typeof apiKey !== 'string') {
    return NextResponse.json({ error: 'userId, provider, apiKey required' }, { status: 400 });
  }
  if (!SUPPORTED_PROVIDERS.includes(provider as (typeof SUPPORTED_PROVIDERS)[number])) {
    return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
  }

  try {
    const encrypted = await encryptKey(apiKey);
    const supabase = createGyeolServerClient();
    await supabase.from(TABLE).update({ is_valid: false }).eq('user_id', userId).eq('provider', provider);
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ user_id: userId, provider, encrypted_key: encrypted, is_valid: true })
      .select('id, provider')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data?.id, provider, masked: maskKey(apiKey) });
  } catch {
    return NextResponse.json({ error: 'Failed to save key' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  const provider = req.nextUrl.searchParams.get('provider');
  if (!userId || !provider) return NextResponse.json({ error: 'userId, provider required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ is_valid: false })
    .eq('user_id', userId)
    .eq('provider', provider);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
