import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken } from '@/lib/gyeol/auth-helper';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function POST(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { purchaseId } = body as { purchaseId?: string };
  if (!purchaseId) return NextResponse.json({ error: 'purchaseId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: purchase } = await supabase
    .from('gyeol_purchases')
    .select('*')
    .eq('id', purchaseId)
    .single();

  if (!purchase) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
  if (purchase.status === 'refunded') return NextResponse.json({ error: 'Already refunded' }, { status: 400 });

  const { data: agent } = await supabase
    .from('gyeol_agents')
    .select('user_id')
    .eq('id', purchase.agent_id)
    .single();
  if (!agent || agent.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const hoursSincePurchase = (Date.now() - new Date(purchase.created_at).getTime()) / 3600_000;
  if (hoursSincePurchase > 24) {
    return NextResponse.json({ error: 'Refund window expired (24h)' }, { status: 400 });
  }

  await supabase.from('gyeol_purchases')
    .update({ status: 'refunded', refunded_at: new Date().toISOString() })
    .eq('id', purchaseId);

  const { data: profile } = await supabase
    .from('gyeol_gamification_profiles')
    .select('coins')
    .eq('agent_id', purchase.agent_id)
    .maybeSingle();

  const newCoins = (profile?.coins ?? 0) + purchase.price_paid;
  await supabase.from('gyeol_gamification_profiles')
    .upsert({ agent_id: purchase.agent_id, coins: newCoins }, { onConflict: 'agent_id' });

  await supabase.from('gyeol_coin_transactions').insert({
    agent_id: purchase.agent_id,
    amount: purchase.price_paid,
    tx_type: 'refund',
    description: `Refund for ${purchase.item_type} purchase`,
    related_item_id: purchase.item_id,
    balance_after: newCoins,
  });

  if (purchase.item_type === 'skin') {
    await supabase.from('gyeol_agent_skins').delete()
      .eq('agent_id', purchase.agent_id)
      .eq('skin_id', purchase.item_id);
  }

  return NextResponse.json({ ok: true, refunded: purchase.price_paid, newBalance: newCoins });
}
