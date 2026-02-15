'use client';

/**
 * GYEOL 활동 피드 — OpenClaw 서버 자율 활동 로그
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useGyeolStore } from '@/store/gyeol-store';

interface ActivityLog {
  id: string;
  activity_type: string;
  summary: string;
  created_at: string;
}

interface ServerStatus {
  connected: boolean;
  version?: string;
  uptime_seconds?: number;
  conversations_count?: number;
  learned_topics_count?: number;
  personality?: Record<string, number>;
  last_heartbeat?: string;
}

const TYPE_ICON: Record<string, string> = {
  learning: '📚',
  reflection: '💭',
  social: '🤝',
  proactive_message: '💌',
  skill_execution: '⚙️',
  error: '🛡️',
};

const TYPE_LABEL: Record<string, string> = {
  learning: '학습',
  reflection: '사색',
  social: '소셜',
  proactive_message: '메시지',
  skill_execution: '스킬',
  error: '보안',
};

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function GyeolActivityPage() {
  const { agent } = useGyeolStore();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const agentId = agent?.id || '00000000-0000-0000-0000-000000000002';
    setLoading(true);

    const [activityRes, statusRes] = await Promise.allSettled([
      fetch(`/api/activity?agentId=${agentId}&limit=30`),
      fetch('/api/agent/status'),
    ]);

    if (activityRes.status === 'fulfilled' && activityRes.value.ok) {
      const data = await activityRes.value.json();
      setLogs(Array.isArray(data) ? data : []);
    }

    if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
      const data = await statusRes.value.json();
      setStatus(data);
    }

    setLoading(false);
  }, [agent?.id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const summary = {
    total: logs.length,
    learning: logs.filter((l) => l.activity_type === 'learning').length,
    reflection: logs.filter((l) => l.activity_type === 'reflection').length,
    skill: logs.filter((l) => l.activity_type === 'skill_execution').length,
  };

  return (
    <main className="min-h-screen bg-black text-[#E5E5E5] p-6 pb-24">
      <div className="max-w-md mx-auto space-y-4">
        <header className="flex items-center gap-4">
          <Link href="/" className="text-white/60 hover:text-white text-sm">
            ← GYEOL
          </Link>
          <h1 className="text-xl font-semibold">활동 피드</h1>
          <button
            onClick={fetchData}
            className="ml-auto text-xs text-indigo-400 hover:text-indigo-300"
          >
            새로고침
          </button>
        </header>

        {status && (
          <div className="rounded-2xl bg-[#0A0A1A] border border-white/10 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${status.connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-white/70">
                OpenClaw {status.version || ''} {status.connected ? '연결됨' : '연결 안 됨'}
              </span>
              {status.uptime_seconds != null && (
                <span className="text-xs text-white/40 ml-auto">
                  {formatUptime(status.uptime_seconds)} 가동
                </span>
              )}
            </div>
            <div className="flex gap-4 text-xs text-white/50">
              {status.conversations_count != null && (
                <span>대화 {status.conversations_count}회</span>
              )}
              {status.learned_topics_count != null && (
                <span>학습 {status.learned_topics_count}건</span>
              )}
              {status.last_heartbeat && (
                <span>마지막 하트비트 {formatTime(status.last_heartbeat)}</span>
              )}
            </div>
            {status.personality && (
              <div className="flex gap-2 flex-wrap text-xs">
                {Object.entries(status.personality).map(([trait, value]) => (
                  <span key={trait} className="bg-white/5 rounded px-2 py-0.5 text-white/60">
                    {trait} {value}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl bg-[#0A0A1A] border border-white/10 p-4">
          <p className="text-sm text-white/70">
            활동 <span className="text-indigo-400 font-medium">{summary.total}</span>회
            {summary.learning > 0 && (
              <> · 학습 <span className="text-indigo-400">+{summary.learning}</span></>
            )}
            {summary.reflection > 0 && (
              <> · 사색 <span className="text-purple-400">+{summary.reflection}</span></>
            )}
            {summary.skill > 0 && (
              <> · 스킬 <span className="text-blue-400">+{summary.skill}</span></>
            )}
          </p>
        </div>

        {loading ? (
          <div className="text-center text-white/50 py-8">불러오는 중...</div>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex items-start gap-3 rounded-xl bg-[#0A0A1A] border border-white/5 p-3"
              >
                <span className="text-lg">{TYPE_ICON[log.activity_type] ?? '•'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/50">
                    {formatTime(log.created_at)} · {TYPE_LABEL[log.activity_type] ?? log.activity_type}
                  </p>
                  <p className="text-sm text-white/90">{log.summary ?? '-'}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && logs.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <p className="text-white/50">아직 활동 기록이 없어요.</p>
            <p className="text-xs text-white/30">
              OpenClaw 서버가 30분마다 자동으로 활동합니다
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
