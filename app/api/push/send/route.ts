import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { agentId, title, message } = body as { agentId: string; title: string; message: string };

    if (!agentId || !message) {
      return NextResponse.json({ error: 'agentId and message required' }, { status: 400 });
    }

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 });
    }

    const supabase = createGyeolServerClient();
    const { data: subs } = await supabase
      .from('gyeol_push_subscriptions')
      .select('endpoint, subscription')
      .eq('agent_id', agentId);

    if (!subs || subs.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No subscriptions found' });
    }

    const payload = JSON.stringify({
      title: title || 'GYEOL',
      body: message,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: '/', agentId },
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subs) {
      try {
        const res = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            TTL: '86400',
          },
          body: payload,
        });
        if (res.ok || res.status === 201) {
          sent++;
        } else {
          failed++;
          if (res.status === 410) {
            await supabase.from('gyeol_push_subscriptions').delete().eq('endpoint', sub.endpoint);
          }
        }
      } catch {
        failed++;
      }
    }

    return NextResponse.json({ sent, failed });
  } catch (err) {
    console.error('Push send error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
