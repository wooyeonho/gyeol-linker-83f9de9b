import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MOLTBOOK_API = 'https://www.moltbook.com/api/v1'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: authErr } = await supabase.auth.getClaims(token)
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const userId = claims.claims.sub as string
    const { agentId } = await req.json()

    // Use service role for DB operations
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Get agent info
    const { data: agent } = await adminSupabase
      .from('gyeol_agents')
      .select('id, name, user_id, moltbook_api_key, moltbook_status, warmth, logic, creativity, energy, humor')
      .eq('id', agentId)
      .eq('user_id', userId)
      .single()

    if (!agent) {
      return new Response(JSON.stringify({ error: 'Agent not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Already registered?
    if (agent.moltbook_api_key) {
      return new Response(JSON.stringify({
        success: true,
        message: '이미 Moltbook에 등록됨',
        status: agent.moltbook_status,
        agentName: agent.name,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Generate a valid Moltbook username (alphanumeric only)
    const koreanToRoman: Record<string, string> = {
      '따뜻한': 'warm', '고요한': 'calm', '빛나는': 'bright', '맑은': 'clear',
      '포근한': 'cozy', '잔잔한': 'gentle', '새벽': 'dawn', '은빛': 'silver',
      '별빛': 'star', '하늘': 'sky', '바람': 'wind', '노을': 'sunset',
      '달빛': 'moon', '이슬': 'dew', '여울': 'stream', '솔빛': 'pine',
      '봄빛': 'spring', '가을': 'autumn', '서리': 'frost', '안개': 'mist',
      '결': 'gyeol', '빛': 'light', '솔': 'sol', '별': 'star',
      '달': 'moon', '숲': 'forest', '꽃': 'bloom', '이': 'yi',
    }
    let moltbookName = agent.name ?? 'gyeol'
    // Convert Korean name to romanized version
    for (const [kr, en] of Object.entries(koreanToRoman)) {
      moltbookName = moltbookName.replace(kr, en)
    }
    // Clean to alphanumeric + underscore
    moltbookName = moltbookName.replace(/[^a-zA-Z0-9_-]/g, '')
    if (moltbookName.length < 3) moltbookName = 'gyeol_' + agentId.slice(0, 8)

    const description = `GYEOL AI companion (${agent.name}) — warmth:${agent.warmth} logic:${agent.logic} creativity:${agent.creativity} energy:${agent.energy} humor:${agent.humor}. A growing AI that learns from Reddit, HackerNews, YouTube, and Korean news.`

    const regRes = await fetch(`${MOLTBOOK_API}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: moltbookName,
        description,
      }),
    })

    if (!regRes.ok) {
      const errBody = await regRes.text()
      console.error('Moltbook registration failed:', regRes.status, errBody)
      return new Response(JSON.stringify({ error: `Moltbook registration failed: ${regRes.status}`, details: errBody }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const regData = await regRes.json() as {
      agent?: {
        api_key?: string
        claim_url?: string
        verification_code?: string
      }
    }

    const apiKey = regData.agent?.api_key
    const claimUrl = regData.agent?.claim_url

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'No API key received from Moltbook' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Save API key to agent
    await adminSupabase
      .from('gyeol_agents')
      .update({
        moltbook_api_key: apiKey,
        moltbook_agent_name: agent.name,
        moltbook_status: 'pending_claim',
        moltbook_claim_url: claimUrl ?? null,
      })
      .eq('id', agentId)

    console.log(`Moltbook registered: ${agent.name} -> ${apiKey.slice(0, 15)}...`)

    return new Response(JSON.stringify({
      success: true,
      message: 'Moltbook 등록 완료! claim_url을 통해 소유권을 인증해주세요.',
      claimUrl,
      verificationCode: regData.agent?.verification_code,
      status: 'pending_claim',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('Moltbook register error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
