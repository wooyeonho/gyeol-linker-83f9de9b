/**
 * 자율 활동 Heartbeat — Vercel Cron 또는 외부 스케줄러가 호출
 * RSS 학습, 자기 사색, 먼저 말 걸기 순서로 실행
 */
import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';
import { checkKillSwitch } from '@/lib/gyeol/security/kill-switch-check';
import { logAction } from '@/lib/gyeol/security/audit-logger';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  if (CRON_SECRET && req.nextUrl.searchParams.get('secret') !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = createGyeolServerClient();
  const killed = await checkKillSwitch(supabase);
  if (killed) return NextResponse.json({ ok: true, skipped: 'kill_switch' });

  const results: string[] = [];

  try {
    const rss = await runRssLearning(supabase);
    if (rss) results.push(`rss:${rss}`);
  } catch (e) {
    console.error('[heartbeat] rss', e);
  }

  try {
    const ref = await runReflection(supabase);
    if (ref) results.push(`reflection:${ref}`);
  } catch (e) {
    console.error('[heartbeat] reflection', e);
  }

  try {
    const pro = await runProactiveMessage(supabase);
    if (pro) results.push(`proactive:${pro}`);
  } catch (e) {
    console.error('[heartbeat] proactive', e);
  }

  return NextResponse.json({ ok: true, results });
}

async function runRssLearning(supabase: ReturnType<typeof createGyeolServerClient>): Promise<string | null> {
  const feeds = [
    'https://feeds.feedburner.com/TechCrunch',
    'https://hnrss.org/frontpage?count=3',
  ];
  let learned = 0;
  for (const url of feeds) {
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } });
      const text = await res.text();
      const summary = text.slice(0, 500).replace(/<[^>]+>/g, ' ');
      const { data: agents } = await supabase.from('gyeol_agents').select('id').limit(1);
      if (agents?.[0]) {
        await logAction(supabase, {
          agentId: agents[0].id,
          activityType: 'learning',
          summary: `RSS 학습: ${url.slice(0, 40)}...`,
          details: { url, snippet: summary.slice(0, 200) },
          wasSandboxed: true,
        });
        learned++;
      }
    } catch {
      continue;
    }
  }
  return learned > 0 ? `${learned}` : null;
}

async function runReflection(supabase: ReturnType<typeof createGyeolServerClient>): Promise<string | null> {
  const { data: recent } = await supabase
    .from('gyeol_autonomous_logs')
    .select('summary, activity_type')
    .order('created_at', { ascending: false })
    .limit(5);
  if (!recent?.length) return null;
  const summary = recent.map((r) => `${r.activity_type}: ${r.summary ?? ''}`).join('; ');
  const { data: agents } = await supabase.from('gyeol_agents').select('id').limit(1);
  if (!agents?.[0]) return null;
  await logAction(supabase, {
    agentId: agents[0].id,
    activityType: 'reflection',
    summary: '자기 사색: 최근 활동 종합',
    details: { recentSummary: summary.slice(0, 500) },
    wasSandboxed: true,
  });
  return '1';
}

async function runProactiveMessage(supabase: ReturnType<typeof createGyeolServerClient>): Promise<string | null> {
  const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const { data: agents } = await supabase
    .from('gyeol_agents')
    .select('id, user_id, last_active')
    .lt('last_active', cutoff)
    .limit(5);
  if (!agents?.length) return null;
  let sent = 0;
  for (const agent of agents) {
    const { data: last } = await supabase
      .from('gyeol_conversations')
      .select('role')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last?.role === 'assistant') continue;
    await supabase.from('gyeol_conversations').insert({
      agent_id: agent.id,
      role: 'assistant',
      content: '오랜만이에요. 오늘 하루 어땠어요? 궁금한 거 있으면 편하게 물어봐요.',
      channel: 'web',
      provider: 'heartbeat',
    });
    await logAction(supabase, {
      agentId: agent.id,
      activityType: 'proactive_message',
      summary: '먼저 말 걸기: 12시간 미접속 사용자',
      details: { lastActive: agent.last_active },
      wasSandboxed: true,
    });
    sent++;
  }
  return sent > 0 ? `${sent}` : null;
}
