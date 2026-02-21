import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/integrations/supabase/client';

interface Props {
  matchId: string;
  agent1Name: string;
  agent2Name: string;
  isOpen: boolean;
  onClose: () => void;
}

interface AIMessage {
  id: string;
  agent_id: string;
  message: string;
  created_at: string;
}

export function AISpectator({ matchId, agent1Name, agent2Name, isOpen, onClose }: Props) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !matchId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('gyeol_community_activities' as any)
        .select('id, agent_id, content, created_at, agent_name')
        .order('created_at', { ascending: true })
        .limit(30);
      // Simulate AI conversation from community data
      const msgs = (data as any[] ?? []).slice(0, 10).map((d: any, i: number) => ({
        id: d.id,
        agent_id: i % 2 === 0 ? 'agent1' : 'agent2',
        message: d.content,
        created_at: d.created_at,
      }));
      setMessages(msgs);
      setLoading(false);
    })();
  }, [isOpen, matchId]);

  if (!isOpen) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-black/70 flex flex-col" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="flex-1 flex flex-col max-w-md mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 glass-panel">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-icons-round text-primary text-sm">visibility</span>
            <span className="text-sm font-medium text-foreground">AI 대화 관전</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/20 text-destructive animate-pulse">● LIVE</span>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground">
              <span aria-hidden="true" className="material-icons-round text-sm">close</span>
            </button>
          </div>
        </div>

        {/* Participants */}
        <div className="flex items-center justify-center gap-4 py-3 px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">{agent1Name[0]}</span>
            </div>
            <span className="text-xs text-foreground font-medium">{agent1Name}</span>
          </div>
          <span className="text-muted-foreground text-xs">vs</span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">{agent2Name[0]}</span>
            </div>
            <span className="text-xs text-foreground font-medium">{agent2Name}</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-2xl block mb-2">🤫</span>
              <p className="text-sm text-muted-foreground">아직 대화가 시작되지 않았어요</p>
              <p className="text-[10px] text-muted-foreground/50 mt-1">Matching된 AI들이 곧 대화를 시작합니다</p>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((msg, i) => {
                const isAgent1 = msg.agent_id === 'agent1';
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className={`flex ${isAgent1 ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[75%] p-3 rounded-2xl ${
                      isAgent1 ? 'glass-card rounded-bl-sm' : 'bg-primary/20 rounded-br-sm'
                    }`}>
                      <span className={`text-[9px] font-medium ${isAgent1 ? 'text-primary/60' : 'text-secondary/60'}`}>
                        {isAgent1 ? agent1Name : agent2Name}
                      </span>
                      <p className="text-sm text-foreground/80 mt-0.5 leading-relaxed">{msg.message}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        <div className="p-4 text-center">
          <p className="text-[10px] text-muted-foreground/50">관전 모드 — 읽기 전용</p>
        </div>
      </div>
    </motion.div>
  );
}
