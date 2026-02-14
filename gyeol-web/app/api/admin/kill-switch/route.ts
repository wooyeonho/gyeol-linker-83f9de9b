import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';
import { invalidateKillSwitchCache } from '@/lib/gyeol/security/kill-switch-check';

const KEY = 'kill_switch';
function getToken(req: NextRequest): string | null {
  const v = req.headers.get('Authorization');
  if (!v?.startsWith('Bearer ')) return null;
  return v.slice(7).trim();
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
    await supabase.from('gyeol_system_state').upsert({
      key: KEY,
      value: { active: true, reason: reason ?? 'Admin activated', activated_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, killSwitch: 'active' });
  }

  await supabase.from('gyeol_system_state').upsert({
    key: KEY,
    value: { active: false, reason: null, activated_at: null },
    updated_at: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true, killSwitch: 'inactive' });
}
