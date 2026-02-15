/**
 * GYEOL 시스템 상태 — OpenClaw 연결, Telegram, Kill Switch
 */

import { NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL || '';

export async function GET() {
  let openclaw = false;
  let telegramConfigured = false;
  let telegramBotUsername = '';
  let groqConfigured = false;

  try {
    const res = await fetch(`${OPENCLAW_URL.replace(/\/$/, '')}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      openclaw = true;
      telegramConfigured = data.checks?.telegram === 'configured';
      groqConfigured = data.checks?.groq === 'configured';
    }
  } catch {}

  if (telegramConfigured) {
    try {
      const res = await fetch(`${OPENCLAW_URL.replace(/\/$/, '')}/api/status`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        telegramBotUsername = data.telegram_bot_username || '';
      }
    } catch {}
  }

  let killSwitchValue: { active?: boolean; reason?: string } = {};
  let activityCount = 0;
  let errorCount = 0;
  try {
    const supabase = createGyeolServerClient();
    const { data: killSwitch } = await supabase
      .from('gyeol_system_state')
      .select('value')
      .eq('key', 'kill_switch')
      .single();
    killSwitchValue = (killSwitch?.value as { active?: boolean; reason?: string }) ?? {};

    const { count: ac } = await supabase
      .from('gyeol_autonomous_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    activityCount = ac ?? 0;

    const { count: ec } = await supabase
      .from('gyeol_autonomous_logs')
      .select('*', { count: 'exact', head: true })
      .eq('activity_type', 'error')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    errorCount = ec ?? 0;
  } catch {}

  return NextResponse.json({
    openclaw,
    groqConfigured,
    telegramConfigured,
    telegramBotUsername,
    killSwitch: killSwitchValue.active === true,
    reason: killSwitchValue.reason ?? null,
    last24hActivityCount: activityCount,
    last24hErrorCount: errorCount,
  });
}
