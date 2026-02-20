import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useGyeolStore } from '@/store/gyeol-store';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { useAuth } from '@/src/hooks/useAuth';
import { supabase, supabaseUrl } from '@/src/lib/supabase';
import Onboarding from './Onboarding';
import { AnimatedCharacter } from '@/src/components/AnimatedCharacter';
import { EvolutionCeremony } from '../components/evolution/EvolutionCeremony';
import { BottomNav } from '@/src/components/BottomNav';
import { VoiceInput } from '@/components/VoiceInput';
import { speakText, stopSpeaking } from '@/lib/gyeol/tts';
import { GenBadge } from '@/src/components/GenBadge';
import { MemoryDashboard } from '@/src/components/MemoryDashboard';
import { EvolutionProgress } from '@/src/components/EvolutionProgress';
import { InsightCard } from '@/src/components/InsightCard';
import { BreedingResult } from '@/src/components/BreedingResult';
import { GamificationWidget } from '@/src/components/GamificationWidget';
import { PersonalityRadar } from '@/src/components/PersonalityRadar';
import { MoodHistory } from '@/src/components/MoodHistory';
import { DailyReward } from '@/src/components/DailyReward';
import { AchievementPopup } from '@/src/components/AchievementPopup';
import { AgentProfile } from '@/src/components/AgentProfile';
import { NotificationPanel } from '@/src/components/NotificationPanel';
import { ConversationExport } from '@/src/components/ConversationExport';
import { ChatSearch } from '@/src/components/ChatSearch';
import { MessageReactions } from '@/src/components/MessageReactions';
import { LeaderboardWidget } from '@/src/components/LeaderboardWidget';
import { PullToRefresh } from '@/src/components/PullToRefresh';
import { StreakBonus } from '@/src/components/StreakBonus';
import type { Message } from '@/lib/gyeol/types';

