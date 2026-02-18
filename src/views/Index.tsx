import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGyeolStore } from '@/store/gyeol-store';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { useAuth } from '@/src/hooks/useAuth';
import { VoidCore } from '@/src/components/PearlSpheres';
import { EvolutionCeremony } from '../components/evolution/EvolutionCeremony';
import { BottomNav } from '@/src/components/BottomNav';
import { VoiceInput } from '@/components/VoiceInput';
import { speakText, stopSpeaking } from '@/lib/gyeol/tts';
import type { Message } from '@/lib/gyeol/types';

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  const [reading, setReading] = useState(false);

  const handleSpeak = () => {
    if (reading) { stopSpeaking(); setReading(false); }
    else { setReading(true); speakText(msg.content, 0.95, () => setReading(false)); }
  };

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
          {(msg as any).metadata?.criticalLearning && (
            <span className="inline-block text-[8px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 mb-1">
              ⚡ Critical Learning! x{(msg as any).metadata.criticalMultiplier}
            </span>
          )}
          <p className="text-[13px] leading-relaxed text-foreground/80 whitespace-pre-wrap break-words">{msg.content}</p>
          <button type="button" onClick={handleSpeak}
            className={`mt-1 p-1 rounded-full transition ${reading ? 'text-primary' : 'text-white/15 hover:text-white/40'}`}
            aria-label={reading ? 'Stop reading' : 'Read aloud'}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" />
            </svg>
          </button>
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

      {/* Top bar */}
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
              <VoidCore isThinking={isLoading} mood={(agent as any)?.mood ?? 'neutral'} />

              <div className="text-center space-y-2">
                <p className="text-lg font-light text-foreground/60">
                  {getGreeting()}
                </p>
                <p className="text-[11px] text-muted-foreground/50">
                  {agent?.total_conversations ?? 0} conversations
                </p>

                {/* 친밀도 + 감정 + 연속 접속 */}
                {agent && (
                  <div className="flex items-center justify-center gap-3 text-[9px] text-white/25 mt-1">
                    <span>
                      {(agent as any).intimacy >= 80 ? '💜' :
                       (agent as any).intimacy >= 60 ? '💙' :
                       (agent as any).intimacy >= 40 ? '💚' :
                       (agent as any).intimacy >= 20 ? '🤍' : '⚪'}
                      {' '}{(agent as any).intimacy ?? 0}%
                    </span>
                    <span>
                      {(agent as any).mood === 'happy' ? '😊' :
                       (agent as any).mood === 'excited' ? '🤩' :
                       (agent as any).mood === 'sad' ? '😢' :
                       (agent as any).mood === 'lonely' ? '🥺' :
                       (agent as any).mood === 'tired' ? '😴' : '🙂'}
                    </span>
                    {(agent as any).consecutive_days > 0 && (
                      <span>🔥 {(agent as any).consecutive_days}d</span>
                    )}
                  </div>
                )}

                {/* 진화 시도 버튼 */}
                {agent && Number((agent as any).evolution_progress) >= 100 && (agent as any).gen < 5 && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/evolution/attempt', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ agentId: agent.id }),
                        });
                        const data = await res.json();
                        if (!data.evolved) {
                          alert(data.message || 'Evolution failed... Try again!');
                        }
                      } catch {
                        alert('An error occurred during evolution attempt.');
                      }
                    }}
                    className="mt-2 px-4 py-2 rounded-xl bg-primary/20 border border-primary/30 text-primary text-xs font-medium animate-pulse hover:bg-primary/30 transition"
                  >
                    ✨ Evolve! (Gen {(agent as any).gen} → {(agent as any).gen + 1})
                  </button>
                )}
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
            placeholder="Ask me anything..."
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
  if (h < 6) return 'A quiet night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
