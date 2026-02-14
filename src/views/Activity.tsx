import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGyeolStore } from '@/store/gyeol-store';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { AutonomousLog } from '@/lib/gyeol/types';

const TYPE_ICON: Record<string, string> = {
  learning: '📚',
  reflection: '💭',
  social: '🦞',
  proactive_message: '💌',
  skill_execution: '⚙️',
  error: '🛡️',
};

const TYPE_LABEL: Record<string, string> = {
  learning: '학습',
  reflection: '사색',
  social: '소셜',
  proactive_message: '메시지',
  skill_execution: '실행',
  error: '보안',
};

export default function ActivityPage() {
  const { agent } = useGyeolStore();
  const [logs, setLogs] = useState<AutonomousLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agent?.id) return;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/activity?agentId=${agent.id}&limit=30`);
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    })();
  }, [agent?.id]);

  const summary = {
    total: logs.length,
    learning: logs.filter((l) => l.activity_type === 'learning').length,
  };

  return (
    <main className="min-h-screen bg-black text-[#E5E5E5] p-6 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        <header className="flex items-center gap-4">
          <Link to="/" className="text-white/60 hover:text-white text-sm">← GYEOL</Link>
          <h1 className="text-xl font-semibold">활동 피드</h1>
        </header>

        <div className="rounded-2xl bg-[#0A0A1A] border border-white/10 p-4">
          <p className="text-sm text-white/70">
            오늘 활동 <span className="text-indigo-400 font-medium">{summary.total}</span>회
            {summary.learning > 0 && (
              <> · 학습 <span className="text-indigo-400">+{summary.learning}</span>건</>
            )}
          </p>
        </div>

        {loading ? (
          <div className="text-center text-white/50 py-8">불러오는 중...</div>
        ) : (
          <ul className="space-y-3">
            {logs.map((log) => (
              <li key={log.id} className="flex items-start gap-3 rounded-xl bg-[#0A0A1A] border border-white/5 p-3">
                <span className="text-lg">{TYPE_ICON[log.activity_type] ?? '•'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/50">
                    {format(new Date(log.created_at), 'HH:mm', { locale: ko })} · {TYPE_LABEL[log.activity_type] ?? log.activity_type}
                  </p>
                  <p className="text-sm text-white/90 truncate">{log.summary ?? '-'}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && logs.length === 0 && (
          <p className="text-center text-white/50 py-8">아직 활동 기록이 없어요.</p>
        )}
      </div>
    </main>
  );
}
