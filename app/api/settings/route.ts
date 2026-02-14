import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

const STATE_TABLE = 'gyeol_system_state';

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId');
  if (!agentId) {
    return NextResponse.json({ error: 'agentId required' }, { status: 400 });
  }

  const supabase = createGyeolServerClient();
  const { data } = await supabase
    .from(STATE_TABLE)
    .select('value')
    .eq('key', `settings:${agentId}`)
    .single();

  const defaults = {
    autonomyLevel: 50,
    contentFilterOn: true,
    notificationsOn: true,
  };

  if (!data?.value) {
    return NextResponse.json(defaults);
  }

  return NextResponse.json({ ...defaults, ...(data.value as Record<string, unknown>) });
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
    .from(STATE_TABLE)
    .select('value')
    .eq('key', `settings:${agentId}`)
    .single();

  const current = (existing?.value as Record<string, unknown>) ?? {};
  const updated = {
    ...current,
    ...(typeof autonomyLevel === 'number' ? { autonomyLevel: Math.max(0, Math.min(100, autonomyLevel)) } : {}),
    ...(typeof contentFilterOn === 'boolean' ? { contentFilterOn } : {}),
    ...(typeof notificationsOn === 'boolean' ? { notificationsOn } : {}),
  };

  await supabase.from(STATE_TABLE).upsert({
    key: `settings:${agentId}`,
    value: updated,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, settings: updated });
}
