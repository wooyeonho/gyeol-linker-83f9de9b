/**
 * 대화 통계 컴포넌트 — 총 대화수, 평균 길이, 주제 분석
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';

interface ConversationStatsProps {
  agentId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ConversationStats({ agentId, isOpen, onClose }: ConversationStatsProps) {
  const [stats, setStats] = useState({
    total: 0, userMsgs: 0, aiMsgs: 0, avgLength: 0, topHour: '—',
  });

  useEffect(() => {
    if (!agentId || !isOpen) return;
    (async () => {
      const { data, count } = await supabase
        .from('gyeol_conversations')
        .select('role, content, created_at', { count: 'exact' })
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (!data) return;
      const msgs = data as any[];
      const userMsgs = msgs.filter(m => m.role === 'user').length;
      const aiMsgs = msgs.filter(m => m.role === 'assistant').length;
      const totalLen = msgs.reduce((a, m) => a + (m.content?.length ?? 0), 0);
      const avgLength = msgs.length > 0 ? Math.round(totalLen / msgs.length) : 0;

      // Find most active hour
      const hourCounts: Record<number, number> = {};
      msgs.forEach(m => {
        const h = new Date(m.created_at).getHours();
        hourCounts[h] = (hourCounts[h] ?? 0) + 1;
      });
      const topHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0];

      setStats({
        total: count ?? msgs.length,
        userMsgs, aiMsgs, avgLength,
        topHour: topHour ? `${topHour[0]}시` : '—',
      });
    })();
  }, [agentId, isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}
        className="glass-card rounded-2xl p-5 w-full max-w-[300px] space-y-4">
        <div className="flex items-center gap-2">
          <span className="material-icons-round text-primary">bar_chart</span>
          <h3 className="text-sm font-bold text-foreground">대화 통계</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: '총 대화', value: stats.total.toLocaleString(), icon: 'chat' },
            { label: '내 메시지', value: stats.userMsgs.toLocaleString(), icon: 'person' },
            { label: 'AI 메시지', value: stats.aiMsgs.toLocaleString(), icon: 'smart_toy' },
            { label: '평균 길이', value: `${stats.avgLength}자`, icon: 'text_fields' },
          ].map(s => (
            <div key={s.label} className="glass-card rounded-xl p-3 text-center">
              <span className="material-icons-round text-primary/50 text-sm">{s.icon}</span>
              <p className="text-lg font-bold text-foreground mt-1">{s.value}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <span className="material-icons-round text-secondary text-sm">schedule</span>
          <div>
            <p className="text-[11px] text-foreground/80">가장 활발한 시간</p>
            <p className="text-sm font-bold text-primary">{stats.topHour}</p>
          </div>
        </div>
        <button onClick={onClose} className="w-full py-2 text-[11px] text-muted-foreground hover:text-foreground transition">닫기</button>
      </motion.div>
    </motion.div>
  );
}
