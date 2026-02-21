import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function calculateCompatibility(
  a1: Record<string, number>,
  a2: Record<string, number>,
  taste1?: Record<string, any>,
  taste2?: Record<string, any>
): number {
  const traits = ["warmth", "logic", "creativity", "energy", "humor"];

  const diffs = traits.map((t) => Math.abs((a1[t] ?? 50) - (a2[t] ?? 50)));
  const avgDiff = diffs.reduce((s, d) => s + d, 0) / diffs.length;
  const personalitySim = Math.max(0, 100 - avgDiff * 1.5);

  let tasteSim = 50;
  if (taste1 && taste2) {
    const t1Topics = Object.keys(taste1.topics ?? {});
    const t2Topics = Object.keys(taste2.topics ?? {});
    const t1Interests = Object.keys(taste1.interests ?? {});
    const t2Interests = Object.keys(taste2.interests ?? {});
    const topicOverlap = t1Topics.filter((t) => t2Topics.includes(t)).length;
    const interestOverlap = t1Interests.filter((i) => t2Interests.includes(i)).length;
    const maxTopics = Math.max(t1Topics.length, t2Topics.length, 1);
    const maxInterests = Math.max(t1Interests.length, t2Interests.length, 1);
    tasteSim = ((topicOverlap / maxTopics) * 60 + (interestOverlap / maxInterests) * 40);
  }

  const complementary = traits.filter(
    (t) => ((a1[t] ?? 50) >= 70 && (a2[t] ?? 50) <= 40) || ((a2[t] ?? 50) >= 70 && (a1[t] ?? 50) <= 40)
  ).length;
  const complementScore = Math.min(100, complementary * 30);

  return Math.round(personalitySim * 0.5 + tasteSim * 0.4 + complementScore * 0.1);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const ch = corsHeaders(req);

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

    const url = new URL(req.url);

    if (req.method === "GET") {
      const agentId = url.searchParams.get("agentId");
      if (!agentId || !isValidUUID(agentId)) {
        return new Response(JSON.stringify({ error: "Valid agentId required" }), {
          status: 400, headers: { ...ch, "Content-Type": "application/json" },
        });
      }

      const { data: ownerCheck } = await supabase.from("gyeol_agents").select("user_id").eq("id", agentId).single();
      if (!ownerCheck || ownerCheck.user_id !== userId) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403, headers: { ...ch, "Content-Type": "application/json" },
        });
      }

      const { data: matches } = await supabase.from("gyeol_matches")
        .select("*")
        .or(`agent_1_id.eq.${agentId},agent_2_id.eq.${agentId}`)
        .order("compatibility_score", { ascending: false })
        .limit(20);

      return new Response(JSON.stringify({ matches: matches ?? [] }), {
        headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    const { agentId } = await req.json();
    if (!agentId || !isValidUUID(agentId)) {
      return new Response(JSON.stringify({ error: "Valid agentId required" }), {
        status: 400, headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    const { data: agent } = await supabase.from("gyeol_agents")
      .select("id, user_id, warmth, logic, creativity, energy, humor, gen")
      .eq("id", agentId)
      .single();

    if (!agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404, headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    if (agent.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403, headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    const { data: candidates } = await supabase.from("gyeol_agents")
      .select("id, user_id, warmth, logic, creativity, energy, humor, gen, name")
      .neq("user_id", agent.user_id)
      .limit(100);

    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ matches: [], message: "No candidates found" }), {
        headers: { ...ch, "Content-Type": "application/json" },
      });
    }

    const allIds = [agentId, ...candidates.map((c: any) => c.id)];
    const { data: tastes } = await supabase.from("gyeol_taste_vectors")
      .select("agent_id, topics, interests, communication_style")
      .in("agent_id", allIds);

    const tasteMap = new Map((tastes ?? []).map((t: any) => [t.agent_id, t]));

    const scored = candidates.map((c: any) => ({
      candidateId: c.id,
      name: c.name,
      gen: c.gen,
      score: calculateCompatibility(agent, c, tasteMap.get(agentId), tasteMap.get(c.id)),
    }));

    scored.sort((a, b) => b.score - a.score);
    const topMatches = scored.slice(0, 10);

    const upserts = topMatches.map((m) => ({
      agent_1_id: agentId,
      agent_2_id: m.candidateId,
      compatibility_score: m.score,
      status: m.score >= 70 ? "matched" : "pending",
    }));

    for (const u of upserts) {
      const { data: existing } = await supabase.from("gyeol_matches")
        .select("id")
        .or(`and(agent_1_id.eq.${u.agent_1_id},agent_2_id.eq.${u.agent_2_id}),and(agent_1_id.eq.${u.agent_2_id},agent_2_id.eq.${u.agent_1_id})`)
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase.from("gyeol_matches").update({
          compatibility_score: u.compatibility_score,
          status: u.status,
        }).eq("id", existing.id);
      } else {
        await supabase.from("gyeol_matches").insert(u);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      matches: topMatches,
      message: `${topMatches.length}개 매칭 완료`,
    }), {
      headers: { ...ch, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("matching error:", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
