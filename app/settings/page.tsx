'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useGyeolStore } from '@/store/gyeol-store';
import { subscribePush, unsubscribePush } from '@/lib/gyeol/push';

import { DEMO_USER_ID } from '@/lib/gyeol/constants';
const BYOK_PROVIDERS = ['openai', 'anthropic', 'deepseek', 'groq', 'gemini', 'cloudflare', 'ollama'] as const;

export default function GyeolSettingsPage() {
  const { agent } = useGyeolStore();
  const [autonomyLevel, setAutonomyLevel] = useState(50);
  const [contentFilterOn, setContentFilterOn] = useState(true);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [byokList, setByokList] = useState<{ id: string; provider: string; masked: string }[]>([]);
  const [byokOpen, setByokOpen] = useState<string | null>(null);
  const [byokKey, setByokKey] = useState('');
  const [byokSaving, setByokSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [killSwitchLoading, setKillSwitchLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [openclawStatus, setOpenclawStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    fetch(`/api/byok?userId=${encodeURIComponent(DEMO_USER_ID)}`)
      .then((r) => r.ok ? r.json() : [])
      .then((list: { provider: string; masked?: string }[]) => setByokList(list.map((x) => ({ ...x, id: x.provider, masked: x.masked ?? '****' }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/admin/status')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setOpenclawStatus(data?.openclaw ? 'connected' : 'disconnected'))
      .catch(() => setOpenclawStatus('disconnected'));
  }, []);

  useEffect(() => {
    if (!agent?.id) return;
    fetch(`/api/settings?agentId=${encodeURIComponent(agent.id)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        if (typeof data.autonomyLevel === 'number') setAutonomyLevel(data.autonomyLevel);
        if (typeof data.contentFilterOn === 'boolean') setContentFilterOn(data.contentFilterOn);
        if (typeof data.notificationsOn === 'boolean') setNotificationsOn(data.notificationsOn);
      })
      .catch(() => {});
  }, [agent?.id]);

  const saveSettings = useCallback(async (patch: Record<string, unknown>) => {
    if (!agent?.id) return;
    setSettingsSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, ...patch }),
      });
    } finally {
      setSettingsSaving(false);
    }
  }, [agent?.id]);

  const toggleKillSwitch = async () => {
    setKillSwitchLoading(true);
    try {
      const action = killSwitchActive ? 'deactivate' : 'activate';
      const res = await fetch('/api/admin/kill-switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${prompt('Kill Switch 토큰을 입력하세요:') ?? ''}`,
        },
        body: JSON.stringify({ action, reason: 'User triggered from settings' }),
      });
      if (res.ok) {
        setKillSwitchActive(!killSwitchActive);
      }
    } finally {
      setKillSwitchLoading(false);
    }
  };

  const saveByok = async (provider: string) => {
    if (!byokKey.trim()) return;
    setByokSaving(true);
    try {
      const res = await fetch('/api/byok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: DEMO_USER_ID, provider, apiKey: byokKey.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setByokList((prev) => [...prev.filter((x) => x.provider !== provider), { id: data.id ?? provider, provider, masked: data.masked ?? '****' }]);
        setByokOpen(null);
        setByokKey('');
      }
    } finally {
      setByokSaving(false);
    }
  };

  const personality = agent
    ? [agent.warmth, agent.logic, agent.creativity, agent.energy, agent.humor]
    : [50, 50, 50, 50, 50];
  const labels = ['따뜻함', '논리', '창의', '에너지', '유머'];

  return (
    <main className="min-h-screen bg-black text-[#E5E5E5] p-6 pb-24">
      <div className="max-w-md mx-auto space-y-8">
        <header className="flex items-center gap-4">
          <Link href="/" className="text-white/60 hover:text-white text-sm">
            ← GYEOL
          </Link>
          <h1 className="text-xl font-semibold">설정</h1>
        </header>

        <section className="rounded-2xl bg-[#0A0A1A] border border-white/10 p-5 space-y-4">
          <h2 className="text-sm font-medium text-white/80">My AI</h2>
          <div>
            <p className="text-xs text-white/50 mb-1">에이전트 이름</p>
            <p className="text-white">{agent?.name ?? 'GYEOL'}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">Gen {agent?.gen ?? 1}</span>
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${Number(agent?.evolution_progress ?? 0)}%` }}
              />
            </div>
            <span className="text-xs text-white/50">{Number(agent?.evolution_progress ?? 0).toFixed(0)}%</span>
          </div>
          <div className="grid grid-cols-5 gap-1 text-center">
            {labels.map((label, i) => (
              <div key={label}>
                <p className="text-[10px] text-white/50">{label}</p>
                <p className="text-xs text-indigo-400">{personality[i]}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-[#0A0A1A] border border-white/10 p-5 space-y-4">
          <h2 className="text-sm font-medium text-white/80">AI 엔진</h2>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <div>
              <p className="text-sm text-white">GYEOL 엔진 활성</p>
              <p className="text-xs text-white/40">별도 설정 없이 바로 대화 가능</p>
            </div>
          </div>
          {openclawStatus === 'connected' && (
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <div>
                <p className="text-sm text-white">OpenClaw 서버 연결됨</p>
                <p className="text-xs text-white/40">자율 에이전트 활성</p>
              </div>
            </div>
          )}
          {byokList.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <div>
                <p className="text-sm text-white">프리미엄 모델 사용 중</p>
                <p className="text-xs text-white/40">{byokList.map((x) => x.provider).join(', ')}</p>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-[#0A0A1A] border border-white/10 p-5 space-y-4">
          <h2 className="text-sm font-medium text-white/80">설정</h2>
          <div className="flex justify-between items-center">
            <span className="text-sm">자율 수준</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50 w-6 text-right">{autonomyLevel}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={autonomyLevel}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setAutonomyLevel(v);
                }}
                onMouseUp={() => saveSettings({ autonomyLevel })}
                onTouchEnd={() => saveSettings({ autonomyLevel })}
                className="w-24 accent-indigo-500"
              />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">콘텐츠 필터</span>
            <button
              type="button"
              onClick={() => {
                const next = !contentFilterOn;
                setContentFilterOn(next);
                saveSettings({ contentFilterOn: next });
              }}
              className={`w-10 h-6 rounded-full transition ${contentFilterOn ? 'bg-indigo-500' : 'bg-white/20'}`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white mt-1 transition ${contentFilterOn ? 'ml-5' : 'ml-1'}`}
              />
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">활동 알림</span>
            <button
              type="button"
              onClick={() => {
                const next = !notificationsOn;
                setNotificationsOn(next);
                saveSettings({ notificationsOn: next });
              }}
              className={`w-10 h-6 rounded-full transition ${notificationsOn ? 'bg-indigo-500' : 'bg-white/20'}`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white mt-1 transition ${notificationsOn ? 'ml-5' : 'ml-1'}`}
              />
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">푸시 알림</span>
            <button
              type="button"
              disabled={pushLoading}
              onClick={async () => {
                setPushLoading(true);
                try {
                  if (pushEnabled) {
                    await unsubscribePush();
                    setPushEnabled(false);
                  } else if (agent?.id) {
                    const ok = await subscribePush(agent.id);
                    setPushEnabled(ok);
                  }
                } finally {
                  setPushLoading(false);
                }
              }}
              className={`w-10 h-6 rounded-full transition ${pushEnabled ? 'bg-indigo-500' : 'bg-white/20'} disabled:opacity-50`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white mt-1 transition ${pushEnabled ? 'ml-5' : 'ml-1'}`}
              />
            </button>
          </div>
          {settingsSaving && <p className="text-xs text-indigo-400">저장 중...</p>}
        </section>

        <section className="rounded-2xl bg-[#0A0A1A] border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-5 flex justify-between items-center text-left"
          >
            <h2 className="text-sm font-medium text-white/80">고급 설정</h2>
            <span className="text-xs text-white/40">{showAdvanced ? '접기' : '펼치기'}</span>
          </button>
          {showAdvanced && (
            <div className="px-5 pb-5 space-y-6">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-white/70">프리미엄 AI 모델 (선택사항)</p>
                  <p className="text-xs text-white/40">내 API 키를 등록하면 더 강력한 모델 사용 가능</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {BYOK_PROVIDERS.map((provider) => {
                    const isRegistered = byokList.some((x) => x.provider === provider);
                    return (
                      <div key={provider} className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => setByokOpen(byokOpen === provider ? null : provider)}
                          className={`rounded-xl border py-2 text-sm capitalize transition ${
                            isRegistered
                              ? 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10'
                              : 'border-white/10 text-white/50 hover:bg-white/5'
                          }`}
                        >
                          {provider}
                        </button>
                        {byokOpen === provider && (
                          <div className="flex gap-1">
                            <input
                              type="password"
                              placeholder="API Key"
                              value={byokKey}
                              onChange={(e) => setByokKey(e.target.value)}
                              className="flex-1 rounded-lg bg-black/50 border border-white/10 px-2 py-1 text-sm text-white placeholder:text-white/40"
                            />
                            <button
                              type="button"
                              disabled={byokSaving || !byokKey.trim()}
                              onClick={() => saveByok(provider)}
                              className="rounded-lg bg-indigo-500/30 text-indigo-300 px-2 py-1 text-sm disabled:opacity-50"
                            >
                              저장
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-white/70">서버 연결</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/50">OpenClaw</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${openclawStatus === 'connected' ? 'bg-green-500' : openclawStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 'bg-white/20'}`} />
                      <span className="text-xs text-white/40">
                        {openclawStatus === 'connected' ? '연결됨' : openclawStatus === 'checking' ? '확인 중' : '미연결'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/50">Ollama (로컬 LLM)</span>
                    <span className="text-xs text-white/40">서버에서 설정</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/50">Cloudflare AI</span>
                    <span className="text-xs text-white/40">BYOK로 등록</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/50">Telegram 봇</span>
                    <span className="text-xs text-white/40">서버에서 설정</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={killSwitchLoading}
                onClick={toggleKillSwitch}
                className={`w-full py-3 rounded-xl font-medium border transition ${
                  killSwitchActive
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                } disabled:opacity-50`}
              >
                {killSwitchLoading ? '처리 중...' : killSwitchActive ? '시스템 재개' : '비상 정지 (Kill Switch)'}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
