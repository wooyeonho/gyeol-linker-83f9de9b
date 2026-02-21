/**
 * 대화 요약 히스토리 컴포넌트
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/integrations/supabase/client';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface SummaryEntry {
  id: string;
  summary: string;
  created_at: string;
  message_count: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  agentId?: string;
}

export function SummaryHistory({ isOpen, onClose, agentId }: Props) {
  const [summaries, setSummaries] = useState<SummaryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !agentId) return;
    setLoading(true);
    // Load from localStorage since we don't have a dedicated table
    try {
      const stored = JSON.parse(localStorage.getItem(`gyeol_summaries_${agentId}`) ?? '[]');
      setSummaries(stored);
    } catch { setSummaries([]); }
    setLoading(false);
  }, [isOpen, agentId]);

  const deleteSummary = (id: string) => {
    const updated = summaries.filter(s => s.id !== id);
    setSummaries(updated);
    if (agentId) localStorage.setItem(`gyeol_summaries_${agentId}`, JSON.stringify(updated));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed inset-x-4 bottom-4 top-auto z-[80] max-h-[70vh] overflow-y-auto glass-card rounded-2xl p-5 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span className="material-icons-round text-primary text-base">history</span>
                Summary History
              </h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary/20">
                <span className="material-icons-round text-muted-foreground text-sm">close</span>
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground text-sm animate-pulse">Loading...</div>
            ) : summaries.length === 0 ? (
              <div className="text-center py-8">
                <span className="material-icons-round text-3xl text-muted-foreground/20 mb-2 block">summarize</span>
                <p className="text-sm text-muted-foreground">No summaries yet</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Use the summarize button in chat to create summaries</p>
              </div>
            ) : (
              <div className="space-y-3">
                {summaries.map((s) => (
                  <div key={s.id} className="glass-card rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(s.created_at), 'M월 d일 HH:mm', { locale: ko })}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-primary/50">{s.message_count} messages</span>
                        <button onClick={() => deleteSummary(s.id)}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive transition">
                          <span className="material-icons-round text-[12px]">delete</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-foreground/80 whitespace-pre-wrap leading-relaxed">{s.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Save a summary to localStorage history */
export function saveSummaryToHistory(agentId: string, summary: string, messageCount: number) {
  const key = `gyeol_summaries_${agentId}`;
  const existing = JSON.parse(localStorage.getItem(key) ?? '[]');
  const entry = {
    id: `sum-${Date.now()}`,
    summary,
    created_at: new Date().toISOString(),
    message_count: messageCount,
  };
  const updated = [entry, ...existing].slice(0, 50); // Keep last 50
  localStorage.setItem(key, JSON.stringify(updated));
}
