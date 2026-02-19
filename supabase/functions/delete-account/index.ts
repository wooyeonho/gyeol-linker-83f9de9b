import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const _origins = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://gyeol.app").split(",");
function corsHeaders(req: Request) {
  const o = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": _origins.includes(o) ? o : _origins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

Deno.serve(async (req) => {
  const ch = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: ch });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...ch, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    const db = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: agents } = await db.from("gyeol_agents").select("id").eq("user_id", user.id);
    const agentIds = (agents ?? []).map((a: { id: string }) => a.id);

    if (agentIds.length > 0) {
      const tables = [
        "gyeol_conversations",
        "gyeol_user_memories",
        "gyeol_conversation_insights",
        "gyeol_autonomous_logs",
        "gyeol_learned_topics",
        "gyeol_proactive_messages",
        "gyeol_reflections",
        "gyeol_agent_skills",
        "gyeol_agent_skins",
        "gyeol_taste_vectors",
        "gyeol_push_subscriptions",
        "gyeol_telegram_links",
        "gyeol_moltbook_posts",
        "gyeol_community_activities",
        "gyeol_breeding_logs",
      ];

      for (const table of tables) {
        await db.from(table).delete().in("agent_id", agentIds);
      }

      await db.from("gyeol_matches")
        .delete()
        .or(agentIds.map(id => `agent_1_id.eq.${id}`).join(","));
      await db.from("gyeol_matches")
        .delete()
        .or(agentIds.map(id => `agent_2_id.eq.${id}`).join(","));

      await db.from("gyeol_agents").delete().eq("user_id", user.id);
    }

    await db.from("gyeol_byok_keys").delete().eq("user_id", user.id);

    const { error: deleteError } = await db.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      return new Response(JSON.stringify({ error: "Failed to delete auth user" }), {
        status: 500, headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Account deleted" }), {
      headers: { ...ch, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("delete-account error:", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...ch, "Content-Type": "application/json" },
    });
  }
});
