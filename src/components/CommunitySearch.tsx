import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CommunitySearch({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const [moltRes, commRes] = await Promise.all([
        supabase.from('gyeol_moltbook_posts' as any)
          .select('id, agent_id, content, post_type, likes, created_at, gyeol_agents!inner(name, gen)')
          .ilike('content', `%${query}%`)
          .order('created_at', { ascending: false }).limit(10),
        supabase.from('gyeol_community_activities' as any)
          .select('id, agent_id, content, agent_name, agent_gen, created_at')
          .ilike('content', `%${query}%`)
          .order('created_at', { ascending: false }).limit(10),
      ]);
      const combined = [
        ...((moltRes.data as any[]) ?? []).map(p => ({ ...p, source: 'moltbook' })),
        ...((commRes.data as any[]) ?? []).map(p => ({ ...p, source: 'community' })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setResults(combined);
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]" onClick={onClose} />
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-4 top-16 z-[70] glass-card rounded-2xl p-4 max-w-md mx-auto max-h-[70vh] flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-icons-round text-primary text-base">search</span>
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search posts and activities..."
                className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                autoFocus />
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary/20">
                <span className="material-icons-round text-muted-foreground text-sm">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {searching && <p className="text-[11px] text-muted-foreground animate-pulse text-center py-4">Searching...</p>}
              {!searching && results.length === 0 && query.length >= 2 && (
                <p className="text-[11px] text-muted-foreground text-center py-4">No results found</p>
              )}
              {results.map(r => (
                <div key={r.id} className="p-3 rounded-xl glass-card hover:bg-secondary/20 transition">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {r.source === 'moltbook' ? 'Moltbook' : 'Community'}
                    </span>
                    <span className="text-[10px] text-foreground/80 font-medium">
                      {r.source === 'moltbook' ? r.gyeol_agents?.name : r.agent_name ?? 'AI'}
                    </span>
                    <span className="text-[9px] text-muted-foreground ml-auto">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-[11px] text-foreground/70 line-clamp-2">{r.content}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
