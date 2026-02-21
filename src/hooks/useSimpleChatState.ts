import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import type { Message } from '@/lib/gyeol/types';
import { useGyeolStore } from '@/store/gyeol-store';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { speakText, stopSpeaking } from '@/lib/gyeol/tts';
import { supabase } from '@/src/lib/supabase';
import { format, isToday, isYesterday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { saveSummaryToHistory } from '@/src/components/SummaryHistory';

const TRANSLATE_LANGS = [
  { code: 'ko', label: '한국어' }, { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' }, { code: 'zh', label: '中文' },
  { code: 'es', label: 'Español' }, { code: 'fr', label: 'Français' },
];

export { TRANSLATE_LANGS };

export function useSimpleChatState() {
  const { agent } = useInitAgent();
  const { messages, sendMessage, isLoading, error, setError, lastReaction, addMessage, setMessages } = useGyeolStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const settings = (agent?.settings as any) ?? {};
  const fontSize = settings.fontSize ?? 18;
  const autoTTS = settings.autoTTS === true;
  const hasCharacter = settings.characterPreset != null;

  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const [convListOpen, setConvListOpen] = useState(false);
  const [translatePickerFor, setTranslatePickerFor] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('gyeol_bookmarks') ?? '[]')); } catch { return new Set(); }
  });
  const [pinnedMessages, setPinnedMessages] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('gyeol_pinned') ?? '[]')); } catch { return new Set(); }
  });
  const [tags, setTags] = useState<Record<string, string[]>>(() => {
    try { return JSON.parse(localStorage.getItem('gyeol_tags') ?? '{}'); } catch { return {}; }
  });
  const [tagInput, setTagInput] = useState<string | null>(null);
  const [tagText, setTagText] = useState('');
  const [editingMsg, setEditingMsg] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editedMessages, setEditedMessages] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('gyeol_edited') ?? '[]')); } catch { return new Set(); }
  });
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [summaryHistoryOpen, setSummaryHistoryOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [voiceMessages, setVoiceMessages] = useState<Record<string, { url: string; duration: number }>>({});
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [selectedModel, setSelectedModel] = useState('default');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showTokenUsage, setShowTokenUsage] = useState(false);
  const [replyMap, setReplyMap] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('gyeol_replies') ?? '{}'); } catch { return {}; }
  });
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showProviderPanel, setShowProviderPanel] = useState(false);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showTTSSettings, setShowTTSSettings] = useState(false);
  const [continuousVoice, setContinuousVoice] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{ dateFrom?: string; dateTo?: string; tags: string[]; keyword: string }>({ tags: [], keyword: '' });

  const allTags = useMemo(() => {
    const s = new Set<string>();
    Object.values(tags).forEach(arr => arr.forEach(t => s.add(t)));
    return [...s];
  }, [tags]);

  const toggleBookmark = (msgId: string) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId); else next.add(msgId);
      localStorage.setItem('gyeol_bookmarks', JSON.stringify([...next]));
      return next;
    });
  };

  const togglePin = (msgId: string) => {
    setPinnedMessages(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId); else next.add(msgId);
      localStorage.setItem('gyeol_pinned', JSON.stringify([...next]));
      return next;
    });
    if (!msgId.startsWith('local-')) {
      supabase.from('gyeol_conversations' as any).update({ is_pinned: !pinnedMessages.has(msgId) } as any).eq('id', msgId);
    }
  };

  const addTag = (msgId: string, tag: string) => {
    if (!tag.trim()) return;
    setTags(prev => {
      const existing = prev[msgId] ?? [];
      if (existing.includes(tag.trim())) return prev;
      const next = { ...prev, [msgId]: [...existing, tag.trim()] };
      localStorage.setItem('gyeol_tags', JSON.stringify(next));
      return next;
    });
    setTagInput(null); setTagText('');
  };

  const removeTag = (msgId: string, tag: string) => {
    setTags(prev => {
      const next = { ...prev, [msgId]: (prev[msgId] ?? []).filter(t => t !== tag) };
      localStorage.setItem('gyeol_tags', JSON.stringify(next));
      return next;
    });
  };

  const handleEditMessage = async (msgId: string) => {
    if (!editText.trim()) return;
    setMessages((prev: Message[]) => prev.map(m => m.id === msgId ? { ...m, content: editText.trim() } : m));
    setEditedMessages(prev => {
      const next = new Set(prev);
      next.add(msgId);
      localStorage.setItem('gyeol_edited', JSON.stringify([...next]));
      return next;
    });
    if (!msgId.startsWith('local-')) {
      await supabase.from('gyeol_conversations' as any).update({ content: editText.trim(), is_edited: true } as any).eq('id', msgId);
    }
    setEditingMsg(null); setEditText('');
  };

  const handleReaction = (msgId: string, emoji: string) => {
    setReactions(prev => ({ ...prev, [msgId]: emoji }));
    if (!msgId.startsWith('local-')) {
      supabase.from('gyeol_conversations' as any).update({ reactions: { [emoji]: 1 } } as any).eq('id', msgId);
    }
  };

  const handleTranslate = async (msgId: string, text: string, lang: string) => {
    setTranslatePickerFor(null);
    setTranslating(msgId);
    try {
      const { data } = await supabase.functions.invoke('translate', {
        body: { text, targetLang: lang },
      });
      if (data?.translated) {
        setTranslations(prev => ({ ...prev, [msgId]: data.translated }));
      }
    } catch (e) { console.error('translate failed', e); }
    setTranslating(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileDrop = (file: File) => {
    if (file.size > 10 * 1024 * 1024) return;
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setAttachedFile(file);
    }
  };

  const handleSendImage = async () => {
    if (!imagePreview || !agent?.id) return;
    const imgMsg = `[이미지 Send] 📷`;
    setImagePreview(null);
    await sendMessage(imgMsg);
  };

  const handleSummarize = async () => {
    if (!agent?.id || summarizing) return;
    setSummarizing(true);
    setSummaryOpen(true);
    setSummaryText('');
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const { data } = await supabase.functions.invoke('summarize', {
        body: { agentId: agent.id, limit: 50 },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (data?.summary) {
        setSummaryText(data.summary);
        saveSummaryToHistory(agent.id, data.summary, messages.length);
      } else setSummaryText('Could not generate summary.');
    } catch {
      setSummaryText('Error generating summary.');
    }
    setSummarizing(false);
  };

  const [isDark, setIsDark] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : true
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const h = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!agent?.id) return;
    const channel = supabase
      .channel(`simple-proactive-${agent.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'gyeol_conversations',
        filter: `agent_id=eq.${agent.id}`,
      }, (payload: any) => {
        const row = payload.new;
        if (row.role === 'assistant') {
          const exists = useGyeolStore.getState().messages.some((m: any) => m.id === row.id);
          if (!exists) {
            addMessage(row);
            if (autoTTS) speakText(row.content, settings.readSpeed ?? 0.95);
          }
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [agent?.id, autoTTS]);

  useEffect(() => {
    if (!autoTTS || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role === 'assistant') {
      speakText(last.content, settings.readSpeed ?? 0.95);
    }
  }, [messages.length]);

  const agentName = agent?.name ?? 'GYEOL';

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading || !agent?.id) return;
    setInput('');
    stopSpeaking();

    if (attachedFile) {
      const fileInfo = `[📎 ${attachedFile.name} (${(attachedFile.size / 1024).toFixed(1)}KB)]`;
      setAttachedFile(null);
      await sendMessage(fileInfo + '\n' + text);
      return;
    }

    const prefix = replyTo ? `[↩ ${replyTo.role === 'user' ? 'You' : agentName}: "${replyTo.content.slice(0, 40)}..."]\n` : '';
    if (replyTo) {
      const localId = `pending-reply-${Date.now()}`;
      setReplyMap(prev => {
        const next = { ...prev, [localId]: replyTo.id };
        localStorage.setItem('gyeol_replies', JSON.stringify(next));
        return next;
      });
      setReplyTo(null);
    }
    await sendMessage(prefix + text);
  };

  const handleDeleteMessage = (msgId: string) => {
    setMessages((prev: Message[]) => prev.filter(m => m.id !== msgId));
  };

  const handleResendMessage = async (content: string) => {
    if (isLoading || !agent?.id) return;
    await sendMessage(content);
  };

  const intimacy = (agent as any)?.intimacy ?? 0;
  const intimacyLevel = intimacy < 10 ? 'Stranger' : intimacy < 20 ? 'Acquaintance' : intimacy < 30 ? 'Casual' : intimacy < 40 ? 'Friend' : intimacy < 50 ? 'Good Friend' : intimacy < 60 ? 'Close Friend' : intimacy < 70 ? 'Bestie' : intimacy < 80 ? 'Soulmate' : intimacy < 90 ? 'Family' : 'Inseparable';
  const intimacyEmoji = intimacy < 10 ? '🤝' : intimacy < 20 ? '👋' : intimacy < 30 ? '😊' : intimacy < 40 ? '💕' : intimacy < 50 ? '💖' : intimacy < 60 ? '💗' : intimacy < 70 ? '💞' : intimacy < 80 ? '💘' : intimacy < 90 ? '👨‍👩‍👧' : '💫';

  const getDateLabel = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return '오늘';
    if (isYesterday(d)) return '어제';
    return format(d, 'M월 d일 (EEE)', { locale: ko });
  }, []);

  const filteredMessages = useMemo(() => {
    let filtered = messages;
    if (activeFilters.keyword) {
      const kw = activeFilters.keyword.toLowerCase();
      filtered = filtered.filter(m => m.content.toLowerCase().includes(kw));
    }
    if (activeFilters.tags.length > 0) {
      filtered = filtered.filter(m => {
        const msgTags = tags[m.id] ?? [];
        return activeFilters.tags.some(t => msgTags.includes(t));
      });
    }
    if (activeFilters.dateFrom) {
      filtered = filtered.filter(m => m.created_at >= activeFilters.dateFrom!);
    }
    if (activeFilters.dateTo) {
      filtered = filtered.filter(m => m.created_at <= activeFilters.dateTo! + 'T23:59:59');
    }
    return filtered;
  }, [messages, activeFilters, tags]);

  const groupedMessages = filteredMessages.reduce<{ date: string; label: string; msgs: Message[] }[]>((acc, msg) => {
    const dateKey = format(new Date(msg.created_at), 'yyyy-MM-dd');
    const last = acc[acc.length - 1];
    if (last && last.date === dateKey) {
      last.msgs.push(msg);
    } else {
      acc.push({ date: dateKey, label: getDateLabel(msg.created_at), msgs: [msg] });
    }
    return acc;
  }, []);

  return {
    agent, messages, isLoading, error, setError, lastReaction,
    input, setInput, messagesEndRef, settings, fontSize, autoTTS, hasCharacter,
    reactions, reactionPickerFor, setReactionPickerFor,
    convListOpen, setConvListOpen,
    translatePickerFor, setTranslatePickerFor, translations, translating,
    imagePreview, setImagePreview, imageInputRef,
    bookmarks, pinnedMessages, tags, tagInput, setTagInput, tagText, setTagText,
    editingMsg, setEditingMsg, editText, setEditText, editedMessages,
    summaryOpen, setSummaryOpen, summaryText, summarizing, summaryHistoryOpen, setSummaryHistoryOpen,
    statsOpen, setStatsOpen, shareOpen, setShareOpen, exportOpen, setExportOpen,
    voiceMessages, setVoiceMessages, replyTo, setReplyTo,
    selectedModel, setSelectedModel, showModelSelector, setShowModelSelector,
    showTokenUsage, setShowTokenUsage, replyMap,
    attachedFile, setAttachedFile, searchOpen, setSearchOpen,
    showProviderPanel, setShowProviderPanel, maxTokens, setMaxTokens,
    showSystemPrompt, setShowSystemPrompt, showTTSSettings, setShowTTSSettings,
    continuousVoice, setContinuousVoice, activeFilters, setActiveFilters,
    allTags, toggleBookmark, togglePin, addTag, removeTag,
    handleEditMessage, handleReaction, handleTranslate,
    handleImageSelect, handleFileDrop, handleSendImage, handleSummarize,
    handleSend, handleDeleteMessage, handleResendMessage,
    isDark, intimacy, intimacyLevel, intimacyEmoji,
    agentName, filteredMessages, groupedMessages, sendMessage,
  };
}

export type SimpleChatState = ReturnType<typeof useSimpleChatState>;
