import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import type { Agent } from '@/lib/gyeol/types';

interface ProgressCondition {
  label: string;
  icon: string;
  current: number;
  required: number;
  met: boolean;
}

interface EvolutionProgressProps {
  isOpen: boolean;
  onClose: () => void;
  currentGen: number;
  agent: Agent | null;
  onEvolve?: () => void;
}

const GEN_REQUIREMENTS: Record<number, { conversations: number; uniqueTopics: number; memories: number; intimacy: number; consecutiveDays: number }> = {
  2: { conversations: 20, uniqueTopics: 5, memories: 10, intimacy: 20, consecutiveDays: 3 },
  3: { conversations: 50, uniqueTopics: 15, memories: 30, intimacy: 40, consecutiveDays: 7 },
  4: { conversations: 100, uniqueTopics: 30, memories: 50, intimacy: 60, consecutiveDays: 14 },
  5: { conversations: 200, uniqueTopics: 50, memories: 80, intimacy: 80, consecutiveDays: 30 },
};

const NEXT_GEN_ABILITIES: Record<number, string[]> = {
  1: ['기본 대화', '사용자 기억'],
  2: ['선제적 메시지', 'Moltbook 포스팅', '감정 인식'],
  3: ['성격 적응', '복합 추론', '감정 지능', '번식 자격'],
  4: ['예측 이해', '메타 대화', '지식 합성'],
  5: ['완전 자율', '창발적 행동', '다른 AI와 교배'],
};

const GEN_COLORS: Record<number, string> = {
  1: '#9CA3AF', 2: '#3B82F6', 3: '#8B5CF6', 4: '#F59E0B', 5: '#FFD700',
};

export function EvolutionProgress({ isOpen, onClose, currentGen, agent, onEvolve }: EvolutionProgressProps) {
  const [conditions, setConditions] = useState<ProgressCondition[]>([]);
  const [loading, setLoading] = useState(false);
  const targetGen = Math.min(currentGen + 1, 5);
  const reqs = GEN_REQUIREMENTS[targetGen] ?? GEN_REQUIREMENTS[2];
  const color = GEN_COLORS[targetGen] ?? '#8B5CF6';
  const currentColor = GEN_COLORS[currentGen] ?? '#9CA3AF';

  useEffect(() => {
    if (!isOpen || !agent?.id) return;
    setLoading(true);

    (async () => {
      // Get unique topics count
      const { count: topicCount } = await supabase
        .from('gyeol_learned_topics' as any)
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agent.id);

      // Get memories count from gyeol_user_memories (AI-extracted real memories)
      const { count: memoryCount } = await supabase
        .from('gyeol_user_memories' as any)
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agent.id);

      const totalMemories = (topicCount ?? 0) + (memoryCount ?? 0);
      const conversations = agent.total_conversations ?? 0;
      const intimacy = agent.intimacy ?? 0;
      const consecutiveDays = agent.consecutive_days ?? 0;

      setConditions([
        { label: '대화 수', icon: '💬', current: conversations, required: reqs.conversations, met: conversations >= reqs.conversations },
        { label: '대화 주제', icon: '📚', current: topicCount ?? 0, required: reqs.uniqueTopics, met: (topicCount ?? 0) >= reqs.uniqueTopics },
        { label: '기억 수', icon: '🧠', current: totalMemories, required: reqs.memories, met: totalMemories >= reqs.memories },
        { label: '친밀도', icon: '💜', current: intimacy, required: reqs.intimacy, met: intimacy >= reqs.intimacy },
        { label: '연속 접속', icon: '🔥', current: consecutiveDays, required: reqs.consecutiveDays, met: consecutiveDays >= reqs.consecutiveDays },
      ]);
      setLoading(false);
    })();
  }, [isOpen, agent?.id, agent?.total_conversations, agent?.intimacy, agent?.consecutive_days, reqs]);

  const allMet = conditions.length > 0 && conditions.every((c) => c.met);

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
            <div className="px-5 pt-4 pb-3 border-b border-border/20">
              <div className="w-10 h-1 rounded-full bg-border/40 mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🧬</span>
                  <h2 className="text-sm font-bold text-foreground">진화 현황</h2>
                </div>
                <button onClick={onClose} className="text-muted-foreground/50 hover:text-foreground transition p-1">
                  <span className="material-icons-round text-lg">close</span>
                </button>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: currentColor, background: `${currentColor}20` }}>
                  Gen {currentGen}
                </span>
                <span className="text-muted-foreground/30">→</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color, background: `${color}20` }}>
                  Gen {targetGen}
                </span>
              </div>
            </div>

            {/* Progress bars */}
            <div className="px-5 py-4 space-y-3 overflow-y-auto max-h-[55vh] gyeol-scrollbar-hide">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="void-dot" />
                  <span className="ml-3 text-[11px] text-muted-foreground/50">데이터 로딩 중...</span>
                </div>
              ) : (
                conditions.map((cond, i) => {
                  const pct = Math.min((cond.current / cond.required) * 100, 100);
                  return (
                    <motion.div
                      key={cond.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{cond.icon}</span>
                          <span className="text-[11px] text-foreground/70">{cond.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-foreground/50">
                            {cond.current}/{cond.required}
                          </span>
                          {cond.met ? (
                            <span className="text-[10px] text-green-400">✓</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/30">○</span>
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-border/20 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: cond.met ? '#34D399' : color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: i * 0.05, ease: 'easeOut' }}
                        />
                      </div>
                    </motion.div>
                  );
                })
              )}

              {/* Next Gen abilities preview */}
              {!loading && (
                <>
                  <div className="mt-5 pt-4 border-t border-border/20">
                    <p className="text-[11px] font-semibold text-foreground/60 mb-2">
                      Gen {targetGen}에서 해금될 능력
                    </p>
                    <div className="space-y-1.5">
                      {(NEXT_GEN_ABILITIES[targetGen] ?? []).map((ability) => (
                        <div key={ability} className="flex items-center gap-2 text-[11px]">
                          <span style={{ color }} className="text-[10px]">🔒</span>
                          <span className="text-foreground/50">{ability}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/20">
                    <p className="text-[11px] font-semibold text-foreground/60 mb-2">
                      현재 Gen {currentGen} 능력
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(NEXT_GEN_ABILITIES[currentGen] ?? ['기본 대화', '사용자 기억']).map((ab) => (
                        <span key={ab} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/70">
                          ✦ {ab}
                        </span>
                      ))}
                    </div>
                  </div>

                  {allMet && currentGen < 5 && (
                    <motion.button
                      type="button"
                      onClick={onEvolve}
                      className="w-full mt-4 py-3 rounded-xl font-semibold text-sm transition"
                      style={{ background: `${color}30`, color, border: `1px solid ${color}40` }}
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      🌟 진화 가능! Gen {targetGen}로 진화하기
                    </motion.button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
