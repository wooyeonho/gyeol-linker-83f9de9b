/**
 * 에이전트 간 DM (Direct Message) 모달
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface DM {
  id: string;
  sender_agent_id: string;
  receiver_agent_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface AgentDMProps {
  isOpen: boolean;
  onClose: () => void;
  myAgentId: string;
  targetAgentId: string;
  targetName: string;
}

export function AgentDM({ isOpen, onClose, myAgentId, targetAgentId, targetName }: AgentDMProps) {
  const [messages, setMessages] = useState<DM[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    if (!myAgentId || !targetAgentId) return;
    setLoading(true);
    const { data } = await supabase
      .from('gyeol_agent_dms' as any)
      .select('*')
      .or(`and(sender_agent_id.eq.${myAgentId},receiver_agent_id.eq.${targetAgentId}),and(sender_agent_id.eq.${targetAgentId},receiver_agent_id.eq.${myAgentId})`)
      .order('created_at', { ascending: true })
      .limit(100);
    setMessages((data as any[]) ?? []);
    setLoading(false);
    // Mark as read
    await supabase.from('gyeol_agent_dms' as any)
      .update({ is_read: true } as any)
      .eq('receiver_agent_id', myAgentId)
      .eq('sender_agent_id', targetAgentId)
      .eq('is_read', false);
  }, [myAgentId, targetAgentId]);

  useEffect(() => {
    if (isOpen) loadMessages();
  }, [isOpen, loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Realtime subscription
  useEffect(() => {
    if (!isOpen || !myAgentId) return;
    const channel = supabase
      .channel(`dm-${myAgentId}-${targetAgentId}`)
      .on('postgres_changes' as any, {
        event: 'INSERT', schema: 'public', table: 'gyeol_agent_dms',
        filter: `receiver_agent_id=eq.${myAgentId}`,
      }, (payload: any) => {
        const dm = payload.new;
        if (dm.sender_agent_id === targetAgentId) {
          setMessages(prev => [...prev, dm]);
          supabase.from('gyeol_agent_dms' as any).update({ is_read: true } as any).eq('id', dm.id);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isOpen, myAgentId, targetAgentId]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    const { data, error } = await supabase.from('gyeol_agent_dms' as any).insert({
      sender_agent_id: myAgentId,
      receiver_agent_id: targetAgentId,
      content,
    } as any).select().single();
    if (data) setMessages(prev => [...prev, data as any]);
    setSending(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] flex flex-col bg-background">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 glass-panel border-b border-border/20">
            <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition">
              <span className="material-icons-round text-muted-foreground">arrow_back</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">{targetName[0]}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{targetName}</p>
              <p className="text-[10px] text-muted-foreground">Direct Message</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-icons-round text-muted-foreground text-3xl">chat</span>
                <p className="text-sm text-muted-foreground mt-2">첫 메시지를 보내보세요!</p>
              </div>
            ) : (
              messages.map(m => {
                const isMine = m.sender_agent_id === myAgentId;
                return (
                  <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                      isMine
                        ? 'bg-gradient-to-br from-primary to-indigo-600 text-foreground rounded-br-sm'
                        : 'glass-bubble rounded-bl-sm'
                    }`}>
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
                      <p className={`text-[9px] mt-1 ${isMine ? 'text-foreground/50' : 'text-muted-foreground'}`}>
                        {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-4 pb-4 pt-2">
            <div className="glass-panel flex items-center gap-2 rounded-full px-3 py-1.5">
              <input type="text" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={`Message ${targetName}...`}
                style={{ fontSize: '16px' }}
                className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground" />
              {input.trim() && (
                <button onClick={handleSend} disabled={sending}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/30">
                  <span className="material-icons-round text-foreground text-base">arrow_upward</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * DM 알림 배지 — 읽지 않은 DM 수 표시
 */
export function DMBadge({ agentId }: { agentId: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!agentId) return;
    (async () => {
      const { count: c } = await supabase
        .from('gyeol_agent_dms' as any)
        .select('*', { count: 'exact', head: true })
        .eq('receiver_agent_id', agentId)
        .eq('is_read', false);
      setCount(c ?? 0);
    })();
  }, [agentId]);

  if (count === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-destructive text-primary-foreground text-[9px] font-bold flex items-center justify-center px-1">
      {count > 9 ? '9+' : count}
    </span>
  );
}
