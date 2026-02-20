/**
 * 대화 검색 컴포넌트 (개선판) — 날짜 그룹핑 + 하이라이트
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import type { Message } from '@/lib/gyeol/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  agentId?: string;
  onJumpToMessage?: (messageId: string) => void;
}

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-primary/30 text-primary rounded px-0.5">{part}</mark>
      : part
  );
}

export function ChatSearch({ isOpen, onClose, agentId, onJumpToMessage }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [searching, setSearching] = useState(false);
  const [filter, setFilter] = useState<'all' | 'user' | 'assistant'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
      setFilter('all');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || !agentId) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      let q = supabase
        .from('gyeol_conversations')
        .select('*')
        .eq('agent_id', agentId)
        .ilike('content', `%${query.trim()}%`)
        .order('created_at', { ascending: false })
        .limit(30);
      if (filter !== 'all') q = q.eq('role', filter);
      const { data } = await q;
      setResults((data as any[]) ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, agentId, filter]);

  const grouped = useMemo(() => {
    const groups: Record<string, Message[]> = {};
    results.forEach(msg => {
      const date = new Date(msg.created_at).toLocaleDateString('ko', { year: 'numeric', month: 'long', day: 'numeric' });
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  }, [results]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col"
      role="dialog"
      aria-label="대화 검색"
    >
      {/* Search header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/10">
        <button onClick={onClose} className="text-muted-foreground" aria-label="닫기">
          <span className="material-icons-round text-lg">arrow_back</span>
        </button>
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="대화 검색..."
            aria-label="검색어 입력"
            className="w-full bg-muted/20 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/5">
        {[
          { key: 'all' as const, label: '전체' },
          { key: 'user' as const, label: '나' },
          { key: 'assistant' as const, label: 'AI' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1 rounded-full text-[10px] font-medium transition ${
              filter === f.key ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted/10'
            }`}
          >
            {f.label}
          </button>
        ))}
        {results.length > 0 && (
          <span className="ml-auto text-[9px] text-muted-foreground/50">{results.length}개 결과</span>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {results.length === 0 && query.trim() && !searching && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="material-icons-round text-muted-foreground/20 text-4xl">search_off</span>
            <p className="text-muted-foreground text-sm">검색 결과 없음</p>
          </div>
        )}

        {!query.trim() && !searching && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="material-icons-round text-muted-foreground/20 text-4xl">search</span>
            <p className="text-muted-foreground/50 text-xs">검색어를 입력하세요</p>
          </div>
        )}

        {Object.entries(grouped).map(([date, msgs]) => (
          <div key={date}>
            <p className="text-[9px] text-muted-foreground/40 font-medium mb-2 sticky top-0 bg-background/95 py-1">{date}</p>
            <div className="space-y-1.5">
              {msgs.map((msg, i) => (
                <motion.button
                  key={msg.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => onJumpToMessage?.(msg.id)}
                  className="w-full text-left glass-card rounded-xl p-3 hover:bg-muted/10 transition"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                      msg.role === 'user' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'
                    }`}>
                      {msg.role === 'user' ? 'You' : 'AI'}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(msg.created_at).toLocaleTimeString('ko', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[12px] text-foreground/80 line-clamp-2">
                    {highlightText(msg.content.slice(0, 150), query)}
                  </p>
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
