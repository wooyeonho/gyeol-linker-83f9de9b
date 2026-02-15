import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, subscription } = body as {
      agentId: string;
      subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
    };

    if (!agentId || !subscription?.endpoint) {
      return NextResponse.json({ error: 'agentId and subscription required' }, { status: 400 });
    }

    const supabase = createGyeolServerClient();
    await supabase.from('gyeol_push_subscriptions').upsert(
      {
        agent_id: agentId,
        endpoint: subscription.endpoint,
        subscription: subscription,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Push subscribe error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint } = body as { endpoint: string };
    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint required' }, { status: 400 });
    }

    const supabase = createGyeolServerClient();
    await supabase.from('gyeol_push_subscriptions').delete().eq('endpoint', endpoint);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Push unsubscribe error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
