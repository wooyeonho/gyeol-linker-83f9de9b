/**
 * 웹 푸시 구독 저장
 */
import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';
import { DEMO_USER_ID } from '@/lib/gyeol/constants';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { agentId, subscription } = body as {
    agentId?: string;
    subscription?: { endpoint: string; keys?: { p256dh?: string; auth?: string } };
  };
  if (!agentId || !subscription?.endpoint) {
    return NextResponse.json({ error: 'agentId and subscription.endpoint required' }, { status: 400 });
  }
  const supabase = createGyeolServerClient();
  await supabase.from('gyeol_push_subscriptions').upsert(
    {
      user_id: DEMO_USER_ID,
      agent_id: agentId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys?.p256dh ?? null,
      auth: subscription.keys?.auth ?? null,
    },
    { onConflict: 'endpoint' }
  );
  return NextResponse.json({ ok: true });
}
