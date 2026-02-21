import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isValidUUID } from "../_shared/validate-uuid.ts";

const _origins = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://gyeol.app").split(",");
function corsHeaders(req: Request) {
  const o = req.headers.get("origin") ?? "";
  if (
    _origins.includes(o) ||
    o.endsWith(".lovable.app") ||
    o.endsWith(".lovableproject.com")
  ) {
    return {
      "Access-Control-Allow-Origin": o,
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };
  }
  return {
    "Access-Control-Allow-Origin": _origins[0],
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
      signal: AbortSignal.timeout(10000),
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

async function generateHighQualityPost(
  topics: Array<{ title: string; summary: string | null; source: string; source_url: string | null }>,
  agentName: string,
): Promise<{ title: string; content: string } | null> {
  if (!topics.length) return null
  try {
    const topicInfo = topics.slice(0, 5).map(t =>
      `- ${t.title}: ${t.summary ?? 'no summary'} (source: ${t.source}${t.source_url ? ', ' + t.source_url : ''})`
    ).join('\n')

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an AI agent named ${agentName}. Write a natural, informative post for the Moltbook community based on what you learned. Rules: casual tone, cite real data and sources, add your own analysis, plain text only (no markdown), 200-400 chars, catchy short title, 2-3 hashtags at end. Respond in the same language as the topic content.`
          },
          {
            role: 'user',
            content: `Recent learned topics:\n${topicInfo}\n\nPick the most interesting topic and write a post. Answer in JSON: {"title": "title", "content": "body"}`
          },
        ],
        max_tokens: 512, temperature: 0.7,
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) { await res.text(); return null }
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content ?? ''
    const jsonMatch = raw.match(/\{[\s\S]*"title"[\s\S]*"content"[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.title && parsed.content) return { title: parsed.title, content: parsed.content }
    }
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
    const ch = corsHeaders(req);
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...ch, "Content-Type": "application/json" },
      });
    }
    let callerUserId: string;
    try {
      const payload = JSON.parse(atob(authHeader.replace("Bearer ", "").split(".")[1]));
      callerUserId = payload.sub;
      if (!callerUserId) throw new Error("No sub");
    } catch {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    const { agentId, content, submolt, title, source, autoGenerate } = await req.json()

    if (!agentId || !isValidUUID(agentId)) {
      return new Response(JSON.stringify({ error: 'Valid agentId required' }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      })
    }

    const { data: agentOwner } = await adminSupabase.from("gyeol_agents").select("user_id").eq("id", agentId).single();
    if (!agentOwner || agentOwner.user_id !== callerUserId) {
      return new Response(JSON.stringify({ error: "Not your agent" }), {
        status: 403, headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    const { data: agent } = await adminSupabase
      .from('gyeol_agents')
      .select('moltbook_api_key, moltbook_status, name')
      .eq('id', agentId)
      .single()

    if (!agent?.moltbook_api_key) {
      return new Response(JSON.stringify({ error: 'Agent not registered on Moltbook' }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      })
    }

    let finalTitle = title
    let finalContent = content

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
            status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
          })
        }
      } else if (!content) {
        return new Response(JSON.stringify({ error: 'No learned topics and no content provided' }), {
          status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
        })
      }
    }

    if (!finalContent) {
      return new Response(JSON.stringify({ error: 'content required' }), {
        status: 400, headers: { ...ch, 'Content-Type': 'application/json' },
      })
    }

    const postRes = await fetch(`${MOLTBOOK_API}/posts`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${agent.moltbook_api_key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submolt_name: submolt ?? 'general', title: finalTitle ?? finalContent.slice(0, 100), content: finalContent }),
    })

    const postData = await postRes.json()

    if (!postRes.ok) {
      console.error('Moltbook post failed:', postRes.status, JSON.stringify(postData))
      return new Response(JSON.stringify({ error: 'Moltbook post failed', status: postRes.status }), {
        status: 502, headers: { ...ch, 'Content-Type': 'application/json' },
      })
    }

    let verified = false
    const verification = postData?.post?.verification
    if (verification?.challenge_text && verification?.verification_code) {
      console.log('[moltbook] Solving verification challenge...')
      const answer = await solveMathChallenge(verification.challenge_text)
      if (answer) {
        const verifyRes = await fetch(`${MOLTBOOK_API}/verify`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${agent.moltbook_api_key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ verification_code: verification.verification_code, answer }),
        })
        const verifyData = await verifyRes.json()
        verified = verifyRes.ok && verifyData.success !== false
      }
    }

    await adminSupabase.from('gyeol_moltbook_posts').insert({
      agent_id: agentId, content: finalContent, post_type: 'learning', likes: 0, comments_count: 0,
    })

    await adminSupabase.from('gyeol_autonomous_logs').insert({
      agent_id: agentId, activity_type: 'social',
      summary: `[Moltbook.com posting${verified ? ' verified' : ''}] ${finalContent.slice(0, 100)}`,
      details: { platform: 'moltbook.com', source: source ?? 'auto', verified, postId: postData?.post?.id, autoGenerated: !!autoGenerate },
      was_sandboxed: true,
    })

    return new Response(JSON.stringify({
      success: true, verified,
      message: verified ? 'Moltbook posting + verification complete!' : 'Moltbook posting complete (verification pending)',
      moltbookPost: postData,
      generatedContent: autoGenerate ? { title: finalTitle, content: finalContent } : undefined,
    }), { headers: { ...ch, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('Moltbook post error:', err)
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
