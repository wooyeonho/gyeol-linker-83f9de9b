import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) throw new Error("Unauthorized");

    const { prompt, style = "default", width = 512, height = 512, agentId } = await req.json();
    if (!prompt) throw new Error("prompt required");

    const enhancedPrompt = style === "anime"
      ? `anime style, high quality illustration, ${prompt}`
      : style === "pixel"
      ? `pixel art style, retro game aesthetic, ${prompt}`
      : style === "watercolor"
      ? `watercolor painting style, soft colors, ${prompt}`
      : style === "cosmic"
      ? `cosmic space theme, nebula colors, glowing, ${prompt}`
      : prompt;

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const groqKey = Deno.env.get("GROQ_API_KEY");

    let imageDescription = "";

    if (lovableKey) {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${lovableKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: "Generate a detailed visual description for an AI companion avatar image. Output only the description, no explanation." },
            { role: "user", content: `Create a visual description for: ${enhancedPrompt}` },
          ],
          max_tokens: 200,
        }),
      });
      const aiData = await aiRes.json();
      imageDescription = aiData.choices?.[0]?.message?.content ?? enhancedPrompt;
    } else if (groqKey) {
      const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: "Generate a detailed visual description for an AI companion avatar. Output only the description." },
            { role: "user", content: `Create a visual description for: ${enhancedPrompt}` },
          ],
          max_tokens: 200,
        }),
      });
      const aiData = await aiRes.json();
      imageDescription = aiData.choices?.[0]?.message?.content ?? enhancedPrompt;
    } else {
      imageDescription = enhancedPrompt;
    }

    const svgColor1 = style === "cosmic" ? "#8b5cf6" : style === "anime" ? "#ec4899" : style === "pixel" ? "#22c55e" : "#3b82f6";
    const svgColor2 = style === "cosmic" ? "#4c1d95" : style === "anime" ? "#be185d" : style === "pixel" ? "#15803d" : "#1d4ed8";

    const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${svgColor1}"/><stop offset="100%" style="stop-color:${svgColor2}"/></linearGradient></defs>
      <rect width="${width}" height="${height}" fill="url(#g)"/>
      <circle cx="${width / 2}" cy="${height / 3}" r="${Math.min(width, height) / 5}" fill="rgba(255,255,255,0.2)"/>
      <text x="${width / 2}" y="${height * 0.7}" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-size="14" font-family="sans-serif">AI Generated</text>
    </svg>`;

    const svgBase64 = btoa(placeholderSvg);
    const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

    if (agentId) {
      await supabase.from("gyeol_audit_logs").insert({
        user_id: user.id, agent_id: agentId, action: "image_generation",
        details: { prompt: prompt.slice(0, 200), style, width, height },
      });
    }

    return new Response(JSON.stringify({
      imageUrl: dataUrl,
      description: imageDescription,
      style,
      dimensions: { width, height },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
