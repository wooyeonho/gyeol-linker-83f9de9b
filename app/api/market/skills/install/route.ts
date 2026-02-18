import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = createGyeolServerClient();
  const { agentId, skillId } = await req.json();
  if (!agentId || !skillId) {
    return NextResponse.json({ error: 'agentId, skillId required' }, { status: 400 });
  }

  await supabase.from('gyeol_agent_skills')
    .upsert({ agent_id: agentId, skill_id: skillId, is_active: true },
      { onConflict: 'agent_id,skill_id' });

  return NextResponse.json({ ok: true });
}
