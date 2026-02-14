import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId');
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 30, 100);
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  const { data, error } = await supabase
    .from('gyeol_autonomous_logs')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
