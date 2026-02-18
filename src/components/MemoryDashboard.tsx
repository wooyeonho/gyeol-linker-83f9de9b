import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
};

const MOCK_MEMORIES: MemoryItem[] = [
  { id: '1', category: 'identity', key: 'name', value: '연호', confidence: 100, updated_at: new Date().toISOString() },
  { id: '2', category: 'identity', key: 'occupation', value: '개발자', confidence: 95, updated_at: new Date().toISOString() },
  { id: '3', category: 'identity', key: 'location', value: '서울 (추정)', confidence: 60, updated_at: new Date().toISOString() },
  { id: '4', category: 'preference', key: 'favorite_food', value: '돈볶이', confidence: 80, updated_at: new Date().toISOString() },
  { id: '5', category: 'interest', key: 'studying', value: '주식 투자', confidence: 85, updated_at: new Date().toISOString() },
  { id: '6', category: 'interest', key: 'tech', value: 'AI 기술, 젤프 트레이닝', confidence: 90, updated_at: new Date().toISOString() },
  { id: '7', category: 'goal', key: 'dream', value: 'AI 서비스 창업', confidence: 90, updated_at: new Date().toISOString() },
  { id: '8', category: 'style', key: 'language', value: '한국어, 캐주얼한 말투', confidence: 95, updated_at: new Date().toISOString() },
  { id: '9', category: 'goal', key: 'short_term', value: '앱 완성하기', confidence: 75, updated_at: new Date().toISOString() },
  { id: '10', category: 'emotion', key: 'recent', value: '열정적', confidence: 70, updated_at: new Date().toISOString() },
];

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 100) return <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">확인됨</span>;
  if (confidence >= 70) return <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">신뢰도 {confidence}%</span>;
  if (confidence >= 50) return <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">추정 {confidence}%</span>;
  return <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">확인 필요</span>;
}

interface MemoryDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MemoryDashboard({ isOpen, onClose }: MemoryDashboardProps) {
  const [memories, setMemories] = useState<MemoryItem[]>(MOCK_MEMORIES);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const grouped = memories.reduce<Record<string, MemoryItem[]>>((acc, m) => {
    (acc[m.category] ??= []).push(m);
    return acc;
  }, {});

  const handleDelete = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
    setDeleteTarget(null);
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
            className="w-full max-w-md max-h-[85vh] bg-card/95 backdrop-blur-md rounded-t-2xl border-t border-border/30 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-card/95 backdrop-blur-md px-5 pt-4 pb-3 border-b border-border/20 z-10">
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
                  <span className="material-icons-round text-lg">close</span>
                </button>
              </div>
            </div>

            {/* Memory Groups */}
            <div className="overflow-y-auto max-h-[70vh] px-4 py-3 space-y-4 gyeol-scrollbar-hide">
              {Object.entries(grouped).map(([cat, items]) => {
                const cfg = CATEGORY_CONFIG[cat] ?? { icon: '📌', label: cat };
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-sm">{cfg.icon}</span>
                      <span className="text-[11px] font-semibold text-foreground/70">{cfg.label}</span>
                    </div>
                    <div className="space-y-1.5">
                      {items.map((mem) => (
                        <motion.div
                          key={mem.id}
                          layout
                          className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface/60 border border-border/20 group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] text-foreground/85 truncate">{mem.value}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <ConfidenceBadge confidence={mem.confidence} />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(mem.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-destructive transition p-1 ml-2"
                          >
                            <span className="material-icons-round text-sm">close</span>
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Correction prompt */}
              <div className="mt-4 px-3 py-3 rounded-xl bg-primary/5 border border-primary/10 text-center">
                <p className="text-[11px] text-foreground/50">
                  ⚠️ 잘못된 기억이 있나요?
                </p>
                <p className="text-[10px] text-muted-foreground/40 mt-1">
                  채팅에서 "내 이름은 ○○이야" 라고 말하면 기억이 업데이트돼요
                </p>
              </div>
            </div>

            {/* Delete confirmation */}
            <AnimatePresence>
              {deleteTarget && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-0 left-0 right-0 bg-card/98 backdrop-blur-md border-t border-border/30 px-5 py-4"
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
                      취소
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
