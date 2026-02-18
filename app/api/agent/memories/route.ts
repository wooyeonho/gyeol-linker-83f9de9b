import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

const CATEGORY_LABELS: Record<string, string> = {
  identity: 'Identity',
  preference: 'Preference',
  interest: 'Interest',
  relationship: 'Relationship',
  goal: 'Goal',
  emotion: 'Emotion',
  experience: 'Experience',
  style: 'Style',
  knowledge_level: 'Knowledge Level',
};

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId');
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB not available' }, { status: 503 });

  const { data, error } = await supabase
    .from('gyeol_user_memories')
    .select('id, category, key, value, confidence, access_count, updated_at')
    .eq('agent_id', agentId)
    .gte('confidence', 50)
    .order('category')
    .order('confidence', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const grouped: Record<string, { label: string; memories: typeof data }> = {};
  for (const mem of data ?? []) {
    const cat = mem.category;
    if (!grouped[cat]) {
      grouped[cat] = { label: CATEGORY_LABELS[cat] ?? cat, memories: [] };
    }
    grouped[cat].memories.push(mem);
  }

  const totalCount = (data ?? []).length;
  const avgConfidence = totalCount > 0
    ? Math.round((data ?? []).reduce((s, m) => s + m.confidence, 0) / totalCount)
    : 0;

  return NextResponse.json({
    categories: grouped,
    stats: { totalCount, avgConfidence, categoryCount: Object.keys(grouped).length },
  });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { id, agentId } = body as { id: string; agentId: string };
  if (!id || !agentId) return NextResponse.json({ error: 'id and agentId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB not available' }, { status: 503 });

  const { error } = await supabase
    .from('gyeol_user_memories')
    .delete()
    .eq('id', id)
    .eq('agent_id', agentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, agentId, value } = body as { id: string; agentId: string; value: string };
  if (!id || !agentId || !value) return NextResponse.json({ error: 'id, agentId, value required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB not available' }, { status: 503 });

  const { error } = await supabase
    .from('gyeol_user_memories')
    .update({ value, confidence: 100, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('agent_id', agentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: true });
}
