import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken, getAgentForUser } from '@/lib/gyeol/auth-helper';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function POST(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { agentId } = body as { agentId?: string };
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });

  const agent = await getAgentForUser(agentId, userId);
  if (!agent) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { error } = await supabase
    .from('gyeol_agents')
    .update({
      gen: 1,
      warmth: 50,
      logic: 50,
      creativity: 50,
      energy: 50,
      humor: 50,
      evolution_progress: 0,
      intimacy: 0,
      mood: 'neutral',
      visual_state: {
        color_primary: '#FFFFFF',
        color_secondary: '#4F46E5',
        glow_intensity: 0.3,
        particle_count: 10,
        form: 'point',
      },
    })
    .eq('id', agentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, message: 'Agent reset to defaults' });
}
