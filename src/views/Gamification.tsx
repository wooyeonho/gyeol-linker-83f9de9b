/**
 * GYEOL 게이미피케이션 메인 페이지
 * 탭: Quest | Achievement | Leaderboard | Shop
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav } from '@/src/components/BottomNav';
import { useGamification, expToNextLevel, RARITY_COLORS, RARITY_BG, RARITY_GLOW } from '@/src/hooks/useGamification';
import { SeasonPass } from '@/src/components/SeasonPass';
import { InventoryPanel } from '@/src/components/InventoryPanel';
import { InsightDashboard } from '@/src/components/InsightDashboard';
import { LevelUpCeremony } from '@/src/components/LevelUpCeremony';
import { CoinHistory } from '@/src/components/CoinHistory';
import { QuestTimer } from '@/src/components/QuestTimer';
import { AchievementRecommend } from '@/src/components/AchievementRecommend';
import { useGyeolStore } from '@/store/gyeol-store';
import { ExpBooster, LevelPerks } from '@/src/components/GamificationDeep';
import { EvolutionCountdown } from '@/src/components/EvolutionEngine';

type Tab = 'quests' | 'achievements' | 'leaderboard' | 'shop' | 'season';

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'quests', icon: 'assignment', label: 'Quest' },
  { key: 'achievements', icon: 'emoji_events', label: 'Achievement' },
  { key: 'leaderboard', icon: 'leaderboard', label: 'Ranking' },
  { key: 'shop', icon: 'storefront', label: 'Shop' },
  { key: 'season', icon: 'stars', label: 'Season' },
];

export default function GamificationPage() {
  const [tab, setTab] = useState<Tab>('quests');
  const agent = useGyeolStore((s) => s.agent);
  const gam = useGamification();
  const { profile, loading, inventory, shopItems, reload } = gam;
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [coinHistoryOpen, setCoinHistoryOpen] = useState(false);
  const [insightOpen, setInsightOpen] = useState(false);
  const [levelUpShow, setLevelUpShow] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState(1);

  if (loading) {
    return (
      <main role="main" className="min-h-screen bg-background flex items-center justify-center">
        <div className="void-dot" />
      </main>
    );
  }

  const levelProgress = profile ? expToNextLevel(profile.exp, profile.level) : { needed: 100, progress: 0 };

  return (
    <main className="flex flex-col min-h-[100dvh] bg-background font-display relative">
      {/* aurora-bg removed — home only */}

      {/* Header */}
      <div className="relative z-20 px-5 pt-safe" style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-foreground">Gamification</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => setInsightOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-card text-[10px]">
              <span aria-hidden="true" className="material-icons-round text-primary text-[12px]">insights</span>
              <span className="font-bold text-foreground">Insights</span>
            </button>
            <button onClick={() => setInventoryOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-card text-[10px]">
              <span aria-hidden="true" className="material-icons-round text-primary text-[12px]">inventory_2</span>
              <span className="font-bold text-foreground">{inventory.length}</span>
            </button>
            <button onClick={() => setCoinHistoryOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-card text-[10px]">
              <span aria-hidden="true" className="material-icons-round text-[hsl(var(--warning))] text-[12px]">monetization_on</span>
              <span className="font-bold text-foreground">{profile?.coins ?? 0}</span>
            </button>
          </div>
        </div>

        {/* Profile Stats Bar */}
        <div className="glass-card rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary p-[1px] shadow-lg shadow-primary/20">
              <div className="w-full h-full rounded-[11px] bg-background flex items-center justify-center">
                <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-br from-primary to-secondary">
                  {profile?.level ?? 1}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">{agent?.name ?? 'GYEOL'}</span>
                <span className="text-[10px] text-muted-foreground">
                  {profile?.exp ?? 0} / {levelProgress.needed} EXP
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted/30 mt-1">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgress.progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[9px] text-muted-foreground">
                  🔥 {profile?.streak_days ?? 0}-day streak
                </span>
                <span className="text-[9px] text-muted-foreground">
                  ⭐ {profile?.total_exp ?? 0}  Total EXP
                </span>
                {profile?.title && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {profile.title}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* B14: EXP Booster + Level Perks */}
          <div className="mt-3 pt-3 border-t border-border/10 space-y-2">
            <ExpBooster active={!!profile?.title} multiplier={profile?.streak_days && profile.streak_days >= 7 ? 1.5 : 1} />
            <LevelPerks level={profile?.level ?? 1} />
          </div>

          {/* B13: Evolution Countdown */}
          {agent && (
            <div className="mt-3 pt-3 border-t border-border/10">
              <EvolutionCountdown targetDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()} />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl glass-card mb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-medium transition-all ${
                tab === t.key
                  ? 'bg-primary/20 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span aria-hidden="true" className="material-icons-round text-[14px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-24 relative z-10">
        <AnimatePresence mode="wait">
          {tab === 'quests' && <QuestsTab key="quests" gam={gam} />}
          {tab === 'achievements' && <AchievementsTab key="achievements" gam={gam} />}
          {tab === 'leaderboard' && <LeaderboardTab key="leaderboard" gam={gam} agentId={agent?.id} />}
          {tab === 'shop' && <ShopTab key="shop" gam={gam} />}
          {tab === 'season' && <motion.div key="season" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><SeasonPass /></motion.div>}
        </AnimatePresence>
      </div>

      <InventoryPanel isOpen={inventoryOpen} onClose={() => setInventoryOpen(false)} inventory={inventory} shopItems={shopItems} onReload={reload} />
      <CoinHistory isOpen={coinHistoryOpen} onClose={() => setCoinHistoryOpen(false)} agentId={agent?.id} />
      <InsightDashboard isOpen={insightOpen} onClose={() => setInsightOpen(false)} />
      <LevelUpCeremony show={levelUpShow} newLevel={levelUpLevel} onClose={() => setLevelUpShow(false)} />


      <BottomNav />
    </main>
  );
}

// ========== Quest 탭 ==========
function QuestsTab({ gam }: { gam: ReturnType<typeof useGamification> }) {
  const { quests, claimQuestReward } = gam;
  const [claiming, setClaiming] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('daily');

  const filtered = quests.filter((q) => q.quest_type === filter);

  const handleClaim = async (progressId: string, questId: string) => {
    setClaiming(questId);
    await claimQuestReward(progressId, questId);
    setClaiming(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      {/* Quest Timers */}
      <div className="grid grid-cols-2 gap-2">
        <QuestTimer type="daily" />
        <QuestTimer type="weekly" />
      </div>

      {/* Quest type filter */}
      <div className="flex gap-2">
        {['daily', 'weekly', 'tutorial', 'seasonal'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
              filter === type ? 'bg-primary/20 text-primary' : 'glass-card text-muted-foreground'
            }`}
          >
            {type === 'daily' ? 'Daily' : type === 'weekly' ? 'Weekly' : type === 'tutorial' ? 'Tutorial' : 'Season'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No quests available
        </div>
      ) : (
        filtered.map((quest) => {
          const p = quest.progress;
          const pct = p ? Math.min((p.current_value / quest.requirement_value) * 100, 100) : 0;
          const completed = p?.is_completed ?? false;
          const claimed = p?.is_claimed ?? false;

          return (
            <motion.div
              key={quest.id}
              layout
              className={`glass-card rounded-2xl p-4 ${claimed ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  completed ? 'bg-[hsl(var(--success,142_71%_45%)/0.2)]' : 'bg-primary/10'
                }`}>
                  <span className={`material-icons-round text-lg ${
                    completed ? 'text-[hsl(var(--success,142_71%_45%))]' : 'text-primary'
                  }`}>{quest.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">{quest.title}</span>
                    {claimed ? (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Done</span>
                    ) : completed ? (
                      <button
                        onClick={() => p && handleClaim(p.id, quest.id)}
                        disabled={claiming === quest.id}
                        className="text-[10px] px-3 py-1 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold animate-pulse"
                      >
                        {claiming === quest.id ? '...' : 'Claim Reward'}
                      </button>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{quest.description}</p>
                  
                  {/* Progress bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-muted-foreground">
                        {p?.current_value ?? 0} / {quest.requirement_value}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{Math.round(pct)}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-muted/30">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          completed ? 'bg-[hsl(var(--success,142_71%_45%))]' : 'bg-gradient-to-r from-primary to-secondary'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Rewards */}
                  <div className="flex items-center gap-3 mt-2">
                    {quest.reward_exp > 0 && (
                      <span className="text-[9px] text-secondary flex items-center gap-0.5">
                        <span aria-hidden="true" className="material-icons-round text-[10px]">bolt</span>
                        +{quest.reward_exp} EXP
                      </span>
                    )}
                    {quest.reward_coins > 0 && (
                      <span className="text-[9px] text-[hsl(var(--warning))] flex items-center gap-0.5">
                        <span aria-hidden="true" className="material-icons-round text-[10px]">monetization_on</span>
                        +{quest.reward_coins}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })
      )}
    </motion.div>
  );
}

// ========== Achievement 탭 ==========
function AchievementsTab({ gam }: { gam: ReturnType<typeof useGamification> }) {
  const { achievements } = gam;
  const [filter, setFilter] = useState<string>('all');
  const [shareAch, setShareAch] = useState<any>(null);

  const categories = ['all', 'general', 'chat', 'evolution', 'social', 'market'];
  const filtered = filter === 'all' ? achievements : achievements.filter((a) => a.category === filter);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      {/* Summary */}
      <div className="glass-card rounded-2xl p-4 text-center">
        <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
          {unlockedCount}
        </span>
        <span className="text-lg text-muted-foreground"> / {achievements.length}</span>
        <p className="text-[10px] text-muted-foreground mt-1">Achievements earned</p>
      </div>

      {/* Achievement recommendations */}
      <AchievementRecommend achievements={achievements} onSelect={(ach) => setShareAch(ach)} />

      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto gyeol-scrollbar-hide pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${
              filter === cat ? 'bg-primary/20 text-primary' : 'glass-card text-muted-foreground'
            }`}
          >
            {cat === 'all' ? 'All' : cat === 'general' ? 'General' : cat === 'chat' ? 'Chat' : cat === 'evolution' ? 'Evolution' : cat === 'social' ? 'Social' : 'Market'}
          </button>
        ))}
      </div>

      {/* Achievement grid */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((ach) => {
          const unlocked = !!ach.unlocked;
          const hidden = ach.is_hidden && !unlocked;
          return (
            <motion.div
              key={ach.id}
              layout
              onClick={() => { if (unlocked) setShareAch(ach); }}
              className={`glass-card rounded-2xl p-3 border cursor-pointer ${
                unlocked ? RARITY_BG[ach.rarity] : 'border-transparent'
              } ${unlocked ? RARITY_GLOW[ach.rarity] : 'opacity-60'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                unlocked ? 'bg-gradient-to-br from-primary/20 to-secondary/20' : 'bg-muted/20'
              }`}>
                <span className={`material-icons-round text-xl ${
                  unlocked ? RARITY_COLORS[ach.rarity] : 'text-muted-foreground/30'
                }`}>
                  {hidden ? 'lock' : ach.icon}
                </span>
              </div>
              <p className={`text-[11px] font-bold ${unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                {hidden ? '???' : ach.name}
              </p>
              <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">
                {hidden ? 'Complete conditions to reveal' : ach.description}
              </p>
              {!hidden && (
                <div className="flex items-center gap-1 mt-1.5">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${RARITY_BG[ach.rarity]} ${RARITY_COLORS[ach.rarity]}`}>
                    {ach.rarity}
                  </span>
                  {ach.reward_title && unlocked && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      🏷 {ach.reward_title}
                    </span>
                  )}
                  {unlocked && (
                    <span className="text-[8px] px-1 py-0.5 rounded-full bg-secondary/10 text-secondary ml-auto">
                      📤
                    </span>
                  )}
                </div>
              )}
              {unlocked && ach.unlocked?.is_new && (
                <div className="absolute top-2 right-2">
                  <span className="w-2 h-2 rounded-full bg-destructive inline-block animate-pulse" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Achievement Share Modal */}
      {shareAch && (
        <AchievementShareModal ach={shareAch} onClose={() => setShareAch(null)} />
      )}
    </motion.div>
  );
}

function AchievementShareModal({ ach, onClose }: { ach: any; onClose: () => void }) {
  const shareText = `🏆 GYEOL Achievements earned!\n${ach.name}\n${ach.description ?? ''}\n\n#GYEOL #AI동반자`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}
        className="glass-card rounded-2xl p-6 w-full max-w-[280px] text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto">
          <span aria-hidden="true" className="material-icons-round text-3xl text-primary">{ach.icon}</span>
        </div>
        <div>
          <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase ${RARITY_BG[ach.rarity]} ${RARITY_COLORS[ach.rarity]}`}>{ach.rarity}</span>
          <h3 className="text-lg font-bold text-foreground mt-2">{ach.name}</h3>
          <p className="text-[11px] text-muted-foreground mt-1">{ach.description}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl glass-card text-xs text-muted-foreground">Close</button>
          <button onClick={async () => {
            if (navigator.share) {
              await navigator.share({ title: `GYEOL Achievement: ${ach.name}`, text: shareText });
            } else {
              await navigator.clipboard.writeText(shareText);
            }
            onClose();
          }}
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1">
            <span aria-hidden="true" className="material-icons-round text-sm">share</span> Share
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ========== Leaderboard 탭 ==========
function LeaderboardTab({ gam, agentId }: { gam: ReturnType<typeof useGamification>; agentId?: string }) {
  const { leaderboard, profile } = gam;
  const [period, setPeriod] = useState<string>('alltime');
  const [prevRanks, setPrevRanks] = useState<Record<string, number>>({});
  const filteredBoard = leaderboard.filter(e => e.period === period || period === 'alltime');

  // Track rank changes
  useEffect(() => {
    const currentRanks: Record<string, number> = {};
    filteredBoard.forEach((e, i) => { currentRanks[e.agent_id] = i + 1; });
    // Only update prevRanks after first render
    if (Object.keys(prevRanks).length > 0) {
      // prevRanks stays as previous snapshot for comparison
    }
    const timer = setTimeout(() => setPrevRanks(currentRanks), 5000);
    return () => clearTimeout(timer);
  }, [filteredBoard.length, period]);

  const getRankChange = (agentId: string, currentRank: number) => {
    const prev = prevRanks[agentId];
    if (!prev) return null;
    const diff = prev - currentRank;
    if (diff > 0) return { dir: 'up' as const, val: diff };
    if (diff < 0) return { dir: 'down' as const, val: Math.abs(diff) };
    return null;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      {/* Leaderboard rewards info */}
      <div className="glass-card rounded-2xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <span aria-hidden="true" className="material-icons-round text-[hsl(var(--warning))] text-sm">card_giftcard</span>
          <span className="text-[11px] font-bold text-foreground">Rank Rewards</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { rank: '🥇 1st', coins: 500, exp: 200 },
            { rank: '🥈 2nd', coins: 300, exp: 120 },
            { rank: '🥉 3rd', coins: 150, exp: 80 },
          ].map(r => (
            <div key={r.rank} className="text-[9px] text-muted-foreground">
              <p className="font-bold text-foreground">{r.rank}</p>
              <p className="text-[hsl(var(--warning))]">💰{r.coins}</p>
              <p className="text-secondary">⚡{r.exp} EXP</p>
            </div>
          ))}
        </div>
      </div>

      {/* Period filter */}
      <div className="flex gap-2">
        {[
          { key: 'alltime', label: 'All' },
          { key: 'weekly', label: 'Weekly' },
          { key: 'monthly', label: 'Monthly' },
        ].map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
              period === p.key ? 'bg-primary/20 text-primary' : 'glass-card text-muted-foreground'
            }`}>{p.label}</button>
        ))}
      </div>

      {/* My rank card */}
      {profile && (
        <div className="glass-card rounded-2xl p-4 glass-card-selected">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {filteredBoard.findIndex((l) => l.agent_id === agentId) + 1 || '—'}
              </span>
            </div>
            <div className="flex-1">
              <span className="text-sm font-bold text-foreground">My Rank</span>
              <p className="text-[10px] text-muted-foreground">
                Lv.{profile.level} • 총 {profile.total_exp} EXP
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                {profile.total_exp}
              </span>
              <p className="text-[9px] text-muted-foreground">점</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard list */}
      {filteredBoard.length === 0 ? (
        <div className="text-center py-12">
          <span aria-hidden="true" className="material-icons-round text-4xl text-muted-foreground/20 mb-2">leaderboard</span>
          <p className="text-sm text-muted-foreground">No ranking data yet</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Chat and complete quests to appear on rankings</p>
        </div>
      ) : (
        filteredBoard.map((entry, i) => {
          const isMe = entry.agent_id === agentId;
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
          const rankChange = getRankChange(entry.agent_id, i + 1);
          return (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`glass-card rounded-2xl p-3 flex items-center gap-3 ${isMe ? 'glass-card-selected' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                i < 3 ? 'bg-gradient-to-br from-amber-400/20 to-amber-600/20 text-[hsl(var(--warning))]' : 'bg-muted/20 text-muted-foreground'
              }`}>
                {medal ?? i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-[12px] font-bold ${isMe ? 'text-primary' : 'text-foreground'}`}>
                  {entry.agent_name ?? 'GYEOL'}
                </span>
                <span className="text-[9px] text-muted-foreground ml-2">Gen {entry.agent_gen}</span>
              </div>
              {/* Rank change indicator */}
              {rankChange && (
                <span className={`text-[9px] font-bold flex items-center gap-0.5 ${
                  rankChange.dir === 'up' ? 'text-[hsl(var(--success,142_71%_45%))]' : 'text-destructive'
                }`}>
                  <span aria-hidden="true" className="material-icons-round text-[10px]">
                    {rankChange.dir === 'up' ? 'arrow_upward' : 'arrow_downward'}
                  </span>
                  {rankChange.val}
                </span>
              )}
              <span className="text-sm font-bold text-foreground">{entry.score.toLocaleString()}</span>
            </motion.div>
          );
        })
      )}
    </motion.div>
  );
}

// ========== Shop 탭 ==========
function ShopTab({ gam }: { gam: ReturnType<typeof useGamification> }) {
  const { shopItems, inventory, profile, purchaseItem } = gam;
  const [buying, setBuying] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handlePurchase = async (itemId: string) => {
    setBuying(itemId);
    const result = await purchaseItem(itemId);
    if (!result.success) {
      setMessage(result.error ?? 'Purchase failed');
    } else {
      setMessage('Purchase complete! 🎉');
    }
    setBuying(null);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      {/* Coins display */}
      <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Your Coins</p>
          <p className="text-2xl font-bold text-[hsl(var(--warning))] flex items-center gap-1">
            <span aria-hidden="true" className="material-icons-round text-lg">monetization_on</span>
            {profile?.coins ?? 0}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Inventory</p>
          <p className="text-2xl font-bold text-foreground">{inventory.length}</p>
        </div>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center py-2 text-sm font-medium ${
            message.includes('실패') || message.includes('부족') ? 'text-destructive' : 'text-[hsl(var(--success,142_71%_45%))]'
          }`}
        >
          {message}
        </motion.div>
      )}

      {/* Shop items */}
      <div className="grid grid-cols-2 gap-3">
        {shopItems.map((item) => {
          const owned = inventory.find((i) => i.item_id === item.id);
          const canAfford = (profile?.coins ?? 0) >= item.price_coins;
          const meetsLevel = (profile?.level ?? 1) >= item.min_level;

          return (
            <div key={item.id} className="glass-card rounded-2xl p-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/10 flex items-center justify-center mb-2">
                <span aria-hidden="true" className="material-icons-round text-lg text-primary">{item.icon}</span>
              </div>
              <p className="text-[11px] font-bold text-foreground">{item.name}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
              
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] font-bold text-[hsl(var(--warning))] flex items-center gap-0.5">
                  <span aria-hidden="true" className="material-icons-round text-[10px]">monetization_on</span>
                  {item.price_coins}
                </span>
                {owned ? (
                  <span className="text-[9px] text-[hsl(var(--success,142_71%_45%))] font-medium">
                    Owned x{owned.quantity}
                  </span>
                ) : (
                  <button
                    onClick={() => handlePurchase(item.id)}
                    disabled={buying === item.id || !canAfford || !meetsLevel}
                    className={`text-[9px] px-2.5 py-1 rounded-full font-bold transition-all ${
                      canAfford && meetsLevel
                        ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground'
                        : 'bg-muted/20 text-muted-foreground cursor-not-allowed'
                    }`}
                  >
                    {buying === item.id ? '...' : !meetsLevel ? `Lv.${item.min_level}+` : '구매'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Inventory section */}
      {inventory.length > 0 && (
        <>
          <h3 className="text-sm font-bold text-foreground mt-6">📦 My Inventory</h3>
          <div className="space-y-2">
            {inventory.map((inv) => {
              const item = shopItems.find((s) => s.id === inv.item_id);
              return (
                <div key={inv.id} className="glass-card rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span aria-hidden="true" className="material-icons-round text-sm text-primary">{item?.icon ?? 'inventory_2'}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-[11px] font-bold text-foreground">{item?.name ?? 'Item'}</span>
                    <span className="text-[9px] text-muted-foreground ml-2">x{inv.quantity}</span>
                  </div>
                  <button className="text-[9px] px-2 py-1 rounded-full glass-card text-primary font-medium">
                    사용
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}
