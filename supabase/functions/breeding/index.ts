import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MIN_GEN = 2;
const MIN_COMPAT = 50;
const COOLDOWN_HOURS = 72;
const SUCCESS_RATE = 70;
const MUTATION_CHANCE = 15;

function inheritTrait(p1: number, p2: number): number {
  const ratio = 0.3 + Math.random() * 0.4;
  const base = p1 * ratio + p2 * (1 - ratio);
  return Math.max(0, Math.min(100, Math.round(base + (Math.random() - 0.5) * 10)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const agent1Id = url.searchParams.get("agent1Id");
      const agent2Id = url.searchParams.get("agent2Id");
      if (!agent1Id || !agent2Id) {
        return new Response(JSON.stringify({ error: "agent1Id, agent2Id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: agents } = await supabase.from("gyeol_agents").select("id, gen").in("id", [agent1Id, agent2Id]);
      if (!agents || agents.length !== 2) {
        return new Response(JSON.stringify({ eligible: false, reason: "에이전트를 찾을 수 없습니다" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const a1 = agents.find((a: any) => a.id === agent1Id)!;
      const a2 = agents.find((a: any) => a.id === agent2Id)!;
      if (a1.gen < MIN_GEN || a2.gen < MIN_GEN) {
        return new Response(JSON.stringify({ eligible: false, reason: `번식하려면 Gen ${MIN_GEN} 이상이어야 합니다` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ eligible: true, reason: "번식 가능" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST — attempt breeding
    const { agent1Id, agent2Id, userId } = await req.json();
    if (!agent1Id || !agent2Id || !userId) {
      return new Response(JSON.stringify({ error: "agent1Id, agent2Id, userId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check gen
    const { data: agents } = await supabase.from("gyeol_agents").select("id, name, gen, warmth, logic, creativity, energy, humor").in("id", [agent1Id, agent2Id]);
    if (!agents || agents.length !== 2) {
      return new Response(JSON.stringify({ success: false, message: "에이전트를 찾을 수 없습니다" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const p1 = agents.find((a: any) => a.id === agent1Id)!;
    const p2 = agents.find((a: any) => a.id === agent2Id)!;

    if (p1.gen < MIN_GEN || p2.gen < MIN_GEN) {
      return new Response(JSON.stringify({ success: false, message: `번식하려면 Gen ${MIN_GEN} 이상이어야 합니다 (현재: Gen ${p1.gen}, Gen ${p2.gen})` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check compatibility
    const { data: match } = await supabase.from("gyeol_matches").select("compatibility_score")
      .or(`and(agent_1_id.eq.${agent1Id},agent_2_id.eq.${agent2Id}),and(agent_1_id.eq.${agent2Id},agent_2_id.eq.${agent1Id})`)
      .limit(1).maybeSingle();

    if (!match || match.compatibility_score < MIN_COMPAT) {
      return new Response(JSON.stringify({ success: false, message: `호환도 ${MIN_COMPAT}% 이상 필요 (현재: ${match?.compatibility_score ?? 0}%)` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check cooldown
    const { data: recentBreeding } = await supabase.from("gyeol_breeding_logs").select("created_at")
      .or(`parent_1_id.eq.${agent1Id},parent_1_id.eq.${agent2Id},parent_2_id.eq.${agent1Id},parent_2_id.eq.${agent2Id}`)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (recentBreeding) {
      const hoursSince = (Date.now() - new Date(recentBreeding.created_at).getTime()) / 3600000;
      if (hoursSince < COOLDOWN_HOURS) {
        return new Response(JSON.stringify({ success: false, message: `쿨다운 중 (${Math.ceil(COOLDOWN_HOURS - hoursSince)}시간 남음)` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Roll for success
    const roll = Math.random() * 100;
    if (roll >= SUCCESS_RATE) {
      await supabase.from("gyeol_breeding_logs").insert({ parent_1_id: agent1Id, parent_2_id: agent2Id, success: false, details: { roll: Math.floor(roll) } });
      return new Response(JSON.stringify({ success: false, message: `번식 실패 — 다음에 다시 시도하세요` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create child
    const traits = {
      warmth: inheritTrait(p1.warmth, p2.warmth),
      logic: inheritTrait(p1.logic, p2.logic),
      creativity: inheritTrait(p1.creativity, p2.creativity),
      energy: inheritTrait(p1.energy, p2.energy),
      humor: inheritTrait(p1.humor, p2.humor),
    };

    let mutatedTrait: string | null = null;
    if (Math.random() * 100 < MUTATION_CHANCE) {
      const keys = ["warmth", "logic", "creativity", "energy", "humor"] as const;
      const key = keys[Math.floor(Math.random() * keys.length)];
      mutatedTrait = key;
      (traits as any)[key] = Math.min(100, (traits as any)[key] + 15 + Math.floor(Math.random() * 20));
    }

    const childName = p1.name.slice(0, Math.ceil(p1.name.length / 2)) + p2.name.slice(Math.floor(p2.name.length / 2));
    const childGen = Math.max(p1.gen, p2.gen);

    const { data: child } = await supabase.from("gyeol_agents").insert({
      user_id: userId, name: childName, gen: childGen,
      ...traits, mood: "excited", evolution_progress: 0, total_conversations: 0,
    }).select("id").single();

    await supabase.from("gyeol_breeding_logs").insert({
      parent_1_id: agent1Id, parent_2_id: agent2Id, child_id: child?.id, success: true,
      details: { childName, traits, mutatedTrait },
    });

    const msg = mutatedTrait
      ? `번식 성공! ${childName} 탄생 (돌연변이: ${mutatedTrait} 강화)`
      : `번식 성공! ${childName} 탄생`;

    return new Response(JSON.stringify({ success: true, child: { id: child?.id, name: childName, gen: childGen, traits }, message: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
