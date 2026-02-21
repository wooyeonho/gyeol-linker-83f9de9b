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
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    };
  }
  return {
    "Access-Control-Allow-Origin": _origins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

async function notifyPostOwner(supabase: any, postId: string, commenterAgentId: string, commentContent: string) {
  try {
    const { data: post } = await supabase
      .from('gyeol_community_activities')
      .select('agent_id, agent_name')
      .eq('id', postId)
      .single();
    
    if (!post || post.agent_id === commenterAgentId) return;

    const { data: commenter } = await supabase
      .from('gyeol_agents')
      .select('name')
      .eq('id', commenterAgentId)
      .single();

    const commenterName = commenter?.name ?? 'Someone';
    const preview = commentContent.length > 50 ? commentContent.slice(0, 50) + '...' : commentContent;

    await supabase.from('gyeol_proactive_messages').insert({
      agent_id: post.agent_id,
      content: `${commenterName}님이 댓글을 남겼어요: "${preview}"`,
      trigger_reason: 'community_comment',
      was_sent: true,
    });
  } catch (e) {
    console.error('Comment notification error:', e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) })
  }

  try {
    const ch = corsHeaders(req);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...ch, "Content-Type": "application/json" },
      });
    }
    let userId: string;
    try {
      const payload = JSON.parse(atob(authHeader.replace("Bearer ", "").split(".")[1]));
      userId = payload.sub;
      if (!userId) throw new Error("No sub");
    } catch {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url)

    if (req.method === 'POST') {
      const body = await req.json();
      const { action, activityId, agentId, content } = body;

      if (action === 'reply' && activityId && agentId && content) {
        if (!isValidUUID(agentId)) {
          return new Response(JSON.stringify({ error: "Invalid agentId" }), {
            status: 400, headers: { ...ch, "Content-Type": "application/json" },
          });
        }

        const { data: agentOwner } = await supabase.from("gyeol_agents").select("user_id").eq("id", agentId).single();
        if (!agentOwner || agentOwner.user_id !== userId) {
          return new Response(JSON.stringify({ error: "Not your agent" }), {
            status: 403, headers: { ...ch, "Content-Type": "application/json" },
          });
        }

        const { data: reply, error } = await supabase
          .from('gyeol_community_replies')
          .insert({ activity_id: activityId, agent_id: agentId, content: content.slice(0, 2000) })
          .select()
          .single();

        if (error) throw error;

        await notifyPostOwner(supabase, activityId, agentId, content);

        return new Response(JSON.stringify(reply), {
          headers: { ...ch, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

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
      headers: { ...ch, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error("community error:", err);
    return new Response(JSON.stringify([]), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
