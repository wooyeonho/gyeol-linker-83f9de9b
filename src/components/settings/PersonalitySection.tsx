import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import { useGyeolStore } from '@/store/gyeol-store';

const PERSONALITY_PRESETS = [
  { label: 'Calm', warmth: 70, logic: 40, creativity: 50, energy: 30, humor: 40 },
  { label: 'Energetic', warmth: 50, logic: 40, creativity: 60, energy: 80, humor: 70 },
  { label: 'Analytical', warmth: 40, logic: 80, creativity: 50, energy: 50, humor: 30 },
  { label: 'Creative', warmth: 50, logic: 30, creativity: 80, energy: 60, humor: 60 },
  { label: 'Caring', warmth: 90, logic: 30, creativity: 40, energy: 60, humor: 50 },
  { label: 'Witty', warmth: 60, logic: 50, creativity: 70, energy: 70, humor: 90 },
];

interface Props {
  agent: any;
  activeSection: string | null;
  toggleSection: (s: string) => void;
  SectionHeader: React.FC<{ id: string; icon: string; title: string }>;
  warmth: number; setWarmth: (v: number) => void;
  logic: number; setLogic: (v: number) => void;
  creativity: number; setCreativity: (v: number) => void;
  energy: number; setEnergy: (v: number) => void;
  humor: number; setHumor: (v: number) => void;
  agentName: string; setAgentName: (v: string) => void;
  nameEditing: boolean; setNameEditing: (v: boolean) => void;
  personalitySaving: boolean;
  savePersonality: () => Promise<void>;
  setError: (e: { message: string } | null) => void;
}

