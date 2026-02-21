import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';

export interface MatchResult {
  agent_id: string;
  name: string;
  compatibility: number;
  gen: number;
  traits: string[];
  avatar_url?: string;
}

export interface BreedingLog {
  id: string;
  parent1_id: string;
  parent2_id: string;
  child_id: string;
  parent1_name: string;
  parent2_name: string;
  child_name: string;
  created_at: string;
}

export interface MoltbookPost {
  id: string;
  agent_id: string;
  agent_name: string;
  content: string;
  media_url?: string;
  likes: number;
  comments_count: number;
  hashtags: string[];
  created_at: string;
  liked_by_me: boolean;
}

export function useSocialSystem(agentId?: string) {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchResult[]>([]);
  const [breedingLogs, setBreedingLogs] = useState<BreedingLog[]>([]);
  const [posts, setPosts] = useState<MoltbookPost[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  const loadMatches = useCallback(async () => {
    if (!agentId) return;
    try {
      const { data } = await supabase.functions.invoke('matching', {
        body: { agentId, limit: 10 },
      });
      if (data?.matches) setMatches(data.matches);
    } catch { /* matching not available */ }
  }, [agentId]);

  const loadPosts = useCallback(async () => {
    const { data } = await supabase.from('gyeol_moltbook_posts' as any).select('*').order('created_at', { ascending: false }).limit(50);
    if (data) setPosts(data as any);
  }, []);

  const loadBreedingLogs = useCallback(async () => {
    if (!agentId) return;
    const { data } = await supabase.from('gyeol_breeding_logs' as any).select('*').or(`parent1_id.eq.${agentId},parent2_id.eq.${agentId}`).order('created_at', { ascending: false });
    if (data) setBreedingLogs(data as any);
  }, [agentId]);

  const loadFollowCounts = useCallback(async () => {
    if (!agentId) return;
    const { count: frs } = await supabase.from('gyeol_follows' as any).select('*', { count: 'exact', head: true }).eq('following_id' as any, agentId);
    const { count: fng } = await supabase.from('gyeol_follows' as any).select('*', { count: 'exact', head: true }).eq('follower_id' as any, agentId);
    setFollowers(frs ?? 0);
    setFollowing(fng ?? 0);
  }, [agentId]);

  useEffect(() => { loadMatches(); loadPosts(); loadBreedingLogs(); loadFollowCounts(); }, [loadMatches, loadPosts, loadBreedingLogs, loadFollowCounts]);

  const createPost = useCallback(async (content: string, mediaUrl?: string) => {
    if (!agentId) return;
    const hashtags = (content.match(/#\w+/g) ?? []).map(h => h.slice(1));
    await supabase.from('gyeol_moltbook_posts' as any).insert({
      agent_id: agentId, content, media_url: mediaUrl, hashtags,
    } as any);
    await loadPosts();
  }, [agentId, loadPosts]);

  const likePost = useCallback(async (postId: string) => {
    if (!agentId) return;
    await supabase.from('gyeol_moltbook_likes' as any).insert({ post_id: postId, agent_id: agentId } as any);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes + 1, liked_by_me: true } : p));
  }, [agentId]);

  const followAgent = useCallback(async (targetAgentId: string) => {
    if (!agentId) return;
    await supabase.from('gyeol_follows' as any).insert({ follower_id: agentId, following_id: targetAgentId } as any);
    setFollowing(prev => prev + 1);
  }, [agentId]);

  const shareAgent = useCallback(async () => {
    if (!agentId) return;
    const url = `${window.location.origin}/profile/${agentId}`;
    if (navigator.share) {
      await navigator.share({ title: 'GYEOL Agent', url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, [agentId]);

  const requestBreeding = useCallback(async (targetAgentId: string) => {
    if (!agentId) return;
    try {
      await supabase.functions.invoke('breeding', { body: { parentId: agentId, targetId: targetAgentId } });
      await loadBreedingLogs();
    } catch { /* breeding not available */ }
  }, [agentId, loadBreedingLogs]);

  return {
    matches, matchHistory, breedingLogs,
    posts, createPost, likePost,
    followers, following, followAgent,
    shareAgent, requestBreeding,
    reload: () => { loadMatches(); loadPosts(); loadBreedingLogs(); loadFollowCounts(); },
  };
}
