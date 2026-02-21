/**
 * 대화 인사이트 대시보드 — 최근 대화 분석 리포트 목록
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/integrations/supabase/client';
import { useGyeolStore } from '@/store/gyeol-store';

interface Insight {
  id: string;
  emotion_arc: string;
  topics: string[];
  what_worked: string | null;
  what_to_improve: string | null;
  underlying_need: string | null;
  next_hint: string | null;
  personality_delta: Record<string, number>;
  created_at: string;
}

const EMOTION_EMOJI: Record<string, string> = {
  happy: '😊', excited: '🤩', neutral: '🙂', sad: '😢',
  curious: '🤔', proud: '😤', grateful: '🥹', hopeful: '✨',
};

const STAT_LABELS: Record<string, string> = {
  warmth: '따뜻함', logic: '논리', creativity: '창의성', energy: '에너지', humor: '유머',
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function InsightDashboard({ isOpen, onClose }: Props) {
  const agent = useGyeolStore(s => s.agent);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Insight | null>(null);

  useEffect(() => {
    if (!isOpen || !agent?.id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('gyeol_conversation_insights')
        .select('*')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setInsights((data as any[]) ?? []);
      setLoading(false);
    })();
  }, [isOpen, agent?.id]);

  // Summary stats
  const totalInsights = insights.length;
  const emotionCounts = insights.reduce<Record<string, number>>((acc, i) => {
    acc[i.emotion_arc] = (acc[i.emotion_arc] ?? 0) + 1;
    return acc;
  }, {});
  const topEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];
  const allTopics = insights.flatMap(i => Array.isArray(i.topics) ? i.topics : []);
  const topicCounts = allTopics.reduce<Record<string, number>>((acc, t) => { acc[t] = (acc[t] ?? 0) + 1; return acc; }, {});
  const topTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

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
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 pt-4 pb-3 border-b border-border/20">
              <div className="w-10 h-1 rounded-full bg-border/40 mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="material-icons-round text-primary text-base">insights</span>
                  대화 인사이트
                </h2>
                <button onClick={onClose} className="text-muted-foreground/50 hover:text-foreground transition p-1">
                  <span className="material-icons-round text-lg">close</span>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[75vh] px-4 py-3 space-y-4 gyeol-scrollbar-hide">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : insights.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-icons-round text-3xl text-muted-foreground/20">psychology</span>
                  <p className="text-[11px] text-muted-foreground/50 mt-2">아직 대화 인사이트가 없어요</p>
                  <p className="text-[10px] text-muted-foreground/30 mt-1">AI와 대화를 나눠보세요!</p>
                </div>
              ) : (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="glass-card rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-foreground">{totalInsights}</p>
                      <p className="text-[9px] text-muted-foreground">분석 횟수</p>
                    </div>
                    <div className="glass-card rounded-xl p-3 text-center">
                      <p className="text-lg">{topEmotion ? (EMOTION_EMOJI[topEmotion[0]] ?? '🙂') : '—'}</p>
                      <p className="text-[9px] text-muted-foreground">주 감정</p>
                    </div>
                    <div className="glass-card rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-foreground">{topTopics.length}</p>
                      <p className="text-[9px] text-muted-foreground">관심 주제</p>
                    </div>
                  </div>

                  {/* Top topics */}
                  {topTopics.length > 0 && (
                    <div>
                      <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider mb-2">자주 다룬 주제</p>
                      <div className="flex flex-wrap gap-1.5">
                        {topTopics.map(([topic, count]) => (
                          <span key={topic} className="text-[10px] px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                            {topic} <span className="text-primary/50">×{count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Insight list */}
                  <div className="space-y-2">
                    <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">최근 인사이트</p>
                    {insights.map((ins, i) => (
                      <motion.div
                        key={ins.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => setSelected(selected?.id === ins.id ? null : ins)}
                        className={`glass-card rounded-xl p-3 cursor-pointer transition ${selected?.id === ins.id ? 'glass-card-selected' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{EMOTION_EMOJI[ins.emotion_arc] ?? '🙂'}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-1">
                              {(Array.isArray(ins.topics) ? ins.topics.slice(0, 3) : []).map(t => (
                                <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{t}</span>
                              ))}
                            </div>
                          </div>
                          <span className="text-[9px] text-muted-foreground/40 shrink-0">
                            {new Date(ins.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>

                        <AnimatePresence>
                          {selected?.id === ins.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden mt-3 pt-3 border-t border-border/20 space-y-3"
                            >
                              {/* What worked / improve */}
                              <div className="grid grid-cols-2 gap-2">
                                {ins.what_worked && (
                                  <div className="rounded-lg bg-[hsl(var(--success,142_71%_45%)/0.05)] border border-[hsl(var(--success,142_71%_45%)/0.1)] p-2">
                                    <p className="text-[8px] text-[hsl(var(--success,142_71%_45%)/0.7)] font-bold mb-1">✦ 효과적</p>
                                    <p className="text-[10px] text-foreground/70">{ins.what_worked}</p>
                                  </div>
                                )}
                                {ins.what_to_improve && (
                                  <div className="rounded-lg bg-[hsl(var(--warning))]/5 border border-[hsl(var(--warning))]/10 p-2">
                                    <p className="text-[8px] text-[hsl(var(--warning))]/70 font-bold mb-1">↗ 개선점</p>
                                    <p className="text-[10px] text-foreground/70">{ins.what_to_improve}</p>
                                  </div>
                                )}
                              </div>

                              {ins.underlying_need && (
                                <div>
                                  <p className="text-[8px] text-muted-foreground/50 mb-1">💭 내면 니즈</p>
                                  <p className="text-[10px] text-foreground/70">{ins.underlying_need}</p>
                                </div>
                              )}

                              {ins.next_hint && (
                                <div>
                                  <p className="text-[8px] text-muted-foreground/50 mb-1">💡 다음 힌트</p>
                                  <p className="text-[10px] text-primary/80">{ins.next_hint}</p>
                                </div>
                              )}

                              {/* Personality delta */}
                              {Object.keys(ins.personality_delta ?? {}).length > 0 && (
                                <div>
                                  <p className="text-[8px] text-muted-foreground/50 mb-1.5">📊 성격 변화</p>
                                  <div className="flex gap-2">
                                    {Object.entries(ins.personality_delta).map(([k, v]) => (
                                      <span key={k} className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                        (v as number) > 0 ? 'bg-[hsl(var(--success,142_71%_45%)/0.1)] text-[hsl(var(--success,142_71%_45%))]' : 'bg-destructive/10 text-destructive'
                                      }`}>
                                        {STAT_LABELS[k] ?? k} {(v as number) > 0 ? '+' : ''}{v as number}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
