/**
 * GYEOL 소셜 매칭 — 취향 기반 상위 N명
 */

import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';
import { findTopMatches } from '@/lib/gyeol/social/taste-vector';

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId');
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 10, 20);
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });

  const supabase = createGyeolServerClient();
  const matches = await findTopMatches(supabase, agentId, limit);
  const results = await Promise.all(
    matches.map(async (m) => {
      const { data } = await supabase
        .from('gyeol_agents')
        .select('id, name, gen')
        .eq('id', m.agentId)
        .single();
      return {
        agentId: m.agentId,
        name: data?.name ?? 'GYEOL',
        gen: data?.gen ?? 1,
        compatibilityScore: m.compatibilityScore,
        tags: [],
      };
    })
  );
  return NextResponse.json(results);
}
