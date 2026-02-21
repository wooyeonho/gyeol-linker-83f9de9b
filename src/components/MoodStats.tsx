/**
 * 무드 통계 — 전체 기분 분포 및 트렌드
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊', excited: '🤩', neutral: '🙂', sad: '😢',
  lonely: '🥺', tired: '😴', anxious: '😰', curious: '🤔',
  proud: '😤', grateful: '🥹', playful: '😜', focused: '🧐',
  melancholic: '😔', hopeful: '✨', surprised: '😲', loving: '🥰',
};

export function MoodStats({ agentId }: { agentId?: string }) {
  const [distribution, setDistribution] = useState<{ mood: string; count: number }[]>([]);

  useEffect(() => {
    if (!agentId) return;
    (async () => {
      const { data } = await supabase
        .from('gyeol_conversation_insights')
        .select('emotion_arc')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!data) return;
      const counts: Record<string, number> = {};
      (data ?? []).forEach(d => {
        const m = d.emotion_arc || 'neutral';
        counts[m] = (counts[m] ?? 0) + 1;
      });
      const sorted = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .map(([mood, count]) => ({ mood, count }));
      setDistribution(sorted);
    })();
  }, [agentId]);

  if (distribution.length === 0) return null;

  const total = distribution.reduce((a, d) => a + d.count, 0);
  const topMood = distribution[0];

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span aria-hidden="true" className="material-icons-round text-primary/50 text-sm">mood</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Mood Overview</span>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{MOOD_EMOJI[topMood.mood] ?? '🙂'}</span>
        <div>
          <p className="text-sm font-bold text-foreground capitalize">{topMood.mood}</p>
          <p className="text-[9px] text-muted-foreground">가장 많은 감정 ({Math.round(topMood.count / total * 100)}%)</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {distribution.slice(0, 5).map(d => (
          <div key={d.mood} className="flex items-center gap-2">
            <span className="text-sm w-6 text-center">{MOOD_EMOJI[d.mood] ?? '🙂'}</span>
            <div className="flex-1 h-1.5 rounded-full bg-muted/30">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                initial={{ width: 0 }}
                animate={{ width: `${(d.count / total) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground w-8 text-right">{d.count}회</span>
          </div>
        ))}
      </div>
    </div>
  );
}
