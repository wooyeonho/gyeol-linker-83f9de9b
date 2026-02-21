/**
 * 기분 히스토리 차트 — 감정 타임라인 시각화 (개선판)
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/src/integrations/supabase/client';

interface MoodEntry {
  mood: string;
  created_at: string;
}

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊', excited: '🤩', neutral: '🙂', sad: '😢',
  lonely: '🥺', tired: '😴', anxious: '😰', curious: '🤔',
  proud: '😤', grateful: '🥹', playful: '😜', focused: '🧐',
  melancholic: '😔', hopeful: '✨', surprised: '😲', loving: '🥰',
};

const MOOD_SCORE: Record<string, number> = {
  excited: 95, happy: 85, loving: 80, grateful: 78, proud: 75,
  playful: 72, hopeful: 68, curious: 65, focused: 60, surprised: 55,
  neutral: 50, tired: 40, melancholic: 35, anxious: 30, lonely: 25, sad: 20,
};

export function MoodHistory({ agentId }: { agentId?: string }) {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!agentId) return;
    (async () => {
      const { data } = await supabase
        .from('gyeol_conversation_insights')
        .select('emotion_arc, created_at')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(14);
      if (data) {
        setEntries((data as any[]).map((d) => ({
          mood: d.emotion_arc || 'neutral',
          created_at: d.created_at,
        })).reverse());
      }
      setLoading(false);
    })();
  }, [agentId]);

  if (loading) return null;
  if (entries.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span aria-hidden="true" className="material-icons-round text-primary/50 text-sm">timeline</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Emotion Timeline</span>
        </div>
        <p className="text-center py-3 text-muted-foreground text-[11px]">
          대화를 더 나누면 감정 히스토리가 생성됩니다
        </p>
      </div>
    );
  }

  const maxScore = 100;
  const chartHeight = 80;

  return (
    <div className="glass-card rounded-2xl p-4" role="region" aria-label="감정 히스토리">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="material-icons-round text-primary/50 text-sm">timeline</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Emotion Timeline</span>
        </div>
        <span className="text-[9px] text-muted-foreground/50">{entries.length}일</span>
      </div>

      {/* SVG Line Chart */}
      <div className="relative" style={{ height: chartHeight }}>
        <svg width="100%" height={chartHeight} viewBox={`0 0 ${entries.length * 24} ${chartHeight}`} preserveAspectRatio="none">
          {/* Gradient fill */}
          <defs>
            <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path
            d={
              `M0,${chartHeight} ` +
              entries.map((e, i) => {
                const x = i * 24 + 12;
                const score = MOOD_SCORE[e.mood] ?? 50;
                const y = chartHeight - (score / maxScore) * (chartHeight - 10);
                return `L${x},${y}`;
              }).join(' ') +
              ` L${(entries.length - 1) * 24 + 12},${chartHeight} Z`
            }
            fill="url(#moodGrad)"
          />

          {/* Line */}
          <path
            d={entries.map((e, i) => {
              const x = i * 24 + 12;
              const score = MOOD_SCORE[e.mood] ?? 50;
              const y = chartHeight - (score / maxScore) * (chartHeight - 10);
              return `${i === 0 ? 'M' : 'L'}${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Interactive dots */}
        <div className="absolute inset-0 flex items-end">
          {entries.map((e, i) => {
            const score = MOOD_SCORE[e.mood] ?? 50;
            const bottom = (score / maxScore) * (chartHeight - 10);
            const emoji = MOOD_EMOJI[e.mood] ?? '🙂';
            return (
              <div
                key={i}
                className="flex-1 relative cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <motion.div
                  className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary shadow-sm shadow-primary/40"
                  style={{ bottom: bottom - 4 }}
                  initial={{ scale: 0 }}
                  animate={{ scale: hoveredIdx === i ? 1.8 : 1 }}
                  transition={{ delay: i * 0.03 }}
                />
                {hoveredIdx === i && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute left-1/2 -translate-x-1/2 bg-card border border-border/20 rounded-lg px-2 py-1 text-center z-10 shadow-lg"
                    style={{ bottom: bottom + 10 }}
                  >
                    <span className="text-sm">{emoji}</span>
                    <p className="text-[8px] text-muted-foreground whitespace-nowrap">
                      {new Date(e.created_at).toLocaleDateString('ko', { month: 'short', day: 'numeric' })}
                    </p>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Date labels */}
      <div className="flex justify-between text-[8px] text-muted-foreground/40 mt-1">
        <span>{entries[0] ? new Date(entries[0].created_at).toLocaleDateString('ko', { month: 'short', day: 'numeric' }) : ''}</span>
        <span>{entries[entries.length - 1] ? new Date(entries[entries.length - 1].created_at).toLocaleDateString('ko', { month: 'short', day: 'numeric' }) : ''}</span>
      </div>

      {/* Mood distribution */}
      <div className="flex flex-wrap gap-1 mt-3 justify-center">
        {Object.entries(
          entries.reduce((acc, e) => { acc[e.mood] = (acc[e.mood] || 0) + 1; return acc; }, {} as Record<string, number>)
        )
          .sort(([, a], [, b]) => b - a)
          .slice(0, 4)
          .map(([mood, count]) => (
            <span key={mood} className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/70">
              {MOOD_EMOJI[mood] ?? '🙂'} {count}회
            </span>
          ))}
      </div>
    </div>
  );
}
