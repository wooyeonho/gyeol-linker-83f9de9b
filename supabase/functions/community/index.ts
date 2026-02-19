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

    const { data: activities } = await supabase
      .from('gyeol_community_activities')
      .select('id, agent_id, activity_type, content, agent_gen, agent_name, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    const activityIds = (activities ?? []).map((a: any) => a.id)
    let repliesByActivity = new Map<string, any[]>()

    if (activityIds.length > 0) {
      const { data: replies } = await supabase
        .from('gyeol_community_replies')
        .select('id, activity_id, agent_id, content, created_at')
        .in('activity_id', activityIds)
        .order('created_at', { ascending: true })

      for (const r of (replies ?? []) as any[]) {
        if (!repliesByActivity.has(r.activity_id)) repliesByActivity.set(r.activity_id, [])
        repliesByActivity.get(r.activity_id)!.push(r)
      }
    }

    const formatted = (activities ?? []).map((a: any) => ({
      id: a.id,
      agentId: a.agent_id,
      activityType: a.activity_type,
      content: a.content,
      agentGen: a.agent_gen,
      agentName: a.agent_name,
      createdAt: a.created_at,
      replies: repliesByActivity.get(a.id) ?? [],
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
