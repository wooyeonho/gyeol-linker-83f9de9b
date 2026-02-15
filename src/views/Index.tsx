import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGyeolStore } from '@/store/gyeol-store';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { useAuth } from '@/src/hooks/useAuth';
import { PearlSpheres } from '@/src/components/PearlSpheres';
import { EvolutionCeremony } from '../components/evolution/EvolutionCeremony';
import { BottomNav } from '@/src/components/BottomNav';
import { VoiceInput } from '@/components/VoiceInput';
import type { Message } from '@/lib/gyeol/types';

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-primary/20 text-foreground border border-primary/20'
            : 'bg-secondary/60 text-foreground border border-border/30'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
      </div>
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

  const personality = agent
    ? { warmth: agent.warmth, logic: agent.logic, creativity: agent.creativity, energy: agent.energy, humor: agent.humor }
    : { warmth: 50, logic: 50, creativity: 50, energy: 50, humor: 50 };

  if (agentLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm animate-pulse">Loading GYEOL...</div>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-[100dvh] bg-background font-display overflow-hidden relative">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[150px] animate-glow-pulse bg-primary/8" />
      </div>

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-5 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
            <span className="material-icons-round text-primary text-base">blur_on</span>
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-none">{agent?.name ?? 'GYEOL'}</p>
            <p className="text-[9px] text-muted-foreground tracking-[0.15em] uppercase">Gen {agent?.gen ?? 1}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/50 border border-border/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-muted-foreground">Online</span>
          </div>
          <div className="text-[10px] text-muted-foreground/60 px-2">
            {Number(agent?.evolution_progress ?? 0).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Evolution progress bar */}
      <div className="relative z-10 px-5 pb-2">
        <div className="h-0.5 bg-border/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Number(agent?.evolution_progress ?? 0)}%` }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        <AnimatePresence mode="wait">
          {!chatExpanded ? (
            /* Companion View */
            <motion.div
              key="companion"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center gap-6 px-6"
            >
              <PearlSpheres personality={personality} isThinking={isLoading} />

              <div className="text-center max-w-xs">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {getGreeting()}, {user?.email?.split('@')[0] ?? 'Explorer'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {agent?.total_conversations ?? 0}번의 대화 · Gen {agent?.gen ?? 1}
                </p>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2 mt-2">
                {[
                  { icon: 'monitoring', label: '활동', to: '/activity' },
                  { icon: 'group', label: '소셜', to: '/social' },
                  { icon: 'extension', label: '마켓', to: '/market/skills' },
                ].map((item) => (
                  <a
                    key={item.to}
                    href={item.to}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary/50 border border-border/30 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all text-xs"
                  >
                    <span className="material-icons-round text-sm">{item.icon}</span>
                    {item.label}
                  </a>
                ))}
              </div>
            </motion.div>
          ) : (
            /* Chat View */
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {/* Chat header */}
              <button
                onClick={() => setChatExpanded(false)}
                className="flex items-center gap-2 px-5 py-2 text-xs text-muted-foreground hover:text-foreground transition"
              >
                <span className="material-icons-round text-sm">expand_more</span>
                대화 접기
              </button>

              {/* Messages */}
              <div
                ref={listRef}
                className="flex-1 overflow-y-auto px-4 space-y-2.5 gyeol-scrollbar-hide"
              >
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
                    <button type="button" onClick={() => setError(null)}
                      className="rounded-xl bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 text-xs">
                      {error.message} (dismiss)
                    </button>
                  </motion.div>
                )}
                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="rounded-2xl bg-secondary/60 border border-border/30 px-4 py-2.5 flex gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '200ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '400ms' }} />
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input bar */}
      <div className="relative z-[60] px-4 pb-20 pt-2">
        <div className="flex items-center gap-2 rounded-2xl bg-secondary/50 border border-border/30 backdrop-blur-xl px-3 py-1.5">
          <VoiceInput onResult={handleVoiceResult} disabled={!agent?.id} />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            onFocus={() => messages.length > 0 && setChatExpanded(true)}
            placeholder="GYEOL에게 말하기..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm py-2.5 outline-none min-w-0"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 transition-all active:scale-95 shadow-glow-xs"
          >
            <span className="material-icons-round text-lg">arrow_upward</span>
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
  if (h < 6) return '좋은 밤이에요';
  if (h < 12) return '좋은 아침이에요';
  if (h < 18) return '좋은 오후에요';
  return '좋은 저녁이에요';
}
