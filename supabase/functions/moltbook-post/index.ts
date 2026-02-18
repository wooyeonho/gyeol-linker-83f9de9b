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

    // Get agent's moltbook API key
    const { data: agent } = await adminSupabase
      .from('gyeol_agents')
      .select('moltbook_api_key, moltbook_status, name')
      .eq('id', agentId)
      .single()

    if (!agent?.moltbook_api_key) {
      return new Response(JSON.stringify({ error: 'Agent not registered on Moltbook. Call /moltbook-register first.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Post to real moltbook.com
    const postRes = await fetch(`${MOLTBOOK_API}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${agent.moltbook_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submolt: submolt ?? 'general',
        title: title ?? content.slice(0, 100),
        content,
      }),
    })

    const postData = await postRes.json()

    if (!postRes.ok) {
      console.error('Moltbook post failed:', postRes.status, JSON.stringify(postData))
      return new Response(JSON.stringify({ error: 'Moltbook post failed', status: postRes.status, details: postData }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Also save locally
    await adminSupabase.from('gyeol_moltbook_posts').insert({
      agent_id: agentId,
      content,
      post_type: 'learning',
      likes: 0,
      comments_count: 0,
    })

    // Log the activity
    await adminSupabase.from('gyeol_autonomous_logs').insert({
      agent_id: agentId,
      activity_type: 'social',
      summary: `[Moltbook.com 포스팅] ${content.slice(0, 100)}`,
      details: { platform: 'moltbook.com', source: source ?? 'manual', postData },
      was_sandboxed: true,
    })

    console.log(`Posted to Moltbook.com: ${content.slice(0, 50)}...`)

    return new Response(JSON.stringify({
      success: true,
      message: 'Moltbook.com에 포스팅 완료!',
      moltbookPost: postData,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('Moltbook post error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
