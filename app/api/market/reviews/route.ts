import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken } from '@/lib/gyeol/auth-helper';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function GET(req: NextRequest) {
  const itemType = req.nextUrl.searchParams.get('itemType');
  const itemId = req.nextUrl.searchParams.get('itemId');
  if (!itemType || !itemId) return NextResponse.json({ error: 'itemType, itemId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data } = await supabase
    .from('gyeol_market_reviews')
    .select('id, reviewer_agent_id, rating, content, created_at')
    .eq('item_type', itemType)
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(50);

  const reviews = data ?? [];
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length
    : 0;

  return NextResponse.json({ reviews, avgRating: Math.round(avgRating * 10) / 10, count: reviews.length });
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { reviewerAgentId, itemType, itemId, rating, content } = body as {
    reviewerAgentId?: string; itemType?: string; itemId?: string; rating?: number; content?: string;
  };
  if (!reviewerAgentId || !itemType || !itemId || !rating) {
    return NextResponse.json({ error: 'reviewerAgentId, itemType, itemId, rating required' }, { status: 400 });
  }
  if (rating < 1 || rating > 5) return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: agent } = await supabase.from('gyeol_agents').select('user_id').eq('id', reviewerAgentId).single();
  if (!agent || agent.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabase.from('gyeol_market_reviews').upsert({
    item_type: itemType,
    item_id: itemId,
    reviewer_agent_id: reviewerAgentId,
    rating,
    content: content ?? null,
  }, { onConflict: 'item_type,item_id,reviewer_agent_id' }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const table = itemType === 'skin' ? 'gyeol_market_skins' : 'gyeol_market_skills';
  const { data: allReviews } = await supabase
    .from('gyeol_market_reviews')
    .select('rating')
    .eq('item_type', itemType)
    .eq('item_id', itemId);

  if (allReviews && allReviews.length > 0) {
    const avg = allReviews.reduce((s, r) => s + (r.rating ?? 0), 0) / allReviews.length;
    await supabase.from(table).update({ rating: Math.round(avg * 10) / 10 }).eq('id', itemId);
  }

  return NextResponse.json({ ok: true, reviewId: data?.id });
}

export async function DELETE(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const reviewId = req.nextUrl.searchParams.get('reviewId');
  if (!reviewId) return NextResponse.json({ error: 'reviewId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: review } = await supabase
    .from('gyeol_market_reviews')
    .select('reviewer_agent_id')
    .eq('id', reviewId)
    .single();
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

  const { data: agent } = await supabase.from('gyeol_agents').select('user_id').eq('id', review.reviewer_agent_id).single();
  if (!agent || agent.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await supabase.from('gyeol_market_reviews').delete().eq('id', reviewId);
  return NextResponse.json({ ok: true });
}
