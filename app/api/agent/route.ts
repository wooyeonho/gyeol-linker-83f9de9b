/**
 * GYEOL 에이전트 조회/생성 — userId 기준
 * Supabase 없으면 인메모리 기본 에이전트 반환
 */

import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

const DEFAULT_VISUAL = {
  color_primary: '#FFFFFF',
  color_secondary: '#4F46E5',
  glow_intensity: 0.3,
  particle_count: 10,
  form: 'point',
};

function makeDefaultAgent(userId: string, name = 'GYEOL') {
  return {
    id: `local-${userId}`,
    user_id: userId,
    name,
    gen: 1,
    warmth: 50,
    logic: 50,
    creativity: 50,
    energy: 50,
    humor: 50,
    total_conversations: 0,
    evolution_progress: 0,
    visual_state: DEFAULT_VISUAL,
    created_at: new Date().toISOString(),
    last_active: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) {
    return NextResponse.json(makeDefaultAgent(userId));
  }

  const { data, error } = await supabase
    .from('gyeol_agents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json(makeDefaultAgent(userId));
  if (data) return NextResponse.json(data);
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { userId, name = 'GYEOL' } = body as { userId?: string; name?: string };
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) {
    return NextResponse.json(makeDefaultAgent(userId, name));
  }

  const { data: existing } = await supabase
    .from('gyeol_agents')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (existing) return NextResponse.json(existing);

  const { data: user } = await supabase.from('gyeol_users').select('id').eq('id', userId).maybeSingle();
  if (!user) {
    const { error: insertUserError } = await supabase
      .from('gyeol_users')
      .upsert({ id: userId, display_name: 'User' }, { onConflict: 'id' });
    if (insertUserError) return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }

  const { data: agent, error } = await supabase
    .from('gyeol_agents')
    .insert({
      user_id: userId,
      name,
      visual_state: DEFAULT_VISUAL,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(agent);
}
