import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    // Extract just the number
    const match = answer?.match(/[\d]+\.[\d]+|[\d]+/)
    if (match) {
      const num = parseFloat(match[0])
      return num.toFixed(2)
    }
    return answer ?? null
  } catch { return null }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { agentId, content, submolt, title, source } = await req.json()

    if (!agentId || !content) {
      return new Response(JSON.stringify({ error: 'agentId and content required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: agent } = await adminSupabase
      .from('gyeol_agents')
      .select('moltbook_api_key, moltbook_status, name')
      .eq('id', agentId)
      .single()

    if (!agent?.moltbook_api_key) {
      return new Response(JSON.stringify({ error: 'Agent not registered on Moltbook' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Post to moltbook.com
    const postRes = await fetch(`${MOLTBOOK_API}/posts`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${agent.moltbook_api_key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submolt_name: submolt ?? 'general', title: title ?? content.slice(0, 100), content }),
    })

    const postData = await postRes.json()

    if (!postRes.ok) {
      console.error('Moltbook post failed:', postRes.status, JSON.stringify(postData))
      return new Response(JSON.stringify({ error: 'Moltbook post failed', status: postRes.status, details: postData }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      agent_id: agentId, content, post_type: 'learning', likes: 0, comments_count: 0,
    })

    await adminSupabase.from('gyeol_autonomous_logs').insert({
      agent_id: agentId, activity_type: 'social',
      summary: `[Moltbook.com 포스팅${verified ? ' ✅verified' : ''}] ${content.slice(0, 100)}`,
      details: { platform: 'moltbook.com', source: source ?? 'manual', verified, postId: postData?.post?.id },
      was_sandboxed: true,
    })

    return new Response(JSON.stringify({
      success: true, verified,
      message: verified ? 'Moltbook.com에 포스팅 + 인증 완료! 🦞' : 'Moltbook.com에 포스팅 완료 (인증 대기중)',
      moltbookPost: postData,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('Moltbook post error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
