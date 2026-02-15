import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

const AGENTS_TABLE = 'gyeol_agents';

const DEFAULTS = {
  autonomyLevel: 50,
  contentFilterOn: true,
  notificationsOn: true,
};

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId');
  if (!agentId) {
    return NextResponse.json({ error: 'agentId required' }, { status: 400 });
  }

  const supabase = createGyeolServerClient();
  const { data } = await supabase
    .from(AGENTS_TABLE)
    .select('settings')
    .eq('id', agentId)
    .single();

  if (!data?.settings) {
    return NextResponse.json(DEFAULTS);
  }

  return NextResponse.json({ ...DEFAULTS, ...(data.settings as Record<string, unknown>) });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { agentId, autonomyLevel, contentFilterOn, notificationsOn } = body as {
    agentId?: string;
    autonomyLevel?: number;
    contentFilterOn?: boolean;
    notificationsOn?: boolean;
  };

  if (!agentId) {
    return NextResponse.json({ error: 'agentId required' }, { status: 400 });
  }

  const supabase = createGyeolServerClient();

  const { data: existing } = await supabase
    .from(AGENTS_TABLE)
    .select('settings')
    .eq('id', agentId)
    .single();

  const current = (existing?.settings as Record<string, unknown>) ?? {};
  const updated = {
    ...current,
    ...(typeof autonomyLevel === 'number' ? { autonomyLevel: Math.max(0, Math.min(100, autonomyLevel)) } : {}),
    ...(typeof contentFilterOn === 'boolean' ? { contentFilterOn } : {}),
    ...(typeof notificationsOn === 'boolean' ? { notificationsOn } : {}),
  };

  await supabase.from(AGENTS_TABLE).update({
    settings: updated,
  }).eq('id', agentId);

  return NextResponse.json({ ok: true, settings: updated });
}
