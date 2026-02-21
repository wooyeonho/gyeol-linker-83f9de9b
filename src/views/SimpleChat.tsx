import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import type { Message } from '@/lib/gyeol/types';
import { useNavigate } from 'react-router-dom';
import { useGyeolStore } from '@/store/gyeol-store';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { AnimatedCharacter } from '@/src/components/AnimatedCharacter';
import { VoiceInput } from '@/components/VoiceInput';
import { EvolutionCeremony } from '@/src/components/evolution/EvolutionCeremony';
import { speakText, stopSpeaking } from '@/lib/gyeol/tts';
import { supabase } from '@/src/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import { ko } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ConversationList } from '@/src/components/ConversationList';
import { StreakBonus } from '@/src/components/StreakBonus';
import { SummaryHistory, saveSummaryToHistory } from '@/src/components/SummaryHistory';
import { ConversationStats } from '@/src/components/ConversationStats';
import { ConversationShare } from '@/src/components/ConversationShare';
import { ConversationExport } from '@/src/components/ConversationExport';
import { ReplyPreview, ReplyBubble } from '@/src/components/MessageReply';
import { ImageMessage } from '@/src/components/ImageMessage';
import { VoiceRecorder, AudioMessage } from '@/src/components/VoiceRecorder';
import { TypingIndicator } from '@/src/components/TypingIndicator';
import { FileDropZone, FileAttachmentPreview } from '@/src/components/FileDropZone';
import { LinkPreview, extractUrls } from '@/src/components/LinkPreview';
import { ReadReceipt } from '@/src/components/ReadReceipt';
import { TokenUsageDisplay, TokenLimitSlider } from '@/src/components/TokenUsageDisplay';
import { ModelSelector, ProviderComparison, ApiUsageDashboard } from '@/src/components/ModelSelector';
import { MessageReactions } from '@/src/components/MessageReactions';
import { ConversationFilter } from '@/src/components/ConversationFilter';
import { ContinuousVoiceInput, TTSVoiceSelector } from '@/src/components/ContinuousVoiceInput';
import { SystemPromptEditor } from '@/src/components/SystemPromptEditor';
import { ChatSearch } from '@/src/components/ChatSearch';

const REACTIONS = ['\u2764\ufe0f', '\ud83d\udc4d', '\ud83d\ude02', '\ud83e\udd14', '\ud83d\ude22', '\ud83d\udd25'];
const TRANSLATE_LANGS = [
  { code: 'ko', label: '\ud55c\uad6d\uc5b4' }, { code: 'en', label: 'English' },
  { code: 'ja', label: '\u65e5\u672c\u8a9e' }, { code: 'zh', label: '\u4e2d\u6587' },
  { code: 'es', label: 'Espa\u00f1ol' }, { code: 'fr', label: 'Fran\u00e7ais' },
];

function CodeBlockCopy({ children, className }: any) {
  const code = String(children).replace(/\n$/, '');
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group/code">
      <pre className={className}><code>{children}</code></pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-1 right-1 opacity-0 group-hover/code:opacity-100 transition text-[9px] px-2 py-1 rounded-md bg-primary/20 text-primary hover:bg-primary/30"
      >{copied ? '\u2713' : 'Copy'}</button>
    </div>
  );
}

