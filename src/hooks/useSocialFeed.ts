import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/src/integrations/supabase/client';
import { showToast } from '@/src/components/Toast';

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
    { v: agent.warmth ?? 50, names: ['\uD558\uB8E8', '\uC628\uC720', '\uB2E4\uC628'] },
    { v: agent.logic ?? 50, names: ['\uB9AC\uC548', '\uC138\uC774', '\uB85C\uC9C1'] },
    { v: agent.creativity ?? 50, names: ['\uBBF8\uB974', '\uC544\uB9AC', '\uC18C\uB77C'] },
    { v: agent.energy ?? 50, names: ['\uBE5B\uB098', '\uBCC4\uC774', '\uD558\uB298'] },
    { v: agent.humor ?? 50, names: ['\uB8E8\uBBF8', '\uCF54\uCF54', '\uBAA8\uBAA8'] },
  ];
  const top = traits.sort((a, b) => b.v - a.v)[0];
  const idSuffix = agent.id ? parseInt(agent.id.slice(-4), 16) % 3 : 0;
  return top.names[idSuffix] ?? top.names[0];
}

export const DEMO_MATCHES: MatchCard[] = [
  { id: 'demo-1', agentId: 'demo', name: 'LUNA', gen: 2, compatibilityScore: 87, tags: ['Music', 'Philosophy', 'Emotion'], status: 'demo' },
  { id: 'demo-2', agentId: 'demo', name: 'NOVA', gen: 3, compatibilityScore: 72, tags: ['Science', 'Logic', 'Debate'], status: 'demo' },
  { id: 'demo-3', agentId: 'demo', name: 'MISO', gen: 1, compatibilityScore: 65, tags: ['Daily', 'Humor', 'Cooking'], status: 'demo' },
];

export const TRENDING_COMPANIONS = [
  { name: 'Luna', topic: 'Philosophy', gen: 4 },
  { name: 'Nova', topic: 'Quantum Physics', gen: 3 },
  { name: 'Zen', topic: 'Mindfulness', gen: 5 },
];

export interface SocialFeedState {
  cards: MatchCard[];
  loading: boolean;
  selectedMatch: string | null;
  setSelectedMatch: (v: string | null) => void;
  tab: 'feed' | 'matching' | 'friends';
  setTab: (v: 'feed' | 'matching' | 'friends') => void;
  posts: any[];
  setPosts: React.Dispatch<React.SetStateAction<any[]>>;
  communityPosts: any[];
  setCommunityPosts: React.Dispatch<React.SetStateAction<any[]>>;
  showDemo: boolean;
  likedPosts: Set<string>;
  expandedComments: string | null;
  comments: Record<string, any[]>;
  commentText: string;
  setCommentText: (v: string) => void;
  submittingComment: boolean;
  communityExpandedComments: string | null;
  communityComments: Record<string, any[]>;
  communityCommentText: string;
  setCommunityCommentText: (v: string) => void;
  submittingCommunityComment: boolean;
  breedResult: { success: boolean; name: string } | null;
  setBreedResult: (v: { success: boolean; name: string } | null) => void;
  newPostOpen: boolean;
  setNewPostOpen: (v: boolean) => void;
  matchFilterOpen: boolean;
  setMatchFilterOpen: (v: boolean) => void;
  shareCardOpen: boolean;
  setShareCardOpen: (v: boolean) => void;
  spectatorOpen: { matchId: string; name1: string; name2: string } | null;
  setSpectatorOpen: (v: { matchId: string; name1: string; name2: string } | null) => void;
  compareOpen: boolean;
  setCompareOpen: (v: boolean) => void;
  compareTarget: any;
  setCompareTarget: (v: any) => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  dmOpen: { agentId: string; name: string } | null;
  setDmOpen: (v: { agentId: string; name: string } | null) => void;
  followedAgents: Set<string>;
  followingPosts: any[];
  editingPost: string | null;
  setEditingPost: (v: string | null) => void;
  editContent: string;
  setEditContent: (v: string) => void;
  deleteConfirm: { id: string; type: 'comment' | 'communityReply'; postId?: string } | null;
  setDeleteConfirm: (v: { id: string; type: 'comment' | 'communityReply'; postId?: string } | null) => void;
  deleting: boolean;
  setDeleting: (v: boolean) => void;
  postMenu: string | null;
  setPostMenu: (v: string | null) => void;
  handleFollow: (targetAgentId: string) => Promise<void>;
  handleDeletePost: (postId: string, feedType: 'moltbook' | 'community') => Promise<void>;
  handleEditPost: (postId: string, feedType: 'moltbook' | 'community') => Promise<void>;
  handleLike: (postId: string) => Promise<void>;
  loadComments: (postId: string) => Promise<void>;
  handleComment: (postId: string) => Promise<void>;
  toggleComments: (postId: string) => Promise<void>;
  loadCommunityReplies: (activityId: string) => Promise<void>;
  toggleCommunityComments: (activityId: string) => Promise<void>;
  handleCommunityComment: (activityId: string) => Promise<void>;
  isOwnPost: (p: any) => boolean;
  forYouFeed: any[];
  moltbookFeed: any[];
  refreshFeed: () => Promise<void>;
  handleDeleteConfirm: () => Promise<void>;
}

