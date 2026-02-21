/**
 * GYEOL 게이미피케이션 메인 페이지
 * 탭: 퀘스트 | 업적 | 리더보드 | 상점
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
import { GamificationDeep } from '@/src/components/GamificationDeep';
import { EvolutionEngine } from '@/src/components/EvolutionEngine';

type Tab = 'quests' | 'achievements' | 'leaderboard' | 'shop' | 'season';

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'quests', icon: 'assignment', label: '퀘스트' },
  { key: 'achievements', icon: 'emoji_events', label: '업적' },
  { key: 'leaderboard', icon: 'leaderboard', label: '랭킹' },
  { key: 'shop', icon: 'storefront', label: '상점' },
  { key: 'season', icon: 'stars', label: '시즌' },
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
  const [gamDeepOpen, setGamDeepOpen] = useState(false);
  const [evolutionOpen, setEvolutionOpen] = useState(false);

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="aurora-bg" />
        <div className="void-dot" />
      </main>
    );
  }

  const levelProgress = profile ? expToNextLevel(profile.exp, profile.level) : { needed: 100, progress: 0 };

  return (
    <main className="flex flex-col min-h-[100dvh] bg-background font-display relative">
      <div className="aurora-bg" />

      {/* Header */}
      <div className="relative z-20 px-5 pt-safe" style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-foreground">게이미피케이션</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => setInsightOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-card text-[10px]">
              <span className="material-icons-round text-primary text-[12px]">insights</span>
              <span className="font-bold text-foreground">인사이트</span>
            </button>
            <button onClick={() => setInventoryOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-card text-[10px]">
              <span className="material-icons-round text-primary text-[12px]">inventory_2</span>
              <span className="font-bold text-foreground">{inventory.length}</span>
            </button>
            <button onClick={() => setCoinHistoryOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-card text-[10px]">
              <span className="material-icons-round text-amber-400 text-[12px]">monetization_on</span>
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
                  🔥 {profile?.streak_days ?? 0}일 연속
                </span>
                <span className="text-[9px] text-muted-foreground">
                  ⭐ {profile?.total_exp ?? 0} 총 EXP
                </span>
                {profile?.title && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {profile.title}
                  </span>
                )}
              </div>
            </div>
          </div>
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
              <span className="material-icons-round text-[14px]">{t.icon}</span>
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

      {/* B14: Gamification Deep */}
      {agent?.id && (
        <GamificationDeep isOpen={gamDeepOpen} onClose={() => setGamDeepOpen(false)} agentId={agent.id} />
      )}

      {/* B13: Evolution Engine */}
      {agent?.id && (
        <EvolutionEngine isOpen={evolutionOpen} onClose={() => setEvolutionOpen(false)} agentId={agent.id} gen={agent.gen} />
      )}

      <BottomNav />
    </main>
  );
}

