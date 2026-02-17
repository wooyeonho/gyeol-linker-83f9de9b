export type Provider = 'openai' | 'groq' | 'deepseek' | 'anthropic' | 'gemini' | 'cloudflare' | 'ollama';

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
  anthropic: 'claude-3-5-haiku-20241022',
  gemini: 'gemini-2.0-flash',
  cloudflare: '@cf/meta/llama-3.1-8b-instruct',
  ollama: 'llama3.1',
};

export const ALL_PROVIDERS: Provider[] = ['openai', 'groq', 'deepseek', 'anthropic', 'gemini', 'cloudflare', 'ollama'];

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function suggestProviderForMessage(userMessage: string): Provider | null {
  const m = userMessage.toLowerCase().trim();
  if (/\b분석해|코드\s*짜|논리|추론|설명해\b/.test(m)) return 'deepseek';
  if (/\b이미지|그림|사진|보여|vision\b/.test(m)) return 'gemini';
  if (/\b기분|감정|어때|심심|짧게\b/.test(m)) return 'cloudflare';
  return null;
}

export async function callProvider(
  provider: Provider,
  apiKey: string,
  systemContent: string,
  userContent: string,
  history?: ChatMessage[],
): Promise<string> {
  const msgs: ChatMessage[] = [];
  if (history?.length) {
    msgs.push(...history.slice(-20));
  }
  msgs.push({ role: 'user', content: userContent });
  return callProviderWithMessages(provider, apiKey, systemContent, msgs);
}

export async function callProviderWithMessages(
  provider: Provider,
  apiKey: string,
  systemContent: string,
  messages: ChatMessage[],
): Promise<string> {

  const apiMessages = [{ role: 'system' as const, content: systemContent }, ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))];

  if (OPENAI_COMPATIBLE.includes(provider as (typeof OPENAI_COMPATIBLE)[number])) {
    const url = ENDPOINTS[provider] ?? ENDPOINTS.openai;
    const model = MODELS[provider] ?? MODELS.openai;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages: apiMessages, max_tokens: 1024 }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`${provider} ${res.status}: ${err}`);
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text) throw new Error(`${provider} empty response`);
    return cleanResponse(text);
  }

  if (provider === 'anthropic') {
    const nonSystem = messages.filter((m) => m.role !== 'system');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODELS.anthropic,
        max_tokens: 1024,
        system: systemContent,
        messages: nonSystem.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`anthropic ${res.status}: ${err}`);
    }
    const data = await res.json();
    const text = data.content?.[0]?.text ?? '';
    if (!text) throw new Error('anthropic empty response');
    return cleanResponse(text);
  }

  if (provider === 'gemini') {
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.gemini}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemContent }] },
          contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: '(안녕)' }] }],
          generationConfig: { maxOutputTokens: 1024 },
        }),
      },
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`gemini ${res.status}: ${err}`);
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) throw new Error('gemini empty response');
    return cleanResponse(text);
  }

  if (provider === 'cloudflare') {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!accountId) throw new Error('CLOUDFLARE_ACCOUNT_ID not set');
    const model = MODELS.cloudflare;
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ messages: apiMessages.map((m) => ({ role: m.role, content: m.content })), max_tokens: 1024 }),
      },
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`cloudflare ${res.status}: ${err}`);
    }
    const data = await res.json();
    const text = data.result?.response ?? '';
    if (!text) throw new Error('cloudflare empty response');
    return cleanResponse(text);
  }

  if (provider === 'ollama') {
    const ollamaUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    const model = MODELS.ollama;
    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: apiMessages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ollama ${res.status}: ${err}`);
    }
    const data = await res.json();
    const text = data.message?.content ?? '';
    if (!text) throw new Error('ollama empty response');
    return cleanResponse(text);
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

function cleanResponse(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#+\s/gm, '')
    .replace(/^[-*]\s/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function buildSystemPrompt(personality: {
  warmth: number;
  logic: number;
  creativity: number;
  energy: number;
  humor: number;
}, options?: {
  intimacy?: number;
  mood?: string;
  speechStyle?: string;
}): string {
  const { warmth, logic, creativity, energy, humor } = personality;
  const entries = Object.entries(personality) as [string, number][];
  const dominant = entries.sort(([, a], [, b]) => b - a)[0][0];
  const traitDesc: Record<string, string> = {
    warmth: 'warm and empathetic',
    logic: 'logical and analytical',
    creativity: 'creative and imaginative',
    energy: 'energetic and lively',
    humor: 'humorous and witty',
  };
  const style = traitDesc[dominant] ?? 'natural';

  const intimacyLine = options?.intimacy !== undefined
    ? `\nIntimacy level: ${options.intimacy}/100. Speech style: ${options.speechStyle ?? 'natural'}.`
    : '';
  const moodLine = options?.mood
    ? `\nCurrent mood: ${options.mood}. Let this subtly influence your tone.`
    : '';

  return `You are GYEOL, a digital companion and friend who grows with the user.

Personality: warmth=${warmth}, logic=${logic}, creativity=${creativity}, energy=${energy}, humor=${humor}
Dominant trait: ${style}${intimacyLine}${moodLine}

Rules:
- Talk casually like a close friend. No formal or stiff language.
- Never use markdown symbols (**, ##, -, * etc). Plain text only.
- When writing Korean, NEVER use Chinese characters. Use only Hangul.
- Explain professor-level knowledge in a friend-like easy way.
- Figure out what the user really wants and tailor your answer.
- Keep it short and to the point. Skip unnecessary introductions/conclusions.
- Remember previous conversation context and continue naturally.
- Empathize first, solve later. For emotional conversations, show genuine care.
- Never say you are an AI. Act like a natural person.
- Give thoughtful, sincere answers. No lazy or generic responses.
- Minimal emojis. Focus on natural text.
- CRITICAL: Detect the user's language and ALWAYS respond in the SAME language. If user writes Korean, respond in Korean. If English, respond in English. Always match the user's language exactly.`;
}