export default function SimpleChat() {
  const navigate = useNavigate();
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
    const imgMsg = `[\uc774\ubbf8\uc9c0 \uc804\uc1a1] \ud83d\udcf7`;
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

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading || !agent?.id) return;
    setInput('');
    stopSpeaking();

    if (attachedFile) {
      const fileInfo = `[\ud83d\udcce ${attachedFile.name} (${(attachedFile.size / 1024).toFixed(1)}KB)]`;
      setAttachedFile(null);
      await sendMessage(fileInfo + '\n' + text);
      return;
    }

    const prefix = replyTo ? `[\u21a9 ${replyTo.role === 'user' ? 'You' : agentName}: "${replyTo.content.slice(0, 40)}..."]\n` : '';
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
  const intimacyEmoji = intimacy < 10 ? '\ud83e\udd1d' : intimacy < 20 ? '\ud83d\udc4b' : intimacy < 30 ? '\ud83d\ude0a' : intimacy < 40 ? '\ud83d\udc95' : intimacy < 50 ? '\ud83d\udc96' : intimacy < 60 ? '\ud83d\udc97' : intimacy < 70 ? '\ud83d\udc9e' : intimacy < 80 ? '\ud83d\udc98' : intimacy < 90 ? '\ud83d\udc68\u200d\ud83d\udc69\u200d\ud83d\udc67' : '\ud83d\udcab';

  const getDateLabel = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return '\uc624\ub298';
    if (isYesterday(d)) return '\uc5b4\uc81c';
    return format(d, 'M\uc6d4 d\uc77c (EEE)', { locale: ko });
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

  const agentName = agent?.name ?? 'GYEOL';

  const renderMessageActions = (msg: Message, isUser: boolean) => (
    <div className={`flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'justify-end' : ''}`}>
      <MessageReactions messageId={msg.id} onReact={handleReaction} currentReaction={reactions[msg.id]} />
      {isUser && (
        <button onClick={() => { setEditingMsg(msg.id); setEditText(msg.content); }}
          aria-label="Edit message"
          className="text-[9px] text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition">
          <span className="material-icons-round text-[12px]">edit</span>
        </button>
      )}
      <button onClick={() => handleDeleteMessage(msg.id)}
        aria-label="Delete message"
        className="text-[9px] text-muted-foreground hover:text-destructive px-1.5 py-0.5 rounded hover:bg-destructive/10 transition">
        <span className="material-icons-round text-[12px]">delete</span>
      </button>
      <button onClick={() => navigator.clipboard.writeText(msg.content)}
        aria-label="Copy message"
        className="text-[9px] text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition">
        <span className="material-icons-round text-[12px]">content_copy</span>
      </button>
      {!isUser && (
        <button onClick={() => speakText(msg.content, settings.readSpeed ?? 0.95)}
          aria-label="Read aloud"
          className="text-[9px] text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition">
          <span className="material-icons-round text-[12px]">volume_up</span>
        </button>
      )}
      {!isUser && (
        <button onClick={() => setTranslatePickerFor(translatePickerFor === msg.id ? null : msg.id)}
          aria-label="Translate"
          className="text-[9px] text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition">
          <span className="material-icons-round text-[12px]">translate</span>
        </button>
      )}
      <button onClick={() => setReplyTo(msg)}
        aria-label="Reply"
        className="text-[9px] text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition">
        <span className="material-icons-round text-[12px]">reply</span>
      </button>
      <button onClick={() => togglePin(msg.id)}
        aria-label={pinnedMessages.has(msg.id) ? 'Unpin' : 'Pin'}
        className={`text-[9px] px-1.5 py-0.5 rounded transition ${pinnedMessages.has(msg.id) ? 'text-amber-400' : 'text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10'}`}>
        <span className="material-icons-round text-[12px]">push_pin</span>
      </button>
      <button onClick={() => setTagInput(tagInput === msg.id ? null : msg.id)}
        aria-label="Add tag"
        className="text-[9px] text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition">
        <span className="material-icons-round text-[12px]">label</span>
      </button>
      <button onClick={() => toggleBookmark(msg.id)}
        aria-label={bookmarks.has(msg.id) ? 'Remove bookmark' : 'Bookmark'}
        className={`text-[9px] px-1.5 py-0.5 rounded transition ${bookmarks.has(msg.id) ? 'text-amber-400' : 'text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10'}`}>
        <span className="material-icons-round text-[12px]">{bookmarks.has(msg.id) ? 'bookmark' : 'bookmark_border'}</span>
      </button>
    </div>
  );

  const renderUrlPreviews = (content: string) => {
    const urls = extractUrls(content);
    if (urls.length === 0) return null;
    return (
      <div className="mt-1 space-y-1">
        {urls.slice(0, 2).map(url => <LinkPreview key={url} url={url} />)}
      </div>
    );
  };

  const renderTagsAndExtras = (msg: Message, isUser: boolean) => (
    <>
      {(tags[msg.id] ?? []).length > 0 && (
        <div className={`flex flex-wrap gap-1 mt-1 ${isUser ? 'justify-end' : ''}`}>
          {(tags[msg.id] ?? []).map(t => (
            <span key={t} className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/60 flex items-center gap-0.5">
              #{t}
              <button onClick={() => removeTag(msg.id, t)} className="text-primary/30 hover:text-primary">\u00d7</button>
            </span>
          ))}
        </div>
      )}
      <AnimatePresence>
        {tagInput === msg.id && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className={`flex gap-1 mt-1 overflow-hidden ${isUser ? 'justify-end' : ''}`}>
            <input type="text" value={tagText} onChange={e => setTagText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTag(msg.id, tagText)}
              placeholder="tag name" maxLength={20}
              className="w-24 rounded-full bg-secondary/50 border border-border/30 px-2 py-1 text-[9px] text-foreground outline-none" autoFocus />
            <button onClick={() => addTag(msg.id, tagText)}
              className="text-[9px] px-2 py-1 rounded-full bg-primary/10 text-primary">Add</button>
          </motion.div>
        )}
      </AnimatePresence>
      {!isUser && translating === msg.id && (
        <div className="text-[10px] text-muted-foreground mt-1 animate-pulse">\ubc88\uc5ed \uc911...</div>
      )}
      {!isUser && translations[msg.id] && (
        <div className="mt-1 p-2 rounded-lg bg-primary/5 border border-primary/10 text-[11px] text-foreground/80">
          {translations[msg.id]}
        </div>
      )}
      {!isUser && (
        <AnimatePresence>
          {translatePickerFor === msg.id && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="flex gap-1 mt-1 flex-wrap">
              {TRANSLATE_LANGS.map(l => (
                <button key={l.code} onClick={() => handleTranslate(msg.id, msg.content, l.code)}
                  className="text-[9px] px-2 py-1 rounded-full glass-card hover:bg-primary/10 text-muted-foreground hover:text-primary transition">{l.label}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );

  return (
    <FileDropZone onFileDrop={handleFileDrop} accept="image/*,.pdf,.doc,.docx,.txt" disabled={isLoading}>
    <main className="flex flex-col h-[100dvh] bg-background overflow-hidden relative" role="main" aria-label="Chat">
      <div className="aurora-bg" aria-hidden="true" />

      {/* === Header === */}
      {hasCharacter ? (
        <div className="flex-shrink-0 flex flex-col items-center justify-center pt-6 pb-2 relative z-10"
          style={{ height: '30vh' }}>
          <div className="absolute top-4 left-4 flex gap-2">
            <button onClick={() => setConvListOpen(true)}
              aria-label="Conversation history"
              className="w-11 h-11 rounded-full flex items-center justify-center glass-card focus-visible:outline-2 focus-visible:outline-primary">
              <span className="material-icons-round text-lg text-muted-foreground" aria-hidden="true">history</span>
            </button>
            <button onClick={() => setSearchOpen(true)}
              aria-label="Search messages"
              className="w-11 h-11 rounded-full flex items-center justify-center glass-card focus-visible:outline-2 focus-visible:outline-primary">
              <span className="material-icons-round text-lg text-muted-foreground" aria-hidden="true">search</span>
            </button>
          </div>
          <div className="absolute top-4 right-4 flex gap-2">
            <ConversationFilter onFilter={setActiveFilters} availableTags={allTags} />
            <button onClick={() => setStatsOpen(true)}
              aria-label="Stats"
              className="w-11 h-11 rounded-full flex items-center justify-center glass-card focus-visible:outline-2 focus-visible:outline-primary">
              <span className="material-icons-round text-lg text-muted-foreground" aria-hidden="true">bar_chart</span>
            </button>
            <button onClick={() => setShareOpen(true)}
              aria-label="Share conversation"
              className="w-11 h-11 rounded-full flex items-center justify-center glass-card focus-visible:outline-2 focus-visible:outline-primary">
              <span className="material-icons-round text-lg text-muted-foreground" aria-hidden="true">share</span>
            </button>
            <button onClick={() => setExportOpen(true)}
              aria-label="Export conversation"
              className="w-11 h-11 rounded-full flex items-center justify-center glass-card focus-visible:outline-2 focus-visible:outline-primary">
              <span className="material-icons-round text-lg text-muted-foreground" aria-hidden="true">download</span>
            </button>
            <button onClick={() => setSummaryHistoryOpen(true)}
              aria-label="Summary history"
              className="w-11 h-11 rounded-full flex items-center justify-center glass-card focus-visible:outline-2 focus-visible:outline-primary">
              <span className="material-icons-round text-lg text-muted-foreground" aria-hidden="true">history_edu</span>
            </button>
            <button onClick={handleSummarize}
              aria-label="Summarize conversation"
              className="w-11 h-11 rounded-full flex items-center justify-center glass-card focus-visible:outline-2 focus-visible:outline-primary">
              <span className="material-icons-round text-lg text-muted-foreground" aria-hidden="true">summarize</span>
            </button>
            <button onClick={() => navigate('/settings')}
              aria-label="Settings"
              className="w-11 h-11 rounded-full flex items-center justify-center glass-card focus-visible:outline-2 focus-visible:outline-primary">
              <span className="material-icons-round text-lg text-muted-foreground" aria-hidden="true">settings</span>
            </button>
          </div>
          <AnimatedCharacter
            mood={(agent as any)?.mood ?? 'neutral'}
            isThinking={isLoading}
            reaction={lastReaction}
            characterPreset={settings.characterPreset}
            skinId={(agent as any)?.skin_id}
            gen={agent?.gen ?? 1}
            size="lg"
          />
          <div className="mt-2 flex items-center gap-2">
            <p className="text-base font-medium text-foreground">{agentName}</p>
            <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--success,142_71%_45%))] shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[10px] text-[hsl(var(--success,142_71%_45%)/0.7)]">Online</p>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/70">{intimacyEmoji} {intimacyLevel}</span>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 glass-panel z-10 relative">
          <div className="flex items-center gap-2">
            <button onClick={() => setConvListOpen(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition">
              <span className="material-icons-round text-lg">history</span>
            </button>
            <button onClick={() => setSearchOpen(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition">
              <span className="material-icons-round text-lg">search</span>
            </button>
            <p className="text-base font-medium text-foreground">{agentName}</p>
            <div className="w-2 h-2 rounded-full bg-[hsl(var(--success,142_71%_45%))] shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          </div>
          <div className="flex items-center gap-1">
            <ConversationFilter onFilter={setActiveFilters} availableTags={allTags} />
            <button onClick={() => setShowProviderPanel(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition"
              aria-label="AI Provider settings">
              <span className="material-icons-round text-lg">tune</span>
            </button>
            <button onClick={() => navigate('/settings')}
              className="w-11 h-11 rounded-full flex items-center justify-center glass-card">
              <span className="material-icons-round text-lg text-muted-foreground">settings</span>
            </button>
          </div>
        </div>
      )}

      {/* Streak bonus banner */}
      {(agent as any)?.consecutive_days > 1 && (
        <div className="px-4 pb-1 relative z-10">
          <StreakBonus streakDays={(agent as any).consecutive_days} />
        </div>
      )}

      {/* === Messages === */}
      <div className="flex-1 overflow-y-auto px-4 pb-2 relative z-10" role="log" aria-label="Messages" aria-live="polite">
        {/* Pinned messages bar */}
        {pinnedMessages.size > 0 && (
          <div className="mb-2 p-2 rounded-xl glass-card border border-amber-500/20 sticky top-0 z-20 backdrop-blur-md">
            <div className="flex items-center gap-1 mb-1">
              <span className="material-icons-round text-amber-400 text-[12px]">push_pin</span>
              <span className="text-[10px] text-amber-400 font-medium">Pinned ({pinnedMessages.size})</span>
            </div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {messages.filter(m => pinnedMessages.has(m.id)).map(m => (
                <div key={`pin-${m.id}`} className="text-[10px] text-foreground/60 truncate flex items-center gap-1">
                  <span className={m.role === 'user' ? 'text-primary/50' : 'text-secondary/50'}>{m.role === 'user' ? 'You' : agentName}:</span>
                  <span className="truncate">{m.content.slice(0, 60)}</span>
                  <button onClick={() => togglePin(m.id)} className="ml-auto text-amber-400/50 hover:text-amber-400 shrink-0">
                    <span className="material-icons-round text-[10px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {groupedMessages.map((group) => (
          <div key={group.date}>
            <div className="flex justify-center py-3">
              <span className="px-4 py-1.5 rounded-full glass-card text-[11px] font-medium text-muted-foreground">
                {group.label}
              </span>
            </div>

            {group.msgs.map(msg => (
              <div key={msg.id} className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                {msg.role === 'user' ? (
                  <div className="flex gap-2.5 justify-end">
                    <div className="max-w-[80%]">
                      {/* Reply bubble */}
                      {replyMap[msg.id] && (
                        <ReplyBubble originalMessage={messages.find(m => m.id === replyMap[msg.id])} agentName={agentName} />
                      )}
                      <span className="text-[10px] text-muted-foreground font-medium mr-1 mb-1 block text-right">
                        You \u00b7 {format(new Date(msg.created_at), 'HH:mm')}
                        {editedMessages.has(msg.id) && <span className="ml-1 text-muted-foreground/40">(\uc218\uc815\ub428)</span>}
                      </span>
                      <div className={`user-bubble p-4 rounded-2xl rounded-br-sm ${pinnedMessages.has(msg.id) ? 'ring-1 ring-amber-400/30' : ''}`}
                        style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}>
                        {editingMsg === msg.id ? (
                          <div className="space-y-2">
                            <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2}
                              className="w-full bg-background/50 rounded-lg px-2 py-1 text-sm outline-none border border-primary/20 resize-none" autoFocus />
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => setEditingMsg(null)} className="text-[9px] px-2 py-1 rounded text-muted-foreground">Cancel</button>
                              <button onClick={() => handleEditMessage(msg.id)} className="text-[9px] px-2 py-1 rounded bg-primary/20 text-primary">Save</button>
                            </div>
                          </div>
                        ) : msg.content.startsWith('[') && msg.content.includes('\ud83d\udcf7') && imagePreview ? (
                          <ImageMessage src={imagePreview} alt="Sent image" />
                        ) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        )}
                      </div>
                      {renderUrlPreviews(msg.content)}
                      {/* Read receipt */}
                      <div className="flex justify-end mt-0.5">
                        <ReadReceipt sent={true} read={msg.role === 'user' && messages.some(m => m.role === 'assistant' && new Date(m.created_at) > new Date(msg.created_at))} />
                      </div>
                      {renderTagsAndExtras(msg, true)}
                      {renderMessageActions(msg, true)}
                    </div>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-secondary/30 to-primary/20 border border-foreground/10 flex items-center justify-center shadow-lg mt-5">
                      <span className="material-icons-round text-muted-foreground text-[14px]">person</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2.5 justify-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-secondary/20 border border-foreground/10 flex items-center justify-center shadow-lg mt-5">
                      <span className="material-icons-round text-primary/80 text-[14px]">smart_toy</span>
                    </div>
                    <div className="max-w-[80%]">
                      <span className="text-[10px] text-primary/60 font-medium ml-1 mb-1 block">{agentName} \u00b7 {format(new Date(msg.created_at), 'HH:mm')}</span>
                      <div className="glass-bubble p-4 rounded-2xl rounded-bl-sm"
                        style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}>
                        <div className="prose prose-invert max-w-none prose-p:my-1 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: CodeBlockCopy }}>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                      {renderUrlPreviews(msg.content)}
                      {renderTagsAndExtras(msg, false)}
                      {renderMessageActions(msg, false)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex gap-2.5 mb-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-secondary/20 border border-foreground/10 flex items-center justify-center">
              <span className="material-icons-round text-primary/80 text-[14px]">smart_toy</span>
            </div>
            <div className="glass-bubble p-4 rounded-2xl rounded-bl-sm">
              <div className="flex items-center gap-1.5 h-4">
                <div className="typing-dot" />
                <div className="typing-dot" style={{ animationDelay: '0.15s' }} />
                <div className="typing-dot" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center py-2">
            <button onClick={() => setError(null)}
              className="text-xs text-red-400/70">{error.message}</button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* === Input bar === */}
      <div className="flex-shrink-0 relative z-10"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}>
        <div className="bg-gradient-to-t from-background to-transparent pt-6 px-4">
          {/* Reply preview */}
          <AnimatePresence>
            {replyTo && <ReplyPreview replyTo={replyTo} onClear={() => setReplyTo(null)} />}
          </AnimatePresence>
          {/* Image preview */}
          {imagePreview && (
            <div className="mb-2 relative inline-block">
              <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-xl border border-primary/20" />
              <button onClick={() => setImagePreview(null)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-primary-foreground text-[10px] flex items-center justify-center">\u2715</button>
            </div>
          )}
          {/* File attachment preview */}
          <AnimatePresence>
            {attachedFile && (
              <div className="mb-2">
                <FileAttachmentPreview file={attachedFile} onRemove={() => setAttachedFile(null)} />
              </div>
            )}
          </AnimatePresence>
          {/* Model selector chip + token info */}
          <div className="flex items-center gap-2 mb-1.5">
            <ModelSelector currentModel={selectedModel} onSelect={setSelectedModel} />
            <button onClick={() => setShowTokenUsage(true)}
              className="text-[9px] text-muted-foreground/40 hover:text-muted-foreground transition px-2 py-1 rounded-full glass-card">
              {messages.length * 150 > 0 ? `${(messages.length * 150).toLocaleString()} tokens` : 'Token usage'}
            </button>
            <button onClick={() => setShowProviderPanel(true)}
              className="text-[9px] text-muted-foreground/40 hover:text-muted-foreground transition px-1.5 py-1 rounded-full glass-card"
              aria-label="Provider settings">
              <span className="material-icons-round text-[12px]">tune</span>
            </button>
          </div>
          <div className="glass-panel input-glow flex items-center gap-2 rounded-full px-2 py-1.5">
            <input type="file" ref={imageInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
            <button type="button" onClick={() => imageInputRef.current?.click()}
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition flex-shrink-0">
              <span className="material-icons-round text-[20px]">add_photo_alternate</span>
            </button>
            <input type="text" value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Message GYEOL..."
              aria-label="Message input"
              style={{ fontSize: '16px' }}
              className="flex-1 bg-transparent outline-none min-w-0 text-foreground placeholder:text-muted-foreground focus-visible:outline-none" />
            {continuousVoice ? (
              <ContinuousVoiceInput onResult={t => { setInput(prev => prev + t); }} disabled={isLoading} />
            ) : (
              <>
                <VoiceRecorder onRecorded={(url, dur) => {
                  const id = `voice-${Date.now()}`;
                  setVoiceMessages(prev => ({ ...prev, [id]: { url, duration: dur } }));
                  sendMessage(`[\ud83c\udfa4 Voice message (${dur}s)]`);
                }} disabled={isLoading} />
                <VoiceInput onResult={t => setInput(t)} disabled={isLoading} />
              </>
            )}
            {input.trim() && (
              <button onClick={handleSend} disabled={isLoading}
                aria-label="Send message"
                className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 flex items-center justify-center flex-shrink-0 transition-all focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2">
                <span className="material-icons-round text-primary-foreground text-base" aria-hidden="true">arrow_upward</span>
              </button>
            )}
          </div>
          <p className="text-center text-[9px] text-slate-600 mt-1.5">
            GYEOL can make mistakes. Verify important information.
          </p>
        </div>
      </div>

      <EvolutionCeremony />

      {/* Conversation Summary Modal */}
      <AnimatePresence>
        {summaryOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]" onClick={() => setSummaryOpen(false)} />
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
              className="fixed inset-x-4 bottom-20 top-auto z-[70] max-h-[60vh] overflow-y-auto glass-card rounded-2xl p-5 max-w-md mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="material-icons-round text-primary text-base">summarize</span>
                  Conversation Summary
                </h3>
                <button onClick={() => setSummaryOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary/20">
                  <span className="material-icons-round text-muted-foreground text-sm">close</span>
                </button>
              </div>
              {summarizing ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                  <span className="material-icons-round text-primary animate-spin text-base">hourglass_top</span>
                  Analyzing conversation...
                </div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{summaryText}</ReactMarkdown>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SummaryHistory isOpen={summaryHistoryOpen} onClose={() => setSummaryHistoryOpen(false)} agentId={agent?.id} />

      {agent?.id && (
        <ConversationList
          isOpen={convListOpen}
          onClose={() => setConvListOpen(false)}
          agentId={agent.id}
        />
      )}

      <ConversationStats isOpen={statsOpen} onClose={() => setStatsOpen(false)} agentId={agent?.id} />
      <ConversationShare isOpen={shareOpen} onClose={() => setShareOpen(false)} messages={messages} agentName={agentName} />
      <ConversationExport isOpen={exportOpen} onClose={() => setExportOpen(false)} messages={messages} agentName={agentName} />
      <ChatSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} agentId={agent?.id} />

      {/* Model Selector Modal */}
      {showModelSelector && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModelSelector(false)} />
          <div className="relative z-10 w-full max-w-md p-4">
            <ModelSelector currentModel={selectedModel} onSelect={(m) => { setSelectedModel(m); setShowModelSelector(false); }} />
          </div>
        </div>
      )}

      {/* Token Usage */}
      {showTokenUsage && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowTokenUsage(false)} />
          <div className="relative z-10 w-full max-w-sm p-4 glass-card rounded-2xl mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Token Usage</h3>
              <button onClick={() => setShowTokenUsage(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary/20">
                <span className="material-icons-round text-muted-foreground text-sm">close</span>
              </button>
            </div>
            <TokenUsageDisplay tokensUsed={messages.length * 150} dailyTotal={messages.length * 150} maxTokens={maxTokens} />
            <TokenLimitSlider value={maxTokens} onChange={setMaxTokens} />
          </div>
        </div>
      )}

      {/* Provider Panel */}
      <AnimatePresence>
        {showProviderPanel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" onClick={() => setShowProviderPanel(false)} />
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
              className="fixed inset-x-4 bottom-4 top-auto z-[80] max-h-[80vh] overflow-y-auto glass-card rounded-2xl p-5 max-w-md mx-auto space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">AI Provider Settings</h3>
                <button onClick={() => setShowProviderPanel(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary/20">
                  <span className="material-icons-round text-muted-foreground text-sm">close</span>
                </button>
              </div>
              <ProviderComparison />
              <ApiUsageDashboard agentId={agent?.id} />
              <TokenLimitSlider value={maxTokens} onChange={setMaxTokens} />
              <div className="pt-2 border-t border-border/10">
                <button onClick={() => { setShowProviderPanel(false); setShowSystemPrompt(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl glass-card hover:bg-muted/10 transition text-left">
                  <span className="material-icons-round text-primary text-base">psychology</span>
                  <div>
                    <p className="text-[11px] font-medium text-foreground">System Prompt Editor</p>
                    <p className="text-[9px] text-muted-foreground">Customize AI behavior</p>
                  </div>
                </button>
              </div>
              <div className="pt-2 border-t border-border/10">
                <button onClick={() => { setShowProviderPanel(false); setShowTTSSettings(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl glass-card hover:bg-muted/10 transition text-left">
                  <span className="material-icons-round text-primary text-base">record_voice_over</span>
                  <div>
                    <p className="text-[11px] font-medium text-foreground">TTS Voice Settings</p>
                    <p className="text-[9px] text-muted-foreground">Change voice, speed, pitch</p>
                  </div>
                </button>
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-foreground/60">Continuous Voice Input</span>
                <button onClick={() => setContinuousVoice(!continuousVoice)}
                  className={`w-10 h-5 rounded-full transition-colors ${continuousVoice ? 'bg-primary' : 'bg-muted/30'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${continuousVoice ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* System Prompt Editor Modal */}
      <AnimatePresence>
        {showSystemPrompt && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" onClick={() => setShowSystemPrompt(false)} />
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
              className="fixed inset-x-4 bottom-4 top-auto z-[80] max-h-[70vh] overflow-y-auto glass-card rounded-2xl p-5 max-w-md mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">System Prompt</h3>
                <button onClick={() => setShowSystemPrompt(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary/20">
                  <span className="material-icons-round text-muted-foreground text-sm">close</span>
                </button>
              </div>
              <SystemPromptEditor agent={agent} onUpdate={() => {}} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* TTS Voice Settings Modal */}
      <AnimatePresence>
        {showTTSSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" onClick={() => setShowTTSSettings(false)} />
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
              className="fixed inset-x-4 bottom-4 top-auto z-[80] max-h-[70vh] overflow-y-auto glass-card rounded-2xl p-5 max-w-md mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">TTS Voice Settings</h3>
                <button onClick={() => setShowTTSSettings(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary/20">
                  <span className="material-icons-round text-muted-foreground text-sm">close</span>
                </button>
              </div>
              <TTSVoiceSelector />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
    </FileDropZone>
  );
}
