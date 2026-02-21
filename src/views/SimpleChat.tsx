import { useEffect, useState, useRef, useCallback } from 'react';
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
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ConversationList } from '@/src/components/ConversationList';
import { StreakBonus } from '@/src/components/StreakBonus';

// Emoji reactions for messages
const REACTIONS = ['❤️', '👍', '😂', '🤔', '😢', '🔥'];
const TRANSLATE_LANGS = [
  { code: 'ko', label: '한국어' }, { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' }, { code: 'zh', label: '中文' },
  { code: 'es', label: 'Español' }, { code: 'fr', label: 'Français' },
];

// Code block with copy button (extracted to avoid hooks-in-callback)
function CodeBlockCopy({ children, className }: any) {
  const code = String(children).replace(/\n$/, '');
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group/code">
      <pre className={className}><code>{children}</code></pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-1 right-1 opacity-0 group-hover/code:opacity-100 transition text-[9px] px-2 py-1 rounded-md bg-primary/20 text-primary hover:bg-primary/30"
      >{copied ? '✓' : 'Copy'}</button>
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
  const autoTTS = settings.autoTTS !== false;
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
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [summarizing, setSummarizing] = useState(false);

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
    // Update locally
    setMessages((prev: Message[]) => prev.map(m => m.id === msgId ? { ...m, content: editText.trim() } : m));
    // Also update in DB if not local
    if (!msgId.startsWith('local-')) {
      await supabase.from('gyeol_conversations' as any).update({ content: editText.trim() } as any).eq('id', msgId);
    }
    setEditingMsg(null); setEditText('');
  };

  const handleTranslate = async (msgId: string, text: string, lang: string) => {
    setTranslatePickerFor(null);
    setTranslating(msgId);
    try {
      const { data, error } = await supabase.functions.invoke('translate', {
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

  const handleSendImage = async () => {
    if (!imagePreview || !agent?.id) return;
    const imgMsg = `[이미지 전송] 📷`;
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
      const { data, error } = await supabase.functions.invoke('summarize', {
        body: { agentId: agent.id, limit: 50 },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (data?.summary) setSummaryText(data.summary);
      else setSummaryText('Could not generate summary.');
    } catch (e) {
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
    await sendMessage(text);
  };

  const handleDeleteMessage = (msgId: string) => {
    setMessages((prev: Message[]) => prev.filter(m => m.id !== msgId));
  };

  const handleResendMessage = async (content: string) => {
    if (isLoading || !agent?.id) return;
    await sendMessage(content);
  };

  // Intimacy info
  const intimacy = (agent as any)?.intimacy ?? 0;
  const intimacyLevel = intimacy < 10 ? 'Stranger' : intimacy < 20 ? 'Acquaintance' : intimacy < 30 ? 'Casual' : intimacy < 40 ? 'Friend' : intimacy < 50 ? 'Good Friend' : intimacy < 60 ? 'Close Friend' : intimacy < 70 ? 'Bestie' : intimacy < 80 ? 'Soulmate' : intimacy < 90 ? 'Family' : 'Inseparable';
  const intimacyEmoji = intimacy < 10 ? '🤝' : intimacy < 20 ? '👋' : intimacy < 30 ? '😊' : intimacy < 40 ? '💕' : intimacy < 50 ? '💖' : intimacy < 60 ? '💗' : intimacy < 70 ? '💞' : intimacy < 80 ? '💘' : intimacy < 90 ? '👨‍👩‍👧' : '💫';

  // Date grouping helper
  const getDateLabel = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return '오늘';
    if (isYesterday(d)) return '어제';
    return format(d, 'M월 d일 (EEE)', { locale: ko });
  }, []);

  // Group messages by date
  const groupedMessages = messages.reduce<{ date: string; label: string; msgs: Message[] }[]>((acc, msg) => {
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

  return (
    <main className="flex flex-col h-[100dvh] bg-background overflow-hidden relative" role="main" aria-label="Chat">
      <div className="aurora-bg" aria-hidden="true" />

      {/* === Header === */}
      {hasCharacter ? (
        <div className="flex-shrink-0 flex flex-col items-center justify-center pt-6 pb-2 relative z-10"
          style={{ height: '30vh' }}>
          <button onClick={() => setConvListOpen(true)}
            aria-label="Conversation history"
            className="absolute top-4 left-4 w-11 h-11 rounded-full flex items-center justify-center glass-card focus-visible:outline-2 focus-visible:outline-primary">
            <span className="material-icons-round text-lg text-muted-foreground" aria-hidden="true">history</span>
          </button>
          <div className="absolute top-4 right-4 flex gap-2">
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
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[10px] text-emerald-400/70">Online</p>
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
            <p className="text-base font-medium text-foreground">{agentName}</p>
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          </div>
          <button onClick={() => navigate('/settings')}
            className="w-11 h-11 rounded-full flex items-center justify-center glass-card">
            <span className="material-icons-round text-lg text-muted-foreground">settings</span>
          </button>
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
          <div className="mb-2 p-2 rounded-xl glass-card border border-amber-500/20">
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
            {/* Date separator */}
            <div className="flex justify-center py-3">
              <span className="px-4 py-1.5 rounded-full glass-card text-[11px] font-medium text-slate-400">
                {group.label}
              </span>
            </div>

            {group.msgs.map(msg => (
              <div key={msg.id} className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                {msg.role === 'user' ? (
                  <div className="flex gap-2.5 justify-end">
                    <div className="max-w-[80%]">
                      <span className="text-[10px] text-slate-400 font-medium mr-1 mb-1 block text-right">You · {format(new Date(msg.created_at), 'HH:mm')}</span>
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
                        ) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        )}
                      </div>
                      {/* Tags */}
                      {(tags[msg.id] ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 justify-end">
                          {tags[msg.id].map(t => (
                            <span key={t} className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/60 flex items-center gap-0.5">
                              #{t}
                              <button onClick={() => removeTag(msg.id, t)} className="text-primary/30 hover:text-primary">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Reaction display */}
                      {reactions[msg.id] && (
                        <div className="flex justify-end mt-0.5">
                          <span className="text-sm bg-background/50 rounded-full px-1.5 py-0.5 border border-white/5">{reactions[msg.id]}</span>
                        </div>
                      )}
                      {/* Message actions */}
                      <div className="flex justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setReactionPickerFor(reactionPickerFor === msg.id ? null : msg.id)}
                          aria-label="Add reaction"
                          className="text-[9px] text-slate-500 hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition">
                          <span className="material-icons-round text-[12px]">add_reaction</span>
                        </button>
                        <button onClick={() => { setEditingMsg(msg.id); setEditText(msg.content); }}
                          aria-label="Edit message"
                          className="text-[9px] text-slate-500 hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition">
                          <span className="material-icons-round text-[12px]">edit</span>
                        </button>
                        <button onClick={() => handleDeleteMessage(msg.id)}
                          aria-label="Delete message"
                          className="text-[9px] text-slate-500 hover:text-destructive px-1.5 py-0.5 rounded hover:bg-destructive/10 transition">
                          <span className="material-icons-round text-[12px]">delete</span>
                        </button>
                        <button onClick={() => togglePin(msg.id)}
                          aria-label={pinnedMessages.has(msg.id) ? 'Unpin' : 'Pin'}
                          className={`text-[9px] px-1.5 py-0.5 rounded transition ${pinnedMessages.has(msg.id) ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400 hover:bg-amber-400/10'}`}>
                          <span className="material-icons-round text-[12px]">push_pin</span>
                        </button>
                        <button onClick={() => setTagInput(tagInput === msg.id ? null : msg.id)}
                          aria-label="Add tag"
                          className="text-[9px] text-slate-500 hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition">
                          <span className="material-icons-round text-[12px]">label</span>
                        </button>
                        <button onClick={() => toggleBookmark(msg.id)}
                          aria-label={bookmarks.has(msg.id) ? 'Remove bookmark' : 'Bookmark'}
                          className={`text-[9px] px-1.5 py-0.5 rounded transition ${bookmarks.has(msg.id) ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400 hover:bg-amber-400/10'}`}>
                          <span className="material-icons-round text-[12px]">{bookmarks.has(msg.id) ? 'bookmark' : 'bookmark_border'}</span>
                        </button>
                      </div>
                      {/* Tag input */}
                      <AnimatePresence>
                        {tagInput === msg.id && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="flex gap-1 mt-1 justify-end overflow-hidden">
                            <input type="text" value={tagText} onChange={e => setTagText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && addTag(msg.id, tagText)}
                              placeholder="tag name" maxLength={20}
                              className="w-24 rounded-full bg-secondary/50 border border-border/30 px-2 py-1 text-[9px] text-foreground outline-none" autoFocus />
                            <button onClick={() => addTag(msg.id, tagText)}
                              className="text-[9px] px-2 py-1 rounded-full bg-primary/10 text-primary">Add</button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {/* Reaction picker */}
                      <AnimatePresence>
                        {reactionPickerFor === msg.id && (
                          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="flex gap-1 mt-1 justify-end">
                            {REACTIONS.map(r => (
                              <button key={r} onClick={() => { setReactions(prev => ({ ...prev, [msg.id]: r })); setReactionPickerFor(null); }}
                                className="text-lg hover:scale-125 transition-transform">{r}</button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-secondary/30 to-primary/20 border border-white/10 flex items-center justify-center shadow-lg mt-5">
                      <span className="material-icons-round text-slate-300 text-[14px]">person</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2.5 justify-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-secondary/20 border border-white/10 flex items-center justify-center shadow-lg mt-5">
                      <span className="material-icons-round text-primary/80 text-[14px]">smart_toy</span>
                    </div>
                    <div className="max-w-[80%]">
                      <span className="text-[10px] text-primary/60 font-medium ml-1 mb-1 block">{agentName} · {format(new Date(msg.created_at), 'HH:mm')}</span>
                      <div className="glass-bubble p-4 rounded-2xl rounded-bl-sm"
                        style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}>
                        <div className="prose prose-invert max-w-none prose-p:my-1 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: CodeBlockCopy }}>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                      {/* Reaction display */}
                      {reactions[msg.id] && (
                        <div className="flex mt-0.5">
                          <span className="text-sm bg-background/50 rounded-full px-1.5 py-0.5 border border-white/5">{reactions[msg.id]}</span>
                        </div>
                      )}
                      {/* AI message actions */}
                      <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setReactionPickerFor(reactionPickerFor === msg.id ? null : msg.id)}
                          aria-label="Add reaction"
                          className="text-[9px] text-slate-500 hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition focus-visible:outline-2 focus-visible:outline-primary">
                          <span className="material-icons-round text-[12px]" aria-hidden="true">add_reaction</span>
                        </button>
                        <button onClick={() => handleDeleteMessage(msg.id)}
                          aria-label="Delete message"
                          className="text-[9px] text-slate-500 hover:text-destructive px-1.5 py-0.5 rounded hover:bg-destructive/10 transition focus-visible:outline-2 focus-visible:outline-primary">
                          <span className="material-icons-round text-[12px]" aria-hidden="true">delete</span>
                        </button>
                        <button onClick={() => navigator.clipboard.writeText(msg.content)}
                          aria-label="Copy message"
                          className="text-[9px] text-slate-500 hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition focus-visible:outline-2 focus-visible:outline-primary">
                          <span className="material-icons-round text-[12px]" aria-hidden="true">content_copy</span>
                        </button>
                        <button onClick={() => speakText(msg.content, settings.readSpeed ?? 0.95)}
                          aria-label="Read aloud"
                          className="text-[9px] text-slate-500 hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition focus-visible:outline-2 focus-visible:outline-primary">
                          <span className="material-icons-round text-[12px]" aria-hidden="true">volume_up</span>
                        </button>
                        <button onClick={() => setTranslatePickerFor(translatePickerFor === msg.id ? null : msg.id)}
                          aria-label="Translate"
                          className="text-[9px] text-slate-500 hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition focus-visible:outline-2 focus-visible:outline-primary">
                          <span className="material-icons-round text-[12px]" aria-hidden="true">translate</span>
                        </button>
                        <button onClick={() => toggleBookmark(msg.id)}
                          aria-label={bookmarks.has(msg.id) ? 'Remove bookmark' : 'Bookmark'}
                          className={`text-[9px] px-1.5 py-0.5 rounded transition focus-visible:outline-2 focus-visible:outline-primary ${bookmarks.has(msg.id) ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400 hover:bg-amber-400/10'}`}>
                          <span className="material-icons-round text-[12px]" aria-hidden="true">{bookmarks.has(msg.id) ? 'bookmark' : 'bookmark_border'}</span>
                        </button>
                      </div>
                      {/* Translation result */}
                      {translating === msg.id && (
                        <div className="text-[10px] text-muted-foreground mt-1 animate-pulse">번역 중...</div>
                      )}
                      {translations[msg.id] && (
                        <div className="mt-1 p-2 rounded-lg bg-primary/5 border border-primary/10 text-[11px] text-foreground/80">
                          {translations[msg.id]}
                        </div>
                      )}
                      {/* Translate picker */}
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
                      {/* Reaction picker */}
                      <AnimatePresence>
                        {reactionPickerFor === msg.id && (
                          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="flex gap-1 mt-1">
                            {REACTIONS.map(r => (
                              <button key={r} onClick={() => { setReactions(prev => ({ ...prev, [msg.id]: r })); setReactionPickerFor(null); }}
                                className="text-lg hover:scale-125 transition-transform">{r}</button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Typing indicator with dots */}
        {isLoading && (
          <div className="flex gap-2.5 mb-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-secondary/20 border border-white/10 flex items-center justify-center">
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
          {/* Image preview */}
          {imagePreview && (
            <div className="mb-2 relative inline-block">
              <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-xl border border-primary/20" />
              <button onClick={() => setImagePreview(null)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center">✕</button>
            </div>
          )}
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
              className="flex-1 bg-transparent outline-none min-w-0 text-foreground placeholder:text-slate-500 focus-visible:outline-none" />
            <VoiceInput onResult={t => setInput(t)} disabled={isLoading} />
            {input.trim() && (
              <button onClick={handleSend} disabled={isLoading}
                aria-label="Send message"
                className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 flex items-center justify-center flex-shrink-0 transition-all focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2">
                <span className="material-icons-round text-white text-base" aria-hidden="true">arrow_upward</span>
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

      {/* Conversation history drawer */}
      {agent?.id && (
        <ConversationList
          isOpen={convListOpen}
          onClose={() => setConvListOpen(false)}
          agentId={agent.id}
        />
      )}
    </main>
  );
}
