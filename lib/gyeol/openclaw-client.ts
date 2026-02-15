/**
 * OpenClaw Gateway 클라이언트 — coollabsio/openclaw Docker 이미지 API
 * 포트 8080, /api/* 엔드포인트
 */
const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL ?? '';
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? '';

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (OPENCLAW_TOKEN) h['Authorization'] = `Bearer ${OPENCLAW_TOKEN}`;
  return h;
}

function baseUrl(): string {
  return OPENCLAW_URL.replace(/\/$/, '');
}

interface OpenClawStatus {
  connected: boolean;
  version?: string;
  uptime?: number;
  error?: string;
}

interface OpenClawChatResponse {
  message: string;
  model?: string;
  thinking?: string;
}

export async function getOpenClawStatus(): Promise<OpenClawStatus> {
  if (!OPENCLAW_URL) return { connected: false, error: 'OPENCLAW_GATEWAY_URL not set' };
  try {
    const res = await fetch(`${baseUrl()}/api/health`, {
      method: 'GET',
      headers: headers(),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { connected: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { connected: true, version: data.version, uptime: data.uptime };
  } catch (err) {
    return { connected: false, error: err instanceof Error ? err.message : 'Connection failed' };
  }
}

export async function openClawChat(
  agentId: string,
  message: string,
): Promise<OpenClawChatResponse | null> {
  if (!OPENCLAW_URL) return null;
  try {
    const res = await fetch(`${baseUrl()}/api/chat`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ agentId, message }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    return (await res.json()) as OpenClawChatResponse;
  } catch {
    return null;
  }
}

export async function triggerOpenClawHeartbeat(agentId: string): Promise<boolean> {
  if (!OPENCLAW_URL) return false;
  try {
    const res = await fetch(`${baseUrl()}/api/heartbeat`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ agentId }),
      signal: AbortSignal.timeout(30000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listOpenClawSkills(): Promise<string[]> {
  if (!OPENCLAW_URL) return [];
  try {
    const res = await fetch(`${baseUrl()}/api/skills`, {
      method: 'GET',
      headers: headers(),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.skills ?? []) as string[];
  } catch {
    return [];
  }
}

export interface OpenClawActivityLog {
  id: string;
  agent_id: string;
  activity_type: string;
  summary: string;
  details: Record<string, unknown>;
  was_sandboxed: boolean;
  created_at: string;
}

export async function getOpenClawActivity(limit = 30): Promise<OpenClawActivityLog[]> {
  if (!OPENCLAW_URL) return [];
  try {
    const res = await fetch(`${baseUrl()}/api/activity?limit=${limit}`, {
      method: 'GET',
      headers: headers(),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data.slice(0, limit) : []) as OpenClawActivityLog[];
  } catch {
    return [];
  }
}

export async function getOpenClawMemory(): Promise<Record<string, unknown> | null> {
  if (!OPENCLAW_URL) return null;
  try {
    const res = await fetch(`${baseUrl()}/api/memory`, {
      method: 'GET',
      headers: headers(),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
