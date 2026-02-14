/**
 * GYEOL 시스템 상태 — Kill Switch, 활동 수, 에러 수
 */

import { NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function GET() {
  const supabase = createGyeolServerClient();
  const { data: killSwitch } = await supabase
    .from('gyeol_system_state')
    .select('value')
    .eq('key', 'kill_switch')
    .single();

  const { count: activityCount } = await supabase
    .from('gyeol_autonomous_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const { count: errorCount } = await supabase
    .from('gyeol_autonomous_logs')
    .select('*', { count: 'exact', head: true })
    .eq('activity_type', 'error')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const value = (killSwitch?.value as { active?: boolean; reason?: string }) ?? {};
  return NextResponse.json({
    killSwitch: value.active === true,
    reason: value.reason ?? null,
    last24hActivityCount: activityCount ?? 0,
    last24hErrorCount: errorCount ?? 0,
  });
}
