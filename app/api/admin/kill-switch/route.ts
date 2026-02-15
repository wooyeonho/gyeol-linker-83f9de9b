/**
 * GYEOL Kill Switch — 관리자 전용 활성화/비활성화
 */

import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';
import { invalidateKillSwitchCache } from '@/lib/gyeol/security/kill-switch-check';

const AUTH_HEADER = 'Authorization';
const TOKEN_PREFIX = 'Bearer ';

function getToken(req: NextRequest): string | null {
  const v = req.headers.get(AUTH_HEADER);
  if (!v?.startsWith(TOKEN_PREFIX)) return null;
  return v.slice(TOKEN_PREFIX.length).trim();
}

export async function POST(req: NextRequest) {
  const token = getToken(req);
  const killSwitchToken = process.env.KILL_SWITCH_TOKEN;
  if (!killSwitchToken || token !== killSwitchToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { action, reason } = body as { action?: string; reason?: string };

  if (action !== 'activate' && action !== 'deactivate') {
    return NextResponse.json({ error: 'action must be activate or deactivate' }, { status: 400 });
  }

  const supabase = createGyeolServerClient();
  invalidateKillSwitchCache();

  if (action === 'activate') {
    await supabase.from('gyeol_system_state').update({
      kill_switch: true,
      reason: reason ?? 'Admin activated',
      updated_at: new Date().toISOString(),
    }).eq('id', 'global');
    return NextResponse.json({ ok: true, killSwitch: 'active' });
  }

  await supabase.from('gyeol_system_state').update({
    kill_switch: false,
    reason: null,
    updated_at: new Date().toISOString(),
  }).eq('id', 'global');
  return NextResponse.json({ ok: true, killSwitch: 'inactive' });
}
