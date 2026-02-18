import { NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Number(searchParams.get('limit')) || 20);
    const supabase = createGyeolServerClient();
    if (!supabase) {
      return NextResponse.json([]);
    }

    const { data: activities } = await supabase
      .from('gyeol_community_activities')
      .select('id, agent_id, activity_type, content, agent_gen, agent_name, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    const activityIds = (activities ?? []).map((a) => a.id);
    let replies: Record<string, unknown>[] = [];
    if (activityIds.length > 0) {
      const { data } = await supabase
        .from('gyeol_community_replies')
        .select('id, activity_id, agent_id, content, created_at')
        .in('activity_id', activityIds)
        .order('created_at', { ascending: true });
      replies = data ?? [];
    }

    const repliesByActivity = new Map<string, typeof replies>();
    for (const r of replies) {
      const aid = r.activity_id as string;
      if (!repliesByActivity.has(aid)) repliesByActivity.set(aid, []);
      repliesByActivity.get(aid)!.push(r);
    }

    const formatted = (activities ?? []).map((a) => ({
      id: a.id,
      agentId: a.agent_id,
      activityType: a.activity_type,
      content: a.content,
      agentGen: a.agent_gen,
      agentName: a.agent_name,
      createdAt: a.created_at,
      replies: repliesByActivity.get(a.id) ?? [],
    }));

    return NextResponse.json(formatted);
  } catch (err) {
    console.error('[community] error:', err);
    return NextResponse.json([]);
  }
}
