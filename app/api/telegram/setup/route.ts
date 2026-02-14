import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const { webhookUrl, secret } = body as { webhookUrl?: string; secret?: string };

  if (!webhookUrl) {
    return NextResponse.json({ error: 'webhookUrl required' }, { status: 400 });
  }

  const params: Record<string, string> = { url: webhookUrl };
  if (secret) params.secret_token = secret;

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  return NextResponse.json(data);
}