// ========== 퀘스트 탭 ==========
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
            {type === 'daily' ? '일일' : type === 'weekly' ? '주간' : type === 'tutorial' ? '튜토리얼' : '시즌'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          진행 가능한 퀘스트가 없습니다
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
                  completed ? 'bg-emerald-500/20' : 'bg-primary/10'
                }`}>
                  <span className={`material-icons-round text-lg ${
                    completed ? 'text-emerald-400' : 'text-primary'
                  }`}>{quest.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">{quest.title}</span>
                    {claimed ? (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">완료</span>
                    ) : completed ? (
                      <button
                        onClick={() => p && handleClaim(p.id, quest.id)}
                        disabled={claiming === quest.id}
                        className="text-[10px] px-3 py-1 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-bold animate-pulse"
                      >
                        {claiming === quest.id ? '...' : '보상 받기'}
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
                          completed ? 'bg-emerald-400' : 'bg-gradient-to-r from-primary to-secondary'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Rewards */}
                  <div className="flex items-center gap-3 mt-2">
                    {quest.reward_exp > 0 && (
                      <span className="text-[9px] text-secondary flex items-center gap-0.5">
                        <span className="material-icons-round text-[10px]">bolt</span>
                        +{quest.reward_exp} EXP
                      </span>
                    )}
                    {quest.reward_coins > 0 && (
                      <span className="text-[9px] text-amber-400 flex items-center gap-0.5">
                        <span className="material-icons-round text-[10px]">monetization_on</span>
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

// ========== 업적 탭 ==========
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
        <p className="text-[10px] text-muted-foreground mt-1">업적 달성</p>
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
            {cat === 'all' ? '전체' : cat === 'general' ? '일반' : cat === 'chat' ? '대화' : cat === 'evolution' ? '진화' : cat === 'social' ? '소셜' : '마켓'}
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
                {hidden ? '조건을 충족하면 공개됩니다' : ach.description}
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
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" />
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
  const shareText = `🏆 GYEOL 업적 달성!\n${ach.name}\n${ach.description ?? ''}\n\n#GYEOL #AI동반자`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}
        className="glass-card rounded-2xl p-6 w-full max-w-[280px] text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto">
          <span className="material-icons-round text-3xl text-primary">{ach.icon}</span>
        </div>
        <div>
          <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase ${RARITY_BG[ach.rarity]} ${RARITY_COLORS[ach.rarity]}`}>{ach.rarity}</span>
          <h3 className="text-lg font-bold text-foreground mt-2">{ach.name}</h3>
          <p className="text-[11px] text-muted-foreground mt-1">{ach.description}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl glass-card text-xs text-muted-foreground">닫기</button>
          <button onClick={async () => {
            if (navigator.share) {
              await navigator.share({ title: `GYEOL 업적: ${ach.name}`, text: shareText });
            } else {
              await navigator.clipboard.writeText(shareText);
            }
            onClose();
          }}
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold flex items-center justify-center gap-1">
            <span className="material-icons-round text-sm">share</span> 공유
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ========== 리더보드 탭 ==========
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
          <span className="material-icons-round text-amber-400 text-sm">card_giftcard</span>
          <span className="text-[11px] font-bold text-foreground">순위 보상</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { rank: '🥇 1위', coins: 500, exp: 200 },
            { rank: '🥈 2위', coins: 300, exp: 120 },
            { rank: '🥉 3위', coins: 150, exp: 80 },
          ].map(r => (
            <div key={r.rank} className="text-[9px] text-muted-foreground">
              <p className="font-bold text-foreground">{r.rank}</p>
              <p className="text-amber-400">💰{r.coins}</p>
              <p className="text-secondary">⚡{r.exp} EXP</p>
            </div>
          ))}
        </div>
      </div>

      {/* Period filter */}
      <div className="flex gap-2">
        {[
          { key: 'alltime', label: '전체' },
          { key: 'weekly', label: '주간' },
          { key: 'monthly', label: '월간' },
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
              <span className="text-sm font-bold text-foreground">내 순위</span>
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
          <span className="material-icons-round text-4xl text-muted-foreground/20 mb-2">leaderboard</span>
          <p className="text-sm text-muted-foreground">아직 랭킹 데이터가 없습니다</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">대화하고 퀘스트를 완료하면 랭킹에 등록됩니다</p>
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
                i < 3 ? 'bg-gradient-to-br from-amber-400/20 to-amber-600/20 text-amber-400' : 'bg-muted/20 text-muted-foreground'
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
                  rankChange.dir === 'up' ? 'text-emerald-400' : 'text-destructive'
                }`}>
                  <span className="material-icons-round text-[10px]">
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

// ========== 상점 탭 ==========
function ShopTab({ gam }: { gam: ReturnType<typeof useGamification> }) {
  const { shopItems, inventory, profile, purchaseItem } = gam;
  const [buying, setBuying] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handlePurchase = async (itemId: string) => {
    setBuying(itemId);
    const result = await purchaseItem(itemId);
    if (!result.success) {
      setMessage(result.error ?? '구매 실패');
    } else {
      setMessage('구매 완료! 🎉');
    }
    setBuying(null);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      {/* Coins display */}
      <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">보유 코인</p>
          <p className="text-2xl font-bold text-amber-400 flex items-center gap-1">
            <span className="material-icons-round text-lg">monetization_on</span>
            {profile?.coins ?? 0}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">인벤토리</p>
          <p className="text-2xl font-bold text-foreground">{inventory.length}</p>
        </div>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center py-2 text-sm font-medium ${
            message.includes('실패') || message.includes('부족') ? 'text-destructive' : 'text-emerald-400'
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
                <span className="material-icons-round text-lg text-primary">{item.icon}</span>
              </div>
              <p className="text-[11px] font-bold text-foreground">{item.name}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
              
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
                  <span className="material-icons-round text-[10px]">monetization_on</span>
                  {item.price_coins}
                </span>
                {owned ? (
                  <span className="text-[9px] text-emerald-400 font-medium">
                    보유 x{owned.quantity}
                  </span>
                ) : (
                  <button
                    onClick={() => handlePurchase(item.id)}
                    disabled={buying === item.id || !canAfford || !meetsLevel}
                    className={`text-[9px] px-2.5 py-1 rounded-full font-bold transition-all ${
                      canAfford && meetsLevel
                        ? 'bg-gradient-to-r from-primary to-secondary text-white'
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
          <h3 className="text-sm font-bold text-foreground mt-6">📦 내 인벤토리</h3>
          <div className="space-y-2">
            {inventory.map((inv) => {
              const item = shopItems.find((s) => s.id === inv.item_id);
              return (
                <div key={inv.id} className="glass-card rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="material-icons-round text-sm text-primary">{item?.icon ?? 'inventory_2'}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-[11px] font-bold text-foreground">{item?.name ?? '아이템'}</span>
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