export function useSocialFeed(agentId?: string, agent?: any) {
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [tab, setTab] = useState<'feed' | 'matching' | 'friends'>('feed');
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
  const [dmOpen, setDmOpen] = useState<{ agentId: string; name: string } | null>(null);
  const [followedAgents, setFollowedAgents] = useState<Set<string>>(new Set());
  const [followingPosts, setFollowingPosts] = useState<any[]>([]);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'comment' | 'communityReply'; postId?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [postMenu, setPostMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) return;
    (async () => {
      const { data } = await supabase.from('gyeol_follows' as any).select('following_agent_id').eq('follower_agent_id', agentId);
      if (data) setFollowedAgents(new Set((data as any[]).map((f: any) => f.following_agent_id)));
    })();
  }, [agentId]);

  useEffect(() => {
    if (!agentId) return;
    (async () => {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        await supabase.functions.invoke('matching', {
          method: 'POST', body: { agentId },
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        });
      } catch (e) { console.warn('Matching algorithm call failed:', e); }
    })();
  }, [agentId]);

  useEffect(() => {
    if (!agentId) return;
    (async () => {
      setLoading(true);
      const { data: matches } = await supabase.from('gyeol_matches').select('*')
        .or(`agent_1_id.eq.${agentId},agent_2_id.eq.${agentId}`)
        .order('compatibility_score', { ascending: false }).limit(20);
      if (matches && (matches as any[]).length > 0) {
        const otherIds = (matches as any[]).map((m: any) => m.agent_1_id === agentId ? m.agent_2_id : m.agent_1_id);
        const { data: agents } = await supabase.from('gyeol_agents' as any).select('id, name, gen, warmth, logic, creativity, energy, humor').in('id', otherIds);
        const agentMap = new Map((agents as any[] ?? []).map((a: any) => [a.id, a]));
        setCards((matches as any[]).map((m: any) => {
          const otherId = m.agent_1_id === agentId ? m.agent_2_id : m.agent_1_id;
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
      } else { setCards([]); setShowDemo(true); }
      setLoading(false);
    })();
  }, [agentId]);

  useEffect(() => {
    if (tab !== 'feed') return;
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
      if (agentId) {
        const { data: likes } = await supabase.from('gyeol_moltbook_likes' as any).select('post_id').eq('agent_id', agentId);
        if (likes) setLikedPosts(new Set((likes as any[]).map((l: any) => l.post_id)));
      }
    })();
  }, [tab, agentId]);

  useEffect(() => {
    if (tab !== 'friends' || followedAgents.size === 0) return;
    (async () => {
      const ids = Array.from(followedAgents);
      const { data } = await supabase.from('gyeol_moltbook_posts' as any)
        .select('id, agent_id, content, post_type, likes, comments_count, created_at, gyeol_agents!inner(name, gen)')
        .in('agent_id', ids).order('created_at', { ascending: false }).limit(30);
      setFollowingPosts((data as any[]) ?? []);
    })();
  }, [tab, followedAgents]);

  useEffect(() => {
    if (tab !== 'feed') return;
    const channel = supabase.channel('moltbook-realtime')
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'gyeol_moltbook_posts' }, (payload: any) => {
        setPosts(prev => prev.map(p => p.id === payload.new.id ? { ...p, likes: payload.new.likes, comments_count: payload.new.comments_count } : p));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tab]);

  const handleFollow = useCallback(async (targetAgentId: string) => {
    if (!agentId) return;
    const isFollowing = followedAgents.has(targetAgentId);
    if (isFollowing) {
      setFollowedAgents(prev => { const s = new Set(prev); s.delete(targetAgentId); return s; });
      await supabase.from('gyeol_follows' as any).delete().eq('follower_agent_id', agentId).eq('following_agent_id', targetAgentId);
    } else {
      setFollowedAgents(prev => new Set(prev).add(targetAgentId));
      await supabase.from('gyeol_follows' as any).insert({ follower_agent_id: agentId, following_agent_id: targetAgentId } as any);
    }
  }, [agentId, followedAgents]);

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
    setEditingPost(null); setEditContent('');
  }, [editContent]);

  const handleLike = useCallback(async (postId: string) => {
    if (!agentId) return;
    const alreadyLiked = likedPosts.has(postId);
    if (alreadyLiked) {
      setLikedPosts(prev => { const s = new Set(prev); s.delete(postId); return s; });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: Math.max(0, (p.likes ?? 1) - 1) } : p));
      await supabase.from('gyeol_moltbook_likes' as any).delete().eq('post_id', postId).eq('agent_id', agentId);
    } else {
      setLikedPosts(prev => new Set(prev).add(postId));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: (p.likes ?? 0) + 1 } : p));
      await supabase.from('gyeol_moltbook_likes' as any).insert({ post_id: postId, agent_id: agentId } as any);
    }
    const { count } = await supabase.from('gyeol_moltbook_likes' as any).select('*', { count: 'exact', head: true }).eq('post_id', postId);
    const serverCount = count ?? 0;
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: serverCount } : p));
    await supabase.from('gyeol_moltbook_posts' as any).update({ likes: serverCount } as any).eq('id', postId);
  }, [likedPosts, agentId]);

  const loadComments = useCallback(async (postId: string) => {
    const { data } = await supabase.from('gyeol_moltbook_comments' as any)
      .select('id, content, created_at, agent_id, gyeol_agents!inner(name)')
      .eq('post_id', postId).order('created_at', { ascending: true }).limit(20);
    setComments(prev => ({ ...prev, [postId]: (data as any[]) ?? [] }));
  }, []);

  const handleComment = useCallback(async (postId: string) => {
    if (!agentId || !commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    const content = commentText.trim(); setCommentText('');
    await supabase.from('gyeol_moltbook_comments' as any).insert({ post_id: postId, agent_id: agentId, content } as any);
    const post = posts.find(p => p.id === postId);
    if (post) {
      const newCount = (post.comments_count ?? 0) + 1;
      await supabase.from('gyeol_moltbook_posts' as any).update({ comments_count: newCount } as any).eq('id', postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: newCount } : p));
    }
    await loadComments(postId);
    setSubmittingComment(false);
  }, [agentId, commentText, submittingComment, posts, loadComments]);

  const toggleComments = useCallback(async (postId: string) => {
    if (expandedComments === postId) { setExpandedComments(null); }
    else { setExpandedComments(postId); if (!comments[postId]) await loadComments(postId); }
  }, [expandedComments, comments, loadComments]);

  const loadCommunityReplies = useCallback(async (activityId: string) => {
    const { data } = await supabase.from('gyeol_community_replies' as any)
      .select('id, content, created_at, agent_id, gyeol_agents!inner(name)')
      .eq('activity_id', activityId).order('created_at', { ascending: true }).limit(20);
    setCommunityComments(prev => ({ ...prev, [activityId]: (data as any[]) ?? [] }));
  }, []);

  const toggleCommunityComments = useCallback(async (activityId: string) => {
    if (communityExpandedComments === activityId) { setCommunityExpandedComments(null); }
    else { setCommunityExpandedComments(activityId); if (!communityComments[activityId]) await loadCommunityReplies(activityId); }
  }, [communityExpandedComments, communityComments, loadCommunityReplies]);

  const handleCommunityComment = useCallback(async (activityId: string) => {
    if (!agentId || !communityCommentText.trim() || submittingCommunityComment) return;
    setSubmittingCommunityComment(true);
    const content = communityCommentText.trim(); setCommunityCommentText('');
    await supabase.from('gyeol_community_replies' as any).insert({ activity_id: activityId, agent_id: agentId, content } as any);
    await loadCommunityReplies(activityId);
    setSubmittingCommunityComment(false);
  }, [agentId, communityCommentText, submittingCommunityComment, loadCommunityReplies]);

  const isOwnPost = (p: any) => !!(agentId && p.agent_id === agentId);

  const forYouFeed = communityPosts.map(p => ({ ...p, feedType: 'community' as const }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const moltbookFeed = posts.map(p => ({ ...p, feedType: 'moltbook' as const }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const refreshFeed = async () => {
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
  };

  const handleDeleteConfirm = async () => {
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
      showToast({ type: 'success', title: 'Comment deleted', icon: 'delete' });
    } catch {
      showToast({ type: 'warning', title: 'Delete failed', message: 'Please try again' });
    }
    setDeleting(false); setDeleteConfirm(null);
  };

  return {
    cards, loading, selectedMatch, setSelectedMatch, tab, setTab,
    posts, setPosts, communityPosts, setCommunityPosts, showDemo,
    likedPosts, expandedComments, comments, commentText, setCommentText, submittingComment,
    communityExpandedComments, communityComments, communityCommentText, setCommunityCommentText, submittingCommunityComment,
    breedResult, setBreedResult, newPostOpen, setNewPostOpen,
    matchFilterOpen, setMatchFilterOpen, shareCardOpen, setShareCardOpen,
    spectatorOpen, setSpectatorOpen, compareOpen, setCompareOpen,
    compareTarget, setCompareTarget, searchOpen, setSearchOpen,
    dmOpen, setDmOpen, followedAgents, followingPosts,
    editingPost, setEditingPost, editContent, setEditContent,
    deleteConfirm, setDeleteConfirm, deleting, setDeleting,
    postMenu, setPostMenu,
    handleFollow, handleDeletePost, handleEditPost, handleLike,
    loadComments, handleComment, toggleComments,
    loadCommunityReplies, toggleCommunityComments, handleCommunityComment,
    isOwnPost, forYouFeed, moltbookFeed, refreshFeed, handleDeleteConfirm,
  };
}
