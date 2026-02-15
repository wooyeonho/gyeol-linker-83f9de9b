/**
 * OpenClaw 서버 상태 조회 API
 * 프론트엔드 활동 페이지에서 서버 상태 표시용
 */

import { NextResponse } from 'next/server';

const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL || '';

export async function GET() {
  if (!OPENCLAW_URL) {
    return NextResponse.json({ connected: false, error: 'OpenClaw not configured' });
  }

  try {
    const res = await fetch(`${OPENCLAW_URL.replace(/\/$/, '')}/api/status`, {
      signal: AbortSignal.timeout(5000),
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      return NextResponse.json({ connected: false, error: `HTTP ${res.status}` });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ connected: false, error: 'Connection failed' });
  }
}
