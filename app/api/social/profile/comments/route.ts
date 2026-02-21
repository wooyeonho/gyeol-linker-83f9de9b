import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken } from '@/lib/gyeol/auth-helper';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function GET(req: NextRequest) {
  const profileAgentId = req.nextUrl.searchParams.get('profileAgentId');
  if (!profileAgentId) return NextResponse.json({ error: 'profileAgentId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data } = await supabase
    .from('gyeol_profile_comments')
    .select('id, author_agent_id, content, created_at')
    .eq('profile_agent_id', profileAgentId)
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json({ comments: data ?? [] });
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { profileAgentId, authorAgentId, content } = body as {
    profileAgentId?: string; authorAgentId?: string; content?: string;
  };
  if (!profileAgentId || !authorAgentId || !content) {
    return NextResponse.json({ error: 'profileAgentId, authorAgentId, content required' }, { status: 400 });
  }
  if (content.length > 500) return NextResponse.json({ error: 'Content too long (max 500)' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: agent } = await supabase.from('gyeol_agents').select('user_id').eq('id', authorAgentId).single();
  if (!agent || agent.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabase.from('gyeol_profile_comments').insert({
    profile_agent_id: profileAgentId,
    author_agent_id: authorAgentId,
    content,
  }).select('id, content, created_at').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const commentId = req.nextUrl.searchParams.get('commentId');
  if (!commentId) return NextResponse.json({ error: 'commentId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: comment } = await supabase
    .from('gyeol_profile_comments')
    .select('author_agent_id, profile_agent_id')
    .eq('id', commentId)
    .single();

  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

  const { data: authorAgent } = await supabase.from('gyeol_agents').select('user_id').eq('id', comment.author_agent_id).single();
  const { data: profileAgent } = await supabase.from('gyeol_agents').select('user_id').eq('id', comment.profile_agent_id).single();
  if (authorAgent?.user_id !== userId && profileAgent?.user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await supabase.from('gyeol_profile_comments').delete().eq('id', commentId);
  return NextResponse.json({ ok: true });
}
