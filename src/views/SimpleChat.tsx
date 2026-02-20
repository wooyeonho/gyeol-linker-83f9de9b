import { useEffect, useState, useRef, useCallback } from 'react';
import type { Message } from '@/lib/gyeol/types';
import { useNavigate } from 'react-router-dom';
import { useGyeolStore } from '@/store/gyeol-store';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { AnimatedCharacter } from '@/src/components/AnimatedCharacter';
import { VoiceInput } from '@/components/VoiceInput';
import { EvolutionCeremony } from '@/src/components/evolution/EvolutionCeremony';
import { speakText, stopSpeaking } from '@/lib/gyeol/tts';
import { supabase } from '@/src/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ConversationList } from '@/src/components/ConversationList';
import { StreakBonus } from '@/src/components/StreakBonus';

// Emoji reactions for messages
const REACTIONS = ['❤️', '👍', '😂', '🤔', '😢', '🔥'];

// Code block with copy button (extracted to avoid hooks-in-callback)
function CodeBlockCopy({ children, className }: any) {
  const code = String(children).replace(/\n$/, '');
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group/code">
      <pre className={className}><code>{children}</code></pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-1 right-1 opacity-0 group-hover/code:opacity-100 transition text-[9px] px-2 py-1 rounded-md bg-primary/20 text-primary hover:bg-primary/30"
      >{copied ? '✓' : 'Copy'}</button>
    </div>
  );
}

