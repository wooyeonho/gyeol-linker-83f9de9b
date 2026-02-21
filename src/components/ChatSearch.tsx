/**
 * 대화 Search 컴포넌트 (개선판) — 날짜 그룹핑 + 하이라이트
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

type SortOrder = 'newest' | 'oldest' | 'relevance';

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
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
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
        .order('created_at', { ascending: sortOrder === 'oldest' })
        .limit(50);
      if (filter !== 'all') q = q.eq('role', filter);
      if (dateFrom) q = q.gte('created_at', `${dateFrom}T00:00:00`);
      if (dateTo) q = q.lte('created_at', `${dateTo}T23:59:59`);
      const { data } = await q;
      setResults((data ?? []) ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, agentId, filter, sortOrder, dateFrom, dateTo]);

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
      aria-label="대화 Search"
    >
      {/* Search header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/10">
        <button onClick={onClose} className="text-muted-foreground" aria-label="닫기">
          <span aria-hidden="true" className="material-icons-round text-lg">arrow_back</span>
        </button>
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="대화 Search..."
            aria-label="Search어 입력"
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
        <button onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-2 py-1 rounded-full text-[10px] font-medium transition ${showAdvanced ? 'bg-secondary/20 text-secondary' : 'text-muted-foreground hover:bg-muted/10'}`}>
          <span aria-hidden="true" className="material-icons-round text-[10px]">tune</span>
        </button>
        {results.length > 0 && (
          <span className="ml-auto text-[9px] text-muted-foreground/50">{results.length}개 결과</span>
        )}
      </div>

      {/* Advanced filters */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border/5">
            <div className="px-4 py-2 space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[9px] text-muted-foreground block mb-0.5">시작일</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="w-full bg-muted/10 rounded-lg px-2 py-1 text-[10px] text-foreground outline-none" />
                </div>
                <div className="flex-1">
                  <label className="text-[9px] text-muted-foreground block mb-0.5">종료일</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="w-full bg-muted/10 rounded-lg px-2 py-1 text-[10px] text-foreground outline-none" />
                </div>
              </div>
              <div className="flex gap-1">
                {([{ key: 'newest', label: '최신순' }, { key: 'oldest', label: '오래된순' }] as const).map(s => (
                  <button key={s.key} onClick={() => setSortOrder(s.key)}
                    className={`px-2 py-1 rounded-full text-[9px] font-medium transition ${sortOrder === s.key ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted/10'}`}>
                    {s.label}
                  </button>
                ))}
                {(dateFrom || dateTo) && (
                  <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                    className="px-2 py-1 rounded-full text-[9px] text-destructive hover:bg-destructive/10 transition">초기화</button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {results.length === 0 && query.trim() && !searching && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span aria-hidden="true" className="material-icons-round text-muted-foreground/20 text-4xl">search_off</span>
            <p className="text-muted-foreground text-sm">Search 결과 None</p>
          </div>
        )}

        {!query.trim() && !searching && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span aria-hidden="true" className="material-icons-round text-muted-foreground/20 text-4xl">search</span>
            <p className="text-muted-foreground/50 text-xs">Search어를 입력하세요</p>
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
