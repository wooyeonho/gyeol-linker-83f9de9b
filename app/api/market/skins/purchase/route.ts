import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken } from '@/lib/gyeol/auth-helper';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';
import { checkPurchaseAbuse } from '@/lib/gyeol/abuse-detection';
import { calculateCommission, applyDiscount } from '@/lib/gyeol/market-commission';

export async function POST(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { agentId, skinId, couponCode } = body as { agentId?: string; skinId?: string; couponCode?: string };
  if (!agentId || !skinId) return NextResponse.json({ error: 'agentId, skinId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: agent } = await supabase.from('gyeol_agents').select('user_id').eq('id', agentId).single();
  if (!agent || agent.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const abuseCheck = await checkPurchaseAbuse(agentId, skinId);
  if (abuseCheck.flagged) return NextResponse.json({ error: 'Purchase rate limit exceeded' }, { status: 429 });

  const { data: existing } = await supabase
    .from('gyeol_agent_skins')
    .select('id')
    .eq('agent_id', agentId)
    .eq('skin_id', skinId)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: 'Already owned' }, { status: 409 });

  const { data: skin } = await supabase
    .from('gyeol_market_skins')
    .select('id, price, creator_id, commission_rate')
    .eq('id', skinId)
    .single();
  if (!skin) return NextResponse.json({ error: 'Skin not found' }, { status: 404 });

  let finalPrice = skin.price ?? 0;
  let couponId: string | null = null;

  if (couponCode) {
    const { data: coupon } = await supabase
      .from('gyeol_coupons')
      .select('*')
      .eq('code', couponCode)
      .eq('is_active', true)
      .maybeSingle();

    if (coupon && (coupon.applicable_type === 'skin' || coupon.applicable_type === 'all')) {
      if (!coupon.expires_at || new Date(coupon.expires_at) > new Date()) {
        if ((coupon.current_uses ?? 0) < (coupon.max_uses ?? 100)) {
          const { data: used } = await supabase
            .from('gyeol_coupon_uses')
            .select('id')
            .eq('coupon_id', coupon.id)
            .eq('agent_id', agentId)
            .maybeSingle();
          if (!used) {
            finalPrice = applyDiscount(finalPrice, coupon.discount_type, coupon.discount_value, coupon.min_price);
            couponId = coupon.id;
          }
        }
      }
    }
  }

  const { data: profile } = await supabase
    .from('gyeol_gamification_profiles')
    .select('coins')
    .eq('agent_id', agentId)
    .maybeSingle();

  const currentCoins = profile?.coins ?? 0;
  if (currentCoins < finalPrice) {
    return NextResponse.json({ error: 'Insufficient coins', current: currentCoins, required: finalPrice }, { status: 400 });
  }

  const newBalance = currentCoins - finalPrice;
  await supabase.from('gyeol_gamification_profiles')
    .upsert({ agent_id: agentId, coins: newBalance }, { onConflict: 'agent_id' });

  await supabase.from('gyeol_agent_skins').insert({ agent_id: agentId, skin_id: skinId });

  await supabase.from('gyeol_purchases').insert({
    agent_id: agentId,
    item_type: 'skin',
    item_id: skinId,
    price_paid: finalPrice,
    coupon_id: couponId,
  });

  await supabase.from('gyeol_coin_transactions').insert({
    agent_id: agentId,
    amount: -finalPrice,
    tx_type: 'spend',
    description: `Purchased skin`,
    related_item_id: skinId,
    balance_after: newBalance,
  });

  if (couponId) {
    await supabase.from('gyeol_coupon_uses').insert({ coupon_id: couponId, agent_id: agentId });
    await supabase.rpc('increment_coupon_uses', { p_coupon_id: couponId }).catch(() => {});
  }

  if (skin.creator_id) {
    const { commission, sellerReceives } = calculateCommission(finalPrice, skin.commission_rate ?? 0.10);
    const { data: creatorProfile } = await supabase
      .from('gyeol_gamification_profiles')
      .select('coins')
      .eq('agent_id', skin.creator_id)
      .maybeSingle();
    if (creatorProfile) {
      await supabase.from('gyeol_gamification_profiles')
        .update({ coins: (creatorProfile.coins ?? 0) + sellerReceives })
        .eq('agent_id', skin.creator_id);
      await supabase.from('gyeol_coin_transactions').insert({
        agent_id: skin.creator_id,
        amount: sellerReceives,
        tx_type: 'earn',
        description: `Skin sale (commission: ${commission})`,
        related_item_id: skinId,
        related_agent_id: agentId,
      });
    }
  }

  await supabase.from('gyeol_market_skins')
    .update({ downloads: (skin as Record<string, number>).downloads ? (skin as Record<string, number>).downloads + 1 : 1 })
    .eq('id', skinId);

  return NextResponse.json({ ok: true, pricePaid: finalPrice, newBalance, couponApplied: !!couponId });
}
