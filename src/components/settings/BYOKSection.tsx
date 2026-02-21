import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import { useGyeolStore } from '@/store/gyeol-store';
import { SafetyContentFilter, PIIFilter } from '@/src/components/SettingsDeep';
import { SocialLoginButtons, ProfilePictureUpload } from '@/src/components/AuthDeep';

const BYOK_PROVIDERS = ['openai', 'anthropic', 'deepseek', 'groq', 'gemini'] as const;

interface Props {
  agent: any;
  user: any;
  activeSection: string | null;
  SectionHeader: React.FC<{ id: string; icon: string; title: string }>;
  byokList: { provider: string; masked: string }[];
  setByokList: React.Dispatch<React.SetStateAction<{ provider: string; masked: string }[]>>;
  byokOpen: string | null; setByokOpen: (v: string | null) => void;
  byokKey: string; setByokKey: (v: string) => void;
  byokSaving: boolean; setByokSaving: (v: boolean) => void;
  safetyLevel: 'low' | 'medium' | 'high'; setSafetyLevel: (v: 'low' | 'medium' | 'high') => void;
  piiFilterOn: boolean; setPiiFilterOn: (v: boolean) => void;
  killSwitchActive: boolean; toggleKillSwitch: () => void;
  setDeleteModalOpen: (v: boolean) => void;
}

export function BYOKSection({
  agent, user, activeSection, SectionHeader,
  byokList, setByokList, byokOpen, setByokOpen, byokKey, setByokKey,
  byokSaving, setByokSaving, safetyLevel, setSafetyLevel,
  piiFilterOn, setPiiFilterOn, killSwitchActive, toggleKillSwitch, setDeleteModalOpen,
}: Props) {
  const { setAgent } = useGyeolStore();

  const saveByok = async (provider: string) => {
    if (!byokKey.trim() || !user) return;
    setByokSaving(true);
    try {
      await supabase.from('gyeol_byok_keys' as any).upsert({ user_id: user.id, provider, encrypted_key: byokKey.trim() } as any, { onConflict: 'user_id,provider' });
      setByokList(prev => [...prev.filter(x => x.provider !== provider), { provider, masked: '****' + byokKey.trim().slice(-4) }]);
      setByokOpen(null); setByokKey('');
    } finally { setByokSaving(false); }
  };

  return (
    <section>
      <SectionHeader id="advanced" icon="settings" title="Advanced" />
      <AnimatePresence>
        {activeSection === 'advanced' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2 space-y-4">
            <div className="space-y-2">
              <p className="text-[10px] text-foreground/30">Premium AI Models (BYOK)</p>
              <div className="grid grid-cols-2 gap-1.5">
                {BYOK_PROVIDERS.map((provider) => {
                  const registered = byokList.find(x => x.provider === provider);
                  return (
                    <div key={provider} className="flex flex-col gap-1">
                      <button type="button" onClick={() => setByokOpen(byokOpen === provider ? null : provider)}
                        className={`rounded-lg border py-1.5 text-xs capitalize transition ${registered ? 'border-primary/20 text-primary/80 bg-primary/5' : 'border-foreground/[0.06] text-foreground/30 hover:bg-foreground/[0.03]'}`}>
                        <span className="flex items-center justify-center gap-1">
                          {registered && <span className="material-icons-round text-[10px] text-[hsl(var(--success,142_71%_45%))]">check_circle</span>}
                          {provider}
                        </span>
                      </button>
                      {byokOpen === provider && (
                        <div className="space-y-1">
                          {registered && (
                            <div className="flex items-center justify-between rounded-lg bg-foreground/[0.02] border border-foreground/[0.04] px-2 py-1">
                              <span className="text-[10px] text-foreground/40 font-mono">{registered.masked}</span>
                              <button type="button" onClick={async () => {
                                if (!user) return;
                                await supabase.from('gyeol_byok_keys' as any).delete().eq('user_id', user.id).eq('provider', provider);
                                setByokList(prev => prev.filter(x => x.provider !== provider));
                                setByokOpen(null);
                              }}
                                className="text-destructive/60 hover:text-destructive transition">
                                <span className="material-icons-round text-xs">delete_outline</span>
                              </button>
                            </div>
                          )}
                          <div className="flex gap-1">
                            <input type="password" placeholder={registered ? "New API Key" : "API Key"} value={byokKey} onChange={e => setByokKey(e.target.value)}
                              className="flex-1 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-2 py-1 text-xs text-foreground placeholder:text-foreground/20 outline-none" />
                            <button type="button" disabled={byokSaving || !byokKey.trim()} onClick={() => saveByok(provider)}
                              className="rounded-lg bg-primary/10 text-primary/80 px-2 py-1 text-xs disabled:opacity-40">{registered ? 'Update' : 'Save'}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] text-foreground/30">Safety Content Filter</p>
              <SafetyContentFilter level={safetyLevel} onChange={(l) => setSafetyLevel(l)} />
              <PIIFilter enabled={piiFilterOn} onToggle={() => setPiiFilterOn(!piiFilterOn)} />
            </div>
            <div className="space-y-3">
              <p className="text-[10px] text-foreground/30">Account</p>
              <ProfilePictureUpload
                currentUrl={(agent?.settings as any)?.profilePicture}
                onUpload={async (url) => {
                  const s = { ...(agent?.settings as any), profilePicture: url };
                  await supabase.from('gyeol_agents' as any).update({ settings: s } as any).eq('id', agent?.id);
                  if (agent) setAgent({ ...agent, settings: s } as any);
                }}
              />
              <SocialLoginButtons onLogin={(provider) => console.log('Social login:', provider)} />
            </div>
            <button type="button" onClick={toggleKillSwitch}
              className={`w-full py-2.5 rounded-xl text-xs font-medium border transition ${killSwitchActive ? 'bg-[hsl(var(--success,142_71%_45%)/0.05)] text-[hsl(var(--success,142_71%_45%)/0.7)] border-[hsl(var(--success,142_71%_45%)/0.1)]' : 'bg-destructive/5 text-destructive/70 border-destructive/10'}`}>
              {killSwitchActive ? 'Resume System' : 'Emergency Stop (Kill Switch)'}
            </button>
            <div className="mt-4 pt-4 border-t border-border/10">
              <button type="button" onClick={() => setDeleteModalOpen(true)}
                className="w-full py-2.5 rounded-xl text-xs font-medium border border-destructive/20 bg-destructive/5 text-destructive/70 hover:bg-destructive/10 transition">
                Delete Account & All Data
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
