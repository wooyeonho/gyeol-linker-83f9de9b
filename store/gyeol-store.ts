/**
 * GYEOL Zustand 스토어 — 에이전트, 메시지, 활동 로그, 음성 인식 상태
 */

import { create } from 'zustand';
import type { Agent, Message, AutonomousLog } from '@/lib/gyeol/types';
import { supabase } from '@/src/lib/supabase';
import { showToast } from '@/src/components/Toast';

function cleanChinese(text: string, locale?: string): string {
  if (locale && (locale.startsWith('ja') || locale.startsWith('zh'))) return text;
  return text.replace(/[\u4E00-\u9FFF]/g, '');
}
export type GyeolError = { message: string; code?: string } | null;

export type ConversationInsight = {
  topics: string[];
  emotionArc: string;
  whatWorked: string;
  whatToImprove: string;
  personalityChanged: boolean;
  changes: Record<string, number>;
} | null;

interface GyeolState {
  agent: Agent | null;
  messages: Message[];
  autonomousLogs: AutonomousLog[];
  isLoading: boolean;
  isListening: boolean;
  error: GyeolError;
  evolutionCeremony: { show: boolean; newGen?: number } | null;
  lastInsight: ConversationInsight;
  lastReaction: string | null;
  setAgent: (a: Agent | null) => void;
  setMessages: (m: Message[] | ((prev: Message[]) => Message[])) => void;
  setAutonomousLogs: (l: AutonomousLog[] | ((prev: AutonomousLog[]) => AutonomousLog[])) => void;
  setIsLoading: (v: boolean) => void;
  setIsListening: (v: boolean) => void;
  setError: (e: GyeolError) => void;
  showEvolutionCeremony: (newGen?: number) => void;
  dismissEvolutionCeremony: () => void;
  clearInsight: () => void;
  setReaction: (r: string | null) => void;
  addMessage: (msg: Message) => void;
  sendMessage: (text: string) => Promise<void>;
  subscribeToUpdates: (agentId: string) => (() => void) | void;
  reset: () => void;
}

const initialState = {
  agent: null as Agent | null,
  messages: [] as Message[],
  autonomousLogs: [] as AutonomousLog[],
  isLoading: false,
  isListening: false,
  error: null as GyeolError,
  evolutionCeremony: null as { show: boolean; newGen?: number } | null,
  lastInsight: null as ConversationInsight,
  lastReaction: null as string | null,
};

