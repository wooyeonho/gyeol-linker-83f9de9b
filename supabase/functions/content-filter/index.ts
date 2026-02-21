import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLOCKED_PATTERNS = [
  /\b(hack|exploit|inject|xss|sql.?inject)\b/i,
  /\b(suicide|self.?harm|kill\s+myself)\b/i,
  /\b(child\s+abuse|csam|cp)\b/i,
  /[\u4e00-\u9fff]{5,}/,
];

const SPAM_PATTERNS = [
  /(.)\1{10,}/,
  /(https?:\/\/\S+\s*){5,}/i,
  /\b(buy now|click here|free money|earn \$|make \$)\b/i,
];

interface FilterResult {
  allowed: boolean;
  reason?: string;
  severity: "safe" | "warning" | "blocked";
  filteredContent?: string;
  flags: string[];
}

function filterContent(text: string, customBlockedWords: string[] = []): FilterResult {
  const flags: string[] = [];

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      flags.push(`blocked_pattern:${pattern.source.slice(0, 30)}`);
    }
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      flags.push(`spam_pattern:${pattern.source.slice(0, 30)}`);
    }
  }

  for (const word of customBlockedWords) {
    if (word && text.toLowerCase().includes(word.toLowerCase())) {
      flags.push(`custom_blocked:${word}`);
    }
  }

  if (text.length > 10000) {
    flags.push("too_long");
  }

  if (flags.some((f) => f.startsWith("blocked_pattern"))) {
    return { allowed: false, reason: "Content contains blocked patterns", severity: "blocked", flags };
  }

  if (flags.some((f) => f.startsWith("custom_blocked"))) {
    return { allowed: false, reason: "Content contains blocked words", severity: "blocked", flags };
  }

  if (flags.some((f) => f.startsWith("spam_pattern") || f === "too_long")) {
    return { allowed: true, reason: "Content flagged for review", severity: "warning", filteredContent: text.slice(0, 5000), flags };
  }

  return { allowed: true, severity: "safe", filteredContent: text, flags };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, customBlockedWords = [] } = await req.json();
    if (!content || typeof content !== "string") throw new Error("content string required");

    const result = filterContent(content, customBlockedWords);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
