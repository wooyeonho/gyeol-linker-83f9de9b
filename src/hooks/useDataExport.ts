import { useState, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useInitAgent } from '@/src/hooks/useInitAgent';

export function useDataExport() {
  const { agent } = useInitAgent();
  const [exporting, setExporting] = useState(false);

  const exportData = useCallback(async () => {
    if (!agent?.id) return;
    setExporting(true);
    try {
      const [convRes, memRes, gamRes] = await Promise.all([
        supabase.from("gyeol_conversations" as any).select("*").eq("agent_id", agent.id).order("created_at", { ascending: true }),
        supabase.from("gyeol_memories" as any).select("*").eq("agent_id", agent.id),
        supabase.from("gyeol_gamification" as any).select("*").eq("agent_id", agent.id).maybeSingle(),
      ]);
      const exportPayload = {
        exported_at: new Date().toISOString(),
        agent: {
          id: agent.id,
          name: (agent as any).name,
          persona: (agent as any).persona,
          personality_traits: (agent as any).personality_traits,
          settings: (agent as any).settings,
          created_at: (agent as any).created_at,
        },
        conversations: convRes.data ?? [],
        memories: memRes.data ?? [],
        gamification: gamRes.data ?? null,
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "gyeol-data-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [agent]);

  return { exportData, exporting };
}
