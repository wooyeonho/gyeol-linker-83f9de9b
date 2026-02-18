import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { useAuth } from '@/src/hooks/useAuth';
import { supabase } from '@/src/lib/supabase';
import { BottomNav } from '../components/BottomNav';

const BYOK_PROVIDERS = ['openai', 'anthropic', 'deepseek', 'groq', 'gemini'] as const;

export default function SettingsPage() {
  const { agent } = useInitAgent();
  const { user, signOut } = useAuth();
  const [autonomyLevel, setAutonomyLevel] = useState(50);
  const [contentFilterOn, setContentFilterOn] = useState(true);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [autoTTS, setAutoTTS] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState(0.95);
  const [byokList, setByokList] = useState<{ provider: string; masked: string }[]>([]);
  const [byokOpen, setByokOpen] = useState<string | null>(null);
  const [byokKey, setByokKey] = useState('');
  const [byokSaving, setByokSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramCode, setTelegramCode] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('gyeol_byok_keys' as any).select('provider, encrypted_key').eq('user_id', user.id);
      if (data) {
        setByokList((data as any[]).map((x: any) => ({ provider: x.provider, masked: '****' + (x.encrypted_key?.slice(-4) ?? '') })));
      }
    })();
  }, [user]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('gyeol_system_state' as any).select('kill_switch').eq('id', 'global').maybeSingle();
      if (data) setKillSwitchActive((data as any).kill_switch);
    })();
  }, []);

  useEffect(() => {
    if (!agent) return;
    const s = (agent as any).settings ?? {};
    if (typeof s.autoTTS === 'boolean') setAutoTTS(s.autoTTS);
    if (typeof s.ttsSpeed === 'number') setTtsSpeed(s.ttsSpeed);
    setTelegramCode(agent.id);
    (async () => {
      const { data } = await supabase.from('gyeol_telegram_links' as any)
        .select('id').eq('agent_id', agent.id).limit(1);
      if (data && (data as any[]).length > 0) setTelegramLinked(true);
    })();
  }, [agent]);

  const saveByok = async (provider: string) => {
    if (!byokKey.trim() || !user) return;
    setByokSaving(true);
    try {
      await supabase.from('gyeol_byok_keys' as any).upsert({ user_id: user.id, provider, encrypted_key: byokKey.trim() } as any, { onConflict: 'user_id,provider' });
      setByokList((prev) => [...prev.filter((x) => x.provider !== provider), { provider, masked: '****' + byokKey.trim().slice(-4) }]);
      setByokOpen(null);
      setByokKey('');
    } finally {
      setByokSaving(false);
    }
  };

  const toggleKillSwitch = async () => {
    const newVal = !killSwitchActive;
    await supabase.from('gyeol_system_state' as any).update({ kill_switch: newVal, reason: newVal ? 'User activated' : 'User deactivated' } as any).eq('id', 'global');
    setKillSwitchActive(newVal);
  };

  const personality = agent ? [agent.warmth, agent.logic, agent.creativity, agent.energy, agent.humor] : [50, 50, 50, 50, 50];
  const labels = ['온기', '논리', '창의', '에너지', '유머'];

  return (
    <main className="min-h-screen bg-black font-display pb-16">
      <div className="max-w-md mx-auto px-5 pt-6 pb-4 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-foreground/80">Settings</h1>
          <button type="button" onClick={signOut}
            className="text-[10px] text-white/20 hover:text-white/50 transition">
            Sign out
          </button>
        </header>

        <section className="space-y-1">
          <p className="text-[10px] text-white/20 uppercase tracking-widest mb-2">Account</p>
          <p className="text-sm text-foreground/60">{user?.email}</p>
        </section>

        <section className="space-y-4">
          <p className="text-[10px] text-white/20 uppercase tracking-widest">AI Profile</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <span className="text-primary text-xs font-bold">G{agent?.gen ?? 1}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground/80">{agent?.name ?? 'GYEOL'}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-[2px] bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div className="h-full bg-primary/50 rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${Number(agent?.evolution_progress ?? 0)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }} />
                </div>
                <span className="text-[9px] text-white/25">{Number(agent?.evolution_progress ?? 0).toFixed(0)}%</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            {labels.map((label, i) => (
              <div key={label} className="flex-1 text-center">
                <div className="h-8 flex items-end justify-center mb-1">
                  <motion.div className="w-full max-w-[20px] rounded-sm bg-primary/15"
                    initial={{ height: 0 }} animate={{ height: `${(personality[i] / 100) * 100}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }} />
                </div>
                <p className="text-[8px] text-white/25">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="h-px bg-white/[0.04]" />

        <section className="space-y-4">
          <p className="text-[10px] text-white/20 uppercase tracking-widest">Preferences</p>
          {[
            { label: '자율성 수준', type: 'range' as const, value: autonomyLevel, onChange: setAutonomyLevel },
            { label: '콘텐츠 필터', type: 'toggle' as const, value: contentFilterOn, onChange: () => setContentFilterOn(!contentFilterOn) },
            { label: '활동 알림', type: 'toggle' as const, value: notificationsOn, onChange: () => setNotificationsOn(!notificationsOn) },
          ].map((item) => (
            <div key={item.label} className="flex justify-between items-center">
              <span className="text-xs text-white/40">{item.label}</span>
              {item.type === 'range' ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/20 w-5 text-right">{item.value as number}</span>
                  <input type="range" min={0} max={100} value={item.value as number}
                    onChange={(e) => (item.onChange as (v: number) => void)(Number(e.target.value))}
                    className="w-20 accent-primary" />
                </div>
              ) : (
                <button type="button" onClick={item.onChange as () => void}
                  className={`w-9 h-5 rounded-full transition-colors ${item.value ? 'bg-primary/60' : 'bg-white/[0.06]'}`}>
                  <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all ${item.value ? 'ml-[18px]' : 'ml-1'}`} />
                </button>
              )}
            </div>
          ))}

          {/* 자동 읽어주기 */}
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs text-white/40">자동 읽어주기</span>
              <p className="text-[9px] text-white/20">AI 응답을 자동으로 읽어줍니다</p>
            </div>
            <button type="button" onClick={() => {
              const next = !autoTTS;
              setAutoTTS(next);
              if (agent) supabase.from('gyeol_agents' as any)
                .update({ settings: { ...(agent as any).settings, autoTTS: next } } as any)
                .eq('id', agent.id);
            }}
              className={`w-9 h-5 rounded-full transition ${autoTTS ? 'bg-primary/60' : 'bg-white/[0.06]'}`}>
              <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all ${autoTTS ? 'ml-[18px]' : 'ml-1'}`} />
            </button>
          </div>

          {/* 읽기 속도 */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/40">읽기 속도</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/20">{ttsSpeed.toFixed(1)}x</span>
              <input type="range" min={0.5} max={1.5} step={0.1} value={ttsSpeed}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setTtsSpeed(v);
                  if (agent) supabase.from('gyeol_agents' as any)
                    .update({ settings: { ...(agent as any).settings, ttsSpeed: v } } as any)
                    .eq('id', agent.id);
                }}
                className="w-20 accent-primary" />
            </div>
          </div>
        </section>

        <div className="h-px bg-white/[0.04]" />

        <section className="space-y-3">
          <p className="text-[10px] text-white/20 uppercase tracking-widest">Telegram</p>
          {telegramLinked ? (
            <div className="flex items-center gap-2 text-emerald-400/70">
              <span className="material-icons-round text-sm">check_circle</span>
              <span className="text-xs">텔레그램 연결됨</span>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-white/40 leading-relaxed">
                텔레그램에서 GYEOL 봇에게 아래 코드를 보내세요:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-xs text-foreground/60 font-mono truncate">
                  /start {telegramCode}
                </code>
                <button type="button" onClick={() => {
                  navigator.clipboard.writeText(`/start ${telegramCode}`);
                }} className="rounded-lg bg-primary/10 text-primary/80 px-3 py-2 text-xs">
                  복사
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="h-px bg-white/[0.04]" />

        <section>
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex justify-between items-center py-1">
            <p className="text-[10px] text-white/20 uppercase tracking-widest">Advanced</p>
            <span className="material-icons-round text-white/15 text-sm">{showAdvanced ? 'expand_less' : 'expand_more'}</span>
          </button>
          {showAdvanced && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-4 space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] text-white/30">Premium AI Models (BYOK)</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {BYOK_PROVIDERS.map((provider) => {
                    const isRegistered = byokList.some((x) => x.provider === provider);
                    return (
                      <div key={provider} className="flex flex-col gap-1">
                        <button type="button" onClick={() => setByokOpen(byokOpen === provider ? null : provider)}
                          className={`rounded-lg border py-1.5 text-xs capitalize transition ${isRegistered ? 'border-primary/20 text-primary/80 bg-primary/5' : 'border-white/[0.06] text-white/30 hover:bg-white/[0.03]'}`}>
                          {provider}
                        </button>
                        {byokOpen === provider && (
                          <div className="flex gap-1">
                            <input type="password" placeholder="API Key" value={byokKey} onChange={(e) => setByokKey(e.target.value)}
                              className="flex-1 rounded-lg bg-white/[0.03] border border-white/[0.06] px-2 py-1 text-xs text-foreground placeholder:text-white/20 outline-none" />
                            <button type="button" disabled={byokSaving || !byokKey.trim()} onClick={() => saveByok(provider)}
                              className="rounded-lg bg-primary/10 text-primary/80 px-2 py-1 text-xs disabled:opacity-40">
                              Save
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <button type="button" onClick={toggleKillSwitch}
                className={`w-full py-2.5 rounded-xl text-xs font-medium border transition ${killSwitchActive ? 'bg-emerald-500/5 text-emerald-500/70 border-emerald-500/10' : 'bg-destructive/5 text-destructive/70 border-destructive/10'}`}>
                {killSwitchActive ? '시스템 재개' : '긴급 정지 (Kill Switch)'}
              </button>
            </motion.div>
          )}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
