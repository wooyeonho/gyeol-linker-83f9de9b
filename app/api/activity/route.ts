/**
 * GYEOL 자율 활동 로그 조회
 * Supabase → GYEOL 서버 → 빈 배열 폴백
 */

import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL || '';

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId');
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 30, 100);
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('gyeol_autonomous_logs')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!error && data && data.length > 0) {
        return NextResponse.json(data);
      }
    } catch {
      // fallback to GYEOL server
    }
  }

  if (OPENCLAW_URL) {
    try {
      const res = await fetch(`${OPENCLAW_URL.replace(/\/$/, '')}/api/activity`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const logs = await res.json();
        return NextResponse.json(Array.isArray(logs) ? logs.slice(0, limit) : []);
      }
    } catch {
      // fallback to empty
    }
  }

  return NextResponse.json([]);
}
