'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useGyeolStore } from '@/store/gyeol-store';
import { DEMO_USER_ID } from '@/lib/gyeol/constants';

const BYOK_PROVIDERS = ['openai', 'anthropic', 'deepseek', 'groq', 'gemini', 'custom'] as const;

export default function SettingsPage() {
  const { agent } = useGyeolStore();
  const [byokList, setByokList] = useState<{ id: string; provider: string; masked: string }[]>([]);
  const [byokOpen, setByokOpen] = useState<string | null>(null);
  const [byokKey, setByokKey] = useState('');
  const [byokSaving, setByokSaving] = useState(false);
  const [contentFilterOn, setContentFilterOn] = useState(true);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [autonomyLevel, setAutonomyLevel] = useState(50);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [killSwitchToken, setKillSwitchToken] = useState('');
  const [killSwitchLoading, setKillSwitchLoading] = useState(false);
  const [killSwitchMessage, setKillSwitchMessage] = useState('');

  useEffect(() => {
    fetch(`/api/byok?userId=${encodeURIComponent(DEMO_USER_ID)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { provider: string; masked?: string }[]) => setByokList(list.map((x) => ({ ...x, id: x.provider, masked: x.masked ?? '****' }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!agent?.id) return;
    fetch(`/api/settings?agentId=${encodeURIComponent(agent.id)}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { contentFilterOn?: boolean; notificationsOn?: boolean; autonomyLevel?: number }) => {
        if (typeof data.contentFilterOn === 'boolean') setContentFilterOn(data.contentFilterOn);
        if (typeof data.notificationsOn === 'boolean') setNotificationsOn(data.notificationsOn);
        if (typeof data.autonomyLevel === 'number') setAutonomyLevel(data.autonomyLevel);
      })
      .catch(() => {});
  }, [agent?.id]);

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

  const saveSettings = async () => {
    if (!agent?.id) return;
    setSettingsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          contentFilterOn,
          notificationsOn,
          autonomyLevel,
        }),
      });
      if (res.ok) setKillSwitchMessage('');
    } finally {
      setSettingsSaving(false);
    }
  };

  const triggerKillSwitch = async (action: 'activate' | 'deactivate') => {
    if (!killSwitchToken.trim()) {
      setKillSwitchMessage('토큰을 입력하세요.');
      return;
    }
    setKillSwitchLoading(true);
    setKillSwitchMessage('');
    try {
      const res = await fetch('/api/admin/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${killSwitchToken.trim()}` },
        body: JSON.stringify({ action, reason: action === 'activate' ? '설정에서 비상 정지' : null }),
      });
      const data = await res.json();
      if (res.ok) setKillSwitchMessage(action === 'activate' ? '시스템이 일시 정지되었습니다.' : '시스템이 재개되었습니다.');
      else setKillSwitchMessage(data.error ?? '실패');
    } catch {
      setKillSwitchMessage('요청 실패');
    } finally {
      setKillSwitchLoading(false);
    }
  };

  const personality = agent ? [agent.warmth, agent.logic, agent.creativity, agent.energy, agent.humor] : [50, 50, 50, 50, 50];
  const labels = ['따뜻함', '논리', '창의', '에너지', '유머'];

  return (
    <main className="min-h-screen bg-black text-[#E5E5E5] p-6 pb-24">
      <div className="max-w-md mx-auto space-y-8">
        <header className="flex items-center gap-4">
          <Link href="/" className="text-white/60 hover:text-white text-sm">← GYEOL</Link>
          <h1 className="text-xl font-semibold">설정</h1>
        </header>
        <section className="rounded-2xl bg-[#0A0A1A] border border-white/10 p-5 space-y-4">
          <h2 className="text-sm font-medium text-white/80">My AI</h2>
          <p className="text-white">{agent?.name ?? 'GYEOL'}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">Gen {agent?.gen ?? 1}</span>
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Number(agent?.evolution_progress ?? 0)}%` }} />
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
          <h2 className="text-sm font-medium text-white/80">Safety</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">AI 자율성</span>
            <span className="text-xs text-white/50">보수적 ↔ 자유</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={autonomyLevel}
            onChange={(e) => setAutonomyLevel(Number(e.target.value))}
            onBlur={saveSettings}
            className="w-full h-2 rounded-full appearance-none bg-white/10 accent-indigo-500"
          />
          <p className="text-xs text-white/50">{autonomyLevel}%</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">콘텐츠 필터</span>
            <button
              type="button"
              role="switch"
              aria-checked={contentFilterOn}
              onClick={() => { setContentFilterOn((v) => !v); setTimeout(saveSettings, 0); }}
              className={`relative w-11 h-6 rounded-full transition ${contentFilterOn ? 'bg-indigo-500' : 'bg-white/20'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition left-1 ${contentFilterOn ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">활동 알림</span>
            <button
              type="button"
              role="switch"
              aria-checked={notificationsOn}
              onClick={() => { setNotificationsOn((v) => !v); setTimeout(saveSettings, 0); }}
              className={`relative w-11 h-6 rounded-full transition ${notificationsOn ? 'bg-indigo-500' : 'bg-white/20'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition left-1 ${notificationsOn ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          {settingsSaving && <p className="text-xs text-indigo-400">저장 중...</p>}
        </section>

        <section className="rounded-2xl bg-[#0A0A1A] border border-white/10 p-5 space-y-4">
          <h2 className="text-sm font-medium text-white/80">Emergency Stop</h2>
          <p className="text-xs text-white/50">관리자 토큰 입력 후 시스템 전체를 일시 정지할 수 있습니다.</p>
          <input
            type="password"
            placeholder="KILL_SWITCH_TOKEN"
            value={killSwitchToken}
            onChange={(e) => setKillSwitchToken(e.target.value)}
            className="w-full rounded-lg bg-black/50 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => triggerKillSwitch('activate')}
              disabled={killSwitchLoading}
              className="flex-1 rounded-xl bg-red-500/20 text-red-400 py-2 text-sm font-medium disabled:opacity-50"
            >
              일시 정지
            </button>
            <button
              type="button"
              onClick={() => triggerKillSwitch('deactivate')}
              disabled={killSwitchLoading}
              className="flex-1 rounded-xl bg-white/10 text-white/80 py-2 text-sm font-medium disabled:opacity-50"
            >
              재개
            </button>
          </div>
          {killSwitchMessage && <p className="text-sm text-white/70">{killSwitchMessage}</p>}
        </section>

        <section className="rounded-2xl bg-[#0A0A1A] border border-white/10 p-5 space-y-4">
          <h2 className="text-sm font-medium text-white/80">AI Brain (BYOK)</h2>
          <div className="grid grid-cols-2 gap-2">
            {BYOK_PROVIDERS.map((provider) => (
              <div key={provider} className="flex flex-col gap-1">
                <button type="button" onClick={() => setByokOpen(byokOpen === provider ? null : provider)} className="rounded-xl border border-white/10 py-2 text-sm text-white/70 hover:bg-white/5 capitalize">{provider}</button>
                {byokOpen === provider && (
                  <div className="flex gap-1">
                    <input type="password" placeholder="API Key" value={byokKey} onChange={(e) => setByokKey(e.target.value)} className="flex-1 rounded-lg bg-black/50 border border-white/10 px-2 py-1 text-sm text-white placeholder:text-white/40" />
                    <button type="button" disabled={byokSaving || !byokKey.trim()} onClick={() => saveByok(provider)} className="rounded-lg bg-indigo-500/30 text-indigo-300 px-2 py-1 text-sm disabled:opacity-50">저장</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {byokList.length > 0 && <p className="text-xs text-white/50">등록된 키: {byokList.map((x) => x.provider).join(', ')}</p>}
        </section>
      </div>
    </main>
  );
}
