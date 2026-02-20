/**
 * Phase 3: 감정 히스토리 그래프
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const MOOD_COLORS: Record<string, string> = {
  happy: 'bg-emerald-400', excited: 'bg-amber-400', neutral: 'bg-slate-400',
  sad: 'bg-blue-400', lonely: 'bg-purple-400', tired: 'bg-gray-400',
  anxious: 'bg-orange-400', curious: 'bg-cyan-400', proud: 'bg-rose-400',
  grateful: 'bg-pink-400', playful: 'bg-yellow-400', focused: 'bg-indigo-400',
  melancholic: 'bg-violet-400', hopeful: 'bg-teal-400', surprised: 'bg-red-400',
  loving: 'bg-pink-500',
};

export function MoodHistory({ agentId }: { agentId?: string }) {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) return;
    (async () => {
      // Use conversation_insights emotion_arc as mood history proxy
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
      <div className="text-center py-4 text-muted-foreground text-[11px]">
        대화를 더 나누면 감정 히스토리가 생성됩니다
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <span className="material-icons-round text-[14px] text-primary/50">timeline</span>
        Emotion Timeline
      </h3>
      <div className="flex items-end gap-1.5 h-16">
        {entries.map((e, i) => {
          const emoji = MOOD_EMOJI[e.mood] ?? '🙂';
          const color = MOOD_COLORS[e.mood] ?? 'bg-slate-400';
          const height = 20 + Math.random() * 30; // visual variety
          return (
            <motion.div
              key={i}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height, opacity: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="flex flex-col items-center gap-1 flex-1"
            >
              <span className="text-[10px]">{emoji}</span>
              <div className={`w-full rounded-t-sm ${color}`} style={{ height: `${height}%`, opacity: 0.6 }} />
            </motion.div>
          );
        })}
      </div>
      <div className="flex justify-between text-[8px] text-muted-foreground/50">
        <span>{entries[0] ? new Date(entries[0].created_at).toLocaleDateString('ko', { month: 'short', day: 'numeric' }) : ''}</span>
        <span>{entries[entries.length - 1] ? new Date(entries[entries.length - 1].created_at).toLocaleDateString('ko', { month: 'short', day: 'numeric' }) : ''}</span>
      </div>
    </div>
  );
}
