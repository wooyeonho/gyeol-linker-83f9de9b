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
  const [byokList, setByokList] = useState<{ provider: string; masked: string }[]>([]);
  const [byokOpen, setByokOpen] = useState<string | null>(null);
  const [byokKey, setByokKey] = useState('');
  const [byokSaving, setByokSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [killSwitchActive, setKillSwitchActive] = useState(false);

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
    <main className="min-h-screen bg-background font-display pb-20">
      <div className="max-w-md mx-auto p-5 pt-6 space-y-5">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">설정</h1>
          <button type="button" onClick={signOut}
            className="text-[10px] text-muted-foreground hover:text-foreground transition px-3 py-1.5 rounded-lg border border-border/50">
            로그아웃
          </button>
        </header>

        {/* Account */}
        <section className="section-card !p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">계정</p>
          <p className="text-sm text-foreground">{user?.email}</p>
        </section>

        {/* AI Profile */}
        <section className="section-card !p-4 space-y-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">내 AI</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold">G{agent?.gen ?? 1}</span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{agent?.name ?? 'GYEOL'}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1 bg-border/30 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${Number(agent?.evolution_progress ?? 0)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }} />
                </div>
                <span className="text-[9px] text-muted-foreground">{Number(agent?.evolution_progress ?? 0).toFixed(0)}%</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1 text-center">
            {labels.map((label, i) => (
              <div key={label}>
                <div className="h-6 flex items-end justify-center">
                  <motion.div className="w-3 rounded-t bg-primary/25"
                    initial={{ height: 0 }} animate={{ height: `${(personality[i] / 100) * 100}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }} />
                </div>
                <p className="text-[8px] text-muted-foreground mt-1">{label}</p>
                <p className="text-[9px] text-primary">{personality[i]}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Engine */}
        <section className="section-card !p-4 space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">AI 엔진</p>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs text-foreground">GYEOL Engine Active</p>
          </div>
        </section>

        {/* Preferences */}
        <section className="section-card !p-4 space-y-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">환경설정</p>
          {[
            { label: '자율성 수준', type: 'range' as const, value: autonomyLevel, onChange: setAutonomyLevel },
            { label: '콘텐츠 필터', type: 'toggle' as const, value: contentFilterOn, onChange: () => setContentFilterOn(!contentFilterOn) },
            { label: '활동 알림', type: 'toggle' as const, value: notificationsOn, onChange: () => setNotificationsOn(!notificationsOn) },
          ].map((item) => (
            <div key={item.label} className="flex justify-between items-center">
              <span className="text-xs text-foreground/70">{item.label}</span>
              {item.type === 'range' ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-5 text-right">{item.value as number}</span>
                  <input type="range" min={0} max={100} value={item.value as number}
                    onChange={(e) => (item.onChange as (v: number) => void)(Number(e.target.value))}
                    className="w-20 accent-primary" />
                </div>
              ) : (
                <button type="button" onClick={item.onChange as () => void}
                  className={`w-9 h-5 rounded-full transition-colors ${item.value ? 'bg-primary' : 'bg-border'}`}>
                  <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all ${item.value ? 'ml-[18px]' : 'ml-1'}`} />
                </button>
              )}
            </div>
          ))}
        </section>

        {/* Advanced */}
        <section className="section-card !p-0 overflow-hidden">
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-4 flex justify-between items-center text-left">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">고급 설정</p>
            <span className="material-icons-round text-muted-foreground text-sm">{showAdvanced ? 'expand_less' : 'expand_more'}</span>
          </button>
          {showAdvanced && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-4 pb-4 space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Premium AI Models (BYOK)</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {BYOK_PROVIDERS.map((provider) => {
                    const isRegistered = byokList.some((x) => x.provider === provider);
                    return (
                      <div key={provider} className="flex flex-col gap-1">
                        <button type="button" onClick={() => setByokOpen(byokOpen === provider ? null : provider)}
                          className={`rounded-lg border py-1.5 text-xs capitalize transition ${isRegistered ? 'border-primary/30 text-primary bg-primary/5' : 'border-border/50 text-muted-foreground hover:bg-secondary/50'}`}>
                          {provider}
                        </button>
                        {byokOpen === provider && (
                          <div className="flex gap-1">
                            <input type="password" placeholder="API Key" value={byokKey} onChange={(e) => setByokKey(e.target.value)}
                              className="flex-1 rounded-lg bg-secondary/50 border border-border/30 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground outline-none" />
                            <button type="button" disabled={byokSaving || !byokKey.trim()} onClick={() => saveByok(provider)}
                              className="rounded-lg bg-primary/10 text-primary px-2 py-1 text-xs disabled:opacity-40">
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
                className={`w-full py-2.5 rounded-xl text-xs font-medium border transition ${killSwitchActive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
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
