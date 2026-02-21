import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { profileAgentId, viewerAgentId } = body as { profileAgentId?: string; viewerAgentId?: string };
  if (!profileAgentId) return NextResponse.json({ error: 'profileAgentId required' }, { status: 400 });
  if (profileAgentId === viewerAgentId) return NextResponse.json({ ok: true, self: true });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? null;

  await supabase.from('gyeol_profile_views').insert({
    profile_agent_id: profileAgentId,
    viewer_agent_id: viewerAgentId ?? null,
    viewer_ip: ip,
  });

  await supabase.rpc('increment_profile_views', { p_agent_id: profileAgentId }).catch(() => {
    supabase.from('gyeol_agents')
      .update({ profile_views_count: 1 })
      .eq('id', profileAgentId)
      .then(() => {});
  });

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const profileAgentId = req.nextUrl.searchParams.get('profileAgentId');
  if (!profileAgentId) return NextResponse.json({ error: 'profileAgentId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ count: 0 });

  const { data: agent } = await supabase
    .from('gyeol_agents')
    .select('profile_views_count')
    .eq('id', profileAgentId)
    .single();

  return NextResponse.json({ count: agent?.profile_views_count ?? 0 });
}