export function PersonalitySection({
  agent, activeSection, toggleSection, SectionHeader,
  warmth, setWarmth, logic, setLogic, creativity, setCreativity,
  energy, setEnergy, humor, setHumor, agentName, setAgentName,
  nameEditing, setNameEditing, personalitySaving, savePersonality, setError,
}: Props) {
  const { setAgent } = useGyeolStore();
  const personality = [warmth, logic, creativity, energy, humor];
  const labels = ['Warm', 'Logic', 'Create', 'Energy', 'Humor'];
  const setters = [setWarmth, setLogic, setCreativity, setEnergy, setHumor];

  return (
    <section>
      <SectionHeader id="personality" icon="psychology" title="Personality" />
      <AnimatePresence>
        {activeSection === 'personality' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-4 pt-2">
            <div className="flex items-center gap-2">
              {nameEditing ? (
                <div className="flex-1 space-y-1">
                  <input type="text" value={agentName} onChange={e => setAgentName(e.target.value)}
                    onBlur={async () => {
                      if (agentName.trim() && agentName !== agent?.name) {
                        const { data: dup } = await supabase.from('gyeol_agents' as any)
                          .select('id').eq('name', agentName.trim()).neq('id', agent?.id ?? '').limit(1);
                        if (dup && (dup as any[]).length > 0) {
                          setError({ message: 'Name already taken' });
                          setAgentName(agent?.name ?? 'GYEOL');
                        }
                      }
                      setNameEditing(false);
                    }} autoFocus maxLength={20}
                    className="w-full bg-foreground/[0.03] border border-foreground/[0.08] rounded-lg px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary/30" />
                </div>
              ) : (
                <button type="button" onClick={() => setNameEditing(true)}
                  className="flex items-center gap-2 text-sm text-foreground/80 hover:text-primary/80 transition">
                  <span>{agentName}</span>
                  <span aria-hidden="true" className="material-icons-round text-foreground/20 text-xs">edit</span>
                </button>
              )}
              <span className="text-[10px] text-foreground/20 bg-foreground/[0.03] px-2 py-0.5 rounded">Gen {agent?.gen ?? 1}</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-foreground/80">Personality Lock</p>
                <p className="text-[9px] text-foreground/25">Lock to prevent conversation changes</p>
              </div>
              <button type="button" onClick={async () => {
                const locked = !((agent?.settings as any)?.personalityLocked);
                const s = { ...(agent?.settings as any), personalityLocked: locked };
                await supabase.from('gyeol_agents' as any).update({ settings: s } as any).eq('id', agent?.id);
                if (agent) setAgent({ ...agent, settings: s } as any);
              }}
                className={`w-10 h-6 rounded-full transition ${(agent?.settings as any)?.personalityLocked ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-foreground/10'}`}>
                <div className={`w-4 h-4 rounded-full bg-white mx-1 transition-transform shadow-sm ${(agent?.settings as any)?.personalityLocked ? 'translate-x-4' : ''}`} />
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] text-foreground/30">Custom Persona</p>
              <select value={(agent?.settings as any)?.persona ?? 'friend'} onChange={async (e) => {
                const s = { ...(agent?.settings as any), persona: e.target.value };
                await supabase.from('gyeol_agents' as any).update({ settings: s } as any).eq('id', agent?.id);
                if (agent) setAgent({ ...agent, settings: s } as any);
              }}
                className="w-full rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-3 py-2 text-xs text-foreground outline-none">
                <option value="friend">Friend</option>
                <option value="mentor">Mentor</option>
                <option value="assistant">Assistant</option>
                <option value="philosopher">Philosopher</option>
                <option value="comedian">Comedian</option>
                <option value="teacher">Teacher</option>
              </select>
              <input type="text" placeholder="Or type custom persona"
                defaultValue={(agent?.settings as any)?.personaCustom ?? ''}
                onBlur={async (e) => {
                  const val = e.target.value.trim();
                  const s = { ...(agent?.settings as any), personaCustom: val, ...(val ? { persona: val } : {}) };
                  await supabase.from('gyeol_agents' as any).update({ settings: s } as any).eq('id', agent?.id);
                  if (agent) setAgent({ ...agent, settings: s } as any);
                }}
                className="w-full rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-3 py-2 text-xs text-foreground placeholder:text-foreground/20 outline-none" />
            </div>

            <div className="glass-card rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-foreground/30">Balance Score</p>
                <span className="text-sm font-bold text-primary">
                  {(() => {
                    const vals = personality;
                    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
                    const variance = vals.reduce((a, v) => a + Math.pow(v - avg, 2), 0) / vals.length;
                    return Math.round(100 - Math.sqrt(variance));
                  })()}
                </span>
              </div>
              <p className="text-[9px] text-foreground/20">Higher = more balanced personality</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-foreground/30">Quick Presets</p>
                <button type="button" onClick={async () => {
                  const preset = { label: `Custom ${new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}`, warmth, logic, creativity, energy, humor };
                  const s = (agent?.settings as any) ?? {};
                  const saved = s.savedPresets ?? [];
                  const updated = [...saved, preset].slice(-6);
                  const ns = { ...s, savedPresets: updated };
                  await supabase.from('gyeol_agents' as any).update({ settings: ns } as any).eq('id', agent?.id);
                  if (agent) setAgent({ ...agent, settings: ns } as any);
                }}
                  className="text-[9px] px-2 py-1 rounded-full bg-primary/10 text-primary/70 hover:bg-primary/20 transition flex items-center gap-1">
                  <span aria-hidden="true" className="material-icons-round text-[10px]">save</span> Save Current
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {PERSONALITY_PRESETS.map(p => (
                  <button key={p.label} type="button" onClick={() => {
                    setWarmth(p.warmth); setLogic(p.logic); setCreativity(p.creativity);
                    setEnergy(p.energy); setHumor(p.humor);
                  }}
                    className="p-2 rounded-lg glass-card text-center hover:border-primary/20 transition">
                    <span className="text-[8px] text-muted-foreground">{p.label}</span>
                  </button>
                ))}
              </div>
              {((agent?.settings as any)?.savedPresets ?? []).length > 0 && (
                <div className="mt-2">
                  <p className="text-[9px] text-foreground/20 mb-1">Saved Presets</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {((agent?.settings as any)?.savedPresets ?? []).map((p: any, i: number) => (
                      <button key={i} type="button" onClick={() => {
                        setWarmth(p.warmth); setLogic(p.logic); setCreativity(p.creativity);
                        setEnergy(p.energy); setHumor(p.humor);
                      }}
                        className="p-2 rounded-lg glass-card text-center hover:border-primary/20 transition relative group/preset">
                        <span className="text-[8px] text-primary/60 block truncate">{p.label}</span>
                        <button onClick={async (e) => {
                          e.stopPropagation();
                          const s = (agent?.settings as any) ?? {};
                          const saved = (s.savedPresets ?? []).filter((_: any, j: number) => j !== i);
                          const ns = { ...s, savedPresets: saved };
                          await supabase.from('gyeol_agents' as any).update({ settings: ns } as any).eq('id', agent?.id);
                          if (agent) setAgent({ ...agent, settings: ns } as any);
                        }}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive/80 text-foreground text-[8px] flex items-center justify-center opacity-0 group-hover/preset:opacity-100 transition">&times;</button>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {labels.map((label, i) => (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-foreground/40">{label}</span>
                    <span className="text-[10px] text-primary/60 font-mono">{personality[i]}</span>
                  </div>
                  <input type="range" min={0} max={100} value={personality[i]}
                    onChange={e => setters[i](Number(e.target.value))}
                    disabled={(agent?.settings as any)?.personalityLocked}
                    aria-label={label}
                    className="w-full disabled:opacity-30" />
                </div>
              ))}
            </div>

            <button type="button" onClick={savePersonality} disabled={personalitySaving || (agent?.settings as any)?.personalityLocked}
              className="w-full py-2 rounded-xl text-xs font-medium bg-primary/10 text-primary/80 border border-primary/10 hover:bg-primary/15 transition disabled:opacity-40">
              {personalitySaving ? 'Saving...' : (agent?.settings as any)?.personalityLocked ? 'Locked' : 'Save Personality'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
