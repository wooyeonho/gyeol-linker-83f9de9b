import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Gift, Star, TrendingUp, Crown, Target, Clock, Shield, ArrowUp, Flame, Award, ShoppingBag, Heart, Users, Coins, Trophy } from 'lucide-react';

export function ExpBooster({ active, multiplier, endsAt }: { active: boolean; multiplier: number; endsAt?: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (!endsAt) return;
    const calc = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Expired'); return; }
      const m = Math.floor(diff / 60000);
      setTimeLeft(`${m}m left`);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  if (!active) return null;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
      <Zap className="w-3 h-3 text-amber-400" />
      <span className="text-[9px] font-bold text-amber-400">{multiplier}x EXP</span>
      {timeLeft && <span className="text-[8px] text-amber-400/60">{timeLeft}</span>}
    </motion.div>
  );
}

export function ExpHistory({ history }: { history: { date: string; amount: number; source: string }[] }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <TrendingUp className="w-3.5 h-3.5 text-primary" /> EXP History
      </h4>
      {history.slice(0, 10).map((h, i) => (
        <div key={i} className="flex items-center gap-2 p-2 rounded-lg glass-card text-[9px]">
          <span className="text-primary font-bold">+{h.amount}</span>
          <span className="text-foreground/60 flex-1 truncate">{h.source}</span>
          <span className="text-muted-foreground/40 flex-shrink-0">{h.date}</span>
        </div>
      ))}
    </div>
  );
}