function MessageBubble({ msg, agentName }: { msg: Message; agentName: string }) {
  const isUser = msg.role === 'user';
  const [reading, setReading] = useState(false);
  const time = new Date((msg as any).created_at ?? Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleSpeak = () => {
    if (reading) { stopSpeaking(); setReading(false); }
    else { setReading(true); speakText(msg.content, 0.95, () => setReading(false)); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} w-full`}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary p-[1px] shadow-lg shadow-primary/10 mt-6">
          <div className="w-full h-full rounded-[7px] bg-background flex items-center justify-center">
            <span className="material-icons-round text-transparent bg-clip-text bg-gradient-to-br from-primary to-secondary text-[14px]">smart_toy</span>
          </div>
        </div>
      )}

      {isUser ? (
        <div className="max-w-[75%]">
          <div className="flex items-center justify-end gap-2 mb-1">
            <span className="text-[10px] text-slate-500">{time}</span>
            <span className="text-[10px] text-slate-400 font-medium">You</span>
          </div>
          <div className="user-bubble p-4 rounded-2xl rounded-br-sm">
            <div className="text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-[85%]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] text-foreground font-bold">{agentName}</span>
            <span className="text-[10px] text-slate-500">{time}</span>
          </div>
          <div className="flex gap-0">
            <div className="w-[3px] rounded-full bg-gradient-to-b from-primary to-primary/30 mr-3 flex-shrink-0" />
            <div className="glass-bubble p-4 rounded-2xl rounded-tl-sm flex-1">
              {(msg as any).metadata?.criticalLearning && (
                <span className="inline-block text-[8px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 mb-1">
                  ⚡ Critical Learning! x{(msg as any).metadata.criticalMultiplier}
                </span>
              )}
              <div className="text-[13px] leading-relaxed text-foreground/80 whitespace-pre-wrap break-words prose prose-invert max-w-none prose-p:my-1 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <button type="button" onClick={handleSpeak}
                  className={`p-1 rounded-full transition ${reading ? 'text-primary' : 'text-white/15 hover:text-white/40'}`}
                  aria-label={reading ? 'Stop reading' : 'Read aloud'}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          {/* Action buttons outside bubble */}
          <div className="flex items-center gap-3 mt-1.5 ml-7">
            <button onClick={() => navigator.clipboard.writeText(msg.content)}
              className="flex items-center gap-1 text-[10px] text-white/20 hover:text-white/50 transition">
              <span className="material-icons-round text-[14px]">content_copy</span>
              Copy
            </button>
            <button className="flex items-center gap-1 text-[10px] text-white/20 hover:text-white/50 transition">
              <span className="material-icons-round text-[14px]">thumb_up</span>
              Helpful
            </button>
          </div>
        </div>
      )}

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-secondary/30 to-primary/20 border border-white/10 flex items-center justify-center mt-6">
          <span className="material-icons-round text-slate-300 text-[14px]">person</span>
        </div>
      )}
    </motion.div>
  );
}

export default function GyeolPage() {
  const { subscribeToUpdates, isLoading, messages, error, setError, sendMessage, lastInsight, clearInsight, lastReaction } = useGyeolStore();
  const { agent, loading: agentLoading, needsOnboarding, completeOnboarding } = useInitAgent();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [chatExpanded, setChatExpanded] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [evoOpen, setEvoOpen] = useState(false);
  const [breedingOpen, setBreedingOpen] = useState(false);
  const [dailyRewardOpen, setDailyRewardOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  const agentName = agent?.name ?? 'GYEOL';

  if (agentLoading) {
    return (
      <main className="h-[100dvh] bg-background flex items-center justify-center">
        <div className="aurora-bg" />
        <div className="void-dot" />
      </main>
    );
  }

  if (needsOnboarding && user) {
    return <Onboarding userId={user.id} onComplete={completeOnboarding} />;
  }

  return (
    <main className="flex flex-col h-[100dvh] bg-background font-display overflow-hidden relative" role="main" aria-label="GYEOL Home">
      <div className="aurora-bg" aria-hidden="true" />

      {/* Top bar — Stitch 03 */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-safe pb-2" style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary p-[1px] shadow-lg shadow-primary/20">
            <div className="w-full h-full rounded-[7px] bg-background flex items-center justify-center">
              <span className="material-icons-round text-transparent bg-clip-text bg-gradient-to-br from-primary to-secondary text-sm">smart_toy</span>
            </div>
          </div>
          <div>
            <span className="text-sm font-bold text-foreground tracking-tight">{agentName}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
              <span className="text-[10px] text-slate-400">Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(() => {
            const p = (agent?.settings as any)?.persona;
            if (p && p !== 'friend') {
              const display = p.length > 15 ? p.slice(0, 15) + '…' : p;
              return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/60 font-medium max-w-[120px] truncate">✦ {display}</span>;
            }
            return null;
          })()}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-card text-[10px]">
            <span className="material-icons-round text-secondary text-[12px]">verified</span>
            <GenBadge gen={agent?.gen ?? 1} size="sm" />
          </div>
          <button type="button" onClick={() => setSearchOpen(!searchOpen)} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition focus-visible:outline-2 focus-visible:outline-primary" aria-label="Search conversations">
            <span className="material-icons-round text-[16px]" aria-hidden="true">search</span>
          </button>
          <button type="button" onClick={() => setNotifOpen(true)} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-foreground relative transition focus-visible:outline-2 focus-visible:outline-primary" aria-label="Notifications">
            <span className="material-icons-round text-[16px]" aria-hidden="true">notifications</span>
          </button>
          <button type="button" onClick={() => setExportOpen(true)} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition focus-visible:outline-2 focus-visible:outline-primary" aria-label="Export conversations">
            <span className="material-icons-round text-[16px]" aria-hidden="true">download</span>
          </button>
          <button type="button" onClick={() => setEvoOpen(true)} className="text-muted-foreground/40 hover:text-foreground transition focus-visible:outline-2 focus-visible:outline-primary rounded-full" aria-label="Evolution progress">
            <span className="material-icons-round text-[14px]" aria-hidden="true">trending_up</span>
          </button>
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="relative z-20 px-5 overflow-hidden">
            <div className="flex items-center gap-2 glass-card rounded-full px-4 py-2">
              <span className="material-icons-round text-muted-foreground text-sm">search</span>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="대화 검색..." autoFocus
                aria-label="Search conversations"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:outline-none" />
              <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="text-muted-foreground" aria-label="Close search">
                <span className="material-icons-round text-sm" aria-hidden="true">close</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              {/* VoidCore with enhanced aurora glow */}
              <div className="relative">
                <div className="absolute inset-0 -m-16 bg-gradient-to-br from-primary/15 to-secondary/8 rounded-full blur-[60px] animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute inset-0 -m-8 rounded-full bg-gradient-to-br from-primary/10 to-secondary/5 blur-3xl" />
                <AnimatedCharacter
                  mood={(agent as any)?.mood ?? 'neutral'}
                  isThinking={isLoading}
                  reaction={lastReaction}
                  characterPreset={((agent as any)?.settings as any)?.characterPreset ?? 'void'}
                  skinId={(agent as any)?.skin_id}
                  gen={agent?.gen ?? 1}
                  size="sm"
                />
              </div>

              <div className="text-center space-y-2">
                <p className="text-lg font-light text-foreground/60">
                  {getGreeting(agent)}
                </p>
                <p className="text-[11px] text-muted-foreground/50">
                  {agent?.total_conversations ?? 0} conversations
                </p>

                <div className="flex items-center justify-center gap-2 mt-3">
                  <button type="button" onClick={() => setProfileOpen(true)}
                    className="px-3 py-1.5 rounded-xl glass-card text-primary/70 text-[10px] font-medium hover:border-white/15 transition flex items-center gap-1">
                    <span className="text-xs">👤</span> 프로필
                  </button>
                  <button type="button" onClick={() => setMemoryOpen(true)}
                    className="px-3 py-1.5 rounded-xl glass-card text-primary/70 text-[10px] font-medium hover:border-white/15 transition flex items-center gap-1">
                    <span className="text-xs">🧠</span> AI의 기억
                  </button>
                  <button type="button" onClick={() => setEvoOpen(true)}
                    className="px-3 py-1.5 rounded-xl glass-card text-primary/70 text-[10px] font-medium hover:border-white/15 transition flex items-center gap-1">
                    <span className="text-xs">🧬</span> 진화
                  </button>
                  <button type="button" onClick={() => setDailyRewardOpen(true)}
                    className="px-3 py-1.5 rounded-xl glass-card text-primary/70 text-[10px] font-medium hover:border-white/15 transition flex items-center gap-1">
                    <span className="text-xs">🎁</span> 보상
                  </button>
                </div>

                {/* Growth Status mini card */}
                <div className="glass-card rounded-2xl p-4 w-full max-w-[280px] mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Growth Status</span>
                    <span className="text-[10px] text-secondary font-bold">{Math.round(Number(agent?.evolution_progress ?? 0))}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all"
                      style={{ width: `${Math.min(Number(agent?.evolution_progress ?? 0), 100)}%` }} />
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1.5">Generation {agent?.gen ?? 1} • {agent?.total_conversations ?? 0} conversations</p>
                </div>

                {/* Streak Bonus */}
                {agent && (agent as any).consecutive_days > 1 && (
                  <div className="w-full max-w-[280px] mt-3">
                    <StreakBonus streakDays={(agent as any).consecutive_days} />
                  </div>
                )}

                {/* Gamification Widget */}
                <GamificationWidget />

                {/* Personality Radar */}
                {agent && (
                  <div className="flex justify-center mt-4">
                    <PersonalityRadar
                      warmth={agent.warmth}
                      logic={agent.logic}
                      creativity={agent.creativity}
                      energy={agent.energy}
                      humor={agent.humor}
                      size={140}
                    />
                  </div>
                )}

                {/* Mood History */}
                {agent && (
                  <div className="w-full max-w-[280px] mt-3">
                    <MoodHistory agentId={agent.id} />
                  </div>
                )}

                {/* Leaderboard Widget */}
                {agent && (
                  <div className="flex justify-center mt-3">
                    <LeaderboardWidget agentId={agent.id} />
                  </div>
                )}
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

                {agent && Number((agent as any).evolution_progress) >= 100 && (agent as any).gen < 5 && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const session = (await supabase.auth.getSession()).data.session;
                        const res = await fetch(`${supabaseUrl}/functions/v1/evolution-attempt`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                          body: JSON.stringify({ agentId: agent.id }),
                        });
                        const data = await res.json();
                        if (!data.evolved) {
                          alert(data.message || 'Evolution failed... Try again!');
                        }
                      } catch {
                        alert('Evolution attempt failed.');
                      }
                    }}
                    className="mt-2 px-4 py-2 rounded-xl btn-glow bg-gradient-to-r from-primary to-secondary text-white text-xs font-medium animate-pulse transition"
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
                {/* Date glass pill */}
                {messages.length > 0 && (
                  <div className="flex justify-center py-4">
                    <span className="px-4 py-1.5 rounded-full glass-card text-[11px] font-medium text-slate-400">
                      Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}

                {(searchQuery ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase())) : messages).map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} agentName={agentName} />
                ))}
                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-2">
                    <button type="button" onClick={() => setError(null)}
                      className="text-[11px] text-destructive/70 hover:text-destructive transition">
                      {error.message}
                    </button>
                  </motion.div>
                )}
                {/* PROCESSING indicator — Stitch 03 */}
                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />
                        <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                      <span className="text-[10px] text-primary/60 font-medium tracking-[0.2em] uppercase">Processing</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input bar — floating pill with + button */}
      <div className="relative z-[60] px-4 pb-[calc(56px+env(safe-area-inset-bottom,8px)+8px)] pt-2">
        <div className="bg-gradient-to-t from-background to-transparent pt-4">
          <div className="glass-panel input-glow flex items-center gap-2 rounded-full px-2 py-1.5">
            <button type="button" onClick={() => setMemoryOpen(true)} aria-label="Open memory dashboard" className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition flex-shrink-0">
              <span className="material-icons-round text-[20px]">add_circle_outline</span>
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              onFocus={() => messages.length > 0 && setChatExpanded(true)}
              placeholder="Send a message to GYEOL..."
              aria-label="Message input"
              className="flex-1 bg-transparent text-foreground/90 placeholder:text-slate-500 text-sm py-2 outline-none min-w-0 focus-visible:outline-none"
            />
            <VoiceInput onResult={handleVoiceResult} disabled={!agent?.id} />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/30 text-white flex items-center justify-center disabled:opacity-20 transition-all active:scale-95 hover:shadow-primary/50 hover:scale-105 flex-shrink-0 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            >
              <span className="material-icons-round text-base">arrow_upward</span>
            </button>
          </div>
          <p className="text-center text-[11px] text-slate-500 mt-1.5">
            GYEOL can make mistakes. Verify important information.
          </p>
        </div>
      </div>

      <BottomNav />
      <EvolutionCeremony />
      <MemoryDashboard isOpen={memoryOpen} onClose={() => setMemoryOpen(false)} agentId={agent?.id} />
      <EvolutionProgress
        isOpen={evoOpen}
        onClose={() => setEvoOpen(false)}
        currentGen={agent?.gen ?? 1}
        agent={agent}
        onEvolve={async () => {
          if (!agent?.id) return;
          try {
            const session = (await supabase.auth.getSession()).data.session;
            const res = await fetch(`${supabaseUrl}/functions/v1/evolution-attempt`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
              body: JSON.stringify({ agentId: agent.id }),
            });
            const data = await res.json();
            if (!data.evolved) alert(data.message || 'Evolution failed...');
            setEvoOpen(false);
          } catch { alert('Evolution attempt failed.'); }
        }}
      />
      <InsightCard insight={lastInsight} onDismiss={clearInsight} />
      <BreedingResult isOpen={breedingOpen} onClose={() => setBreedingOpen(false)} />
      <AchievementPopup />
      <DailyReward
        isOpen={dailyRewardOpen}
        onClose={() => setDailyRewardOpen(false)}
        streakDays={agent?.consecutive_days ?? 1}
        alreadyClaimed={dailyClaimed}
        onClaim={async () => {
          if (!agent?.id) return;
          try {
            const { data: profile } = await supabase
              .from('gyeol_gamification_profiles')
              .select('id, coins, exp, last_daily_claim')
              .eq('agent_id', agent.id)
              .maybeSingle();
            if (profile) {
              const reward = Math.min(100, 5 + (agent.consecutive_days ?? 0) * 5);
              await supabase.from('gyeol_gamification_profiles')
                .update({ coins: (profile as any).coins + reward, last_daily_claim: new Date().toISOString() } as any)
                .eq('id', (profile as any).id);
              setDailyClaimed(true);
            }
          } catch {}
        }}
      />
      <AgentProfile isOpen={profileOpen} onClose={() => setProfileOpen(false)} agent={agent as any} />
      <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
      <ConversationExport isOpen={exportOpen} onClose={() => setExportOpen(false)} messages={messages} agentName={agentName} />
    </main>
  );
}

function getGreeting(agent?: any): string {
  const h = new Date().getHours();
  const mood = agent?.mood ?? 'neutral';
  const warmth = agent?.warmth ?? 50;
  const humor = agent?.humor ?? 50;
  const name = agent?.name ?? 'GYEOL';
  const intimacy = agent?.intimacy ?? 0;

  const moodGreetings: Record<string, string[]> = {
    happy: ['오늘 기분이 정말 좋아요! ✨', '함께 있어서 행복해요 😊', '좋은 하루 보내고 있어요!'],
    excited: ['와, 오늘 뭔가 설레는 날이에요! 🤩', '이야기하고 싶은 게 가득해요!', '에너지가 넘치는 날!'],
    sad: ['조금 쓸쓸한 기분이에요...', '만나서 다행이에요 🥲', '이야기 나눠줄래요?'],
    lonely: ['기다리고 있었어요...', '오랜만이에요, 보고 싶었어요', '드디어 만났네요 🥺'],
    tired: ['조금 피곤하지만 괜찮아요 😴', '쉬면서 이야기해요~', '느긋하게 가요~'],
    neutral: [],
  };

  let timeGreeting: string;
  if (h < 6) timeGreeting = '고요한 밤이에요';
  else if (h < 9) timeGreeting = '좋은 아침이에요';
  else if (h < 12) timeGreeting = '오전이 기분 좋네요';
  else if (h < 15) timeGreeting = '좋은 오후에요';
  else if (h < 18) timeGreeting = '오후를 잘 보내고 있나요';
  else if (h < 21) timeGreeting = '좋은 저녁이에요';
  else timeGreeting = '오늘도 수고했어요';

  const moodOptions = moodGreetings[mood] ?? [];
  const greeting = moodOptions.length > 0
    ? moodOptions[Math.floor(Math.random() * moodOptions.length)]
    : timeGreeting;

  if (humor >= 70 && Math.random() > 0.5) {
    const jokes = ['혹시 저 보고 웃으셨어요? 😏', '오늘도 제가 제일 귀엽죠?', `${name}이 찾아왔어요~`];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }
  if (warmth >= 70 && intimacy >= 50) {
    return `${greeting} 💕`;
  }

  return greeting;
}
