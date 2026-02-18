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

export function InsightCard({ insight, onDismiss }: InsightCardProps) {
  if (!insight) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 200 }}
        className="fixed bottom-[calc(56px+env(safe-area-inset-bottom,8px)+70px)] left-3 right-3 z-40 max-w-md mx-auto"
      >
        <div className="rounded-2xl bg-card/95 backdrop-blur-md border border-border/30 p-4 shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">💡</span>
              <span className="text-[11px] font-bold text-foreground/80">대화 인사이트 리포트</span>
            </div>
            <button onClick={onDismiss} className="text-muted-foreground/40 hover:text-foreground transition">
              <span className="material-icons-round text-sm">close</span>
            </button>
          </div>

          {/* Topics */}
          <p className="text-[10px] text-muted-foreground/60 mb-1">이번 대화 주제</p>
          <div className="flex flex-wrap gap-1 mb-3">
            {insight.topics.map((t) => (
              <span key={t} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/80">
                {t}
              </span>
            ))}
          </div>

          {/* What worked / to improve */}
          <div className="space-y-2 mb-3">
            <div>
              <p className="text-[9px] text-green-400/70 font-medium">✦ 효과적이었던 점</p>
              <p className="text-[11px] text-foreground/70 mt-0.5">{insight.whatWorked}</p>
            </div>
            <div>
              <p className="text-[9px] text-yellow-400/70 font-medium">↗ 개선할 점</p>
              <p className="text-[11px] text-foreground/70 mt-0.5">{insight.whatToImprove}</p>
            </div>
          </div>

          {/* Personality changes */}
          {insight.personalityChanged && Object.keys(insight.changes).length > 0 && (
            <div className="pt-2 border-t border-border/20">
              <p className="text-[9px] text-muted-foreground/50 mb-1.5">📊 성격 변화</p>
              <div className="flex gap-3">
                {Object.entries(insight.changes).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-1">
                    <span className="text-[10px] text-foreground/60">{STAT_LABELS[key] ?? key}</span>
                    <span className={`text-[10px] font-bold ${val > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {val > 0 ? `+${val}` : val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dismiss hint */}
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
