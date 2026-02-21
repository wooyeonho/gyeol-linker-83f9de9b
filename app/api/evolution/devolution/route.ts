import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken, getAgentForUser } from '@/lib/gyeol/auth-helper';
import { checkDevolution } from '@/lib/gyeol/devolution';

export async function POST(req: NextRequest) {
  const userId = getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { agentId } = body as { agentId?: string };
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });

  const agent = await getAgentForUser(agentId, userId);
  if (!agent) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const result = await checkDevolution(agentId);
  return NextResponse.json(result);
}
