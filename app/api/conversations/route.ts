/**
 * GYEOL 대화 목록 조회
 * Supabase 없으면 빈 배열 반환
 */

import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId');
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 50, 100);
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  if (!supabase) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabase
    .from('gyeol_conversations')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json([]);
  return NextResponse.json(data ?? []);
}
