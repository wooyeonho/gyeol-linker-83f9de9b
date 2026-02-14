/**
 * GYEOL Zustand 스토어 — 에이전트, 메시지, 활동 로그, 음성 인식 상태
 */

import { create } from 'zustand';
import type { Agent, Message, AutonomousLog } from '@/lib/gyeol/types';
import { createClient } from '@/lib/supabase/client';

export type GyeolError = { message: string; code?: string } | null;

interface GyeolState {
  agent: Agent | null;
  messages: Message[];
  autonomousLogs: AutonomousLog[];
  isLoading: boolean;
  isListening: boolean;
  error: GyeolError;
  evolutionCeremony: { show: boolean; newGen?: number } | null;
  setAgent: (a: Agent | null) => void;
  setMessages: (m: Message[] | ((prev: Message[]) => Message[])) => void;
  setAutonomousLogs: (l: AutonomousLog[] | ((prev: AutonomousLog[]) => AutonomousLog[])) => void;
  setIsLoading: (v: boolean) => void;
  setIsListening: (v: boolean) => void;
  setError: (e: GyeolError) => void;
  showEvolutionCeremony: (newGen?: number) => void;
  dismissEvolutionCeremony: () => void;
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
      const res = await fetch('/api/gyeol/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        agent_id: agent.id,
        role: 'assistant',
        content: data.message ?? '',
        channel: 'web',
        provider: null,
        tokens_used: null,
        response_time_ms: null,
        created_at: new Date().toISOString(),
      };
      set((s) => ({
        messages: [...s.messages, assistantMsg],
        isLoading: false,
        ...(data.newVisualState && s.agent
          ? { agent: { ...s.agent, visual_state: data.newVisualState } }
          : {}),
        ...(data.evolved && data.newGen
          ? { evolutionCeremony: { show: true, newGen: data.newGen } }
          : {}),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : '전송에 실패했어요. 다시 시도해 주세요.';
      set((s) => ({ isLoading: false, error: { message, code: 'SEND_FAILED' } }));
      setTimeout(() => useGyeolStore.getState().setError(null), 4000);
    }
  },
  subscribeToUpdates: (agentId) => {
    if (typeof window === 'undefined') return;
    const supabase = createClient();
    const channel = supabase
      .channel(`gyeol:${agentId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gyeol_conversations', filter: `agent_id=eq.${agentId}` },
        (payload) => {
          const row = payload.new as Message;
          set((s) => ({ messages: [...s.messages, row] }));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
  reset: () => set(initialState),
}));
