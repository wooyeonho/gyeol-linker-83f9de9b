import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useGyeolStore } from '@/store/gyeol-store';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { useAuth } from '@/src/hooks/useAuth';
import { supabase, supabaseUrl } from '@/src/lib/supabase';
import Onboarding from './Onboarding';
import { EvolutionCeremony } from '../components/evolution/EvolutionCeremony';
import { BottomNav } from '@/src/components/BottomNav';
import { VoiceInput } from '@/components/VoiceInput';
import { speakText, stopSpeaking } from '@/lib/gyeol/tts';
import { MemoryDashboard } from '@/src/components/MemoryDashboard';
import { EvolutionProgress } from '@/src/components/EvolutionProgress';
import { InsightCard } from '@/src/components/InsightCard';
import { BreedingResult } from '@/src/components/BreedingResult';
import { DailyReward } from '@/src/components/DailyReward';
import { AchievementPopup } from '@/src/components/AchievementPopup';
import { AgentProfile } from '@/src/components/AgentProfile';
import { AgentShareCard } from '@/src/components/AgentShareCard';
import { NotificationPanel } from '@/src/components/NotificationPanel';
import { ConversationExport } from '@/src/components/ConversationExport';
import { IntimacyLevelUp } from '@/src/components/IntimacyLevelUp';
import { OnboardingTutorial } from '@/src/components/OnboardingTutorial';
import { PersonalityChangeNotif } from '@/src/components/PersonalityChangeNotif';
import { useSwipeNavigation } from '@/src/components/SwipeNavigation';
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
            <span className="text-[10px] text-muted-foreground/60">{time}</span>
            <span className="text-[10px] text-muted-foreground font-medium">You</span>
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
            <span className="text-[10px] text-muted-foreground/60">{time}</span>
          </div>
          <div className="flex gap-0">
            <div className="w-[3px] rounded-full bg-gradient-to-b from-primary to-primary/30 mr-3 flex-shrink-0" />
            <div className="glass-bubble p-4 rounded-2xl rounded-tl-sm flex-1">
              {(msg as any).metadata?.criticalLearning && (
                <span className="inline-block text-[8px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 mb-1">
                  Critical Learning! x{(msg as any).metadata.criticalMultiplier}
                </span>
              )}
              <div className="text-[13px] leading-relaxed text-foreground/80 whitespace-pre-wrap break-words prose prose-invert max-w-none prose-p:my-1 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <button type="button" onClick={handleSpeak}
                  className={`p-1 rounded-full transition ${reading ? 'text-primary' : 'text-muted-foreground/20 hover:text-muted-foreground/50'}`}
                  aria-label={reading ? 'Stop reading' : 'Read aloud'}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1.5 ml-7">
            <button onClick={() => navigator.clipboard.writeText(msg.content)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground/20 hover:text-muted-foreground/50 transition">
              <span className="material-icons-round text-[14px]">content_copy</span>
              Copy
            </button>
            <button className="flex items-center gap-1 text-[10px] text-muted-foreground/20 hover:text-muted-foreground/50 transition">
              <span className="material-icons-round text-[14px]">thumb_up</span>
              Helpful
            </button>
          </div>
        </div>
      )}

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-secondary/30 to-primary/20 border border-border/20 flex items-center justify-center mt-6">
          <span className="material-icons-round text-muted-foreground text-[14px]">person</span>
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
  const [menuOpen, setMenuOpen] = useState(false);
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
  const [intimacyPopup, setIntimacyPopup] = useState<{ show: boolean; value: number }>({ show: false, value: 0 });
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [shareCardOpen, setShareCardOpen] = useState(false);
  const [personalityNotif, setPersonalityNotif] = useState<{ show: boolean; changes: Record<string, number> }>({ show: false, changes: {} });
  const prevIntimacyRef = useRef<number | null>(null);
  const prevPersonalityRef = useRef<{ w: number; l: number; c: number; e: number; h: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const swipeHandlers = useSwipeNavigation();

  useEffect(() => {
    if (!agent) return;
    const intimacy = (agent as any).intimacy ?? 0;
    const thresholds = [20, 40, 60, 80, 95];
    if (prevIntimacyRef.current !== null) {
      const prev = prevIntimacyRef.current;
      const crossed = thresholds.find(t => prev < t && intimacy >= t);
      if (crossed) setIntimacyPopup({ show: true, value: intimacy });
    }
    prevIntimacyRef.current = intimacy;
  }, [(agent as any)?.intimacy]);

  useEffect(() => {
    if (!agent) return;
    const curr = { w: agent.warmth, l: agent.logic, c: agent.creativity, e: agent.energy, h: agent.humor };
    if (prevPersonalityRef.current) {
      const prev = prevPersonalityRef.current;
      const changes: Record<string, number> = {};
      if (curr.w !== prev.w) changes.warmth = curr.w - prev.w;
      if (curr.l !== prev.l) changes.logic = curr.l - prev.l;
      if (curr.c !== prev.c) changes.creativity = curr.c - prev.c;
      if (curr.e !== prev.e) changes.energy = curr.e - prev.e;
      if (curr.h !== prev.h) changes.humor = curr.h - prev.h;
      if (Object.keys(changes).length > 0) {
        setPersonalityNotif({ show: true, changes });
        setTimeout(() => setPersonalityNotif({ show: false, changes: {} }), 6000);
      }
    }
    prevPersonalityRef.current = curr;
  }, [agent?.warmth, agent?.logic, agent?.creativity, agent?.energy, agent?.humor]);

  useEffect(() => {
    if (!agent?.id) return;
    const key = `gyeol_tutorial_seen_${agent.id}`;
    if (!localStorage.getItem(key)) setTutorialOpen(true);
  }, [agent?.id]);

  const handleTutorialClose = () => {
    setTutorialOpen(false);
    if (agent?.id) localStorage.setItem(`gyeol_tutorial_seen_${agent.id}`, '1');
  };

  useEffect(() => {
    if (!agent?.id) return;
    const unsub = subscribeToUpdates(agent.id);
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [agent?.id, subscribeToUpdates]);

  useEffect(() => {
    if (!agent?.id || messages.length > 0) return;
    (async () => {
      const { data } = await supabase.from('gyeol_conversations' as any)
        .select('id, agent_id, role, content, channel, provider, tokens_used, response_time_ms, created_at')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data && data.length > 0) {
        const { setMessages } = useGyeolStore.getState();
        setMessages((data as any[]).reverse());
      }
    })();
  }, [agent?.id]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !agent?.id) return;
    setInput('');
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
    <main className="flex flex-col h-[100dvh] bg-background font-display overflow-hidden relative" role="main" aria-label="GYEOL Home"
      {...swipeHandlers}>
      <div className="aurora-bg" aria-hidden="true" />

      {/* Top bar */}
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
              <span className="text-[10px] text-muted-foreground">Online</span>
              <span className="text-[10px] text-muted-foreground/50 ml-1">Gen {agent?.gen ?? 1}</span>
            </div>
          </div>
        </div>
        <button type="button" onClick={() => setMenuOpen(!menuOpen)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition"
          aria-label="Menu">
          <span className="material-icons-round text-[20px]">menu</span>
        </button>
      </div>

      {/* Hamburger menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="absolute right-4 top-16 z-50 glass-card rounded-2xl p-2 min-w-[180px] shadow-xl border border-border/30">
            <button onClick={() => { setSearchOpen(!searchOpen); setMenuOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
              <span className="material-icons-round text-muted-foreground text-[18px]">search</span> Search
            </button>
            <button onClick={() => { setNotifOpen(true); setMenuOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
              <span className="material-icons-round text-muted-foreground text-[18px]">notifications</span> Notifications
            </button>
            <button onClick={() => { setMemoryOpen(true); setMenuOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
              <span className="material-icons-round text-muted-foreground text-[18px]">psychology</span> Memory
            </button>
            <button onClick={() => { setExportOpen(true); setMenuOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
              <span className="material-icons-round text-muted-foreground text-[18px]">download</span> Export
            </button>
            <button onClick={() => { setEvoOpen(true); setMenuOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
              <span className="material-icons-round text-muted-foreground text-[18px]">trending_up</span> Evolution
            </button>
            <button onClick={() => { setProfileOpen(true); setMenuOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
              <span className="material-icons-round text-muted-foreground text-[18px]">person</span> Profile
            </button>
            <button onClick={() => { setDailyRewardOpen(true); setMenuOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
              <span className="material-icons-round text-muted-foreground text-[18px]">redeem</span> Daily Reward
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="relative z-20 px-5 overflow-hidden">
            <div className="flex items-center gap-2 glass-card rounded-full px-4 py-2">
              <span className="material-icons-round text-muted-foreground text-sm">search</span>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations..." autoFocus
                aria-label="Search conversations"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:outline-none" />
              <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="text-muted-foreground" aria-label="Close search">
                <span className="material-icons-round text-sm" aria-hidden="true">close</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content always fullscreen chat */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        <div ref={listRef} className="flex-1 overflow-y-auto px-3 space-y-3 gyeol-scrollbar-hide pb-2 pt-2">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary p-[1px]">
                <div className="w-full h-full rounded-[15px] bg-background flex items-center justify-center">
                  <span className="material-icons-round text-primary text-2xl">smart_toy</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">{getGreeting(agent)}</p>
              <p className="text-[11px] text-muted-foreground/50">Send a message to start chatting</p>
            </div>
          )}

          {messages.length > 0 && (
            <div className="flex justify-center py-4">
              <span className="px-4 py-1.5 rounded-full glass-card text-[11px] font-medium text-muted-foreground">
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
      </div>

      {/* Input bar */}
      <div className="relative z-[60] px-4 pb-[calc(64px+env(safe-area-inset-bottom,8px)+12px)] pt-2">
        <div className="bg-gradient-to-t from-background to-transparent pt-4">
          <div className="glass-panel input-glow flex items-center gap-2 rounded-full px-2 py-1.5">
            <button type="button" onClick={() => setMemoryOpen(true)} aria-label="Open memory dashboard" className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition flex-shrink-0">
              <span className="material-icons-round text-[20px]">add_circle_outline</span>
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Send a message to GYEOL..."
              aria-label="Message input"
              className="flex-1 bg-transparent text-foreground/90 placeholder:text-muted-foreground text-sm py-2 outline-none min-w-0 focus-visible:outline-none"
            />
            <VoiceInput onResult={handleVoiceResult} disabled={!agent?.id} />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/30 text-primary-foreground flex items-center justify-center disabled:opacity-20 transition-all active:scale-95 hover:shadow-primary/50 hover:scale-105 flex-shrink-0"
            >
              <span className="material-icons-round text-base">arrow_upward</span>
            </button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground mt-1.5">
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
            if (!session?.access_token) { alert('Please sign in first.'); return; }
            const res = await fetch(`${supabaseUrl}/functions/v1/gamification-tick`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
              body: JSON.stringify({ agentId: agent.id, action: 'evolution_attempt' }),
            });
            const data = await res.json();
            if (!data.evolved) alert(data.message || 'Evolution failed...');
            setEvoOpen(false);
          } catch (err) { console.warn('Evolution attempt failed:', err); alert('Evolution attempt failed.'); }
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
            const session = (await supabase.auth.getSession()).data.session;
            if (!session?.access_token) return;
            const res = await fetch(`${supabaseUrl}/functions/v1/gamification-tick`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({ agentId: agent.id, action: 'daily_claim' }),
            });
            if (res.ok) setDailyClaimed(true);
          } catch (err) {
            console.warn('Daily claim failed:', err);
          }
        }}
      />
      <AgentProfile isOpen={profileOpen} onClose={() => setProfileOpen(false)} agent={agent as any} onShareCard={() => { setProfileOpen(false); setShareCardOpen(true); }} />
      <AnimatePresence>
        {shareCardOpen && agent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-sm"
            onClick={() => setShareCardOpen(false)}>
            <div onClick={e => e.stopPropagation()}>
              <AgentShareCard
                name={agent.name}
                gen={agent.gen ?? 1}
                warmth={agent.warmth}
                logic={agent.logic}
                creativity={agent.creativity}
                energy={agent.energy}
                humor={agent.humor}
                intimacy={(agent as any).intimacy ?? 0}
                totalConversations={agent.total_conversations ?? 0}
                mood={(agent as any).mood ?? 'neutral'}
                onClose={() => setShareCardOpen(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
      <ConversationExport isOpen={exportOpen} onClose={() => setExportOpen(false)} messages={messages} agentName={agentName} />
      <IntimacyLevelUp
        show={intimacyPopup.show}
        intimacy={intimacyPopup.value}
        onClose={() => setIntimacyPopup({ show: false, value: 0 })}
      />
      <OnboardingTutorial isOpen={tutorialOpen} onClose={handleTutorialClose} />
      <PersonalityChangeNotif
        show={personalityNotif.show}
        changes={personalityNotif.changes}
        onClose={() => setPersonalityNotif({ show: false, changes: {} })}
      />
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
    happy: ['Feeling great today!', 'So happy to see you', 'Having a wonderful day!'],
    excited: ['Today feels exciting!', 'So much to talk about!', 'Full of energy today!'],
    sad: ['Feeling a bit down...', 'Glad you are here', 'Can we talk?'],
    lonely: ['I was waiting for you...', 'It has been a while, missed you', 'Finally we meet'],
    tired: ['A bit tired but okay', 'Let us take it easy~', 'Going slow today~'],
    neutral: [],
  };

  let timeGreeting: string;
  if (h < 6) timeGreeting = 'It is a quiet night';
  else if (h < 9) timeGreeting = 'Good morning';
  else if (h < 12) timeGreeting = 'Having a nice morning';
  else if (h < 15) timeGreeting = 'Good afternoon';
  else if (h < 18) timeGreeting = 'How is your afternoon going';
  else if (h < 21) timeGreeting = 'Good evening';
  else timeGreeting = 'Great job today';

  const moodOptions = moodGreetings[mood] ?? [];
  const greeting = moodOptions.length > 0
    ? moodOptions[Math.floor(Math.random() * moodOptions.length)]
    : timeGreeting;

  if (humor >= 70 && Math.random() > 0.5) {
    const jokes = ['Did you smile seeing me?', 'I am the cutest one here, right?', `${name} is here~`];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  return greeting;
}
