/**
 * GYEOL 게이미피케이션 훅 — EXP, 코인, 퀘스트, 업적, 리더보드
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useGyeolStore } from '@/store/gyeol-store';

// ========== 타입 ==========
export interface GamificationProfile {
  id: string;
  agent_id: string;
  exp: number;
  level: number;
  coins: number;
  total_exp: number;
  streak_days: number;
  longest_streak: number;
  last_daily_claim: string | null;
  title: string;
}

export interface Quest {
  id: string;
  quest_type: 'daily' | 'weekly' | 'seasonal' | 'special' | 'tutorial';
  title: string;
  description: string | null;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  reward_exp: number;
  reward_coins: number;
  min_level: number;
  min_gen: number;
  sort_order: number;
  is_active: boolean;
}

export interface QuestProgress {
  id: string;
  agent_id: string;
  quest_id: string;
  current_value: number;
  is_completed: boolean;
  is_claimed: boolean;
  started_at: string;
  completed_at: string | null;
  claimed_at: string | null;
}

export interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  requirement_type: string;
  requirement_value: number;
  reward_exp: number;
  reward_coins: number;
  reward_title: string | null;
  sort_order: number;
  is_hidden: boolean;
}

export interface AchievementUnlock {
  id: string;
  agent_id: string;
  achievement_id: string;
  unlocked_at: string;
  is_new: boolean;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
  price_coins: number;
  price_exp: number;
  item_data: Record<string, any>;
  stock: number | null;
  is_limited: boolean;
  min_level: number;
  sort_order: number;
  is_active: boolean;
}

export interface InventoryItem {
  id: string;
  agent_id: string;
  item_id: string;
  quantity: number;
  is_equipped: boolean;
  acquired_at: string;
}

export interface LeaderboardEntry {
  id: string;
  agent_id: string;
  agent_name: string | null;
  agent_gen: number;
  period: string;
  score: number;
  rank: number | null;
  period_start: string;
}

export interface Season {
  id: string;
  name: string;
  description: string | null;
  theme_color: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  reward_summary: string | null;
}

// ========== EXP → 레벨 계산 ==========
export function expForLevel(level: number): number {
  // 레벨 1→2: 100 EXP, 이후 1.15배씩 증가
  return Math.floor(100 * Math.pow(1.15, level - 1));
}

export function expToNextLevel(currentExp: number, currentLevel: number): { needed: number; progress: number } {
  const needed = expForLevel(currentLevel);
  const progress = Math.min((currentExp / needed) * 100, 100);
  return { needed, progress };
}

// ========== 등급 색상 ==========
export const RARITY_COLORS: Record<string, string> = {
  common: 'text-muted-foreground',
  uncommon: 'text-[hsl(var(--success,142_71%_45%))]',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-amber-400',
};

export const RARITY_BG: Record<string, string> = {
  common: 'bg-slate-400/10 border-slate-400/20',
  uncommon: 'bg-[hsl(var(--success,142_71%_45%)/0.1)] border-[hsl(var(--success,142_71%_45%)/0.2)]',
  rare: 'bg-blue-400/10 border-blue-400/20',
  epic: 'bg-purple-400/10 border-purple-400/20',
  legendary: 'bg-amber-400/10 border-amber-400/20',
};

export const RARITY_GLOW: Record<string, string> = {
  common: '',
  uncommon: 'shadow-[hsl(var(--success,142_71%_45%)/0.2)]',
  rare: 'shadow-blue-500/20',
  epic: 'shadow-purple-500/30',
  legendary: 'shadow-amber-500/40 shadow-lg',
};

// ========== 메인 훅 ==========
export function useGamification() {
  const agent = useGyeolStore((s) => s.agent);
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [quests, setQuests] = useState<(Quest & { progress?: QuestProgress })[]>([]);
  const [achievements, setAchievements] = useState<(Achievement & { unlocked?: AchievementUnlock })[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  const agentId = agent?.id;

  // 프로필 로드 (없으면 생성)
  const loadProfile = useCallback(async () => {
    if (!agentId) return;
    const { data } = await supabase
      .from('gyeol_gamification_profiles')
      .select('*')
      .eq('agent_id', agentId)
      .maybeSingle();

    if (data) {
      setProfile(data as any);
    } else {
      // 자동 생성
      const { data: created } = await supabase
        .from('gyeol_gamification_profiles')
        .insert({ agent_id: agentId })
        .select()
        .single();
      if (created) setProfile(created as any);
    }
  }, [agentId]);

  // 퀘스트 + 진행 상태 로드
  const loadQuests = useCallback(async () => {
    if (!agentId) return;
    const [{ data: questData }, { data: progressData }] = await Promise.all([
      supabase.from('gyeol_quests').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('gyeol_quest_progress').select('*').eq('agent_id', agentId),
    ]);
    const qs = (questData ?? []) as Quest[];
    const ps = (progressData ?? []) as QuestProgress[];
    const merged = qs.map((q) => ({
      ...q,
      progress: ps.find((p) => p.quest_id === q.id),
    }));
    setQuests(merged);
  }, [agentId]);

  // 업적 + 달성 로드
  const loadAchievements = useCallback(async () => {
    if (!agentId) return;
    const [{ data: achData }, { data: unlockData }] = await Promise.all([
      supabase.from('gyeol_achievements').select('*').order('sort_order'),
      supabase.from('gyeol_achievement_unlocks').select('*').eq('agent_id', agentId),
    ]);
    const achs = (achData ?? []) as Achievement[];
    const unlocks = (unlockData ?? []) as AchievementUnlock[];
    const merged = achs.map((a) => ({
      ...a,
      unlocked: unlocks.find((u) => u.achievement_id === a.id),
    }));
    setAchievements(merged);
  }, [agentId]);

  // 리더보드 로드
  const loadLeaderboard = useCallback(async () => {
    const { data } = await supabase
      .from('gyeol_leaderboard')
      .select('*')
      .order('score', { ascending: false })
      .limit(50);
    setLeaderboard((data ?? []) as any);
  }, []);

  // 상점 로드
  const loadShop = useCallback(async () => {
    if (!agentId) return;
    const [{ data: items }, { data: inv }] = await Promise.all([
      supabase.from('gyeol_shop_items').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('gyeol_inventory').select('*').eq('agent_id', agentId),
    ]);
    setShopItems((items ?? []) as any);
    setInventory((inv ?? []) as any);
  }, [agentId]);

  // 시즌 로드
  const loadSeasons = useCallback(async () => {
    const { data } = await supabase.from('gyeol_seasons').select('*').order('start_date', { ascending: false });
    setSeasons((data ?? []) as any);
  }, []);

  // 보상 수령
  const claimQuestReward = useCallback(async (questProgressId: string, questId: string) => {
    if (!agentId || !profile) return false;
    const quest = quests.find((q) => q.id === questId);
    if (!quest) return false;

    // 퀘스트 완료 & 보상 수령 표시
    await supabase
      .from('gyeol_quest_progress')
      .update({ is_claimed: true, claimed_at: new Date().toISOString() })
      .eq('id', questProgressId);

    // EXP + 코인 지급
    const newExp = profile.exp + quest.reward_exp;
    const newCoins = profile.coins + quest.reward_coins;
    const newTotalExp = profile.total_exp + quest.reward_exp;

    // 레벨업 체크
    let newLevel = profile.level;
    let remainExp = newExp;
    while (remainExp >= expForLevel(newLevel)) {
      remainExp -= expForLevel(newLevel);
      newLevel++;
    }

    await supabase
      .from('gyeol_gamification_profiles')
      .update({
        exp: remainExp,
        level: newLevel,
        coins: newCoins,
        total_exp: newTotalExp,
        updated_at: new Date().toISOString(),
      })
      .eq('agent_id', agentId);

    // 로그 기록
    await supabase.from('gyeol_currency_logs').insert([
      { agent_id: agentId, currency_type: 'exp', amount: quest.reward_exp, reason: `quest:${quest.title}` },
      ...(quest.reward_coins > 0 ? [{ agent_id: agentId, currency_type: 'coins' as const, amount: quest.reward_coins, reason: `quest:${quest.title}` }] : []),
    ]);

    await Promise.all([loadProfile(), loadQuests()]);
    return true;
  }, [agentId, profile, quests, loadProfile, loadQuests]);

  // 상점 구매 (서버사이드)
  const purchaseItem = useCallback(async (itemId: string) => {
    if (!agentId || !profile) return { success: false, error: '프로필 없음' };
    const item = shopItems.find((i) => i.id === itemId);
    if (!item) return { success: false, error: '아이템 없음' };
    if (profile.coins < item.price_coins) return { success: false, error: '코인 부족' };
    if (profile.level < item.min_level) return { success: false, error: `레벨 ${item.min_level} 필요` };

    try {
      const res = await supabase.functions.invoke('market-purchase', {
        body: { action: 'buy_item', agentId, itemId },
      });

      if (res.error || res.data?.error) {
        return { success: false, error: res.data?.error || 'Purchase failed' };
      }

      await Promise.all([loadProfile(), loadShop()]);
      return { success: true, error: null };
    } catch {
      return { success: false, error: 'Server error' };
    }
  }, [agentId, profile, shopItems, loadProfile, loadShop]);

  // 초기 로드
  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    Promise.all([loadProfile(), loadQuests(), loadAchievements(), loadLeaderboard(), loadShop(), loadSeasons()])
      .finally(() => setLoading(false));

    // Realtime leaderboard updates
    const channel = supabase
      .channel('gamification-leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gyeol_leaderboard' }, () => {
        loadLeaderboard();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [agentId, loadProfile, loadQuests, loadAchievements, loadLeaderboard, loadShop, loadSeasons]);

  return {
    profile,
    quests,
    achievements,
    leaderboard,
    shopItems,
    inventory,
    seasons,
    loading,
    claimQuestReward,
    purchaseItem,
    reload: () => Promise.all([loadProfile(), loadQuests(), loadAchievements(), loadLeaderboard(), loadShop(), loadSeasons()]),
  };
}
