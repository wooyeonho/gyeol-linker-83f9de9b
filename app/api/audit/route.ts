import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken } from '@/lib/gyeol/auth-helper';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function GET(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const limit = Math.min(100, Number(req.nextUrl.searchParams.get('limit')) || 50);
  const offset = Number(req.nextUrl.searchParams.get('offset')) || 0;
  const action = req.nextUrl.searchParams.get('action');

  let query = supabase
    .from('gyeol_audit_logs')
    .select('id, action, resource_type, resource_id, details, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (action) query = query.eq('action', action);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data ?? [], limit, offset });
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { action, resourceType, resourceId, agentId, details } = body as {
    action?: string; resourceType?: string; resourceId?: string; agentId?: string; details?: Record<string, unknown>;
  };
  if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? null;
  const ua = req.headers.get('user-agent') ?? null;

  await supabase.from('gyeol_audit_logs').insert({
    user_id: userId,
    agent_id: agentId ?? null,
    action,
    resource_type: resourceType ?? null,
    resource_id: resourceId ?? null,
    ip_address: ip,
    user_agent: ua,
    details: details ?? {},
  });

  return NextResponse.json({ ok: true });
}
