import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';

export interface SkinItem {
  id: string;
  name: string;
  description: string;
  creator_id: string;
  creator_name: string;
  price: number;
  discount_price?: number;
  preview_url: string;
  downloads: number;
  rating: number;
  tags: string[];
  is_new: boolean;
  created_at: string;
}

export interface SkillItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  downloads: number;
  rating: number;
  dependencies: string[];
  created_at: string;
}

export interface MarketReview {
  id: string;
  item_id: string;
  agent_id: string;
  rating: number;
  text: string;
  created_at: string;
}

export function useMarket() {
  const [skins, setSkins] = useState<SkinItem[]>([]);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [reviews, setReviews] = useState<MarketReview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'price_low' | 'price_high'>('popular');
  const [category, setCategory] = useState<string>('all');
  const [ownedSkins, setOwnedSkins] = useState<Set<string>>(new Set());

  const loadSkins = useCallback(async () => {
    let query = supabase.from('gyeol_market_skins' as any).select('*');
    if (searchQuery) query = query.ilike('name' as any, `%${searchQuery}%`);
    if (sortBy === 'popular') query = query.order('downloads', { ascending: false });
    else if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
    else if (sortBy === 'price_low') query = query.order('price', { ascending: true });
    else if (sortBy === 'price_high') query = query.order('price', { ascending: false });
    const { data } = await query.limit(50);
    if (data) setSkins(data as any);
  }, [searchQuery, sortBy]);

  const loadSkills = useCallback(async () => {
    let query = supabase.from('gyeol_market_skills' as any).select('*');
    if (searchQuery) query = query.ilike('name' as any, `%${searchQuery}%`);
    if (category !== 'all') query = query.eq('category' as any, category);
    const { data } = await query.order('downloads', { ascending: false }).limit(50);
    if (data) setSkills(data as any);
  }, [searchQuery, category]);

  const loadOwnedSkins = useCallback(async (agentId: string) => {
    const { data } = await supabase.from('gyeol_inventory' as any).select('item_id').eq('agent_id', agentId).eq('item_type' as any, 'skin');
    if (data) setOwnedSkins(new Set(data.map((d: any) => d.item_id)));
  }, []);

  useEffect(() => { loadSkins(); loadSkills(); }, [loadSkins, loadSkills]);

  const submitReview = useCallback(async (itemId: string, agentId: string, rating: number, text: string) => {
    await supabase.from('gyeol_market_reviews' as any).insert({ item_id: itemId, agent_id: agentId, rating, text } as any);
  }, []);

  const loadReviews = useCallback(async (itemId: string) => {
    const { data } = await supabase.from('gyeol_market_reviews' as any).select('*').eq('item_id', itemId).order('created_at', { ascending: false });
    if (data) setReviews(data as any);
  }, []);

  const purchaseSkin = useCallback(async (skinId: string, agentId: string) => {
    try {
      const { error } = await supabase.functions.invoke('market-purchase', {
        body: { agentId, itemId: skinId, type: 'skin' },
      });
      if (!error) { await loadOwnedSkins(agentId); }
      return !error;
    } catch { return false; }
  }, [loadOwnedSkins]);

  const purchaseSkill = useCallback(async (skillId: string, agentId: string) => {
    try {
      const { error } = await supabase.functions.invoke('market-purchase', {
        body: { agentId, itemId: skillId, type: 'skill' },
      });
      return !error;
    } catch { return false; }
  }, []);

  return {
    skins, skills, reviews, ownedSkins,
    searchQuery, setSearchQuery,
    sortBy, setSortBy,
    category, setCategory,
    submitReview, loadReviews,
    purchaseSkin, purchaseSkill,
    loadOwnedSkins,
    reload: () => { loadSkins(); loadSkills(); },
  };
}
