import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { useAuth } from '@/src/hooks/useAuth';
import { supabase } from '@/src/lib/supabase';
import { BottomNav } from '../components/BottomNav';
import { TopNav } from '../components/TopNav';

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
  const labels = ['Warmth', 'Logic', 'Creative', 'Energy', 'Humor'];

  return (
    <main className="min-h-screen bg-background font-display pb-24">
      <TopNav />
      <div className="max-w-md mx-auto p-6 pt-24 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <button type="button" onClick={signOut}
            className="text-xs text-muted-foreground hover:text-foreground transition px-3 py-1.5 rounded-lg border border-border">
            로그아웃
          </button>
        </header>

        {/* Account */}
        <section className="section-card">
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Account</h2>
          <p className="text-sm text-foreground">{user?.email}</p>
        </section>

        {/* AI Profile */}
        <section className="section-card space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">My AI</h2>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">G{agent?.gen ?? 1}</span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground text-lg">{agent?.name ?? 'GYEOL'}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${Number(agent?.evolution_progress ?? 0)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }} />
                </div>
                <span className="text-[10px] text-muted-foreground">{Number(agent?.evolution_progress ?? 0).toFixed(0)}%</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1 text-center mt-2">
            {labels.map((label, i) => (
              <div key={label}>
                <div className="h-8 flex items-end justify-center pb-0.5">
                  <motion.div className="w-4 rounded-t bg-primary/30"
                    initial={{ height: 0 }} animate={{ height: `${(personality[i] / 100) * 100}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }} />
                </div>
                <p className="text-[9px] text-muted-foreground mt-1">{label}</p>
                <p className="text-[10px] text-primary">{personality[i]}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Engine Status */}
        <section className="section-card space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">AI Engine</h2>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <div>
              <p className="text-sm text-foreground">GYEOL Engine Active</p>
              <p className="text-[11px] text-muted-foreground">Groq → Lovable AI → Built-in</p>
            </div>
          </div>
          {byokList.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <div>
                <p className="text-sm text-foreground">Premium Models</p>
                <p className="text-[11px] text-muted-foreground">{byokList.map((x) => x.provider).join(', ')}</p>
              </div>
            </div>
          )}
        </section>

        {/* Preferences */}
        <section className="section-card space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Preferences</h2>
          {[
            { label: 'Autonomy Level', type: 'range' as const, value: autonomyLevel, onChange: setAutonomyLevel },
            { label: 'Content Filter', type: 'toggle' as const, value: contentFilterOn, onChange: () => setContentFilterOn(!contentFilterOn) },
            { label: 'Activity Alerts', type: 'toggle' as const, value: notificationsOn, onChange: () => setNotificationsOn(!notificationsOn) },
          ].map((item) => (
            <div key={item.label} className="flex justify-between items-center">
              <span className="text-sm text-foreground/80">{item.label}</span>
              {item.type === 'range' ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-6 text-right">{item.value as number}</span>
                  <input type="range" min={0} max={100} value={item.value as number}
                    onChange={(e) => (item.onChange as (v: number) => void)(Number(e.target.value))}
                    className="w-24 accent-primary" />
                </div>
              ) : (
                <button type="button" onClick={item.onChange as () => void}
                  className={`w-10 h-6 rounded-full transition-colors ${item.value ? 'bg-primary' : 'bg-secondary'}`}>
                  <span className={`block w-4 h-4 rounded-full bg-white shadow-sm transition-all mt-1 ${item.value ? 'ml-5' : 'ml-1'}`} />
                </button>
              )}
            </div>
          ))}
        </section>

        {/* Advanced */}
        <section className="section-card overflow-hidden !p-0">
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-5 flex justify-between items-center text-left">
            <h2 className="text-sm font-medium text-muted-foreground">Advanced</h2>
            <span className="material-icons-round text-muted-foreground text-sm">{showAdvanced ? 'expand_less' : 'expand_more'}</span>
          </button>
          {showAdvanced && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-5 pb-5 space-y-6">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Premium AI Models (BYOK)</p>
                <div className="grid grid-cols-2 gap-2">
                  {BYOK_PROVIDERS.map((provider) => {
                    const isRegistered = byokList.some((x) => x.provider === provider);
                    return (
                      <div key={provider} className="flex flex-col gap-1">
                        <button type="button" onClick={() => setByokOpen(byokOpen === provider ? null : provider)}
                          className={`rounded-xl border py-2 text-sm capitalize transition ${isRegistered ? 'border-primary/30 text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-secondary'}`}>
                          {provider}
                        </button>
                        {byokOpen === provider && (
                          <div className="flex gap-1">
                            <input type="password" placeholder="API Key" value={byokKey} onChange={(e) => setByokKey(e.target.value)}
                              className="flex-1 rounded-lg bg-secondary border border-border px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground" />
                            <button type="button" disabled={byokSaving || !byokKey.trim()} onClick={() => saveByok(provider)}
                              className="rounded-lg bg-primary/10 text-primary px-3 py-1 text-sm disabled:opacity-40">
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
                className={`w-full py-3 rounded-xl font-medium border transition ${killSwitchActive ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                {killSwitchActive ? 'Resume System' : 'Emergency Stop (Kill Switch)'}
              </button>
            </motion.div>
          )}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
