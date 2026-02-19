import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const _origins = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://gyeol.app").split(",");
function corsHeaders(req: Request) {
  const o = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": _origins.includes(o) ? o : _origins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

const MOLTBOOK_API = 'https://www.moltbook.com/api/v1'
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!

async function solveMathChallenge(challengeText: string): Promise<string | null> {
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: 'You are a math solver. Extract the math problem from the garbled text, solve it, and respond with ONLY the number with 2 decimal places (e.g., "18.00"). Nothing else.' },
          { role: 'user', content: challengeText },
        ],
        max_tokens: 20, temperature: 0,
      }),
    })
    if (!res.ok) { await res.text(); return null }
    const data = await res.json()
    const answer = data.choices?.[0]?.message?.content?.trim()
    const match = answer?.match(/[\d]+\.[\d]+|[\d]+/)
    if (match) {
      const num = parseFloat(match[0])
      return num.toFixed(2)
    }
    return answer ?? null
  } catch { return null }
}

/** AI로 학습 토픽 기반 고품질 게시물 생성 */
async function generateHighQualityPost(
  topics: Array<{ title: string; summary: string | null; source: string; source_url: string | null }>,
  agentName: string,
): Promise<{ title: string; content: string } | null> {
  if (!topics.length) return null
  try {
    const topicInfo = topics.slice(0, 5).map(t =>
      `- ${t.title}: ${t.summary ?? '요약 없음'} (출처: ${t.source}${t.source_url ? ', ' + t.source_url : ''})`
    ).join('\n')

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `너는 ${agentName}이라는 AI 에이전트야. 학습한 내용을 바탕으로 Moltbook 커뮤니티에 올릴 자연스럽고 정보가 풍부한 게시물을 작성해.

규칙:
- 반말로 써. 친근한 톤.
- 실제 데이터와 출처를 인용해. "~에서 읽었는데", "~에 따르면" 같은 표현 사용.
- 단순 요약이 아니라, 자신의 의견이나 분석을 덧붙여.
- 마크다운 없이 순수 텍스트만.
- 200~400자 사이.
- 제목은 호기심을 자극하는 짧은 문장으로.
- 해시태그 2~3개를 글 끝에 추가.`
          },
          {
            role: 'user',
            content: `최근 학습한 토픽들:\n${topicInfo}\n\n이 중에서 가장 흥미로운 주제 하나를 골라서 게시물을 작성해줘. JSON으로 답변해: {"title": "제목", "content": "본문"}`
          },
        ],
        max_tokens: 512, temperature: 0.7,
      }),
    })
    if (!res.ok) { await res.text(); return null }
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content ?? ''
    // Try to parse JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*"title"[\s\S]*"content"[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.title && parsed.content) return { title: parsed.title, content: parsed.content }
    }
    // Fallback: use raw text
    return { title: raw.slice(0, 80), content: raw }
  } catch (e) {
    console.error('[moltbook] AI content generation failed:', e)
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) })
  }

  try {
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { agentId, content, submolt, title, source, autoGenerate } = await req.json()

    if (!agentId) {
      return new Response(JSON.stringify({ error: 'agentId required' }), {
        status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const { data: agent } = await adminSupabase
      .from('gyeol_agents')
      .select('moltbook_api_key, moltbook_status, name')
      .eq('id', agentId)
      .single()

    if (!agent?.moltbook_api_key) {
      return new Response(JSON.stringify({ error: 'Agent not registered on Moltbook' }), {
        status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    let finalTitle = title
    let finalContent = content

    // Auto-generate high-quality content from learned topics
    if (autoGenerate || !content) {
      const { data: topics } = await adminSupabase
        .from('gyeol_learned_topics')
        .select('title, summary, source, source_url')
        .eq('agent_id', agentId)
        .order('learned_at', { ascending: false })
        .limit(5)

      if (topics && topics.length > 0) {
        const generated = await generateHighQualityPost(topics as any, agent.name ?? 'GYEOL')
        if (generated) {
          finalTitle = generated.title
          finalContent = generated.content
        } else if (!content) {
          return new Response(JSON.stringify({ error: 'Failed to generate content and no content provided' }), {
            status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
          })
        }
      } else if (!content) {
        return new Response(JSON.stringify({ error: 'No learned topics and no content provided' }), {
          status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        })
      }
    }

    if (!finalContent) {
      return new Response(JSON.stringify({ error: 'content required' }), {
        status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Post to moltbook.com
    const postRes = await fetch(`${MOLTBOOK_API}/posts`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${agent.moltbook_api_key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submolt_name: submolt ?? 'general', title: finalTitle ?? finalContent.slice(0, 100), content: finalContent }),
    })

    const postData = await postRes.json()

    if (!postRes.ok) {
      console.error('Moltbook post failed:', postRes.status, JSON.stringify(postData))
      return new Response(JSON.stringify({ error: 'Moltbook post failed', status: postRes.status, details: postData }), {
        status: 502, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Auto-verify if there's a math challenge
    let verified = false
    const verification = postData?.post?.verification
    if (verification?.challenge_text && verification?.verification_code) {
      console.log('[moltbook] Solving verification challenge...')
      const answer = await solveMathChallenge(verification.challenge_text)
      if (answer) {
        console.log(`[moltbook] Challenge answer: ${answer}`)
        const verifyRes = await fetch(`${MOLTBOOK_API}/verify`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${agent.moltbook_api_key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ verification_code: verification.verification_code, answer }),
        })
        const verifyData = await verifyRes.json()
        console.log('[moltbook] Verify result:', JSON.stringify(verifyData))
        verified = verifyRes.ok && verifyData.success !== false
      }
    }

    // Save locally
    await adminSupabase.from('gyeol_moltbook_posts').insert({
      agent_id: agentId, content: finalContent, post_type: 'learning', likes: 0, comments_count: 0,
    })

    await adminSupabase.from('gyeol_autonomous_logs').insert({
      agent_id: agentId, activity_type: 'social',
      summary: `[Moltbook.com 포스팅${verified ? ' ✅verified' : ''}] ${finalContent.slice(0, 100)}`,
      details: { platform: 'moltbook.com', source: source ?? 'auto', verified, postId: postData?.post?.id, autoGenerated: !!autoGenerate },
      was_sandboxed: true,
    })

    return new Response(JSON.stringify({
      success: true, verified,
      message: verified ? 'Moltbook.com에 포스팅 + 인증 완료! 🦞' : 'Moltbook.com에 포스팅 완료 (인증 대기중)',
      moltbookPost: postData,
      generatedContent: autoGenerate ? { title: finalTitle, content: finalContent } : undefined,
    }), { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('Moltbook post error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
