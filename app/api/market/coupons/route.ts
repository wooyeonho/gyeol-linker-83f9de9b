import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken } from '@/lib/gyeol/auth-helper';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  if (code) {
    const { data } = await supabase
      .from('gyeol_coupons')
      .select('id, code, discount_type, discount_value, applicable_type, expires_at, is_active')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle();

    if (!data) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Coupon expired' }, { status: 410 });
    }
    return NextResponse.json(data);
  }

  const { data } = await supabase
    .from('gyeol_coupons')
    .select('id, code, discount_type, discount_value, applicable_type, expires_at')
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(20);

  return NextResponse.json({ coupons: data ?? [] });
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { agentId, couponCode } = body as { agentId?: string; couponCode?: string };
  if (!agentId || !couponCode) return NextResponse.json({ error: 'agentId, couponCode required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: agent } = await supabase.from('gyeol_agents').select('user_id').eq('id', agentId).single();
  if (!agent || agent.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: coupon } = await supabase
    .from('gyeol_coupons')
    .select('*')
    .eq('code', couponCode)
    .eq('is_active', true)
    .maybeSingle();

  if (!coupon) return NextResponse.json({ error: 'Invalid coupon' }, { status: 404 });
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Coupon expired' }, { status: 410 });
  }
  if ((coupon.current_uses ?? 0) >= (coupon.max_uses ?? 100)) {
    return NextResponse.json({ error: 'Coupon usage limit reached' }, { status: 400 });
  }

  const { data: used } = await supabase
    .from('gyeol_coupon_uses')
    .select('id')
    .eq('coupon_id', coupon.id)
    .eq('agent_id', agentId)
    .maybeSingle();

  if (used) return NextResponse.json({ error: 'Coupon already used' }, { status: 409 });

  return NextResponse.json({
    valid: true,
    discount_type: coupon.discount_type,
    discount_value: coupon.discount_value,
    applicable_type: coupon.applicable_type,
  });
}
