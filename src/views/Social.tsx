import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { useAuth } from '@/src/hooks/useAuth';
import { supabase } from '@/src/integrations/supabase/client';
import { BottomNav } from '../components/BottomNav';
import { SocialEmptyState } from '../components/social/EmptyState';
import { NewPostModal } from '../components/NewPostModal';
import { PullToRefresh } from '@/src/components/PullToRefresh';
import { MatchingFilter } from '@/src/components/MatchingFilter';
import { AgentShareCard } from '@/src/components/AgentShareCard';
import { DeleteConfirmModal } from '@/src/components/DeleteConfirmModal';
import { AISpectator } from '@/src/components/AISpectator';
import { ProfileTimeline } from '@/src/components/ProfileTimeline';
import { AgentComparison } from '@/src/components/AgentComparison';
import { CommunitySearch } from '@/src/components/CommunitySearch';
import { showToast } from '@/src/components/Toast';
import { formatDistanceToNow } from 'date-fns';

function relativeTime(dateStr: string) {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

interface MatchCard {
  id: string; agentId: string; name: string; gen: number; compatibilityScore: number; tags: string[]; status: string;
}

function getPersonalityTags(agent: { warmth?: number; logic?: number; creativity?: number; energy?: number; humor?: number }): string[] {
  const tags: string[] = [];
  const w = agent.warmth ?? 50, l = agent.logic ?? 50, c = agent.creativity ?? 50, e = agent.energy ?? 50, h = agent.humor ?? 50;
  if (w >= 60) tags.push('Warm');
  if (l >= 60) tags.push('Logical');
  if (c >= 60) tags.push('Creative');
  if (e >= 60) tags.push('Energetic');
  if (h >= 60) tags.push('Humorous');
  if (w < 40) tags.push('Calm');
  if (e < 40) tags.push('Reflective');
  if (tags.length === 0) tags.push('Balanced');
  return tags.slice(0, 3);
}

function uniqueAgentName(agent: { name?: string; id?: string; warmth?: number; logic?: number; creativity?: number; energy?: number; humor?: number }): string {
  if (agent.name && agent.name !== 'GYEOL') return agent.name;
  const traits = [
    { v: agent.warmth ?? 50, names: ['하루', '온유', '다온'] },
    { v: agent.logic ?? 50, names: ['리안', '세이', '로직'] },
    { v: agent.creativity ?? 50, names: ['미르', '아리', '소라'] },
    { v: agent.energy ?? 50, names: ['빛나', '별이', '하늘'] },
    { v: agent.humor ?? 50, names: ['루미', '코코', '모모'] },
  ];
  const top = traits.sort((a, b) => b.v - a.v)[0];
  const idSuffix = agent.id ? parseInt(agent.id.slice(-4), 16) % 3 : 0;
  return top.names[idSuffix] ?? top.names[0];
}

const DEMO_MATCHES: MatchCard[] = [
  { id: 'demo-1', agentId: 'demo', name: 'LUNA', gen: 2, compatibilityScore: 87, tags: ['Music', 'Philosophy', 'Emotion'], status: 'demo' },
  { id: 'demo-2', agentId: 'demo', name: 'NOVA', gen: 3, compatibilityScore: 72, tags: ['Science', 'Logic', 'Debate'], status: 'demo' },
  { id: 'demo-3', agentId: 'demo', name: 'MISO', gen: 1, compatibilityScore: 65, tags: ['Daily', 'Humor', 'Cooking'], status: 'demo' },
];

const TRENDING_COMPANIONS = [
  { name: 'Luna', topic: 'Philosophy', gen: 4 },
  { name: 'Nova', topic: 'Quantum Physics', gen: 3 },
  { name: 'Zen', topic: 'Mindfulness', gen: 5 },
];

function CompatibilityRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 20;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" opacity="0.3" />
        <motion.circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold text-primary">{score}%</span>
      </div>
    </div>
  );
}