export const useGyeolStore = create<GyeolState>((set) => ({
  ...initialState,
  setAgent: (agent) => set({ agent }),
  setMessages: (fn) =>
    set((s) => ({
      messages: typeof fn === 'function' ? fn(s.messages) : fn,
    })),
  setAutonomousLogs: (fn) =>
    set((s) => ({
      autonomousLogs: typeof fn === 'function' ? fn(s.autonomousLogs) : fn,
    })),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsListening: (isListening) => set({ isListening }),
  setError: (error) => set({ error }),
  showEvolutionCeremony: (newGen) => set({ evolutionCeremony: { show: true, newGen } }),
  dismissEvolutionCeremony: () => set({ evolutionCeremony: null }),
  clearInsight: () => set({ lastInsight: null }),
  setReaction: (r) => set({ lastReaction: r }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  sendMessage: async (text) => {
    const state = useGyeolStore.getState();
    const agent = state.agent;
    if (!agent?.id) return;
    const userMsg: Message = {
      id: crypto.randomUUID(),
      agent_id: agent.id,
      role: 'user',
      content: text,
      channel: 'web',
      provider: null,
      tokens_used: null,
      response_time_ms: null,
      created_at: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, userMsg], isLoading: true }));
    try {
      const { supabaseUrl } = await import('@/src/lib/supabase');
      const { supabase } = await import('@/src/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      // Try SSE streaming first
      const res = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ agentId: agent.id, message: text, locale: typeof navigator !== 'undefined' ? navigator.language : 'ko', stream: true }),
      });

      const contentType = res.headers.get('content-type') ?? '';

      if (contentType.includes('text/event-stream') && res.body) {
        // SSE streaming mode
        const assistantId = crypto.randomUUID();
        const assistantMsg: Message = {
          id: assistantId,
          agent_id: agent.id,
          role: 'assistant',
          content: '',
          channel: 'web',
          provider: null,
          tokens_used: null,
          response_time_ms: null,
          created_at: new Date().toISOString(),
        };
        set((s) => ({ messages: [...s.messages, assistantMsg] }));

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (!data) continue;
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.token) {
                    fullContent += parsed.token;
                    set((s) => ({
                      messages: s.messages.map(m =>
                        m.id === assistantId ? { ...m, content: cleanChinese(fullContent) } : m
                      ),
                    }));
                  }
                  if (parsed.done) {
                    set((s) => ({
                      isLoading: false,
                      lastReaction: parsed.reaction ?? null,
                      ...(parsed.evolved && parsed.newGen
                        ? { evolutionCeremony: { show: true, newGen: parsed.newGen } }
                        : {}),
                      ...(parsed.conversationInsight
                        ? { lastInsight: parsed.conversationInsight }
                        : {}),
                      ...(parsed.newVisualState && s.agent
                        ? { agent: { ...s.agent, visual_state: parsed.newVisualState } }
                        : {}),
                    }));
                    if (parsed.reaction) {
                      setTimeout(() => useGyeolStore.getState().setReaction(null), 3000);
                    }
                  }
                } catch (parseErr) {
                  console.warn('[SSE] parse error:', parseErr);
                }
              }
            }
          }
        } catch (streamErr) {
          console.warn('[SSE] stream read error:', streamErr);
        } finally {
          set({ isLoading: false });
        }
      } else {
        // Non-streaming JSON response fallback
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          agent_id: agent.id,
          role: 'assistant',
          content: cleanChinese(data.message ?? ''),
          channel: 'web',
          provider: null,
          tokens_used: null,
          response_time_ms: null,
          created_at: new Date().toISOString(),
        };
        set((s) => ({
          messages: [...s.messages, assistantMsg],
          isLoading: false,
          lastReaction: data.reaction ?? null,
          ...(data.newVisualState && s.agent
            ? { agent: { ...s.agent, visual_state: data.newVisualState } }
            : {}),
          ...(data.evolved && data.newGen
            ? { evolutionCeremony: { show: true, newGen: data.newGen } }
            : {}),
          ...(data.conversationInsight
            ? { lastInsight: data.conversationInsight }
            : {}),
        }));
        if (data.reaction) {
          setTimeout(() => useGyeolStore.getState().setReaction(null), 3000);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '전송에 실패했어요. 다시 시도해 주세요.';
      set((s) => ({ isLoading: false, error: { message, code: 'SEND_FAILED' } }));
      setTimeout(() => useGyeolStore.getState().setError(null), 10000);
    }
  },
  subscribeToUpdates: (agentId) => {
    if (typeof window === 'undefined') return;
    const channel = supabase
      .channel(`gyeol:${agentId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'gyeol_agents', filter: `id=eq.${agentId}` },
        (payload: { new: any }) => {
          const row = payload.new;
          set({ agent: row as any });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gyeol_achievement_unlocks', filter: `agent_id=eq.${agentId}` },
        async (payload: { new: any }) => {
          // Fetch achievement name for toast
          const { data: ach } = await supabase
            .from('gyeol_achievements')
            .select('name, rarity, icon, reward_title')
            .eq('id', payload.new.achievement_id)
            .maybeSingle();
          if (ach) {
            showToast({
              type: 'achievement',
              title: `🏆 업적 달성: ${(ach as any).name}`,
              message: (ach as any).reward_title ? `칭호 획득: ${(ach as any).reward_title}` : undefined,
              icon: (ach as any).icon ?? 'emoji_events',
              duration: 5000,
            });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
  reset: () => set(initialState),
}));
