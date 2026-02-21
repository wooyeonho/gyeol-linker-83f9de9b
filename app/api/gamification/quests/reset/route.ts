import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key');
  const expected = process.env.CRON_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!expected || apiKey !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createGyeolServerClient();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { count: dailyReset } = await supabase
    .from('gyeol_quest_progress')
    .update({ progress: 0, is_completed: false, claimed: false, reset_at: new Date().toISOString() })
    .in('quest_id', (
      await supabase.from('gyeol_quest_definitions').select('id').eq('quest_type', 'daily')
    ).data?.map((q) => q.id) ?? [])
    .select('*', { count: 'exact', head: true });

  const dayOfWeek = new Date().getDay();
  let weeklyReset = 0;
  if (dayOfWeek === 1) {
    const { count } = await supabase
      .from('gyeol_quest_progress')
      .update({ progress: 0, is_completed: false, claimed: false, reset_at: new Date().toISOString() })
      .in('quest_id', (
        await supabase.from('gyeol_quest_definitions').select('id').eq('quest_type', 'weekly')
      ).data?.map((q) => q.id) ?? [])
      .select('*', { count: 'exact', head: true });
    weeklyReset = count ?? 0;
  }

  return NextResponse.json({ ok: true, dailyReset: dailyReset ?? 0, weeklyReset });
}
