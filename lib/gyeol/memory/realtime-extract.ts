import type { SupabaseClient } from '@supabase/supabase-js';

interface ExtractedMemory {
  category: string;
  key: string;
  value: string;
  confidence: number;
}

const VALID_CATEGORIES = [
  'identity', 'preference', 'interest', 'relationship',
  'goal', 'emotion', 'experience', 'style', 'knowledge_level',
];

const EXTRACTION_PROMPT = `You extract personal facts from a user's message.
Return JSON array of max 3 items. Each item:
{"category":"one of identity|preference|interest|relationship|goal|emotion|experience|style|knowledge_level","key":"short_key","value":"fact in Korean","confidence":50-100}

Rules:
- Only extract from the USER message, never from assistant context
- Direct statements = confidence 90-100
- Inferred facts = confidence 50-70
- If nothing personal found, return empty array []
- key should be short English (e.g. "job", "favorite_food", "hobby")
- value should be natural Korean

Examples:
User: "나 프론트엔드 개발자야"
[{"category":"identity","key":"job","value":"프론트엔드 개발자","confidence":100}]

User: "요즘 주식 공부 중이야"
[{"category":"interest","key":"studying","value":"주식 투자 공부 중","confidence":90}]

User: "오늘 날씨 좋다"
[]`;

export async function extractAndSaveMemory(
  supabase: SupabaseClient,
  agentId: string,
  userMessage: string,
  provider: string,
): Promise<void> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return;

  if (userMessage.length < 4) return;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!res.ok) return;

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? '';

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const memories: ExtractedMemory[] = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(memories) || memories.length === 0) return;

    for (const mem of memories.slice(0, 3)) {
      if (
        !mem.category ||
        !mem.key ||
        !mem.value ||
        !VALID_CATEGORIES.includes(mem.category)
      ) {
        continue;
      }

      const confidence = Math.min(100, Math.max(0, mem.confidence || 50));

      await supabase
        .from('gyeol_user_memories')
        .upsert(
          {
            agent_id: agentId,
            category: mem.category,
            key: mem.key,
            value: mem.value,
            confidence,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'agent_id,category,key' },
        );
    }
  } catch (err) {
    console.warn('[memory-extract] failed:', err);
  }
}
