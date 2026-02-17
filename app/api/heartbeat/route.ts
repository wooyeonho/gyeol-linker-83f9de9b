import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';
import { runHeartbeat } from '@/lib/gyeol/heartbeat';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createGyeolServerClient();

  const { data: agents } = await supabase
    .from('gyeol_agents')
    .select('id')
    .order('last_active', { ascending: false })
    .limit(10);

  if (!agents || agents.length === 0) {
    return NextResponse.json({ message: 'No agents found', results: [] });
  }

  const results = [];
  for (const agent of agents) {
    const result = await runHeartbeat(supabase, agent.id);
    results.push(result);
  }

  return NextResponse.json({ message: 'Heartbeat complete', results });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { agentId } = body as { agentId?: string };

  if (!agentId) {
    return NextResponse.json({ error: 'agentId required' }, { status: 400 });
  }

  const supabase = createGyeolServerClient();
  const result = await runHeartbeat(supabase, agentId);
  return NextResponse.json(result);
}