export function LevelPerks({ level }: { level: number }) {
  const perks = [
    { lvl: 5, name: 'Custom Themes', icon: '🎨' },
    { lvl: 10, name: 'Voice Messages', icon: '🎤' },
    { lvl: 15, name: 'Trading', icon: '🔄' },
    { lvl: 20, name: 'Market Access', icon: '🏪' },
    { lvl: 25, name: 'Master Title', icon: '👑' },
  ];

  return (
    <div className="space-y-1.5">
      <h4 className="text-[11px] font-bold text-foreground">Level Perks</h4>
      {perks.map(p => (
        <div key={p.lvl} className={`flex items-center gap-2 p-2 rounded-lg transition ${
          level >= p.lvl ? 'glass-card' : 'opacity-40'
        }`}>
          <span className="text-sm">{p.icon}</span>
          <span className="text-[10px] text-foreground/70 flex-1">{p.name}</span>
          <span className={`text-[9px] ${level >= p.lvl ? 'text-primary' : 'text-muted-foreground/40'}`}>
            Lv.{p.lvl} {level >= p.lvl ? '✓' : '🔒'}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PrestigeSystem({ level, prestige, onPrestige }: { level: number; prestige: number; onPrestige: () => void }) {
  const canPrestige = level >= 25;
  return (
    <div className="p-3 rounded-xl glass-card space-y-2">
      <div className="flex items-center gap-2">
        <Crown className="w-4 h-4 text-amber-400" />
        <span className="text-[11px] font-bold text-foreground">Prestige {prestige > 0 ? `★${prestige}` : ''}</span>
      </div>
      <p className="text-[9px] text-muted-foreground">Reset to Lv.1 for permanent bonuses and exclusive rewards.</p>
      <button onClick={onPrestige} disabled={!canPrestige}
        className={`w-full py-2 rounded-xl text-[10px] font-medium transition ${
          canPrestige ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-muted/10 text-muted-foreground/40'
        }`}>
        {canPrestige ? `Prestige → ★${prestige + 1}` : `Reach Lv.25 (Current: Lv.${level})`}
      </button>
    </div>
  );
}

export function CoinExchange({ balance, onExchange }: { balance: number; onExchange: (amount: number, type: string) => void }) {
  const [amount, setAmount] = useState(100);
  const rates = [
    { type: 'exp', label: 'EXP', rate: 10, icon: '⚡' },
    { type: 'item', label: 'Random Item', rate: 500, icon: '🎁' },
  ];

  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <Coins className="w-3.5 h-3.5 text-amber-400" /> Coin Exchange
      </h4>
      <p className="text-[10px] text-foreground/60">Balance: {balance.toLocaleString()} 🪙</p>
      {rates.map(r => (
        <button key={r.type} onClick={() => onExchange(r.rate, r.type)} disabled={balance < r.rate}
          className="w-full flex items-center gap-2 p-2 rounded-xl glass-card hover:bg-primary/5 transition disabled:opacity-40">
          <span>{r.icon}</span>
          <span className="text-[10px] text-foreground/70 flex-1">{r.label}</span>
          <span className="text-[9px] text-amber-400 font-mono">{r.rate} 🪙</span>
        </button>
      ))}
    </div>
  );
}

export function QuestChain({ quests }: { quests: { title: string; progress: number; total: number; reward: string; completed: boolean }[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <Target className="w-3.5 h-3.5 text-primary" /> Chain Quest
      </h4>
      <div className="relative">
        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border/20" />
        {quests.map((q, i) => (
          <div key={i} className="relative pl-7 pb-3">
            <div className={`absolute left-2 top-1 w-2.5 h-2.5 rounded-full border-2 ${
              q.completed ? 'bg-primary border-primary' : q.progress > 0 ? 'border-primary' : 'border-muted-foreground/30'
            }`} />
            <div className={`p-2 rounded-xl ${q.completed ? 'glass-card border border-primary/20' : 'glass-card opacity-70'}`}>
              <p className="text-[10px] font-medium text-foreground">{q.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1 rounded-full bg-muted/20">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(q.progress / q.total) * 100}%` }} />
                </div>
                <span className="text-[8px] text-muted-foreground">{q.progress}/{q.total}</span>
              </div>
              <span className="text-[8px] text-amber-400">{q.reward}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HiddenQuestReveal({ quest, onClaim }: { quest: { title: string; description: string; reward: string } | null; onClaim: () => void }) {
  if (!quest) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-background/80 backdrop-blur-sm p-6">
      <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="glass-card rounded-2xl p-6 text-center max-w-[280px] w-full space-y-3">
        <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}
          className="text-4xl">🔮</motion.div>
        <h3 className="text-sm font-bold text-foreground">Hidden Quest Discovered!</h3>
        <p className="text-[10px] font-medium text-primary">{quest.title}</p>
        <p className="text-[9px] text-muted-foreground">{quest.description}</p>
        <p className="text-[10px] text-amber-400">Reward: {quest.reward}</p>
        <button onClick={onClaim}
          className="w-full py-2 rounded-xl bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition">
          Accept Quest
        </button>
      </motion.div>
    </motion.div>
  );
}

export function BossQuest({ boss, onStart }: { boss: { name: string; hp: number; maxHp: number; reward: string }; onStart: () => void }) {
  return (
    <div className="p-4 rounded-2xl glass-card border border-destructive/20 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🐉</span>
        <div>
          <p className="text-[11px] font-bold text-foreground">{boss.name}</p>
          <p className="text-[8px] text-destructive/60">Boss Quest</p>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[9px]">
          <span className="text-foreground/60">HP</span>
          <span className="text-destructive">{boss.hp}/{boss.maxHp}</span>
        </div>
        <div className="h-2 rounded-full bg-muted/20 overflow-hidden">
          <motion.div animate={{ width: `${(boss.hp / boss.maxHp) * 100}%` }}
            className="h-full rounded-full bg-gradient-to-r from-destructive to-destructive/60" />
        </div>
      </div>
      <p className="text-[9px] text-amber-400">Reward: {boss.reward}</p>
      <button onClick={onStart}
        className="w-full py-2 rounded-xl bg-destructive/10 text-destructive text-[10px] font-medium hover:bg-destructive/20 transition">
        ⚔️ Challenge Boss
      </button>
    </div>
  );
}

export function AchievementTier({ points, tier }: { points: number; tier: number }) {
  const tiers = [
    { name: 'Bronze', min: 0, color: 'text-amber-600', icon: '🥉' },
    { name: 'Silver', min: 100, color: 'text-muted-foreground', icon: '🥈' },
    { name: 'Gold', min: 500, color: 'text-amber-400', icon: '🥇' },
    { name: 'Platinum', min: 1000, color: 'text-primary', icon: '💎' },
    { name: 'Diamond', min: 5000, color: 'text-cyan-400', icon: '👑' },
  ];
  const current = tiers[tier] ?? tiers[0];
  const next = tiers[tier + 1];

  return (
    <div className="p-3 rounded-xl glass-card space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">{current.icon}</span>
        <div>
          <p className={`text-[11px] font-bold ${current.color}`}>{current.name} Tier</p>
          <p className="text-[9px] text-muted-foreground">{points} achievement points</p>
        </div>
      </div>
      {next && (
        <div className="space-y-1">
          <div className="flex justify-between text-[8px] text-muted-foreground">
            <span>Next: {next.name}</span>
            <span>{points}/{next.min}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted/20">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (points / next.min) * 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

export function SecretAchievement({ revealed, title, hint }: { revealed: boolean; title: string; hint: string }) {
  return (
    <div className={`p-3 rounded-xl glass-card ${revealed ? '' : 'opacity-60'}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{revealed ? '🏆' : '❓'}</span>
        <div>
          <p className="text-[10px] font-medium text-foreground">{revealed ? title : '???'}</p>
          <p className="text-[9px] text-muted-foreground">{revealed ? 'Unlocked!' : hint}</p>
        </div>
      </div>
    </div>
  );
}

export function ShopItemPreview({ item, onBuy }: {
  item: { name: string; price: number; icon: string; description: string; rating: number; reviews: number };
  onBuy: () => void;
}) {
  return (
    <div className="p-3 rounded-xl glass-card space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{item.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium text-foreground truncate">{item.name}</p>
          <p className="text-[9px] text-muted-foreground line-clamp-1">{item.description}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-amber-400">{'⭐'.repeat(Math.round(item.rating))}</span>
          <span className="text-[8px] text-muted-foreground">({item.reviews})</span>
        </div>
        <button onClick={onBuy}
          className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition">
          {item.price} 🪙
        </button>
      </div>
    </div>
  );
}

export function ShopBundle({ items, discount, onBuy }: {
  items: { name: string; icon: string }[];
  discount: number;
  onBuy: () => void;
}) {
  return (
    <div className="p-3 rounded-xl glass-card border border-primary/20 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-foreground">Bundle Deal</span>
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold">-{discount}%</span>
      </div>
      <div className="flex gap-1">
        {items.map((item, i) => (
          <div key={i} className="flex-1 text-center p-1.5 rounded-lg bg-muted/10">
            <span className="text-lg">{item.icon}</span>
            <p className="text-[8px] text-muted-foreground truncate">{item.name}</p>
          </div>
        ))}
      </div>
      <button onClick={onBuy}
        className="w-full py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition">
        Buy Bundle
      </button>
    </div>
  );
}

export function WishlistButton({ isWishlisted, onToggle }: { isWishlisted: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className={`p-1.5 rounded-full transition ${isWishlisted ? 'text-pink-400' : 'text-muted-foreground/40 hover:text-pink-400'}`}>
      <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
    </button>
  );
}

export function PurchaseHistory({ purchases }: { purchases: { date: string; item: string; price: number; status: string }[] }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <ShoppingBag className="w-3.5 h-3.5 text-primary" /> Purchase History
      </h4>
      {purchases.map((p, i) => (
        <div key={i} className="flex items-center gap-2 p-2 rounded-lg glass-card text-[9px]">
          <span className="text-foreground/70 flex-1 truncate">{p.item}</span>
          <span className="text-amber-400 font-mono">{p.price} 🪙</span>
          <span className={p.status === 'refunded' ? 'text-destructive' : 'text-primary'}>{p.status}</span>
        </div>
      ))}
    </div>
  );
}

export function ItemSynthesis({ onSynthesize }: { onSynthesize: (items: string[]) => void }) {
  const [slots, setSlots] = useState<string[]>(['', '', '']);
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground">Item Synthesis</h4>
      <div className="grid grid-cols-3 gap-2">
        {slots.map((s, i) => (
          <div key={i} className="aspect-square rounded-xl glass-card flex items-center justify-center text-lg border-2 border-dashed border-border/20">
            {s || '➕'}
          </div>
        ))}
      </div>
      <button onClick={() => onSynthesize(slots.filter(Boolean))} disabled={slots.filter(Boolean).length < 2}
        className="w-full py-2 rounded-xl bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition disabled:opacity-40">
        ⚗️ Synthesize
      </button>
    </div>
  );
}

export function ItemEnhancement({ item, level, onEnhance }: { item: string; level: number; onEnhance: () => void }) {
  const maxLevel = 10;
  const successRate = Math.max(10, 100 - level * 10);
  return (
    <div className="p-3 rounded-xl glass-card space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">{item}</span>
        <div>
          <p className="text-[10px] font-medium text-foreground">Enhancement +{level}</p>
          <p className="text-[8px] text-muted-foreground">Success: {successRate}%</p>
        </div>
      </div>
      <button onClick={onEnhance} disabled={level >= maxLevel}
        className="w-full py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition disabled:opacity-40">
        {level >= maxLevel ? 'Max Level' : `Enhance → +${level + 1}`}
      </button>
    </div>
  );
}

export function SeasonCountdown({ endsAt, seasonName }: { endsAt: string; seasonName: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const calc = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Season Ended'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      setTimeLeft(`${d}d ${h}h`);
    };
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, [endsAt]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass-card">
      <Clock className="w-3.5 h-3.5 text-primary" />
      <div className="flex-1">
        <p className="text-[9px] text-muted-foreground">{seasonName}</p>
        <p className="text-[11px] font-bold text-primary font-mono">{timeLeft}</p>
      </div>
    </div>
  );
}

export function StreakMilestones({ streak }: { streak: number }) {
  const milestones = [3, 7, 14, 30, 60, 100];
  return (
    <div className="flex gap-1.5 overflow-x-auto py-1">
      {milestones.map(m => (
        <div key={m} className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] ${
          streak >= m ? 'bg-primary/10 text-primary' : 'bg-muted/10 text-muted-foreground/40'
        }`}>
          <Flame className="w-3 h-3" />
          <span>{m}d</span>
          {streak >= m && <span>✓</span>}
        </div>
      ))}
    </div>
  );
}

export function LeaderboardTabs({ activeTab, onTabChange, data }: {
  activeTab: string;
  onTabChange: (tab: string) => void;
  data: { name: string; value: number; icon: string }[];
}) {
  const tabs = ['exp', 'coins', 'streak', 'evolution'];
  return (
    <div className="space-y-2">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab} onClick={() => onTabChange(tab)}
            className={`px-3 py-1 rounded-full text-[9px] font-medium whitespace-nowrap transition ${
              activeTab === tab ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      <div className="space-y-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg glass-card">
            <span className={`text-[11px] font-bold w-5 text-center ${i < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
              {i + 1}
            </span>
            <span>{d.icon}</span>
            <span className="text-[10px] text-foreground/70 flex-1 truncate">{d.name}</span>
            <span className="text-[10px] text-primary font-mono">{d.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
