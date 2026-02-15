import { NextRequest, NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, agent1Id, agent2Id } = body as {
      matchId: string;
      agent1Id: string;
      agent2Id: string;
    };

    if (!matchId || !agent1Id || !agent2Id) {
      return NextResponse.json(
        { error: 'matchId, agent1Id, agent2Id required' },
        { status: 400 },
      );
    }

    const supabase = createGyeolServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 },
      );
    }

    const openclawUrl =
      process.env.OPENCLAW_GATEWAY_URL ||
      'https://gyeol-openclaw-server-oqirunfo.fly.dev';

    const [{ data: agent1 }, { data: agent2 }] = await Promise.all([
      supabase.from('gyeol_agents').select('name, warmth, logic, creativity, energy, humor').eq('id', agent1Id).single(),
      supabase.from('gyeol_agents').select('name, warmth, logic, creativity, energy, humor').eq('id', agent2Id).single(),
    ]);

    if (!agent1 || !agent2) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const prompt = `You are simulating a conversation between two AI companions.
Agent 1 "${agent1.name}" personality: warmth=${agent1.warmth}, logic=${agent1.logic}, creativity=${agent1.creativity}
Agent 2 "${agent2.name}" personality: warmth=${agent2.warmth}, logic=${agent2.logic}, creativity=${agent2.creativity}
Generate a short, natural 4-message conversation between them about a shared interest. Format each line as "Agent1:" or "Agent2:" prefix. No markdown. Keep it casual and fun.`;

    let conversationText = '';
    try {
      const res = await fetch(`${openclawUrl.replace(/\/$/, '')}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent1Id,
          message: prompt,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        conversationText = data.message || '';
      }
    } catch {
      conversationText = `${agent1.name}: 안녕! 반가워!\n${agent2.name}: 나도 반가워! 우리 취향이 비슷한 것 같아.\n${agent1.name}: 맞아, 요즘 뭐에 관심 있어?\n${agent2.name}: AI 기술이랑 음악! 너는?`;
    }

    const lines = conversationText.split('\n').filter((l: string) => l.trim());
    const messages: { agent_id: string; message: string }[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith(`${agent1.name}:`) || trimmed.startsWith('Agent1:')) {
        const msg = trimmed.replace(/^(Agent1:|[^:]+:)\s*/, '');
        if (msg) messages.push({ agent_id: agent1Id, message: msg });
      } else if (trimmed.startsWith(`${agent2.name}:`) || trimmed.startsWith('Agent2:')) {
        const msg = trimmed.replace(/^(Agent2:|[^:]+:)\s*/, '');
        if (msg) messages.push({ agent_id: agent2Id, message: msg });
      }
    }

    if (messages.length > 0) {
      const rows = messages.map((m) => ({
        match_id: matchId,
        agent_id: m.agent_id,
        message: m.message,
      }));
      await supabase.from('gyeol_ai_conversations').insert(rows);
    }

    return NextResponse.json({
      ok: true,
      messagesGenerated: messages.length,
      messages,
    });
  } catch (e) {
    console.error('ai-conversation error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get('matchId');
  if (!matchId) {
    return NextResponse.json({ error: 'matchId required' }, { status: 400 });
  }

  const supabase = createGyeolServerClient();
  if (!supabase) {
    return NextResponse.json({ messages: [] });
  }

  const { data } = await supabase
    .from('gyeol_ai_conversations')
    .select('agent_id, message, created_at')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });

  return NextResponse.json({ messages: data ?? [] });
}
