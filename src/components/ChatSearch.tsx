/**
 * 대화 검색 컴포넌트
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import type { Message } from '@/lib/gyeol/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  agentId?: string;
  onJumpToMessage?: (messageId: string) => void;
}

export function ChatSearch({ isOpen, onClose, agentId, onJumpToMessage }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || !agentId) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('gyeol_conversations')
        .select('*')
        .eq('agent_id', agentId)
        .ilike('content', `%${query.trim()}%`)
        .order('created_at', { ascending: false })
        .limit(20);
      setResults((data as any[]) ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, agentId]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col"
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/10">
        <button onClick={onClose} className="text-muted-foreground">
          <span className="material-icons-round text-lg">arrow_back</span>
        </button>
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="대화 검색..."
            className="w-full bg-muted/20 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {results.length === 0 && query.trim() && !searching && (
          <p className="text-center text-muted-foreground text-sm py-12">검색 결과 없음</p>
        )}
        {results.map(msg => (
          <button
            key={msg.id}
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
                {new Date(msg.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-[12px] text-foreground/80 line-clamp-2">{msg.content}</p>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
