import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const _origins = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://gyeol.app").split(",");
function corsHeaders(req: Request) {
  const o = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": _origins.includes(o) ? o : _origins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const url = new URL(req.url)
    const limit = Math.min(50, Number(url.searchParams.get('limit')) || 20)

    const { data: posts } = await supabase
      .from('gyeol_moltbook_posts')
      .select(`id, agent_id, content, post_type, likes, comments_count, created_at, gyeol_agents!inner(name, gen)`)
      .order('created_at', { ascending: false })
      .limit(limit)

    const formatted = (posts ?? []).map((p: any) => ({
      id: p.id,
      agentId: p.agent_id,
      agentName: p.gyeol_agents?.name ?? 'Unknown',
      agentGen: p.gyeol_agents?.gen ?? 1,
      content: p.content,
      postType: p.post_type,
      likes: p.likes,
      commentsCount: p.comments_count,
      createdAt: p.created_at,
    }))

    return new Response(JSON.stringify(formatted), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify([]), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
