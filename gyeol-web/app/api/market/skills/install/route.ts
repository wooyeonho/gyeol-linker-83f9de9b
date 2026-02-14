/**
 * 스킬 설치 — 구매 후 설치 (에이전트에 스킬 활성화)
 * 실제 OpenClaw 연동은 별도; 여기서는 구매 기록 + 로그만
 */
import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';
import { logAction } from '@/lib/gyeol/security/audit-logger';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { agentId, skillId } = body as { agentId?: string; skillId?: string };
  if (!agentId || !skillId) {
    return NextResponse.json({ error: 'agentId and skillId required' }, { status: 400 });
  }
  const supabase = createGyeolServerClient();
  await logAction(supabase, {
    agentId,
    activityType: 'skill_execution',
    summary: '스킬 설치',
    details: { skillId, action: 'install' },
    wasSandboxed: true,
  });
  return NextResponse.json({ ok: true });
}
