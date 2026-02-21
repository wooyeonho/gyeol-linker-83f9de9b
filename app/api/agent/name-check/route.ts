import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name');
  if (!name || name.length < 2 || name.length > 20) {
    return NextResponse.json({ error: 'Name must be 2-20 characters' }, { status: 400 });
  }

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ available: true });

  const { count } = await supabase
    .from('gyeol_agents')
    .select('*', { count: 'exact', head: true })
    .ilike('name', name);

  return NextResponse.json({ available: (count ?? 0) === 0, name });
}
