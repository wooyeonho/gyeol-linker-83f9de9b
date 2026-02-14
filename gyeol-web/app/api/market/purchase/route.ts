/**
 * 마켓 구매 — 스킨/스킬 구매 기록
 */
import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';
import { DEMO_USER_ID } from '@/lib/gyeol/constants';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { userId, agentId, itemType, itemId } = body as {
    userId?: string;
    agentId?: string;
    itemType?: 'skin' | 'skill';
    itemId?: string;
  };
  if (!itemType || !itemId) {
    return NextResponse.json({ error: 'itemType and itemId required' }, { status: 400 });
  }
  const uid = userId ?? DEMO_USER_ID;
  const supabase = createGyeolServerClient();
  let price = 0;
  if (itemType === 'skin') {
    const { data } = await supabase.from('gyeol_skins').select('price').eq('id', itemId).single();
    price = data?.price ?? 0;
  } else {
    const { data } = await supabase.from('gyeol_skills').select('price').eq('id', itemId).single();
    price = data?.price ?? 0;
  }
  const { data: row, error } = await supabase
    .from('gyeol_purchases')
    .insert({ user_id: uid, item_type: itemType, item_id: itemId, price })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (agentId && itemType === 'skin') {
    await supabase.from('gyeol_agents').update({ skin_id: itemId }).eq('id', agentId);
  }
  return NextResponse.json({ ok: true, purchaseId: row?.id });
}
