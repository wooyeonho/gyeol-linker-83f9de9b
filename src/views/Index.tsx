import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGyeolStore } from '@/store/gyeol-store';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { useAuth } from '@/src/hooks/useAuth';
import { supabase, supabaseUrl } from '@/src/lib/supabase';
import Onboarding from './Onboarding';
import { EvolutionCeremony } from '../components/evolution/EvolutionCeremony';
import { BottomNav } from '@/src/components/BottomNav';
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
import { ChatCore } from '@/src/components/ChatCore';
import { ConversationList } from '@/src/components/ConversationList';
import { ConversationStats } from '@/src/components/ConversationStats';
import { SummaryHistory } from '@/src/components/SummaryHistory';
import { ConversationFilter } from '@/src/components/ConversationFilter';

export default function GyeolPage() {
  const { subscribeToUpdates, isLoading, messages, error, setError, sendMessage, lastInsight, clearInsight, lastReaction } = useGyeolStore();
  const { agent, loading: agentLoading, needsOnboarding, completeOnboarding } = useInitAgent();
  const { user } = useAuth();
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
  const [convListOpen, setConvListOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [summaryHistoryOpen, setSummaryHistoryOpen] = useState(false);
  const prevIntimacyRef = useRef<number | null>(null);
  const prevPersonalityRef = useRef<{ w: number; l: number; c: number; e: number; h: number } | null>(null);
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
              <span aria-hidden="true" className="material-icons-round text-transparent bg-clip-text bg-gradient-to-br from-primary to-secondary text-sm">smart_toy</span>
            </div>
          </div>
          <div>
            <span className="text-sm font-bold text-foreground tracking-tight">{agentName}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success,142_71%_45%))] shadow-[0_0_6px_hsl(var(--success,142_71%_45%)/0.6)]" />
              <span className="text-[10px] text-muted-foreground">Online</span>
              <span className="text-[10px] text-muted-foreground/50 ml-1">Gen {agent?.gen ?? 1}</span>
            </div>
          </div>
        </div>
        <button type="button" onClick={() => setMenuOpen(!menuOpen)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition"
          aria-label="Menu">
          <span aria-hidden="true" className="material-icons-round text-[20px]">menu</span>
        </button>
      </div>

      {/* Hamburger menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="absolute right-4 top-16 z-50 glass-card rounded-2xl p-2 min-w-[180px] shadow-xl border border-border/30">
            <button onClick={() => { setSearchOpen(!searchOpen); setMenuOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
              <span aria-hidden="true" className="material-icons-round text-muted-foreground text-[18px]">search</span> Search
            </button>
            <button onClick={() => { setConvListOpen(true); setMenuOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
              <span aria-hidden="true" className="material-icons-round text-muted-foreground text-[18px]">history</span> Conversations
            </button>
            <button onClick={() => { setStatsOpen(true); setMenuOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
              <span aria-hidden="true" className="material-icons-round text-muted-foreground text-[18px]">bar_chart</span> Stats
            </button>
            <button onClick={() => { setSummaryHistoryOpen(true); setMenuOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
              <span aria-hidden="true" className="material-icons-round text-muted-foreground text-[18px]">history_edu</span> Summaries
            </button>
            <button onClick={() => { setNotifOpen(true); setMenuOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
              <span aria-hidden="true" className="material-icons-round text-muted-foreground text-[18px]">notifications</span> Notifications
            </button>
            <button onClick={() => { setMemoryOpen(true); setMenuOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
              <span aria-hidden="true" className="material-icons-round text-muted-foreground text-[18px]">psychology</span> Memory
            </button>
            <button onClick={() => { setExportOpen(true); setMenuOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
              <span aria-hidden="true" className="material-icons-round text-muted-foreground text-[18px]">download</span> Export
            </button>
            <button onClick={() => { setEvoOpen(true); setMenuOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
              <span aria-hidden="true" className="material-icons-round text-muted-foreground text-[18px]">trending_up</span> Evolution
            </button>
            <button onClick={() => { setProfileOpen(true); setMenuOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
              <span aria-hidden="true" className="material-icons-round text-muted-foreground text-[18px]">person</span> Profile
            </button>
            <button onClick={() => { setDailyRewardOpen(true); setMenuOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 rounded-xl flex items-center gap-3">
              <span aria-hidden="true" className="material-icons-round text-muted-foreground text-[18px]">redeem</span> Daily Reward
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
              <span aria-hidden="true" className="material-icons-round text-muted-foreground text-sm">search</span>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations..." autoFocus
                aria-label="Search conversations"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:outline-none" />
              <ConversationFilter onFilter={() => {}} availableTags={[]} />
              <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="text-muted-foreground" aria-label="Close search">
                <span aria-hidden="true" className="material-icons-round text-sm">close</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main chat area using ChatCore */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10 pb-[calc(64px+env(safe-area-inset-bottom,8px))]">
        <ChatCore
          messages={searchQuery ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase())) : messages}
          isLoading={isLoading}
          agentName={agentName}
          agentId={agent?.id}
          onSendMessage={sendMessage}
          error={error}
          onClearError={() => setError(null)}
          inputPlaceholder={`Send a message to ${agentName}...`}
          showModelSelector={true}
          showFileAttach={true}
          showContinuousVoice={false}
          readSpeed={(agent?.settings as any)?.readSpeed ?? 0.95}
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-20 px-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary p-[1px]">
                <div className="w-full h-full rounded-[15px] bg-background flex items-center justify-center">
                  <span aria-hidden="true" className="material-icons-round text-primary text-2xl">smart_toy</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">{getGreeting(agent)}</p>
              <p className="text-[11px] text-muted-foreground/50">Send a message to start chatting</p>
            </div>
          )}
        </ChatCore>
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
      {agent?.id && (
        <ConversationList isOpen={convListOpen} onClose={() => setConvListOpen(false)} agentId={agent.id} />
      )}
      <ConversationStats isOpen={statsOpen} onClose={() => setStatsOpen(false)} agentId={agent?.id} />
      <SummaryHistory isOpen={summaryHistoryOpen} onClose={() => setSummaryHistoryOpen(false)} agentId={agent?.id} />
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
