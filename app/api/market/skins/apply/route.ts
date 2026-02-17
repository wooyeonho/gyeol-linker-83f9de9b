import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export async function POST(req: Request) {
  try {
    const { agentId, skinId } = await req.json();
    if (!agentId || !skinId) {
      return NextResponse.json({ error: 'agentId and skinId required' }, { status: 400 });
    }
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateErr } = await supabase
      .from('gyeol_agents')
      .update({ active_skin_id: skinId })
      .eq('id', agentId);
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    await supabase.from('gyeol_agent_skins').upsert(
      { agent_id: agentId, skin_id: skinId, equipped_at: new Date().toISOString() },
      { onConflict: 'agent_id,skin_id' },
    );

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
