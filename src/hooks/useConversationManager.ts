import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';

export interface ConversationMeta {
  id: string;
  agent_id: string;
  is_pinned: boolean;
  is_archived: boolean;
  tags: string[];
  reply_to_id: string | null;
  read_at: string | null;
  created_at: string;
  content: string;
  role: string;
}

export function useConversationManager(agentId?: string) {
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [filter, setFilter] = useState<{ dateFrom?: string; dateTo?: string; tags?: string[]; keyword?: string }>({});
  const [archivedView, setArchivedView] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!agentId) return;
    const baseQuery = supabase
      .from('gyeol_conversations')
      .select('id, agent_id, content, role, created_at, is_pinned, is_archived, tags, reply_to_id, read_at')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(100) as any;
    const { data } = archivedView
      ? await baseQuery.eq('is_archived', true)
      : await baseQuery.or('is_archived.is.null,is_archived.eq.false');
    if (data) setConversations(data as any);
  }, [agentId, archivedView]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const togglePin = useCallback(async (msgId: string) => {
    const msg = conversations.find(c => c.id === msgId);
    if (!msg) return;
    const pinnedCount = conversations.filter(c => c.is_pinned).length;
    if (!msg.is_pinned && pinnedCount >= 5) return;
    await supabase.from('gyeol_conversations').update({ is_pinned: !msg.is_pinned }).eq('id', msgId);
    setConversations(prev => prev.map(c => c.id === msgId ? { ...c, is_pinned: !c.is_pinned } : c));
  }, [conversations]);

  const toggleArchive = useCallback(async (msgId: string) => {
    const msg = conversations.find(c => c.id === msgId);
    if (!msg) return;
    await supabase.from('gyeol_conversations').update({ is_archived: !msg.is_archived }).eq('id', msgId);
    setConversations(prev => prev.filter(c => c.id !== msgId));
  }, [conversations]);

  const addTag = useCallback(async (msgId: string, tag: string) => {
    const msg = conversations.find(c => c.id === msgId);
    if (!msg) return;
    const newTags = [...(msg.tags ?? []), tag].filter((v, i, a) => a.indexOf(v) === i);
    await supabase.from('gyeol_conversations').update({ tags: newTags }).eq('id', msgId);
    setConversations(prev => prev.map(c => c.id === msgId ? { ...c, tags: newTags } : c));
  }, [conversations]);

  const removeTag = useCallback(async (msgId: string, tag: string) => {
    const msg = conversations.find(c => c.id === msgId);
    if (!msg) return;
    const newTags = (msg.tags ?? []).filter(t => t !== tag);
    await supabase.from('gyeol_conversations').update({ tags: newTags }).eq('id', msgId);
    setConversations(prev => prev.map(c => c.id === msgId ? { ...c, tags: newTags } : c));
  }, [conversations]);

  const markRead = useCallback(async (msgId: string) => {
    await supabase.from('gyeol_conversations').update({ read_at: new Date().toISOString() }).eq('id', msgId);
    setConversations(prev => prev.map(c => c.id === msgId ? { ...c, read_at: new Date().toISOString() } : c));
  }, []);

  const filteredConversations = conversations.filter(c => {
    if (filter.keyword && !c.content.toLowerCase().includes(filter.keyword.toLowerCase())) return false;
    if (filter.tags?.length && !filter.tags.some(t => (c.tags ?? []).includes(t))) return false;
    if (filter.dateFrom && c.created_at < filter.dateFrom) return false;
    if (filter.dateTo && c.created_at > filter.dateTo) return false;
    return true;
  });

  return {
    conversations: filteredConversations,
    filter, setFilter,
    archivedView, setArchivedView,
    togglePin, toggleArchive,
    addTag, removeTag, markRead,
    reload: loadConversations,
  };
}
