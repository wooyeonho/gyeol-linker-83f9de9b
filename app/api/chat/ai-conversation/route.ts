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

    const openclawUrl = process.env.OPENCLAW_GATEWAY_URL;
    if (!openclawUrl) {
      return NextResponse.json(
        { error: 'OPENCLAW_GATEWAY_URL not configured' },
        { status: 503 },
      );
    }

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
Generate a short, natural 4-message conversation between them about a shared interest.
Respond ONLY in this JSON format:
{"messages": [{"agent": 1, "text": "message"}, {"agent": 2, "text": "message"}, ...]}
No markdown. Keep it casual and fun.`;

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

    const messages: { agent_id: string; message: string }[] = [];

    try {
      const jsonMatch = conversationText.match(/\{[\s\S]*"messages"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.messages)) {
          for (const m of parsed.messages) {
            const agentId = m.agent === 1 ? agent1Id : agent2Id;
            if (m.text) messages.push({ agent_id: agentId, message: m.text });
          }
        }
      }
    } catch {
      // JSON parsing failed, try line-based fallback
    }

    if (messages.length === 0) {
      const lines = conversationText.split('\n').filter((l: string) => l.trim());
      for (const line of lines) {
        const trimmed = line.trim().replace(/^\*\*/, '').replace(/\*\*$/, '').replace(/^\d+\.\s*/, '');
        const agent1Match = trimmed.match(/^(?:Agent\s*1|GYEOL|[^:]{1,20}):\s*(.+)/i);
        const agent2Match = trimmed.match(/^(?:Agent\s*2):\s*(.+)/i);
        if (agent1Match && agent1Match[1]) {
          messages.push({ agent_id: agent1Id, message: agent1Match[1] });
        } else if (agent2Match && agent2Match[1]) {
          messages.push({ agent_id: agent2Id, message: agent2Match[1] });
        }
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
