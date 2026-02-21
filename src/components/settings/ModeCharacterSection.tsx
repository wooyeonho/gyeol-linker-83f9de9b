import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import { useGyeolStore } from '@/store/gyeol-store';
import { AnimatedCharacter } from '@/src/components/AnimatedCharacter';

const CHARS = [
  { key: null, emoji: 'mail', label: 'Text Only' },
  { key: 'void', emoji: 'radio_button_checked', label: 'Void' },
  { key: 'jelly', emoji: 'bubble_chart', label: 'Jelly' },
  { key: 'cat', emoji: 'pets', label: 'Cat' },
  { key: 'flame', emoji: 'local_fire_department', label: 'Flame' },
  { key: 'cloud', emoji: 'cloud', label: 'Cloud' },
];

interface Props {
  agent: any;
  activeSection: string | null;
  SectionHeader: React.FC<{ id: string; icon: string; title: string }>;
  currentMode: 'simple' | 'advanced';
  setModeSwitchTarget: (v: 'simple' | 'advanced') => void;
  setModeSwitchOpen: (v: boolean) => void;
  charPreset: string | null;
  setCharPreset: (v: string | null) => void;
}

export function ModeCharacterSection({
  agent, activeSection, SectionHeader,
  currentMode, setModeSwitchTarget, setModeSwitchOpen,
  charPreset, setCharPreset,
}: Props) {
  const { setAgent } = useGyeolStore();

  return (
    <>
      <section>
        <SectionHeader id="mode" icon="toggle_on" title="Mode" />
        <AnimatePresence>
          {activeSection === 'mode' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2">
              <div className="grid grid-cols-2 gap-3 px-1">
                {[
                  { key: 'simple' as const, icon: 'chat_bubble', label: 'Simple' },
                  { key: 'advanced' as const, icon: 'science', label: 'Advanced' },
                ].map(m => (
                  <button key={m.key} onClick={() => {
                    if (m.key !== currentMode) {
                      setModeSwitchTarget(m.key);
                      setModeSwitchOpen(true);
                    }
                  }}
                    className={`p-4 rounded-xl text-center transition ${
                      currentMode === m.key ? 'glass-card-selected' : 'glass-card'
                    }`}>
                    <span aria-hidden="true" className="material-icons-round text-xl text-primary/60">{m.icon}</span>
                    <p className="text-[11px] text-foreground/80 mt-1">{m.label}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <div className="h-px bg-foreground/[0.04]" />

      <section>
        <SectionHeader id="character" icon="pets" title="Character" />
        <AnimatePresence>
          {activeSection === 'character' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2 px-1 space-y-4">
              {charPreset && charPreset !== 'void' && (
                <div className="flex justify-center mb-3">
                  <div className="w-16 h-16">
                    <AnimatedCharacter mood="happy" isThinking={false} characterPreset={charPreset} gen={agent?.gen ?? 1} size="sm" />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                {CHARS.map(c => (
                  <button key={String(c.key)} type="button" onClick={async () => {
                    setCharPreset(c.key);
                    const s = (agent?.settings as any) ?? {};
                    const newSettings = { ...s, characterPreset: c.key };
                    await supabase.from('gyeol_agents' as any)
                      .update({ settings: newSettings } as any).eq('id', agent?.id);
                    if (agent) setAgent({ ...agent, settings: newSettings } as any);
                  }}
                    className={`flex flex-col items-center p-3 rounded-xl transition ${
                      charPreset === c.key ? 'glass-card-selected' : 'glass-card'
                    }`}>
                    <span aria-hidden="true" className="material-icons-round text-lg text-primary/60">{c.emoji}</span>
                    <span className="text-[9px] text-foreground/30 mt-1">{c.label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-foreground/30">Custom Character</p>
                <div className="glass-card rounded-xl p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-foreground/20 block mb-1">Primary Color</label>
                      <input type="color" defaultValue={(agent?.settings as any)?.customChar?.color1 ?? '#7C3AED'}
                        onChange={async (e) => {
                          const s = (agent?.settings as any) ?? {};
                          const cc = { ...(s.customChar ?? {}), color1: e.target.value };
                          const ns = { ...s, customChar: cc };
                          await supabase.from('gyeol_agents' as any).update({ settings: ns } as any).eq('id', agent?.id);
                          if (agent) setAgent({ ...agent, settings: ns } as any);
                        }}
                        className="w-full h-8 rounded-lg border border-foreground/10 cursor-pointer bg-transparent" />
                    </div>
                    <div>
                      <label className="text-[9px] text-foreground/20 block mb-1">Secondary Color</label>
                      <input type="color" defaultValue={(agent?.settings as any)?.customChar?.color2 ?? '#A78BFA'}
                        onChange={async (e) => {
                          const s = (agent?.settings as any) ?? {};
                          const cc = { ...(s.customChar ?? {}), color2: e.target.value };
                          const ns = { ...s, customChar: cc };
                          await supabase.from('gyeol_agents' as any).update({ settings: ns } as any).eq('id', agent?.id);
                          if (agent) setAgent({ ...agent, settings: ns } as any);
                        }}
                        className="w-full h-8 rounded-lg border border-foreground/10 cursor-pointer bg-transparent" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-foreground/20 block mb-1">Glow Intensity</label>
                    <input type="range" min={0} max={100} defaultValue={((agent?.settings as any)?.customChar?.glow ?? 50)}
                      onChange={async (e) => {
                        const s = (agent?.settings as any) ?? {};
                        const cc = { ...(s.customChar ?? {}), glow: Number(e.target.value) };
                        const ns = { ...s, customChar: cc };
                        await supabase.from('gyeol_agents' as any).update({ settings: ns } as any).eq('id', agent?.id);
                        if (agent) setAgent({ ...agent, settings: ns } as any);
                      }}
                      className="w-full" />
                  </div>
                  <div>
                    <label className="text-[9px] text-foreground/20 block mb-1">Emoji Icon</label>
                    <div className="flex gap-1 flex-wrap">
                      {['\u{1F31F}', '\u{1F52E}', '\u{1F48E}', '\u{1F319}', '\u{2B50}', '\u{1F98B}', '\u{1F409}', '\u{1F338}', '\u{1F340}', '\u{2744}\uFE0F', '\u{1F308}', '\u{1F3AD}'].map(emoji => (
                        <button key={emoji} type="button" onClick={async () => {
                          const s = (agent?.settings as any) ?? {};
                          const cc = { ...(s.customChar ?? {}), emoji };
                          const ns = { ...s, customChar: cc };
                          await supabase.from('gyeol_agents' as any).update({ settings: ns } as any).eq('id', agent?.id);
                          if (agent) setAgent({ ...agent, settings: ns } as any);
                        }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                            (agent?.settings as any)?.customChar?.emoji === emoji ? 'glass-card-selected' : 'glass-card'
                          }`}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-center py-2">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                      style={{
                        background: `radial-gradient(circle, ${(agent?.settings as any)?.customChar?.color1 ?? '#7C3AED'}, ${(agent?.settings as any)?.customChar?.color2 ?? '#A78BFA'})`,
                        boxShadow: `0 0 ${((agent?.settings as any)?.customChar?.glow ?? 50) / 3}px ${(agent?.settings as any)?.customChar?.color1 ?? '#7C3AED'}`,
                      }}>
                      {(agent?.settings as any)?.customChar?.emoji ?? '\u{1F31F}'}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </>
  );
}
