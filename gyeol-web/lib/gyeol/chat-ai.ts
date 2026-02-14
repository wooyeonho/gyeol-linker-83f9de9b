/**
 * GYEOL 채팅용 AI 호출 — BYOK/환경변수 키로 프로바이더 호출 (히스토리 지원)
 */

export type ChatProvider = 'openai' | 'groq' | 'deepseek' | 'anthropic' | 'gemini' | 'cloudflare';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const OPENAI_COMPATIBLE = ['openai', 'groq', 'deepseek'] as const;
const ENDPOINTS: Record<string, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
};

const MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  groq: 'llama-3.3-70b-versatile',
  deepseek: 'deepseek-chat',
};

/** 상황별 추천 프로바이더: 분석/코드 → deepseek, 이미지/복합 → gemini, 감정/경량 → cloudflare, 기본 → groq */
export function suggestProviderForMessage(userMessage: string): ChatProvider | null {
  const m = userMessage.toLowerCase().trim();
  if (/\b분석해|코드\s*짜|논리|추론|설명해\b/.test(m)) return 'deepseek';
  if (/\b이미지|그림|사진|보여|vision\b/.test(m)) return 'gemini';
  if (/\b기분|감정|어때|심심|짧게\b/.test(m)) return 'cloudflare';
  return null;
}

/** 단일 유저 메시지용 (히스토리 없음) */
export async function callProvider(
  provider: ChatProvider,
  apiKey: string,
  systemContent: string,
  userContent: string
): Promise<string> {
  return callProviderWithMessages(provider, apiKey, systemContent, [{ role: 'user', content: userContent }]);
}

/** 대화 히스토리 포함 호출. messages는 시간순(오래된 것 먼저), 마지막이 현재 user 메시지 */
export async function callProviderWithMessages(
  provider: ChatProvider,
  apiKey: string,
  systemContent: string,
  messages: ChatMessage[]
): Promise<string> {
  if (OPENAI_COMPATIBLE.includes(provider as (typeof OPENAI_COMPATIBLE)[number])) {
    const url = ENDPOINTS[provider] ?? ENDPOINTS.openai;
    const model = MODELS[provider] ?? MODELS.openai;
    const apiMessages = [{ role: 'system' as const, content: systemContent }, ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))];
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        max_tokens: 1024,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`${provider} ${res.status}: ${err}`);
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text) throw new Error(`${provider} empty response`);
    return text;
  }

  if (provider === 'anthropic') {
    const apiMessages = messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        system: systemContent,
        messages: apiMessages,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`anthropic ${res.status}: ${err}`);
    }
    const data = await res.json();
    const text = data.content?.[0]?.text ?? '';
    if (!text) throw new Error('anthropic empty response');
    return text;
  }

  if (provider === 'gemini') {
    const contents = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemContent }] },
          contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: '(안녕)' }] }],
          generationConfig: { maxOutputTokens: 1024 },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`gemini ${res.status}: ${err}`);
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) throw new Error('gemini empty response');
    return text;
  }

  if (provider === 'cloudflare') {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    if (!accountId || !apiToken) throw new Error('Cloudflare credentials not set');
    const apiMessages = [{ role: 'system' as const, content: systemContent }, ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))];
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          messages: apiMessages.map((m) => ({ role: m.role, content: m.content })),
          max_tokens: 1024,
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`cloudflare ${res.status}: ${err}`);
    }
    const data = await res.json();
    const text = data.result?.response ?? '';
    if (!text) throw new Error('cloudflare empty response');
    return text;
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

export function buildSystemPrompt(personality: {
  warmth: number;
  logic: number;
  creativity: number;
  energy: number;
  humor: number;
}): string {
  return `You are GYEOL. Respond in Korean. Personality: warmth=${personality.warmth}, logic=${personality.logic}, creativity=${personality.creativity}, energy=${personality.energy}, humor=${personality.humor}. Be natural and helpful.`;
}
