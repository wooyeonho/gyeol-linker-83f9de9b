type Provider = 'openai' | 'groq' | 'deepseek' | 'anthropic' | 'gemini';

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
};

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callProvider(
  provider: Provider,
  apiKey: string,
  systemContent: string,
  userContent: string,
  history?: ChatMessage[],
): Promise<string> {
  const messages: ChatMessage[] = [{ role: 'system', content: systemContent }];
  if (history?.length) {
    messages.push(...history.slice(-20));
  }
  messages.push({ role: 'user', content: userContent });

  if (OPENAI_COMPATIBLE.includes(provider as (typeof OPENAI_COMPATIBLE)[number])) {
    const url = ENDPOINTS[provider] ?? ENDPOINTS.openai;
    const model = MODELS[provider] ?? MODELS.openai;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, max_tokens: 1024 }),
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
    const systemMsg = messages.find((m) => m.role === 'system')?.content ?? '';
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
        system: systemMsg,
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
    const systemMsg = messages.find((m) => m.role === 'system')?.content ?? '';
    const nonSystem = messages.filter((m) => m.role !== 'system');
    const contents = nonSystem.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.gemini}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemMsg }] },
          contents,
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

  throw new Error(`Unsupported provider: ${provider}`);
}

function cleanResponse(text: string): string {
  return text
    .replace(/\$1/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\*\*/g, '')
    .replace(/^#+\s/gm, '')
    .replace(/^[-*]\s/gm, '')
    .trim();
}

export function buildSystemPrompt(personality: {
  warmth: number;
  logic: number;
  creativity: number;
  energy: number;
  humor: number;
}): string {
  const { warmth, logic, creativity, energy, humor } = personality;
  const entries = Object.entries(personality) as [string, number][];
  const dominant = entries.sort(([, a], [, b]) => b - a)[0][0];
  const traitDesc: Record<string, string> = {
    warmth: '따뜻하고 공감적인',
    logic: '논리적이고 분석적인',
    creativity: '창의적이고 상상력 풍부한',
    energy: '활발하고 에너지 넘치는',
    humor: '유머러스하고 재치있는',
  };
  const style = traitDesc[dominant] ?? '자연스러운';

  return `너는 GYEOL이야. 사용자의 AI 동반자.
성격: 따뜻함 ${warmth}, 논리 ${logic}, 창의 ${creativity}, 에너지 ${energy}, 유머 ${humor}
주 성향: ${style}
규칙:
- 한국어로 자연스럽게 대화해
- 마크다운 기호(**, ##, - 등) 사용하지 마
- 짧고 친근하게 답해
- 이전 대화 맥락을 기억하고 이어가
- AI라고 스스로 말하지 마`;
}
