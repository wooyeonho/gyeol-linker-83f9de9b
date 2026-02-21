import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken, getAgentForUser } from '@/lib/gyeol/auth-helper';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function POST(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { fromAgentId, toAgentId, amount } = body as { fromAgentId?: string; toAgentId?: string; amount?: number };
  if (!fromAgentId || !toAgentId || !amount || amount <= 0) {
    return NextResponse.json({ error: 'fromAgentId, toAgentId, amount (>0) required' }, { status: 400 });
  }
  if (fromAgentId === toAgentId) {
    return NextResponse.json({ error: 'Cannot transfer to self' }, { status: 400 });
  }

  const agent = await getAgentForUser(fromAgentId, userId);
  if (!agent) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: senderProfile } = await supabase
    .from('gyeol_gamification_profiles')
    .select('coins')
    .eq('agent_id', fromAgentId)
    .single();

  const senderCoins = senderProfile?.coins ?? 0;
  if (senderCoins < amount) {
    return NextResponse.json({ error: 'Insufficient coins', current: senderCoins, required: amount }, { status: 400 });
  }

  const { data: receiver } = await supabase
    .from('gyeol_agents')
    .select('id')
    .eq('id', toAgentId)
    .single();
  if (!receiver) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });

  await supabase.from('gyeol_gamification_profiles')
    .update({ coins: senderCoins - amount })
    .eq('agent_id', fromAgentId);

  const { data: receiverProfile } = await supabase
    .from('gyeol_gamification_profiles')
    .select('coins')
    .eq('agent_id', toAgentId)
    .maybeSingle();

  if (receiverProfile) {
    await supabase.from('gyeol_gamification_profiles')
      .update({ coins: (receiverProfile.coins ?? 0) + amount })
      .eq('agent_id', toAgentId);
  } else {
    await supabase.from('gyeol_gamification_profiles')
      .insert({ agent_id: toAgentId, coins: amount });
  }

  await supabase.from('gyeol_coin_transactions').insert([
    { agent_id: fromAgentId, amount: -amount, tx_type: 'transfer_out', description: `Transfer to ${toAgentId}`, related_agent_id: toAgentId, balance_after: senderCoins - amount },
    { agent_id: toAgentId, amount, tx_type: 'transfer_in', description: `Transfer from ${fromAgentId}`, related_agent_id: fromAgentId, balance_after: (receiverProfile?.coins ?? 0) + amount },
  ]);

  return NextResponse.json({ ok: true, transferred: amount, senderBalance: senderCoins - amount });
}
