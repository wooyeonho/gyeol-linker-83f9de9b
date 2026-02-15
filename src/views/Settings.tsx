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
      const { data } = await supabase
        .from('gyeol_byok_keys' as any)
        .select('provider, encrypted_key')
        .eq('user_id', user.id);
      if (data) {
        setByokList((data as any[]).map((x: any) => ({
          provider: x.provider,
          masked: '****' + (x.encrypted_key?.slice(-4) ?? ''),
        })));
      }
    })();
  }, [user]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('gyeol_system_state' as any)
        .select('kill_switch')
        .eq('id', 'global')
        .maybeSingle();
      if (data) setKillSwitchActive((data as any).kill_switch);
    })();
  }, []);

  const saveByok = async (provider: string) => {
    if (!byokKey.trim() || !user) return;
    setByokSaving(true);
    try {
      await supabase
        .from('gyeol_byok_keys' as any)
        .upsert({ user_id: user.id, provider, encrypted_key: byokKey.trim() } as any, { onConflict: 'user_id,provider' });
      setByokList((prev) => [
        ...prev.filter((x) => x.provider !== provider),
        { provider, masked: '****' + byokKey.trim().slice(-4) },
      ]);
      setByokOpen(null);
      setByokKey('');
    } finally {
      setByokSaving(false);
    }
  };

  const toggleKillSwitch = async () => {
    const newVal = !killSwitchActive;
    await supabase
      .from('gyeol_system_state' as any)
      .update({ kill_switch: newVal, reason: newVal ? 'User activated' : 'User deactivated' } as any)
      .eq('id', 'global');
    setKillSwitchActive(newVal);
  };

  const personality = agent
    ? [agent.warmth, agent.logic, agent.creativity, agent.energy, agent.humor]
    : [50, 50, 50, 50, 50];
  const labels = ['Warmth', 'Logic', 'Creative', 'Energy', 'Humor'];

  return (
    <main className="min-h-screen bg-black text-white/90 pb-24">
      <div className="max-w-md mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Settings</h1>
          <button
            type="button"
            onClick={signOut}
            className="text-xs text-white/40 hover:text-white/60 transition px-3 py-1.5 rounded-lg border border-white/10"
          >
            로그아웃
          </button>
        </header>

        {/* Account */}
        <section className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
          <h2 className="text-sm font-medium text-white/60 mb-2">Account</h2>
          <p className="text-sm text-white/80">{user?.email}</p>
        </section>

        {/* AI Profile */}
        <section className="rounded-2xl bg-white/[0.03] border border-white/5 p-5 space-y-4">
          <h2 className="text-sm font-medium text-white/60">My AI</h2>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <span className="text-indigo-400 font-bold text-lg">G{agent?.gen ?? 1}</span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-lg">{agent?.name ?? 'GYEOL'}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Number(agent?.evolution_progress ?? 0)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-[10px] text-white/40">{Number(agent?.evolution_progress ?? 0).toFixed(0)}%</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1 text-center mt-2">
            {labels.map((label, i) => (
              <div key={label}>
                <div className="h-8 flex items-end justify-center pb-0.5">
                  <motion.div
                    className="w-4 rounded-t bg-indigo-500/30"
                    initial={{ height: 0 }}
                    animate={{ height: `${(personality[i] / 100) * 100}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                  />
                </div>
                <p className="text-[9px] text-white/40 mt-1">{label}</p>
                <p className="text-[10px] text-indigo-400">{personality[i]}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Engine Status */}
        <section className="rounded-2xl bg-white/[0.03] border border-white/5 p-5 space-y-3">
          <h2 className="text-sm font-medium text-white/60">AI Engine</h2>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <div>
              <p className="text-sm text-white">GYEOL Engine Active</p>
              <p className="text-[11px] text-white/40">Groq → Lovable AI → Built-in</p>
            </div>
          </div>
          {byokList.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <div>
                <p className="text-sm text-white">Premium Models</p>
                <p className="text-[11px] text-white/40">{byokList.map((x) => x.provider).join(', ')}</p>
              </div>
            </div>
          )}
        </section>

        {/* Settings Toggles */}
        <section className="rounded-2xl bg-white/[0.03] border border-white/5 p-5 space-y-4">
          <h2 className="text-sm font-medium text-white/60">Preferences</h2>
          {[
            { label: 'Autonomy Level', type: 'range' as const, value: autonomyLevel, onChange: setAutonomyLevel },
            { label: 'Content Filter', type: 'toggle' as const, value: contentFilterOn, onChange: () => setContentFilterOn(!contentFilterOn) },
            { label: 'Activity Alerts', type: 'toggle' as const, value: notificationsOn, onChange: () => setNotificationsOn(!notificationsOn) },
          ].map((item) => (
            <div key={item.label} className="flex justify-between items-center">
              <span className="text-sm text-white/80">{item.label}</span>
              {item.type === 'range' ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40 w-6 text-right">{item.value as number}</span>
                  <input
                    type="range" min={0} max={100}
                    value={item.value as number}
                    onChange={(e) => (item.onChange as (v: number) => void)(Number(e.target.value))}
                    className="w-24 accent-indigo-500"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={item.onChange as () => void}
                  className={`w-10 h-6 rounded-full transition-colors ${item.value ? 'bg-indigo-500' : 'bg-white/10'}`}
                >
                  <span className={`block w-4 h-4 rounded-full bg-white transition-all mt-1 ${item.value ? 'ml-5' : 'ml-1'}`} />
                </button>
              )}
            </div>
          ))}
        </section>

        {/* Advanced */}
        <section className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-5 flex justify-between items-center text-left"
          >
            <h2 className="text-sm font-medium text-white/60">Advanced</h2>
            <span className="text-xs text-white/30">{showAdvanced ? 'Collapse' : 'Expand'}</span>
          </button>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="px-5 pb-5 space-y-6"
            >
              <div className="space-y-3">
                <p className="text-sm text-white/60">Premium AI Models (BYOK)</p>
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
                              ? 'border-indigo-500/30 text-indigo-300 bg-indigo-500/10'
                              : 'border-white/5 text-white/40 hover:bg-white/5'
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
                              className="flex-1 rounded-lg bg-black border border-white/10 px-2 py-1 text-sm text-white placeholder:text-white/30"
                            />
                            <button
                              type="button"
                              disabled={byokSaving || !byokKey.trim()}
                              onClick={() => saveByok(provider)}
                              className="rounded-lg bg-indigo-500/20 text-indigo-300 px-3 py-1 text-sm disabled:opacity-40"
                            >
                              Save
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={toggleKillSwitch}
                className={`w-full py-3 rounded-xl font-medium border transition ${
                  killSwitchActive
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}
              >
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
