import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import { subscribePush, unsubscribePush } from '@/lib/gyeol/push';
import { NotificationSettings } from '@/src/components/NotificationSettings';

interface PreferencesSectionProps {
  agent: any;
  setAgent: (a: any) => void;
  activeSection: string | null;
  SectionHeader: React.FC<{ id: string; icon: string; title: string }>;
  autonomyLevel: number; setAutonomyLevel: (v: number) => void;
  contentFilterOn: boolean; setContentFilterOn: (v: boolean) => void;
  notificationsOn: boolean; setNotificationsOn: (v: boolean) => void;
  autoTTS: boolean; setAutoTTS: (v: boolean) => void;
  ttsSpeed: number; setTtsSpeed: (v: number) => void;
  proactiveInterval: number; setProactiveInterval: (v: number) => void;
  pushEnabled: boolean; setPushEnabled: (v: boolean) => void;
  PROACTIVE_OPTIONS: { value: number; label: string }[];
}

export function PreferencesSection({
  agent, setAgent, activeSection, SectionHeader,
  autonomyLevel, setAutonomyLevel, contentFilterOn, setContentFilterOn,
  notificationsOn, setNotificationsOn, autoTTS, setAutoTTS, ttsSpeed, setTtsSpeed,
  proactiveInterval, setProactiveInterval, pushEnabled, setPushEnabled, PROACTIVE_OPTIONS,
}: PreferencesSectionProps) {
  return (
    <>
      <section>
        <SectionHeader id="proactive" icon="notifications_active" title="Proactive Message" />
        <AnimatePresence>
          {activeSection === 'proactive' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3 pt-2">
              <p className="text-[10px] text-foreground/25 leading-relaxed">Set how often AI initiates messages when you're inactive.</p>
              <div className="flex gap-2">
                {PROACTIVE_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={async () => {
                    setProactiveInterval(opt.value);
                    if (agent) {
                      const newSettings = { ...agent?.settings, proactiveInterval: opt.value };
                      await supabase.from('gyeol_agents').update({ settings: newSettings }).eq('id', agent.id);
                      setAgent({ ...agent, settings: newSettings } as any);
                    }
                  }}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-medium transition border ${
                      proactiveInterval === opt.value
                        ? 'bg-primary/15 text-primary/90 border-primary/30'
                        : 'bg-foreground/[0.02] text-foreground/30 border-foreground/[0.06] hover:border-foreground/10'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <div className="h-px bg-foreground/[0.04]" />

      <section>
        <SectionHeader id="preferences" icon="tune" title="Preferences" />
        <AnimatePresence>
          {activeSection === 'preferences' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-4 pt-2">
              {[
                { label: 'Autonomy Level', type: 'range' as const, value: autonomyLevel, onChange: setAutonomyLevel },
                { label: 'Content Filter', type: 'toggle' as const, value: contentFilterOn, onChange: () => setContentFilterOn(!contentFilterOn) },
                { label: 'Notifications', type: 'toggle' as const, value: notificationsOn, onChange: () => setNotificationsOn(!notificationsOn) },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs text-foreground/40">{item.label}</span>
                  {item.type === 'range' ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-foreground/20 w-5 text-right">{item.value as number}</span>
                      <input type="range" min={0} max={100} value={item.value as number}
                        onChange={(e) => (item.onChange as (v: number) => void)(Number(e.target.value))} className="w-20 accent-primary" />
                    </div>
                  ) : (
                    <button type="button" onClick={item.onChange as () => void}
                      className={`w-9 h-5 rounded-full transition-colors ${item.value ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-foreground/[0.06]'}`}>
                      <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all ${item.value ? 'ml-[18px]' : 'ml-1'}`} />
                    </button>
                  )}
                </div>
              ))}
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs text-foreground/40">Auto Read Aloud</span>
                  <p className="text-[9px] text-foreground/20">Automatically read AI responses</p>
                </div>
                <button type="button" onClick={() => {
                  const next = !autoTTS; setAutoTTS(next);
                  if (agent) supabase.from('gyeol_agents').update({ settings: { ...agent?.settings, autoTTS: next } } as any).eq('id', agent.id);
                }}
                  className={`w-9 h-5 rounded-full transition ${autoTTS ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-foreground/[0.06]'}`}>
                  <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all ${autoTTS ? 'ml-[18px]' : 'ml-1'}`} />
                </button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-foreground/40">Read Speed</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-foreground/20">{ttsSpeed.toFixed(1)}x</span>
                  <input type="range" min={0.5} max={1.5} step={0.1} value={ttsSpeed}
                    onChange={e => { const v = Number(e.target.value); setTtsSpeed(v);
                      if (agent) supabase.from('gyeol_agents').update({ settings: { ...agent?.settings, ttsSpeed: v } } as any).eq('id', agent.id);
                    }} className="w-20 accent-primary" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <div className="h-px bg-foreground/[0.04]" />

      <section>
        <SectionHeader id="notifications" icon="notifications" title="Notification Settings" />
        <AnimatePresence>
          {activeSection === 'notifications' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2 px-1">
              <NotificationSettings agent={agent} onUpdate={(ns) => { if (agent) setAgent({ ...agent, settings: ns } as any); }} />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <div className="h-px bg-foreground/[0.04]" />

      <section>
        <SectionHeader id="push" icon="notifications_active" title="Push Notifications" />
        <AnimatePresence>
          {activeSection === 'push' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3 pt-2">
              <p className="text-[10px] text-foreground/25 leading-relaxed">Enable browser push notifications for proactive AI messages.</p>
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-foreground/80">Push Notifications</p>
                <button type="button" onClick={async () => {
                  if (!agent?.id) return;
                  if (pushEnabled) { await unsubscribePush(); setPushEnabled(false); }
                  else { const ok = await subscribePush(agent.id); setPushEnabled(ok); }
                }}
                  className={`w-10 h-6 rounded-full transition ${pushEnabled ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-foreground/10'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white mx-1 transition-transform shadow-sm ${pushEnabled ? 'translate-x-4' : ''}`} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </>
  );
}
