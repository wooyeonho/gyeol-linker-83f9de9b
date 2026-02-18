import { NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';
import { attemptBreeding, checkBreedingEligibility } from '@/lib/gyeol/breeding';

export async function POST(req: Request) {
  try {
    const { agent1Id, agent2Id, userId } = await req.json();
    if (!agent1Id || !agent2Id || !userId) {
      return NextResponse.json({ error: 'agent1Id, agent2Id, userId required' }, { status: 400 });
    }
    const supabase = createGyeolServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Server configuration error: missing service role key' }, { status: 500 });
    }
    const result = await attemptBreeding(supabase, agent1Id, agent2Id, userId);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agent1Id = searchParams.get('agent1Id');
    const agent2Id = searchParams.get('agent2Id');
    if (!agent1Id || !agent2Id) {
      return NextResponse.json({ error: 'agent1Id, agent2Id required' }, { status: 400 });
    }
    const supabase = createGyeolServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Server configuration error: missing service role key' }, { status: 500 });
    }
    const result = await checkBreedingEligibility(supabase, agent1Id, agent2Id);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
