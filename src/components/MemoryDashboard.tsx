import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';

interface MemoryItem {
  id: string;
  category: string;
  key: string;
  value: string;
  confidence: number;
  updated_at: string;
}

const CATEGORY_CONFIG: Record<string, { icon: string; label: string }> = {
  identity: { icon: '🧑', label: '사용자 정보' },
  preference: { icon: '❤️', label: '좋아하는 것' },
  interest: { icon: '🎯', label: '관심사' },
  goal: { icon: '🎯', label: '목표' },
  relationship: { icon: '👥', label: '관계' },
  emotion: { icon: '😊', label: '최근 감정' },
  style: { icon: '🗣️', label: '대화 스타일' },
  learning: { icon: '📚', label: '학습한 주제' },
};

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 100) return <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-success/20 text-success">Confirm됨</span>;
  if (confidence >= 70) return <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--info)/0.2)] text-[hsl(var(--info))]">신뢰도 {confidence}%</span>;
  if (confidence >= 50) return <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))]">추정 {confidence}%</span>;
  return <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive">Confirm 필요</span>;
}

interface MemoryDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  agentId?: string;
}

export function MemoryDashboard({ isOpen, onClose, agentId }: MemoryDashboardProps) {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    if (!isOpen || !agentId) return;
    setLoading(true);

    (async () => {
      const allMemories: MemoryItem[] = [];

      // 1. Load real AI-extracted memories from gyeol_user_memories
      const { data: userMems } = await supabase
        .from('gyeol_user_memories' as any)
        .select('id, category, key, value, confidence, updated_at')
        .eq('agent_id', agentId)
        .order('confidence', { ascending: false })
        .limit(30);

      if (userMems) {
        for (const m of userMems as any[]) {
          allMemories.push({
            id: m.id,
            category: m.category,
            key: m.key,
            value: m.value,
            confidence: m.confidence ?? 50,
            updated_at: m.updated_at,
          });
        }
      }

      // 2. Load learned topics as separate category
      const { data: topics } = await supabase
        .from('gyeol_learned_topics')
        .select('id, title, summary, source, learned_at')
        .eq('agent_id', agentId)
        .order('learned_at', { ascending: false })
        .limit(15);

      if (topics) {
        for (const t of topics as any[]) {
          allMemories.push({
            id: t.id,
            category: 'learning',
            key: t.source ?? 'rss',
            value: t.title + (t.summary ? ` — ${t.summary.slice(0, 60)}` : ''),
            confidence: 90,
            updated_at: t.learned_at,
          });
        }
      }

      setMemories(allMemories);
      setLoading(false);
    })();
  }, [isOpen, agentId]);

  const grouped = memories.reduce<Record<string, MemoryItem[]>>((acc, m) => {
    (acc[m.category] ??= []).push(m);
    return acc;
  }, {});

  const handleDelete = async (id: string) => {
    // Delete from DB
    await supabase.from('gyeol_user_memories' as any).delete().eq('id', id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
    setDeleteTarget(null);
  };

  const handleEdit = async (id: string) => {
    if (!editValue.trim()) return;
    await supabase.from('gyeol_user_memories' as any).update({ value: editValue.trim() }).eq('id', id);
    setMemories((prev) => prev.map((m) => m.id === id ? { ...m, value: editValue.trim() } : m));
    setEditTarget(null);
    setEditValue('');
  };

  const startEdit = (mem: MemoryItem) => {
    setEditTarget(mem.id);
    setEditValue(mem.value);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-full max-w-md max-h-[85vh] glass-panel rounded-t-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 glass-panel px-5 pt-4 pb-3 border-b border-foreground/[0.06] z-10">
              <div className="w-10 h-1 rounded-full bg-border/40 mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🧠</span>
                  <h2 className="text-sm font-bold text-foreground">AI의 기억</h2>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {memories.length}개의 기억
                  </span>
                </div>
                <button onClick={onClose} className="text-muted-foreground/50 hover:text-foreground transition p-1">
                  <span aria-hidden="true" className="material-icons-round text-lg">close</span>
                </button>
              </div>
            </div>

            {/* Memory Groups */}
            <div className="overflow-y-auto max-h-[70vh] px-4 py-3 space-y-4 gyeol-scrollbar-hide">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="void-dot" />
                  <span className="ml-3 text-[11px] text-muted-foreground/50">기억을 불러오는 중...</span>
                </div>
              ) : memories.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-2xl">🫧</span>
                  <p className="text-[11px] text-muted-foreground/50 mt-2">아직 기억이 없어요</p>
                  <p className="text-[10px] text-muted-foreground/30 mt-1">대화를 나누면 기억이 쌓여요</p>
                </div>
              ) : (
                Object.entries(grouped).map(([cat, items]) => {
                  const cfg = CATEGORY_CONFIG[cat] ?? { icon: '📌', label: cat };
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-sm">{cfg.icon}</span>
                        <span className="text-[11px] font-semibold text-foreground/70">{cfg.label}</span>
                        <span className="text-[9px] text-muted-foreground/30">({items.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {items.map((mem) => (
                          <motion.div
                            key={mem.id}
                            layout
                            className="flex items-center justify-between px-3 py-2 glass-card rounded-xl group"
                          >
                            <div className="flex-1 min-w-0">
                              {editTarget === mem.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleEdit(mem.id)}
                                    className="flex-1 bg-transparent border border-primary/30 rounded-lg px-2 py-1 text-[12px] text-foreground outline-none focus:border-primary"
                                    autoFocus
                                  />
                                  <button onClick={() => handleEdit(mem.id)} className="text-primary text-[11px] font-medium">Save</button>
                                  <button onClick={() => setEditTarget(null)} className="text-muted-foreground text-[11px]">Cancel</button>
                                </div>
                              ) : (
                                <>
                                  <p className="text-[12px] text-foreground/85 truncate">{mem.value}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <ConfidenceBadge confidence={mem.confidence} />
                                  </div>
                                </>
                              )}
                            </div>
                            {editTarget !== mem.id && (
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition ml-2">
                                <button
                                  type="button"
                                  onClick={() => startEdit(mem)}
                                  className="text-muted-foreground/30 hover:text-primary transition p-1"
                                >
                                  <span aria-hidden="true" className="material-icons-round text-sm">edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(mem.id)}
                                  className="text-muted-foreground/30 hover:text-destructive transition p-1"
                                >
                                  <span aria-hidden="true" className="material-icons-round text-sm">close</span>
                                </button>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Correction prompt */}
              {memories.length > 0 && (
                <div className="mt-4 px-3 py-3 rounded-xl bg-primary/5 border border-primary/10 text-center">
                  <p className="text-[11px] text-foreground/50">⚠️ 잘못된 기억이 있나요?</p>
                  <p className="text-[10px] text-muted-foreground/40 mt-1">
                    채팅에서 "내 이름은 ○○이야" 라고 말하면 기억이 업데이트돼요
                  </p>
                </div>
              )}
            </div>

            {/* Delete confirmation */}
            <AnimatePresence>
              {deleteTarget && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-0 left-0 right-0 glass-panel border-t border-foreground/[0.06] px-5 py-4"
                >
                  <p className="text-[12px] text-foreground/80 mb-3">이 기억을 삭제할까요?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(deleteTarget)}
                      className="flex-1 py-2 rounded-xl bg-destructive/20 text-destructive text-[12px] font-medium hover:bg-destructive/30 transition"
                    >
                      삭제
                    </button>
                    <button
                      onClick={() => setDeleteTarget(null)}
                      className="flex-1 py-2 rounded-xl bg-surface border border-border/30 text-foreground/60 text-[12px] hover:bg-surface/80 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
