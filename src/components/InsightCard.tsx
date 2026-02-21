/**
 * 인사이트 카드 — 대화 분석 리포트 (개선판)
 */
import { motion, AnimatePresence } from 'framer-motion';

interface ConversationInsight {
  topics: string[];
  emotionArc: string;
  whatWorked: string;
  whatToImprove: string;
  personalityChanged: boolean;
  changes: Record<string, number>;
}

interface InsightCardProps {
  insight: ConversationInsight | null;
  onDismiss: () => void;
}

const STAT_LABELS: Record<string, string> = {
  warmth: '따뜻함',
  logic: '논리',
  creativity: '창의성',
  energy: '에너지',
  humor: '유머',
};

const EMOTION_EMOJI: Record<string, string> = {
  happy: '😊', excited: '🤩', neutral: '🙂', sad: '😢',
  curious: '🤔', proud: '😤', grateful: '🥹', hopeful: '✨',
};

export function InsightCard({ insight, onDismiss }: InsightCardProps) {
  if (!insight) return null;

  const emotionEmoji = EMOTION_EMOJI[insight.emotionArc] ?? '🙂';
  const totalChanges = Object.values(insight.changes).reduce((s, v) => s + Math.abs(v), 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 200 }}
        className="fixed bottom-[calc(56px+env(safe-area-inset-bottom,8px)+70px)] left-3 right-3 z-40 max-w-md mx-auto"
        role="complementary"
        aria-label="대화 인사이트 리포트"
      >
        <div className="glass-panel rounded-2xl p-4 relative overflow-hidden">
          {/* Decorative accent */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />

          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">💡</span>
              <span className="text-[11px] font-bold text-foreground/80">대화 인사이트 리포트</span>
              <span className="text-sm">{emotionEmoji}</span>
            </div>
            <button onClick={onDismiss} className="text-muted-foreground/40 hover:text-foreground transition" aria-label="닫기">
              <span className="material-icons-round text-sm">close</span>
            </button>
          </div>

          {/* Topics */}
          <div className="mb-3">
            <p className="text-[9px] text-muted-foreground/50 mb-1.5 uppercase tracking-wider">이번 대화 주제</p>
            <div className="flex flex-wrap gap-1">
              {insight.topics.map((t) => (
                <motion.span
                  key={t}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/80"
                >
                  {t}
                </motion.span>
              ))}
            </div>
          </div>

          {/* What worked / to improve */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-xl bg-[hsl(var(--success,142_71%_45%)/0.05)] border border-[hsl(var(--success,142_71%_45%)/0.1)] p-2.5">
              <p className="text-[8px] text-[hsl(var(--success,142_71%_45%)/0.7)] font-bold mb-1 uppercase tracking-wider">✦ 효과적</p>
              <p className="text-[10px] text-foreground/70 leading-relaxed">{insight.whatWorked}</p>
            </div>
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-2.5">
              <p className="text-[8px] text-amber-400/70 font-bold mb-1 uppercase tracking-wider">↗ 개선점</p>
              <p className="text-[10px] text-foreground/70 leading-relaxed">{insight.whatToImprove}</p>
            </div>
          </div>

          {/* Personality changes with animated bars */}
          {insight.personalityChanged && Object.keys(insight.changes).length > 0 && (
            <div className="pt-2 border-t border-border/10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] text-muted-foreground/50">📊 성격 변화</p>
                <p className="text-[8px] text-primary/50 font-bold">총 {totalChanges}p</p>
              </div>
              <div className="space-y-1.5">
                {Object.entries(insight.changes).map(([key, val], i) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[9px] text-foreground/50 w-10 text-right shrink-0">{STAT_LABELS[key] ?? key}</span>
                    <div className="flex-1 h-2 rounded-full bg-border/10 overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, Math.abs(val) * 15)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 * i }}
                        className={`h-full rounded-full ${val > 0 ? 'bg-[hsl(var(--success,142_71%_45%)/0.6)]' : 'bg-destructive/60'}`}
                      />
                    </div>
                    <span className={`text-[10px] font-bold w-6 shrink-0 ${val > 0 ? 'text-[hsl(var(--success,142_71%_45%))]' : 'text-destructive'}`}>
                      {val > 0 ? `+${val}` : val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dismiss */}
          <button
            onClick={onDismiss}
            className="w-full mt-3 text-[9px] text-muted-foreground/30 hover:text-muted-foreground/50 transition text-center"
          >
            탭하여 닫기
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