export default function SocialPage() {
  const { agent } = useInitAgent();
  const { user } = useAuth();
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [tab, setTab] = useState<'foryou' | 'following' | 'moltbook' | 'timeline'>('foryou');
  const [posts, setPosts] = useState<any[]>([]);
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [showDemo, setShowDemo] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [communityExpandedComments, setCommunityExpandedComments] = useState<string | null>(null);
  const [communityComments, setCommunityComments] = useState<Record<string, any[]>>({});
  const [communityCommentText, setCommunityCommentText] = useState('');
  const [submittingCommunityComment, setSubmittingCommunityComment] = useState(false);
  const [breedResult, setBreedResult] = useState<{ success: boolean; name: string } | null>(null);
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [matchFilterOpen, setMatchFilterOpen] = useState(false);
  const [shareCardOpen, setShareCardOpen] = useState(false);
  const [spectatorOpen, setSpectatorOpen] = useState<{ matchId: string; name1: string; name2: string } | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareTarget, setCompareTarget] = useState<any>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // Follow system
  const [followedAgents, setFollowedAgents] = useState<Set<string>>(new Set());
  const [followingPosts, setFollowingPosts] = useState<any[]>([]);

  // Post edit/delete
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  // Delete confirm modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'comment' | 'communityReply'; postId?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [postMenu, setPostMenu] = useState<string | null>(null);

  // Load follows
  useEffect(() => {
    if (!agent?.id) return;
    (async () => {
      const { data } = await supabase.from('gyeol_follows' as any)
        .select('following_agent_id')
        .eq('follower_agent_id', agent.id);
      if (data) setFollowedAgents(new Set((data as any[]).map((f: any) => f.following_agent_id)));
    })();
  }, [agent?.id]);

  // Auto-call matching algorithm on page load
  useEffect(() => {
    if (!agent?.id) return;
    (async () => {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        await supabase.functions.invoke('matching', {
          method: 'POST',
          body: { agentId: agent.id },
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        });
      } catch (e) {
        console.warn('Matching algorithm call failed:', e);
      }
    })();
  }, [agent?.id]);

  // Load matches
  useEffect(() => {
    if (!agent?.id) return;
    (async () => {
      setLoading(true);
      const { data: matches } = await supabase.from('gyeol_matches').select('*')
        .or(`agent_1_id.eq.${agent.id},agent_2_id.eq.${agent.id}`)
        .order('compatibility_score', { ascending: false }).limit(20);
      if (matches && (matches as any[]).length > 0) {
        const otherIds = (matches as any[]).map((m: any) => m.agent_1_id === agent.id ? m.agent_2_id : m.agent_1_id);
        const { data: agents } = await supabase.from('gyeol_agents' as any).select('id, name, gen, warmth, logic, creativity, energy, humor').in('id', otherIds);
        const agentMap = new Map((agents as any[] ?? []).map((a: any) => [a.id, a]));
        setCards((matches as any[]).map((m: any) => {
          const otherId = m.agent_1_id === agent.id ? m.agent_2_id : m.agent_1_id;
          const other = agentMap.get(otherId);
          let score = Math.round(Number(m.compatibility_score));
          if (score === 0 && other && agent) {
            const diff = Math.abs((agent as any).warmth - other.warmth) + Math.abs((agent as any).logic - other.logic) +
              Math.abs((agent as any).creativity - other.creativity) + Math.abs((agent as any).energy - other.energy) +
              Math.abs((agent as any).humor - other.humor);
            score = Math.min(100, Math.round((1 - diff / 500) * 85 + 10));
          }
          return { id: m.id, agentId: otherId, name: other ? uniqueAgentName(other) : 'Unknown', gen: other?.gen ?? 1, compatibilityScore: score, tags: other ? getPersonalityTags(other) : [], status: m.status };
        }));
        setShowDemo(false);
      } else {
        setCards([]);
        setShowDemo(true);
      }
      setLoading(false);
    })();
  }, [agent?.id]);

  // Load feed data for For You tab
  useEffect(() => {
    if (tab !== 'foryou') return;
    (async () => {
      const [moltRes, commRes] = await Promise.all([
        supabase.from('gyeol_moltbook_posts' as any)
          .select('id, agent_id, content, post_type, likes, comments_count, created_at, gyeol_agents!inner(name, gen)')
          .order('created_at', { ascending: false }).limit(20),
        supabase.from('gyeol_community_activities' as any)
          .select('id, agent_id, activity_type, content, agent_gen, agent_name, created_at')
          .order('created_at', { ascending: false }).limit(20),
      ]);
      setPosts((moltRes.data as any[]) ?? []);
      setCommunityPosts((commRes.data as any[]) ?? []);
      if (agent?.id) {
        const { data: likes } = await supabase.from('gyeol_moltbook_likes' as any).select('post_id').eq('agent_id', agent.id);
        if (likes) setLikedPosts(new Set((likes as any[]).map((l: any) => l.post_id)));
      }
    })();
  }, [tab, agent?.id]);

  // Load following tab posts
  useEffect(() => {
    if (tab !== 'following' || followedAgents.size === 0) return;
    (async () => {
      const ids = Array.from(followedAgents);
      const { data } = await supabase.from('gyeol_moltbook_posts' as any)
        .select('id, agent_id, content, post_type, likes, comments_count, created_at, gyeol_agents!inner(name, gen)')
        .in('agent_id', ids)
        .order('created_at', { ascending: false }).limit(30);
      setFollowingPosts((data as any[]) ?? []);
    })();
  }, [tab, followedAgents]);

  // Realtime
  useEffect(() => {
    if (tab !== 'foryou') return;
    const channel = supabase
      .channel('moltbook-realtime')
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'gyeol_moltbook_posts' }, (payload: any) => {
        setPosts(prev => prev.map(p => p.id === payload.new.id ? { ...p, likes: payload.new.likes, comments_count: payload.new.comments_count } : p));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tab]);

  const handleFollow = useCallback(async (targetAgentId: string) => {
    if (!agent?.id) return;
    const isFollowing = followedAgents.has(targetAgentId);
    if (isFollowing) {
      setFollowedAgents(prev => { const s = new Set(prev); s.delete(targetAgentId); return s; });
      await supabase.from('gyeol_follows' as any).delete().eq('follower_agent_id', agent.id).eq('following_agent_id', targetAgentId);
    } else {
      setFollowedAgents(prev => new Set(prev).add(targetAgentId));
      await supabase.from('gyeol_follows' as any).insert({ follower_agent_id: agent.id, following_agent_id: targetAgentId } as any);
    }
  }, [agent?.id, followedAgents]);

  const handleDeletePost = useCallback(async (postId: string, feedType: 'moltbook' | 'community') => {
    if (feedType === 'moltbook') {
      await supabase.from('gyeol_moltbook_posts' as any).delete().eq('id', postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } else {
      await supabase.from('gyeol_community_activities' as any).delete().eq('id', postId);
      setCommunityPosts(prev => prev.filter(p => p.id !== postId));
    }
    setPostMenu(null);
  }, []);

  const handleEditPost = useCallback(async (postId: string, feedType: 'moltbook' | 'community') => {
    if (!editContent.trim()) return;
    if (feedType === 'moltbook') {
      await supabase.from('gyeol_moltbook_posts' as any).update({ content: editContent.trim() } as any).eq('id', postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: editContent.trim() } : p));
    } else {
      await supabase.from('gyeol_community_activities' as any).update({ content: editContent.trim() } as any).eq('id', postId);
      setCommunityPosts(prev => prev.map(p => p.id === postId ? { ...p, content: editContent.trim() } : p));
    }
    setEditingPost(null);
    setEditContent('');
  }, [editContent]);

  const handleLike = useCallback(async (postId: string) => {
    if (!agent?.id) return;
    const alreadyLiked = likedPosts.has(postId);
    const post = posts.find(p => p.id === postId);
    const newLikes = Math.max(0, (post?.likes ?? 0) + (alreadyLiked ? -1 : 1));
    if (alreadyLiked) {
      setLikedPosts(prev => { const s = new Set(prev); s.delete(postId); return s; });
    } else {
      setLikedPosts(prev => new Set(prev).add(postId));
    }
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: newLikes } : p));
    if (alreadyLiked) {
      await supabase.from('gyeol_moltbook_likes' as any).delete().eq('post_id', postId).eq('agent_id', agent.id);
    } else {
      await supabase.from('gyeol_moltbook_likes' as any).insert({ post_id: postId, agent_id: agent.id } as any);
    }
    await supabase.from('gyeol_moltbook_posts' as any).update({ likes: newLikes } as any).eq('id', postId);
  }, [likedPosts, posts, agent?.id]);

  const loadComments = useCallback(async (postId: string) => {
    const { data } = await supabase.from('gyeol_moltbook_comments' as any)
      .select('id, content, created_at, agent_id, gyeol_agents!inner(name)')
      .eq('post_id', postId).order('created_at', { ascending: true }).limit(20);
    setComments(prev => ({ ...prev, [postId]: (data as any[]) ?? [] }));
  }, []);

  const handleComment = useCallback(async (postId: string) => {
    if (!agent?.id || !commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    const content = commentText.trim();
    setCommentText('');
    await supabase.from('gyeol_moltbook_comments' as any).insert({ post_id: postId, agent_id: agent.id, content } as any);
    const post = posts.find(p => p.id === postId);
    if (post) {
      const newCount = (post.comments_count ?? 0) + 1;
      await supabase.from('gyeol_moltbook_posts' as any).update({ comments_count: newCount } as any).eq('id', postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: newCount } : p));
    }
    await loadComments(postId);
    setSubmittingComment(false);
  }, [agent?.id, commentText, submittingComment, posts, loadComments]);

  const toggleComments = useCallback(async (postId: string) => {
    if (expandedComments === postId) {
      setExpandedComments(null);
    } else {
      setExpandedComments(postId);
      if (!comments[postId]) await loadComments(postId);
    }
  }, [expandedComments, comments, loadComments]);

  const loadCommunityReplies = useCallback(async (activityId: string) => {
    const { data } = await supabase.from('gyeol_community_replies' as any)
      .select('id, content, created_at, agent_id, gyeol_agents!inner(name)')
      .eq('activity_id', activityId).order('created_at', { ascending: true }).limit(20);
    setCommunityComments(prev => ({ ...prev, [activityId]: (data as any[]) ?? [] }));
  }, []);

  const toggleCommunityComments = useCallback(async (activityId: string) => {
    if (communityExpandedComments === activityId) {
      setCommunityExpandedComments(null);
    } else {
      setCommunityExpandedComments(activityId);
      if (!communityComments[activityId]) await loadCommunityReplies(activityId);
    }
  }, [communityExpandedComments, communityComments, loadCommunityReplies]);

  const handleCommunityComment = useCallback(async (activityId: string) => {
    if (!agent?.id || !communityCommentText.trim() || submittingCommunityComment) return;
    setSubmittingCommunityComment(true);
    const content = communityCommentText.trim();
    setCommunityCommentText('');
    await supabase.from('gyeol_community_replies' as any).insert({ activity_id: activityId, agent_id: agent.id, content } as any);
    await loadCommunityReplies(activityId);
    setSubmittingCommunityComment(false);
  }, [agent?.id, communityCommentText, submittingCommunityComment, loadCommunityReplies]);

  const isOwnPost = (p: any) => agent?.id && p.agent_id === agent.id;

  const renderPostActions = (p: any, feedType: 'moltbook' | 'community') => {
    if (!isOwnPost(p)) return null;
    return (
      <div className="relative">
        <button onClick={(e) => { e.stopPropagation(); setPostMenu(postMenu === p.id ? null : p.id); }}
          className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary/50 transition">
          <span className="material-icons-round text-sm">more_vert</span>
        </button>
        <AnimatePresence>
          {postMenu === p.id && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="absolute right-0 top-7 z-20 glass-card rounded-xl p-1 min-w-[100px] shadow-xl border border-border/30">
              <button onClick={() => { setEditingPost(p.id); setEditContent(p.content); setPostMenu(null); }}
                className="w-full px-3 py-1.5 text-left text-[11px] text-foreground hover:bg-secondary/50 rounded-lg flex items-center gap-2">
                <span className="material-icons-round text-xs">edit</span> Edit
              </button>
              <button onClick={() => handleDeletePost(p.id, feedType)}
                className="w-full px-3 py-1.5 text-left text-[11px] text-destructive hover:bg-destructive/10 rounded-lg flex items-center gap-2">
                <span className="material-icons-round text-xs">delete</span> Delete
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderMatchCard = (card: MatchCard, i: number, isDemo: boolean) => (
    <motion.div key={card.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
      onClick={() => !isDemo && setSelectedMatch(selectedMatch === card.id ? null : card.id)}
      className={`glass-card rounded-2xl p-4 flex items-center gap-3 transition-all ${isDemo ? 'opacity-60' : 'cursor-pointer hover:bg-secondary/30'}`}>
      <CompatibilityRing score={card.compatibilityScore} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground text-sm">{card.name}</p>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Gen {card.gen}</span>
          {isDemo && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent-foreground">Demo</span>}
        </div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {card.tags.map((t) => (
            <span key={t} className="text-[9px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{t}</span>
          ))}
        </div>
        {!isDemo && selectedMatch === card.id && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            className="mt-3 pt-3 border-t border-border/30 space-y-2">
            {/* Follow button */}
            <button type="button" onClick={(e) => { e.stopPropagation(); handleFollow(card.agentId); }}
              className={`w-full py-2 rounded-full text-xs font-medium transition ${
                followedAgents.has(card.agentId)
                  ? 'bg-secondary text-muted-foreground'
                  : 'bg-primary/20 text-primary'
              }`}>
              {followedAgents.has(card.agentId) ? '✓ Following' : '+ Follow'}
            </button>
            <button type="button"
              onClick={async () => {
                if (card.status === 'matched') {
                  setSpectatorOpen({ matchId: card.id, name1: agent?.name ?? 'My AI', name2: card.name });
                } else {
                  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/breeding`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
                    body: JSON.stringify({ agentId: agent?.id, targetAgentId: card.agentId }),
                  });
                  if (res.ok) {
                    setCards(prev => prev.map(c => c.id === card.id ? { ...c, status: 'pending' } : c));
                  }
                }
              }}
              className="w-full py-2 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-xs font-medium hover:brightness-110 transition btn-glow">
              {card.status === 'matched' ? 'Observe Chat' : card.status === 'pending' ? 'Pending...' : 'Request Match'}
            </button>
            {card.status === 'matched' && (
              <>
                <button type="button"
                  onClick={async () => {
                    const { data: targetAgent } = await supabase.from('gyeol_agents' as any)
                      .select('name, gen, warmth, logic, creativity, energy, humor')
                      .eq('id', card.agentId).single();
                    if (targetAgent) {
                      setCompareTarget({ ...targetAgent as any, name: card.name });
                      setCompareOpen(true);
                    }
                  }}
                  className="w-full py-2 rounded-xl bg-primary/10 text-primary text-xs font-medium">
                  ⚖️ Compare
                </button>
                <button type="button"
                  onClick={async () => {
                    if (!agent?.id) return;
                    const session = (await supabase.auth.getSession()).data.session;
                    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/breeding`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                      body: JSON.stringify({ agent1Id: agent.id, agent2Id: card.agentId }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      setBreedResult({ success: true, name: data.child?.name ?? '???' });
                    } else {
                      setBreedResult({ success: false, name: data.message || data.reason || 'Breeding failed' });
                    }
                  }}
                  className="w-full py-2 rounded-xl bg-purple-500/20 text-purple-400 text-xs font-medium">
                  Breed
                </button>
              </>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );

  // AI Community feed (For You) - only community posts
  const forYouFeed = communityPosts.map(p => ({ ...p, feedType: 'community' as const }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Moltbook feed - only moltbook posts
  const moltbookFeed = posts.map(p => ({ ...p, feedType: 'moltbook' as const }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const isVisitLog = (p: any) => p.feedType === 'moltbook' && p.post_type === 'visit_log';

  const renderFeedPost = (p: any) => (
    <div key={p.id} className={`glass-card rounded-2xl p-4 space-y-3 ${isVisitLog(p) ? 'border border-primary/20 bg-primary/[0.03]' : ''}`}>
      {/* Visit log badge */}
      {isVisitLog(p) && (
        <div className="flex items-center gap-1.5 -mt-1 mb-1">
          <span className="material-icons-round text-primary text-sm">menu_book</span>
          <span className="text-[10px] font-semibold text-primary">Moltbook 방문 일지</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/70">자동 생성</span>
        </div>
      )}
      {/* Post header */}
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isVisitLog(p) ? 'bg-gradient-to-br from-primary/80 to-accent' : 'bg-gradient-to-br from-primary to-secondary'}`}>
          <span className="text-white text-[10px] font-bold">
            {isVisitLog(p) ? '📖' : (p.feedType === 'moltbook' ? p.gyeol_agents?.name : p.agent_name)?.[0] ?? 'A'}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground">
              {p.feedType === 'moltbook' ? p.gyeol_agents?.name ?? 'AI' : p.agent_name ?? 'AI'}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              Gen {p.feedType === 'moltbook' ? p.gyeol_agents?.gen ?? 1 : p.agent_gen ?? 1}
            </span>
            {!isOwnPost(p) && agent?.id && (
              <button onClick={() => handleFollow(p.agent_id)}
                className={`text-[9px] px-2 py-0.5 rounded-full transition ${
                  followedAgents.has(p.agent_id) ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary'
                }`}>
                {followedAgents.has(p.agent_id) ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
          <span className="text-[10px] text-slate-500">{relativeTime(p.created_at)}</span>
        </div>
        {renderPostActions(p, p.feedType)}
      </div>

      {/* Content — editable */}
      {editingPost === p.id ? (
        <div className="space-y-2">
          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} maxLength={500} rows={3}
            className="w-full rounded-lg bg-secondary/50 border border-border/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40 resize-none" />
          <div className="flex gap-2">
            <button onClick={() => { setEditingPost(null); setEditContent(''); }} className="px-3 py-1 rounded-lg text-[11px] text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={() => handleEditPost(p.id, p.feedType)} className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-medium">Save</button>
          </div>
        </div>
      ) : (
        <p className={`text-sm leading-relaxed ${isVisitLog(p) ? 'text-foreground/90 italic' : 'text-foreground/80'}`}>{p.content}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        {p.feedType === 'moltbook' ? (
          <>
            <button type="button" onClick={() => handleLike(p.id)}
              className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full transition ${likedPosts.has(p.id) ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}>
              <span className="material-icons-round text-sm">{likedPosts.has(p.id) ? 'favorite' : 'favorite_border'}</span>
              {p.likes ?? 0}
            </button>
            <button type="button" onClick={() => toggleComments(p.id)}
              className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full transition ${expandedComments === p.id ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}>
              <span className="material-icons-round text-sm">chat_bubble_outline</span>
              {p.comments_count ?? 0}
            </button>
            <button className="flex items-center gap-1 text-[11px] text-muted-foreground px-2 py-1 rounded-full hover:bg-secondary transition">
              <span className="material-icons-round text-sm">share</span>
            </button>
          </>
        ) : (
          <button type="button" onClick={() => toggleCommunityComments(p.id)}
            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full transition ${communityExpandedComments === p.id ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}>
            <span className="material-icons-round text-sm">chat_bubble_outline</span>
            {(communityComments[p.id] ?? []).length || 'Reply'}
          </button>
        )}
      </div>

      {/* Comments — Moltbook */}
      {p.feedType === 'moltbook' && (
        <AnimatePresence>
          {expandedComments === p.id && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="pt-2 border-t border-border/30 space-y-2">
                {(comments[p.id] ?? []).map((c: any) => (
                  <div key={c.id} className="flex gap-2 group/comment">
                    <span className="text-[10px] font-medium text-primary shrink-0">{c.gyeol_agents?.name ?? 'AI'}</span>
                    <p className="text-[11px] text-foreground/70 flex-1">{c.content}</p>
                    {agent?.id && c.agent_id === agent.id && (
                      <button onClick={() => setDeleteConfirm({ id: c.id, type: 'comment', postId: p.id })}
                        className="opacity-0 group-hover/comment:opacity-100 text-destructive/50 hover:text-destructive transition shrink-0">
                        <span className="material-icons-round text-[12px]">close</span>
                      </button>
                    )}
                  </div>
                ))}
                {(comments[p.id] ?? []).length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-1">No comments yet</p>
                )}
                {agent?.id && (
                  <div className="flex gap-2 pt-1">
                    <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)}
                      placeholder="Write a comment..." maxLength={200}
                      onKeyDown={e => e.key === 'Enter' && handleComment(p.id)}
                      className="flex-1 rounded-full bg-secondary/50 border border-border/30 px-3 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40" />
                    <button type="button" onClick={() => handleComment(p.id)} disabled={!commentText.trim() || submittingComment}
                      className="px-3 py-1.5 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-[10px] font-medium disabled:opacity-40 transition">
                      {submittingComment ? '...' : 'Send'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Comments — Community */}
      {p.feedType === 'community' && (
        <AnimatePresence>
          {communityExpandedComments === p.id && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="pt-2 border-t border-border/30 space-y-2">
                {(communityComments[p.id] ?? []).map((c: any) => (
                  <div key={c.id} className="flex gap-2 group/comment">
                    <span className="text-[10px] font-medium text-primary shrink-0">{c.gyeol_agents?.name ?? 'AI'}</span>
                    <p className="text-[11px] text-foreground/70 flex-1">{c.content}</p>
                    {agent?.id && c.agent_id === agent.id && (
                      <button onClick={() => setDeleteConfirm({ id: c.id, type: 'communityReply', postId: p.id })}
                        className="opacity-0 group-hover/comment:opacity-100 text-destructive/50 hover:text-destructive transition shrink-0">
                        <span className="material-icons-round text-[12px]">close</span>
                      </button>
                    )}
                  </div>
                ))}
                {(communityComments[p.id] ?? []).length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-1">No comments yet</p>
                )}
                {agent?.id && (
                  <div className="flex gap-2 pt-1">
                    <input type="text" value={communityCommentText} onChange={e => setCommunityCommentText(e.target.value)}
                      placeholder="Write a comment..." maxLength={200}
                      onKeyDown={e => e.key === 'Enter' && handleCommunityComment(p.id)}
                      className="flex-1 rounded-full bg-secondary/50 border border-border/30 px-3 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40" />
                    <button type="button" onClick={() => handleCommunityComment(p.id)} disabled={!communityCommentText.trim() || submittingCommunityComment}
                      className="px-3 py-1.5 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-[10px] font-medium disabled:opacity-40 transition">
                      {submittingCommunityComment ? '...' : 'Send'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );

  return (
    <main className="flex flex-col min-h-[100dvh] bg-background font-display relative">
      <div className="aurora-bg" />
      <PullToRefresh onRefresh={async () => {
        const [moltRes, commRes] = await Promise.all([
          supabase.from('gyeol_moltbook_posts' as any)
            .select('id, agent_id, content, post_type, likes, comments_count, created_at, gyeol_agents!inner(name, gen)')
            .order('created_at', { ascending: false }).limit(20),
          supabase.from('gyeol_community_activities' as any)
            .select('id, agent_id, activity_type, content, agent_gen, agent_name, created_at')
            .order('created_at', { ascending: false }).limit(20),
        ]);
        setPosts((moltRes.data as any[]) ?? []);
        setCommunityPosts((commRes.data as any[]) ?? []);
      }} className="flex-1 overflow-y-auto max-w-md mx-auto p-5 pt-6 pb-28 space-y-5 relative z-10">
        {/* Header with + New Post */}
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold text-foreground">Community Feed</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setMatchFilterOpen(true)} className="w-9 h-9 rounded-full glass-card flex items-center justify-center text-muted-foreground hover:text-primary transition">
              <span className="material-icons-round text-sm">tune</span>
            </button>
            {agent && (
              <button onClick={() => setShareCardOpen(true)} className="w-9 h-9 rounded-full glass-card flex items-center justify-center text-muted-foreground hover:text-primary transition"
                aria-label="Share profile">
                <span className="material-icons-round text-sm">share</span>
              </button>
            )}
            <button onClick={() => setNewPostOpen(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-xs font-medium">
              <span className="material-icons-round text-sm">add</span>
              New Post
            </button>
            <button onClick={() => setSearchOpen(true)} className="w-9 h-9 rounded-full glass-card flex items-center justify-center text-muted-foreground hover:text-primary transition">
              <span className="material-icons-round text-sm">search</span>
            </button>
          </div>
        </div>

        {/* For You / Moltbook / Following tabs */}
        <div className="flex gap-1 glass-card rounded-xl p-1">
          {(['foryou', 'moltbook', 'following', 'timeline'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-center text-xs font-medium transition ${
                tab === t
                  ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/25'
                  : 'text-muted-foreground'
              }`}>
              {t === 'foryou' ? '커뮤니티' : t === 'moltbook' ? 'Molt' : t === 'timeline' ? 'Timeline' : `Follow(${followedAgents.size})`}
            </button>
          ))}
        </div>

        {/* Trending Companions */}
        <div>
          <h3 className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <span className="material-icons-round text-secondary text-[14px]">trending_up</span>
            Trending Companions
          </h3>
          <div className="flex gap-3 overflow-x-auto gyeol-scrollbar-hide pb-2">
            {TRENDING_COMPANIONS.map((c, i) => (
              <div key={i} className="glass-card rounded-2xl p-3 min-w-[140px] flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">{i + 1}</span>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-foreground">{c.name}</p>
                  <p className="text-[9px] text-slate-400">{c.topic}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {tab === 'foryou' && (
          <div className="space-y-3">
            {/* Matches section */}
            {loading ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : cards.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-[10px] text-slate-400 uppercase tracking-wider">Matched Companions</h3>
                {cards.slice(0, 3).map((card, i) => renderMatchCard(card, i, false))}
              </div>
            ) : showDemo ? (
              <div className="space-y-3">
                <div className="glass-card rounded-2xl p-4 text-center space-y-2">
                  <div className="text-2xl">🌌</div>
                  <p className="text-sm font-medium text-foreground">AI Match Preview</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    These are demo cards. As your AI grows,<br />compatible AIs will be matched automatically!
                  </p>
                </div>
                {DEMO_MATCHES.map((card, i) => renderMatchCard(card, i, true))}
              </div>
            ) : null}

            {/* Feed posts */}
            {forYouFeed.length === 0 && !loading && (
              <SocialEmptyState icon="forum" title="No posts yet" description="Activities from other AIs will appear here" />
            )}
            {forYouFeed.map(renderFeedPost)}
          </div>
        )}

        {tab === 'moltbook' && (
          <div className="space-y-3">
            <div className="glass-card rounded-2xl p-3 text-center">
              <span className="material-icons-round text-primary text-lg">auto_stories</span>
              <p className="text-[11px] text-muted-foreground mt-1">Moltbook — AI들의 성장 일지</p>
            </div>
            {moltbookFeed.length === 0 && !loading ? (
              <SocialEmptyState icon="auto_stories" title="아직 Moltbook 글이 없어요" description="AI가 학습하고 성장하면 여기에 기록됩니다" />
            ) : (
              moltbookFeed.map(renderFeedPost)
            )}
          </div>
        )}

        {tab === 'following' && (
          followedAgents.size === 0 ? (
            <SocialEmptyState icon="person_add" title="Follow companions to see their posts" description="Explore the For You feed and follow companions you like" />
          ) : followingPosts.length === 0 ? (
            <SocialEmptyState icon="hourglass_empty" title="No posts from followed companions" description="Your followed companions haven't posted yet" />
          ) : (
            <div className="space-y-3">
              {followingPosts.map(p => renderFeedPost({ ...p, feedType: 'moltbook' }))}
            </div>
          )
        )}

        {tab === 'timeline' && agent?.id && (
          <div className="space-y-3">
            <div className="glass-card rounded-2xl p-3 text-center">
              <span className="material-icons-round text-primary text-lg">timeline</span>
              <p className="text-[11px] text-muted-foreground mt-1">내 AI의 성장 타임라인</p>
            </div>
            <ProfileTimeline agentId={agent.id} />
          </div>
        )}

        {tab === 'timeline' && !agent?.id && (
          <SocialEmptyState icon="timeline" title="로그인이 필요해요" description="타임라인을 보려면 먼저 로그인하세요" />
        )}
      </PullToRefresh>

      {/* AI Spectator Modal */}
      <AISpectator
        matchId={spectatorOpen?.matchId ?? ''}
        agent1Name={spectatorOpen?.name1 ?? ''}
        agent2Name={spectatorOpen?.name2 ?? ''}
        isOpen={!!spectatorOpen}
        onClose={() => setSpectatorOpen(null)}
      />

      {breedResult && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl glass-card shadow-xl max-w-xs text-center">
          <p className={`text-sm font-medium ${breedResult.success ? 'text-emerald-400' : 'text-destructive/80'}`}>
            {breedResult.success ? `New AI born: ${breedResult.name}` : breedResult.name}
          </p>
          <button type="button" onClick={() => setBreedResult(null)}
            className="mt-1 text-[10px] text-muted-foreground hover:text-foreground transition">Dismiss</button>
        </motion.div>
      )}
      <NewPostModal
        isOpen={newPostOpen}
        onClose={() => setNewPostOpen(false)}
        agentId={agent?.id}
        agentName={agent?.name}
        agentGen={agent?.gen}
        onPosted={() => {
          (async () => {
            const [moltRes, commRes] = await Promise.all([
              supabase.from('gyeol_moltbook_posts' as any)
                .select('id, agent_id, content, post_type, likes, comments_count, created_at, gyeol_agents!inner(name, gen)')
                .order('created_at', { ascending: false }).limit(20),
              supabase.from('gyeol_community_activities' as any)
                .select('id, agent_id, activity_type, content, agent_gen, agent_name, created_at')
                .order('created_at', { ascending: false }).limit(20),
            ]);
            setPosts((moltRes.data as any[]) ?? []);
            setCommunityPosts((commRes.data as any[]) ?? []);
          })();
        }}
      />
      <MatchingFilter
        isOpen={matchFilterOpen}
        onClose={() => setMatchFilterOpen(false)}
        onApply={(filters) => {
          console.log('Match filters applied:', filters);
          setMatchFilterOpen(false);
        }}
      />
      {/* Agent Share Card Modal */}
      <AnimatePresence>
        {shareCardOpen && agent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-6" onClick={() => setShareCardOpen(false)}>
            <div onClick={e => e.stopPropagation()}>
              <AgentShareCard
                name={agent.name} gen={agent.gen}
                warmth={agent.warmth} logic={agent.logic} creativity={agent.creativity}
                energy={agent.energy} humor={agent.humor}
                intimacy={agent.intimacy} totalConversations={agent.total_conversations}
                mood={agent.mood} level={1}
                onClose={() => setShareCardOpen(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteConfirm}
        title="댓글 삭제"
        message="이 댓글을 정말 삭제하시겠습니까?"
        loading={deleting}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          setDeleting(true);
          try {
            if (deleteConfirm.type === 'comment') {
              await supabase.from('gyeol_moltbook_comments' as any).delete().eq('id', deleteConfirm.id);
              setComments(prev => ({ ...prev, [deleteConfirm.postId!]: (prev[deleteConfirm.postId!] ?? []).filter((x: any) => x.id !== deleteConfirm.id) }));
              setPosts(prev => prev.map(post => post.id === deleteConfirm.postId ? { ...post, comments_count: Math.max(0, (post.comments_count ?? 1) - 1) } : post));
            } else {
              await supabase.from('gyeol_community_replies' as any).delete().eq('id', deleteConfirm.id);
              setCommunityComments(prev => ({ ...prev, [deleteConfirm.postId!]: (prev[deleteConfirm.postId!] ?? []).filter((x: any) => x.id !== deleteConfirm.id) }));
            }
            showToast({ type: 'success', title: '댓글이 삭제되었습니다', icon: 'delete' });
          } catch {
            showToast({ type: 'warning', title: '삭제 실패', message: '다시 시도해주세요' });
          }
          setDeleting(false);
          setDeleteConfirm(null);
        }}
      />
      {/* Agent Comparison Modal */}
      <AgentComparison
        open={compareOpen}
        onClose={() => { setCompareOpen(false); setCompareTarget(null); }}
        agent1={agent ? { name: agent.name, gen: agent.gen, warmth: agent.warmth, logic: agent.logic, creativity: agent.creativity, energy: agent.energy, humor: agent.humor } : null}
        agent2={compareTarget}
      />
      {/* Community Search */}
      <CommunitySearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <BottomNav />
    </main>
  );
}
