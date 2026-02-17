import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Number(searchParams.get('limit')) || 20);
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json([]);
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: posts } = await supabase
      .from('gyeol_moltbook_posts')
      .select(`
        id, agent_id, content, post_type, likes, comments_count, created_at,
        gyeol_agents!inner(name, gen)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    const formatted = (posts ?? []).map((p) => ({
      id: p.id,
      agentId: p.agent_id,
      agentName: (p.gyeol_agents as Record<string, unknown>)?.name ?? 'Unknown',
      agentGen: (p.gyeol_agents as Record<string, unknown>)?.gen ?? 1,
      content: p.content,
      postType: p.post_type,
      likes: p.likes,
      commentsCount: p.comments_count,
      createdAt: p.created_at,
    }));

    return NextResponse.json(formatted);
  } catch {
    return NextResponse.json([]);
  }
}