export default function SimpleChat() {
  const navigate = useNavigate();
  const { agent } = useInitAgent();
  const { messages, sendMessage, isLoading, error, setError, lastReaction, addMessage, setMessages } = useGyeolStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const settings = (agent?.settings as any) ?? {};
  const fontSize = settings.fontSize ?? 18;
  const autoTTS = settings.autoTTS !== false;
  const hasCharacter = settings.characterPreset != null;

  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const [convListOpen, setConvListOpen] = useState(false);

  const [isDark, setIsDark] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : true
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const h = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!agent?.id) return;
    const channel = supabase
      .channel(`simple-proactive-${agent.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'gyeol_conversations',
        filter: `agent_id=eq.${agent.id}`,
      }, (payload: any) => {
        const row = payload.new;
        if (row.role === 'assistant') {
          const exists = useGyeolStore.getState().messages.some((m: any) => m.id === row.id);
          if (!exists) {
            addMessage(row);
            if (autoTTS) speakText(row.content, settings.readSpeed ?? 0.95);
          }
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [agent?.id, autoTTS]);

  useEffect(() => {
    if (!autoTTS || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role === 'assistant') {
      speakText(last.content, settings.readSpeed ?? 0.95);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading || !agent?.id) return;
    setInput('');
    stopSpeaking();
    await sendMessage(text);
  };

  const handleDeleteMessage = (msgId: string) => {
    setMessages((prev: Message[]) => prev.filter(m => m.id !== msgId));
  };

  const handleResendMessage = async (content: string) => {
    if (isLoading || !agent?.id) return;
    await sendMessage(content);
  };

  // Intimacy info
  const intimacy = (agent as any)?.intimacy ?? 0;
  const intimacyLevel = intimacy < 10 ? 'Stranger' : intimacy < 20 ? 'Acquaintance' : intimacy < 30 ? 'Casual' : intimacy < 40 ? 'Friend' : intimacy < 50 ? 'Good Friend' : intimacy < 60 ? 'Close Friend' : intimacy < 70 ? 'Bestie' : intimacy < 80 ? 'Soulmate' : intimacy < 90 ? 'Family' : 'Inseparable';
  const intimacyEmoji = intimacy < 10 ? '🤝' : intimacy < 20 ? '👋' : intimacy < 30 ? '😊' : intimacy < 40 ? '💕' : intimacy < 50 ? '💖' : intimacy < 60 ? '💗' : intimacy < 70 ? '💞' : intimacy < 80 ? '💘' : intimacy < 90 ? '👨‍👩‍👧' : '💫';

  // Date grouping helper
  const getDateLabel = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return '오늘';
    if (isYesterday(d)) return '어제';
    return format(d, 'M월 d일 (EEE)', { locale: ko });
  }, []);

  // Group messages by date
  const groupedMessages = messages.reduce<{ date: string; label: string; msgs: Message[] }[]>((acc, msg) => {
    const dateKey = format(new Date(msg.created_at), 'yyyy-MM-dd');
    const last = acc[acc.length - 1];
    if (last && last.date === dateKey) {
      last.msgs.push(msg);
    } else {
      acc.push({ date: dateKey, label: getDateLabel(msg.created_at), msgs: [msg] });
    }
    return acc;
  }, []);

  const agentName = agent?.name ?? 'GYEOL';

  return (
    <main className="flex flex-col h-[100dvh] bg-background overflow-hidden relative" role="main" aria-label="Chat">
      <div className="aurora-bg" aria-hidden="true" />

      {/* === Header === */}
      {hasCharacter ? (
        <div className="flex-shrink-0 flex flex-col items-center justify-center pt-6 pb-2 relative z-10"
          style={{ height: '30vh' }}>
          <button onClick={() => setConvListOpen(true)}
            aria-label="Conversation history"
            className="absolute top-4 left-4 w-11 h-11 rounded-full flex items-center justify-center glass-card focus-visible:outline-2 focus-visible:outline-primary">
            <span className="material-icons-round text-lg text-muted-foreground" aria-hidden="true">history</span>
          </button>
          <button onClick={() => navigate('/settings')}
            aria-label="Settings"
            className="absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center glass-card focus-visible:outline-2 focus-visible:outline-primary">
            <span className="material-icons-round text-lg text-muted-foreground" aria-hidden="true">settings</span>
          </button>
          <AnimatedCharacter
            mood={(agent as any)?.mood ?? 'neutral'}
            isThinking={isLoading}
            reaction={lastReaction}
            characterPreset={settings.characterPreset}
            skinId={(agent as any)?.skin_id}
            gen={agent?.gen ?? 1}
            size="lg"
          />
          <div className="mt-2 flex items-center gap-2">
            <p className="text-base font-medium text-foreground">{agentName}</p>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[10px] text-emerald-400/70">Online</p>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/70">{intimacyEmoji} {intimacyLevel}</span>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 glass-panel z-10 relative">
          <div className="flex items-center gap-2">
            <button onClick={() => setConvListOpen(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition">
              <span className="material-icons-round text-lg">history</span>
            </button>
            <p className="text-base font-medium text-foreground">{agentName}</p>
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          </div>
          <button onClick={() => navigate('/settings')}
            className="w-11 h-11 rounded-full flex items-center justify-center glass-card">
            <span className="material-icons-round text-lg text-muted-foreground">settings</span>
          </button>
        </div>
      )}

      {/* Streak bonus banner */}
      {(agent as any)?.consecutive_days > 1 && (
        <div className="px-4 pb-1 relative z-10">
          <StreakBonus streakDays={(agent as any).consecutive_days} />
        </div>
      )}

      {/* === Messages === */}
      <div className="flex-1 overflow-y-auto px-4 pb-2 relative z-10" role="log" aria-label="Messages" aria-live="polite">
        {groupedMessages.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex justify-center py-3">
              <span className="px-4 py-1.5 rounded-full glass-card text-[11px] font-medium text-slate-400">
                {group.label}
              </span>
            </div>

            {group.msgs.map(msg => (
              <div key={msg.id} className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                {msg.role === 'user' ? (
                  <div className="flex gap-2.5 justify-end">
                    <div className="max-w-[80%]">
                      <span className="text-[10px] text-slate-400 font-medium mr-1 mb-1 block text-right">You · {format(new Date(msg.created_at), 'HH:mm')}</span>
                      <div className="user-bubble p-4 rounded-2xl rounded-br-sm"
                        style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                      {/* Reaction display */}
                      {reactions[msg.id] && (
                        <div className="flex justify-end mt-0.5">
                          <span className="text-sm bg-background/50 rounded-full px-1.5 py-0.5 border border-white/5">{reactions[msg.id]}</span>
                        </div>
                      )}
                      {/* Message actions */}
                      <div className="flex justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setReactionPickerFor(reactionPickerFor === msg.id ? null : msg.id)}
                          aria-label="Add reaction"
                          className="text-[9px] text-slate-500 hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition focus-visible:outline-2 focus-visible:outline-primary">
                          <span className="material-icons-round text-[12px]" aria-hidden="true">add_reaction</span>
                        </button>
                        <button onClick={() => handleDeleteMessage(msg.id)}
                          aria-label="Delete message"
                          className="text-[9px] text-slate-500 hover:text-destructive px-1.5 py-0.5 rounded hover:bg-destructive/10 transition focus-visible:outline-2 focus-visible:outline-primary">
                          <span className="material-icons-round text-[12px]" aria-hidden="true">delete</span>
                        </button>
                        <button onClick={() => handleResendMessage(msg.content)}
                          aria-label="Resend message"
                          className="text-[9px] text-slate-500 hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition focus-visible:outline-2 focus-visible:outline-primary">
                          <span className="material-icons-round text-[12px]" aria-hidden="true">refresh</span>
                        </button>
                      </div>
                      {/* Reaction picker */}
                      <AnimatePresence>
                        {reactionPickerFor === msg.id && (
                          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="flex gap-1 mt-1 justify-end">
                            {REACTIONS.map(r => (
                              <button key={r} onClick={() => { setReactions(prev => ({ ...prev, [msg.id]: r })); setReactionPickerFor(null); }}
                                className="text-lg hover:scale-125 transition-transform">{r}</button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-secondary/30 to-primary/20 border border-white/10 flex items-center justify-center shadow-lg mt-5">
                      <span className="material-icons-round text-slate-300 text-[14px]">person</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2.5 justify-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-secondary/20 border border-white/10 flex items-center justify-center shadow-lg mt-5">
                      <span className="material-icons-round text-primary/80 text-[14px]">smart_toy</span>
                    </div>
                    <div className="max-w-[80%]">
                      <span className="text-[10px] text-primary/60 font-medium ml-1 mb-1 block">{agentName} · {format(new Date(msg.created_at), 'HH:mm')}</span>
                      <div className="glass-bubble p-4 rounded-2xl rounded-bl-sm"
                        style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}>
                        <div className="prose prose-invert max-w-none prose-p:my-1 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: CodeBlockCopy }}>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                      {/* Reaction display */}
                      {reactions[msg.id] && (
                        <div className="flex mt-0.5">
                          <span className="text-sm bg-background/50 rounded-full px-1.5 py-0.5 border border-white/5">{reactions[msg.id]}</span>
                        </div>
                      )}
                      {/* AI message actions */}
                      <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setReactionPickerFor(reactionPickerFor === msg.id ? null : msg.id)}
                          aria-label="Add reaction"
                          className="text-[9px] text-slate-500 hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition focus-visible:outline-2 focus-visible:outline-primary">
                          <span className="material-icons-round text-[12px]" aria-hidden="true">add_reaction</span>
                        </button>
                        <button onClick={() => handleDeleteMessage(msg.id)}
                          aria-label="Delete message"
                          className="text-[9px] text-slate-500 hover:text-destructive px-1.5 py-0.5 rounded hover:bg-destructive/10 transition focus-visible:outline-2 focus-visible:outline-primary">
                          <span className="material-icons-round text-[12px]" aria-hidden="true">delete</span>
                        </button>
                        <button onClick={() => navigator.clipboard.writeText(msg.content)}
                          aria-label="Copy message"
                          className="text-[9px] text-slate-500 hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition focus-visible:outline-2 focus-visible:outline-primary">
                          <span className="material-icons-round text-[12px]" aria-hidden="true">content_copy</span>
                        </button>
                        <button onClick={() => speakText(msg.content, settings.readSpeed ?? 0.95)}
                          aria-label="Read aloud"
                          className="text-[9px] text-slate-500 hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition focus-visible:outline-2 focus-visible:outline-primary">
                          <span className="material-icons-round text-[12px]" aria-hidden="true">volume_up</span>
                        </button>
                      </div>
                      {/* Reaction picker */}
                      <AnimatePresence>
                        {reactionPickerFor === msg.id && (
                          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="flex gap-1 mt-1">
                            {REACTIONS.map(r => (
                              <button key={r} onClick={() => { setReactions(prev => ({ ...prev, [msg.id]: r })); setReactionPickerFor(null); }}
                                className="text-lg hover:scale-125 transition-transform">{r}</button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Typing indicator with dots */}
        {isLoading && (
          <div className="flex gap-2.5 mb-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-secondary/20 border border-white/10 flex items-center justify-center">
              <span className="material-icons-round text-primary/80 text-[14px]">smart_toy</span>
            </div>
            <div className="glass-bubble p-4 rounded-2xl rounded-bl-sm">
              <div className="flex items-center gap-1.5 h-4">
                <div className="typing-dot" />
                <div className="typing-dot" style={{ animationDelay: '0.15s' }} />
                <div className="typing-dot" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center py-2">
            <button onClick={() => setError(null)}
              className="text-xs text-red-400/70">{error.message}</button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* === Input bar === */}
      <div className="flex-shrink-0 relative z-10"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}>
        <div className="bg-gradient-to-t from-background to-transparent pt-6 px-4">
          <div className="glass-panel input-glow flex items-center gap-2 rounded-full px-2 py-1.5">
            <button type="button" className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition flex-shrink-0">
              <span className="material-icons-round text-[20px]">add_circle_outline</span>
            </button>
            <input type="text" value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Message GYEOL..."
              aria-label="Message input"
              style={{ fontSize: '16px' }}
              className="flex-1 bg-transparent outline-none min-w-0 text-foreground placeholder:text-slate-500 focus-visible:outline-none" />
            <VoiceInput onResult={t => setInput(t)} disabled={isLoading} />
            {input.trim() && (
              <button onClick={handleSend} disabled={isLoading}
                aria-label="Send message"
                className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 flex items-center justify-center flex-shrink-0 transition-all focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2">
                <span className="material-icons-round text-white text-base" aria-hidden="true">arrow_upward</span>
              </button>
            )}
          </div>
          <p className="text-center text-[9px] text-slate-600 mt-1.5">
            GYEOL can make mistakes. Verify important information.
          </p>
        </div>
      </div>

      <EvolutionCeremony />

      {/* Conversation history drawer */}
      {agent?.id && (
        <ConversationList
          isOpen={convListOpen}
          onClose={() => setConvListOpen(false)}
          agentId={agent.id}
        />
      )}
    </main>
  );
}
