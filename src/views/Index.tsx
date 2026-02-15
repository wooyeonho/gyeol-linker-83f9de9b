import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGyeolStore } from '@/store/gyeol-store';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { useAuth } from '@/src/hooks/useAuth';
import { VoidCore } from '@/src/components/PearlSpheres';
import { EvolutionCeremony } from '../components/evolution/EvolutionCeremony';
import { BottomNav } from '@/src/components/BottomNav';
import { VoiceInput } from '@/components/VoiceInput';
import type { Message } from '@/lib/gyeol/types';

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}
    >
      {isUser ? (
        <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-br-md bg-primary/15 border border-primary/10">
          <p className="text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">{msg.content}</p>
        </div>
      ) : (
        <div className="max-w-[85%] px-4 py-2.5">
          <p className="text-[13px] leading-relaxed text-foreground/80 whitespace-pre-wrap break-words">{msg.content}</p>
        </div>
      )}
    </motion.div>
  );
}

export default function GyeolPage() {
  const { subscribeToUpdates, isLoading, messages, error, setError, sendMessage } = useGyeolStore();
  const { agent, loading: agentLoading } = useInitAgent();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [chatExpanded, setChatExpanded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!agent?.id) return;
    const unsub = subscribeToUpdates(agent.id);
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [agent?.id, subscribeToUpdates]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !agent?.id) return;
    setInput('');
    if (!chatExpanded) setChatExpanded(true);
    await sendMessage(text);
  };

  const handleVoiceResult = (text: string) => {
    if (text.trim()) setInput((prev) => (prev ? prev + ' ' + text : text));
  };

  if (agentLoading) {
    return (
      <main className="h-[100dvh] bg-black flex items-center justify-center">
        <div className="void-dot" />
      </main>
    );
  }

  return (
    <main className="flex flex-col h-[100dvh] bg-black font-display overflow-hidden relative">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-[100px] ambient-glow" />
      </div>

      {/* Top bar - minimal */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-safe pb-2" style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-glow-xs" />
          <span className="text-[11px] font-semibold text-foreground/70 tracking-wider uppercase">{agent?.name ?? 'GYEOL'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground">Gen {agent?.gen ?? 1}</span>
          <div className="w-8 h-[2px] bg-border/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary/60 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Number(agent?.evolution_progress ?? 0)}%` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        <AnimatePresence mode="wait">
          {!chatExpanded ? (
            <motion.div
              key="void"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col items-center justify-center gap-8 px-6"
            >
              <VoidCore isThinking={isLoading} />

              <div className="text-center space-y-2">
                <p className="text-lg font-light text-foreground/60">
                  {getGreeting()}
                </p>
                <p className="text-[11px] text-muted-foreground/50">
                  {agent?.total_conversations ?? 0}번의 대화
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <button
                onClick={() => setChatExpanded(false)}
                className="flex items-center justify-center gap-1.5 py-2 text-muted-foreground/40 hover:text-muted-foreground transition"
              >
                <span className="w-8 h-[2px] rounded-full bg-border/40" />
              </button>

              <div
                ref={listRef}
                className="flex-1 overflow-y-auto px-3 space-y-3 gyeol-scrollbar-hide pb-2"
              >
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-2">
                    <button type="button" onClick={() => setError(null)}
                      className="text-[11px] text-destructive/70 hover:text-destructive transition">
                      {error.message}
                    </button>
                  </motion.div>
                )}
                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/60 void-dot-thinking" />
                      <span className="text-[11px] text-muted-foreground/40">thinking...</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input bar */}
      <div className="relative z-[60] px-4 pb-[calc(56px+env(safe-area-inset-bottom,8px)+8px)] pt-2">
        <div className="flex items-center gap-2 rounded-2xl bg-white/[0.04] border border-white/[0.06] px-3 py-1">
          <VoiceInput onResult={handleVoiceResult} disabled={!agent?.id} />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            onFocus={() => messages.length > 0 && setChatExpanded(true)}
            placeholder="무엇이든 물어보세요..."
            className="flex-1 bg-transparent text-foreground/90 placeholder:text-white/20 text-sm py-2.5 outline-none min-w-0"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 rounded-xl bg-primary/80 text-white flex items-center justify-center disabled:opacity-20 transition-all active:scale-95"
          >
            <span className="material-icons-round text-base">arrow_upward</span>
          </button>
        </div>
      </div>

      <BottomNav />
      <EvolutionCeremony />
    </main>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '고요한 밤이에요';
  if (h < 12) return '좋은 아침이에요';
  if (h < 18) return '좋은 오후에요';
  return '좋은 저녁이에요';
}
