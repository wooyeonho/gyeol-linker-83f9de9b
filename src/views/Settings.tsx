import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { useAuth } from '@/src/hooks/useAuth';
import { useGyeolStore } from '@/store/gyeol-store';
import { supabase } from '@/src/lib/supabase';
import { BottomNav } from '../components/BottomNav';
import { ThemeToggle } from '../components/ThemeToggle';
import { ModeSwitchGuide } from '@/src/components/ModeSwitchGuide';
import { DeleteAccountModal } from '@/src/components/DeleteAccountModal';
import { AgentShareCard } from '@/src/components/AgentShareCard';
import { StreakCalendar } from '@/src/components/StreakCalendar';
import { getLocale, setLocale, getAvailableLocales } from '@/src/lib/i18n';
import { NotificationSettings } from '@/src/components/NotificationSettings';
import { ProfileCustomizer } from '@/src/components/ProfileCustomizer';
import { AgentStatsDashboard } from '@/src/components/AgentStatsDashboard';
import { SystemPromptEditor } from '@/src/components/SystemPromptEditor';
import { IntimacyEmoji } from '@/src/components/IntimacySystem';
import { MoodSelector } from '@/src/components/MoodSelector';
import { PersonaSelector } from '@/src/components/PersonaSystem';
import { subscribePush, unsubscribePush } from '@/lib/gyeol/push';
import { FeedbackDialog } from '@/src/components/FeedbackDialog';
import { useDataExport } from '@/src/hooks/useDataExport';
import { useReferralSystem } from '@/src/hooks/useReferralSystem';
import { PersonalitySection } from '@/src/components/settings/PersonalitySection';
import { BYOKSection } from '@/src/components/settings/BYOKSection';
import { FeedKeywordSection } from '@/src/components/settings/FeedKeywordSection';
import { SafetySection } from '@/src/components/settings/SafetySection';
import { TelegramSection } from '@/src/components/settings/TelegramSection';
import { AnalysisDomainSection } from '@/src/components/settings/AnalysisDomainSection';
import { ModeCharacterSection } from '@/src/components/settings/ModeCharacterSection';

function hexToHSL(hex: string): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

type Feed = { id: string; feed_url: string; feed_name: string | null; is_active: boolean };
type Keyword = { id: string; keyword: string; category: string | null };

export default function SettingsPage() {
  const { agent } = useInitAgent();
  const { user, signOut } = useAuth();
  const { setAgent } = useGyeolStore();

  const [warmth, setWarmth] = useState(50);
  const [logic, setLogic] = useState(50);
  const [creativity, setCreativity] = useState(50);
  const [energy, setEnergy] = useState(50);
  const [humor, setHumor] = useState(50);
  const [personalitySaving, setPersonalitySaving] = useState(false);
  const [agentName, setAgentName] = useState('GYEOL');
  const [nameEditing, setNameEditing] = useState(false);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedName, setNewFeedName] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [autonomyLevel, setAutonomyLevel] = useState(50);
  const [contentFilterOn, setContentFilterOn] = useState(true);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [autoTTS, setAutoTTS] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState(0.95);
  const [byokList, setByokList] = useState<{ provider: string; masked: string }[]>([]);
  const [byokOpen, setByokOpen] = useState<string | null>(null);
  const [byokKey, setByokKey] = useState('');
  const [byokSaving, setByokSaving] = useState(false);
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramCode, setTelegramCode] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [error, setError] = useState<{ message: string } | null>(null);
  const [proactiveInterval, setProactiveInterval] = useState(6);
  const [analysisDomains, setAnalysisDomains] = useState<Record<string, boolean>>({});
  const [currentMode, setCurrentMode] = useState<'simple' | 'advanced'>('advanced');
  const [kidsSafe, setKidsSafe] = useState(false);
  const [charPreset, setCharPreset] = useState<string | null>('void');
  const [activeSection, setActiveSection] = useState<string | null>('personality');
  const [modeSwitchOpen, setModeSwitchOpen] = useState(false);
  const [modeSwitchTarget, setModeSwitchTarget] = useState<'simple' | 'advanced'>('simple');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [shareCardOpen, setShareCardOpen] = useState(false);
  const [profileCustomOpen, setProfileCustomOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [safetyLevel, setSafetyLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [piiFilterOn, setPiiFilterOn] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { exportData, exporting } = useDataExport();
  const { referralCode, referralCount, loadOrCreateCode, applyReferralCode } = useReferralSystem();
  const [referralInput, setReferralInput] = useState('');
  const [referralMsg, setReferralMsg] = useState('');

  const PROACTIVE_OPTIONS = [
    { value: 0, label: 'OFF' },
    { value: 1, label: '1h' },
    { value: 2, label: '2h' },
    { value: 4, label: '4h' },
    { value: 6, label: '6h' },
  ];

  useEffect(() => {
    if (!agent) return;
    setWarmth(agent.warmth); setLogic(agent.logic); setCreativity(agent.creativity);
    setEnergy(agent.energy); setHumor(agent.humor); setAgentName(agent.name);
    const s = (agent as any).settings ?? {};
    if (typeof s.autoTTS === 'boolean') setAutoTTS(s.autoTTS);
    if (typeof s.ttsSpeed === 'number') setTtsSpeed(s.ttsSpeed);
    if (s.analysisDomains) setAnalysisDomains(s.analysisDomains);
    if (typeof s.proactiveInterval === 'number') setProactiveInterval(s.proactiveInterval);
    if (s.mode) setCurrentMode(s.mode);
    if (typeof s.kidsSafe === 'boolean') setKidsSafe(s.kidsSafe);
    setCharPreset(s.characterPreset ?? 'void');
    setTelegramCode(agent.id);
    (async () => {
      const [feedsRes, keywordsRes, telegramRes] = await Promise.all([
        supabase.from('gyeol_user_feeds' as any).select('*').eq('agent_id', agent.id).order('created_at', { ascending: false }),
        supabase.from('gyeol_user_keywords' as any).select('*').eq('agent_id', agent.id).order('created_at', { ascending: false }),
        supabase.from('gyeol_telegram_links' as any).select('id').eq('agent_id', agent.id).limit(1),
      ]);
      if (feedsRes.data) setFeeds(feedsRes.data as any[]);
      if (keywordsRes.data) setKeywords(keywordsRes.data as any[]);
      if (telegramRes.data && (telegramRes.data as any[]).length > 0) setTelegramLinked(true);
    })();
  }, [agent]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('gyeol_byok_keys' as any).select('provider, encrypted_key').eq('user_id', user.id);
      if (data) setByokList((data as any[]).map((x: any) => ({ provider: x.provider, masked: '****' + (x.encrypted_key?.slice(-4) ?? '') })));
    })();
  }, [user]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('gyeol_system_state' as any).select('kill_switch').eq('id', 'global').maybeSingle();
      if (data) setKillSwitchActive((data as any).kill_switch);
    })();
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savePersonality = useCallback(async () => {
    if (!agent) return;
    setPersonalitySaving(true);
    await supabase.from('gyeol_agents' as any).update({ warmth, logic, creativity, energy, humor, name: agentName } as any).eq('id', agent.id);
    setPersonalitySaving(false);
  }, [agent, warmth, logic, creativity, energy, humor, agentName]);

  useEffect(() => {
    if (!agent) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { savePersonality(); }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [warmth, logic, creativity, energy, humor, savePersonality]);

  const addFeed = async () => {
    if (!agent || !newFeedUrl.trim()) return;
    const { data, error } = await supabase.from('gyeol_user_feeds' as any).insert({ agent_id: agent.id, feed_url: newFeedUrl.trim(), feed_name: newFeedName.trim() || null } as any).select().single();
    if (data && !error) { setFeeds(prev => [data as any, ...prev]); setNewFeedUrl(''); setNewFeedName(''); }
  };
  const removeFeed = async (id: string) => { await supabase.from('gyeol_user_feeds' as any).delete().eq('id', id); setFeeds(prev => prev.filter(f => f.id !== id)); };
  const addKeyword = async () => {
    if (!agent || !newKeyword.trim()) return;
    const { data, error } = await supabase.from('gyeol_user_keywords' as any).insert({ agent_id: agent.id, keyword: newKeyword.trim() } as any).select().single();
    if (data && !error) { setKeywords(prev => [data as any, ...prev]); setNewKeyword(''); }
  };
  const removeKeyword = async (id: string) => { await supabase.from('gyeol_user_keywords' as any).delete().eq('id', id); setKeywords(prev => prev.filter(k => k.id !== id)); };
  const toggleKillSwitch = async () => {
    const newVal = !killSwitchActive;
    await supabase.from('gyeol_system_state' as any).update({ kill_switch: newVal, reason: newVal ? 'User activated' : 'User deactivated' } as any).eq('id', 'global');
    setKillSwitchActive(newVal);
  };
  const toggleSection = (s: string) => setActiveSection(prev => prev === s ? null : s);

  const SectionHeader = ({ id, icon, title }: { id: string; icon: string; title: string }) => (
    <button type="button" onClick={() => toggleSection(id)}
      aria-expanded={activeSection === id} aria-controls={`section-${id}`}
      className="w-full flex items-center justify-between py-2 group focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-lg">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="material-icons-round text-primary/50 text-sm">{icon}</span>
        <p className="text-[11px] text-foreground/40 uppercase tracking-widest font-medium">{title}</p>
      </div>
      <span aria-hidden="true" className="material-icons-round text-foreground/15 text-sm transition-transform group-hover:text-foreground/30"
        style={{ transform: activeSection === id ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
    </button>
  );

  return (
    <main className="min-h-screen bg-background font-display pb-16 relative" role="main" aria-label="Settings">
      <div className="max-w-md mx-auto px-5 pt-6 pb-4 space-y-4 relative z-10">
        <header className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-foreground/80">Settings</h1>
          <button type="button" onClick={signOut} className="text-[10px] text-muted-foreground hover:text-foreground transition">Sign out</button>
        </header>

        {/* Profile Card */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="h-16 bg-gradient-to-r from-primary/30 to-secondary/20" />
          <div className="px-5 pb-5 -mt-8 flex items-end gap-3">
            <div className="relative">
              <div className="w-16 h-16 rounded-full glass-panel flex items-center justify-center"><div className="void-dot" /></div>
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[hsl(var(--success,142_71%_45%))] border-2 border-card shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            </div>
            <div className="pb-1 flex-1">
              <p className="text-sm font-bold text-foreground">{agent?.name ?? 'GYEOL'}</p>
              <p className="text-[10px] text-primary/60">Generation {agent?.gen ?? 1}</p>
              <p className="text-[9px] text-muted-foreground/50">Status: Evolving & Learning</p>
            </div>
            <button onClick={() => setDashboardOpen(true)} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary transition" aria-label="Dashboard">
              <span aria-hidden="true" className="material-icons-round text-sm">dashboard</span>
            </button>
            <button onClick={() => setProfileCustomOpen(true)} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary transition" aria-label="Customize">
              <span aria-hidden="true" className="material-icons-round text-sm">palette</span>
            </button>
            <button onClick={() => setShareCardOpen(true)} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary transition" aria-label="Share">
              <span aria-hidden="true" className="material-icons-round text-sm">share</span>
            </button>
          </div>
        </div>

        {/* General */}
        <div className="glass-card rounded-2xl overflow-hidden p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2"><span aria-hidden="true" className="material-icons-round text-primary text-sm">settings</span><h2 className="text-sm font-semibold text-foreground">General</h2></div>
          <section className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Account</p>
            <p className="text-sm text-foreground/60">{user?.email}</p>
          </section>
          {agent && (agent as any).consecutive_days > 0 && (
            <StreakCalendar streakDays={(agent as any).consecutive_days} longestStreak={(agent as any).consecutive_days} />
          )}
        </div>

        <div className="h-px bg-foreground/[0.04]" />

        {/* AI Section */}
        <div className="glass-card rounded-2xl overflow-hidden p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2"><span aria-hidden="true" className="material-icons-round text-primary text-sm">smart_toy</span><h2 className="text-sm font-semibold text-foreground">AI</h2></div>

          <ModeCharacterSection agent={agent} activeSection={activeSection} SectionHeader={SectionHeader}
            currentMode={currentMode} setModeSwitchTarget={setModeSwitchTarget} setModeSwitchOpen={setModeSwitchOpen}
            charPreset={charPreset} setCharPreset={setCharPreset} />

          <div className="h-px bg-foreground/[0.04]" />

          {/* Appearance */}
          <section className="glass-card rounded-2xl overflow-hidden p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2"><span aria-hidden="true" className="material-icons-round text-primary text-sm">palette</span><h2 className="text-sm font-semibold text-foreground">Appearance</h2></div>
            <ThemeToggle />
            <div className="flex items-center justify-between mt-3">
              <div>
                <p className="text-[11px] text-foreground/80">Custom Primary Color</p>
                <p className="text-[9px] text-foreground/25">Customize theme color</p>
              </div>
              <input type="color"
                defaultValue={(() => { const c = (agent?.settings as any)?.customThemeColor; return c || '#784EDC'; })()}
                onChange={async (e) => {
                  const color = e.target.value;
                  document.documentElement.style.setProperty('--primary', `${hexToHSL(color)}`);
                  const s = { ...(agent?.settings as any), customThemeColor: color };
                  await supabase.from('gyeol_agents' as any).update({ settings: s } as any).eq('id', agent?.id);
                  if (agent) setAgent({ ...agent, settings: s } as any);
                }}
                className="w-8 h-8 rounded-lg border border-foreground/10 cursor-pointer bg-transparent" />
            </div>
          </section>

          <div className="h-px bg-foreground/[0.04]" />

          {/* Language */}
          <section>
            <SectionHeader id="language" icon="language" title="Language" />
            <AnimatePresence>
              {activeSection === 'language' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2 px-1">
                  <div className="grid grid-cols-3 gap-2">
                    {getAvailableLocales().map(loc => (
                      <button key={loc.code} type="button" onClick={() => { setLocale(loc.code); window.location.reload(); }}
                        className={`p-3 rounded-xl text-center transition ${getLocale() === loc.code ? 'glass-card-selected' : 'glass-card'}`}>
                        <span className="text-sm block">{loc.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <div className="h-px bg-foreground/[0.04]" />

          {/* System Prompt */}
          <section>
            <SectionHeader id="systemprompt" icon="terminal" title="System Prompt" />
            <AnimatePresence>
              {activeSection === 'systemprompt' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2 px-1">
                  <SystemPromptEditor agent={agent} onUpdate={(ns) => { if (agent) setAgent({ ...agent, settings: ns } as any); }} />
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <div className="h-px bg-foreground/[0.04]" />

          <SafetySection agent={agent} activeSection={activeSection} SectionHeader={SectionHeader} kidsSafe={kidsSafe} setKidsSafe={setKidsSafe} />

          <div className="h-px bg-foreground/[0.04]" />

          <PersonalitySection agent={agent} activeSection={activeSection} toggleSection={toggleSection} SectionHeader={SectionHeader}
            warmth={warmth} setWarmth={setWarmth} logic={logic} setLogic={setLogic}
            creativity={creativity} setCreativity={setCreativity} energy={energy} setEnergy={setEnergy}
            humor={humor} setHumor={setHumor} agentName={agentName} setAgentName={setAgentName}
            nameEditing={nameEditing} setNameEditing={setNameEditing}
            personalitySaving={personalitySaving} savePersonality={savePersonality} setError={setError} />
        </div>

        {/* Mood & Intimacy */}
        <section>
          <SectionHeader id="mood" icon="mood" title="Mood & Intimacy" />
          <AnimatePresence>
            {activeSection === 'mood' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-4 pt-2">
                <div className="flex items-center gap-3">
                  <IntimacyEmoji intimacy={agent?.intimacy ?? 0} />
                  <div>
                    <p className="text-[11px] text-foreground/80">Intimacy Level</p>
                    <p className="text-[9px] text-foreground/25">{agent?.intimacy ?? 0}% — {(agent?.intimacy ?? 0) < 20 ? 'Stranger' : (agent?.intimacy ?? 0) < 50 ? 'Friend' : (agent?.intimacy ?? 0) < 80 ? 'Close Friend' : 'Soulmate'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-foreground/30 mb-2">Current Mood</p>
                  <MoodSelector currentMood={(agent?.mood as any) ?? 'neutral'} onChange={async (mood) => {
                    await supabase.from('gyeol_agents' as any).update({ mood } as any).eq('id', agent?.id);
                    if (agent) setAgent({ ...agent, mood } as any);
                  }} />
                </div>
                <div>
                  <p className="text-[10px] text-foreground/30 mb-2">Persona</p>
                  <PersonaSelector current={(agent?.settings as any)?.persona ?? 'friend'} onSelect={async (id) => {
                    const s = { ...(agent?.settings as any), persona: id };
                    await supabase.from('gyeol_agents' as any).update({ settings: s } as any).eq('id', agent?.id);
                    if (agent) setAgent({ ...agent, settings: s } as any);
                  }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Integrations */}
        <div className="glass-card rounded-2xl overflow-hidden p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2"><span aria-hidden="true" className="material-icons-round text-primary text-sm">extension</span><h2 className="text-sm font-semibold text-foreground">Integrations</h2></div>

          <FeedKeywordSection activeSection={activeSection} SectionHeader={SectionHeader}
            feeds={feeds} keywords={keywords}
            newFeedUrl={newFeedUrl} setNewFeedUrl={setNewFeedUrl}
            newFeedName={newFeedName} setNewFeedName={setNewFeedName}
            newKeyword={newKeyword} setNewKeyword={setNewKeyword}
            addFeed={addFeed} removeFeed={removeFeed} addKeyword={addKeyword} removeKeyword={removeKeyword} />

          <div className="h-px bg-foreground/[0.04]" />

          <AnalysisDomainSection agent={agent} activeSection={activeSection} SectionHeader={SectionHeader}
            analysisDomains={analysisDomains} setAnalysisDomains={setAnalysisDomains} />

          <div className="h-px bg-foreground/[0.04]" />

          {/* Proactive Message */}
          <section>
            <SectionHeader id="proactive" icon="notifications_active" title="Proactive Message" />
            <AnimatePresence>
              {activeSection === 'proactive' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3 pt-2">
                  <p className="text-[10px] text-foreground/25 leading-relaxed">
                    Set how often AI initiates messages when you're inactive.
                  </p>
                  <div className="flex gap-2">
                    {PROACTIVE_OPTIONS.map(opt => (
                      <button key={opt.value} type="button" onClick={async () => {
                        setProactiveInterval(opt.value);
                        if (agent) {
                          const newSettings = { ...(agent as any).settings, proactiveInterval: opt.value };
                          await supabase.from('gyeol_agents' as any).update({ settings: newSettings } as any).eq('id', agent.id);
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

          {/* Preferences */}
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
                      if (agent) supabase.from('gyeol_agents' as any).update({ settings: { ...(agent as any).settings, autoTTS: next } } as any).eq('id', agent.id);
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
                          if (agent) supabase.from('gyeol_agents' as any).update({ settings: { ...(agent as any).settings, ttsSpeed: v } } as any).eq('id', agent.id);
                        }} className="w-20 accent-primary" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <div className="h-px bg-foreground/[0.04]" />

          {/* Notification Settings */}
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

          {/* Push Notifications */}
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

          <div className="h-px bg-foreground/[0.04]" />

          <TelegramSection activeSection={activeSection} SectionHeader={SectionHeader} telegramLinked={telegramLinked} telegramCode={telegramCode} />

          <div className="h-px bg-foreground/[0.04]" />

          <BYOKSection agent={agent} user={user} activeSection={activeSection} SectionHeader={SectionHeader}
            byokList={byokList} setByokList={setByokList} byokOpen={byokOpen} setByokOpen={setByokOpen}
            byokKey={byokKey} setByokKey={setByokKey} byokSaving={byokSaving} setByokSaving={setByokSaving}
            safetyLevel={safetyLevel} setSafetyLevel={setSafetyLevel} piiFilterOn={piiFilterOn} setPiiFilterOn={setPiiFilterOn}
            killSwitchActive={killSwitchActive} toggleKillSwitch={toggleKillSwitch} setDeleteModalOpen={setDeleteModalOpen} />
        </div>

        {/* Info */}
        <div className="glass-card rounded-2xl overflow-hidden p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2"><span aria-hidden="true" className="material-icons-round text-primary text-sm">info</span><h2 className="text-sm font-semibold text-foreground">Info</h2></div>
          <section className="px-4 mt-6 space-y-3">
            <button type="button" onClick={() => setFeedbackOpen(true)}
              className="w-full py-2.5 rounded-xl text-xs font-medium border border-primary/20 bg-primary/5 text-primary/70 hover:bg-primary/10 transition flex items-center justify-center gap-2">
              <span aria-hidden="true" className="material-icons-round text-sm">feedback</span> Send Feedback
            </button>
            <div className="p-3 rounded-xl border border-border/10 bg-card/30 space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Invite Friends</p>
              <div className="flex gap-2">
                <input readOnly value={referralCode ?? ''} onClick={() => { if (!referralCode) loadOrCreateCode(); }}
                  placeholder="Click to generate code" className="flex-1 bg-background/50 border border-border/10 rounded-lg px-2 py-1.5 text-xs text-foreground" />
                {referralCode && (
                  <button type="button" onClick={() => { navigator.clipboard.writeText(referralCode); }}
                    className="px-3 py-1.5 rounded-lg text-xs bg-primary/10 text-primary border border-primary/20">Copy</button>
                )}
              </div>
              {referralCount > 0 && <p className="text-[10px] text-muted-foreground">Invited: {referralCount}</p>}
              <div className="flex gap-2 mt-1">
                <input value={referralInput} onChange={e => setReferralInput(e.target.value)}
                  placeholder="Enter invite code" className="flex-1 bg-background/50 border border-border/10 rounded-lg px-2 py-1.5 text-xs text-foreground" />
                <button type="button" onClick={async () => {
                  const ok = await applyReferralCode(referralInput);
                  setReferralMsg(ok ? 'Applied! +50 coins' : 'Invalid code');
                  setTimeout(() => setReferralMsg(''), 3000);
                }} className="px-3 py-1.5 rounded-lg text-xs bg-primary/10 text-primary border border-primary/20">Apply</button>
              </div>
              {referralMsg && <p className="text-[10px] text-primary/70">{referralMsg}</p>}
            </div>
            <button type="button" onClick={exportData} disabled={exporting}
              className="w-full py-2.5 rounded-xl text-xs font-medium border border-border/20 bg-card/30 text-foreground/70 hover:bg-card/50 transition flex items-center justify-center gap-2">
              <span aria-hidden="true" className="material-icons-round text-sm">download</span>
              {exporting ? 'Preparing...' : 'Export My Data (JSON)'}
            </button>
          </section>
          <div className="flex gap-3 justify-center mt-4 mb-8">
            <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground underline decoration-border underline-offset-2 transition">Terms</Link>
            <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground underline decoration-border underline-offset-2 transition">Privacy</Link>
            <Link to="/admin" className="text-xs text-muted-foreground hover:text-foreground underline decoration-border underline-offset-2 transition">Admin</Link>
          </div>
        </div>
      </div>

      <ModeSwitchGuide isOpen={modeSwitchOpen} onClose={() => setModeSwitchOpen(false)} targetMode={modeSwitchTarget}
        onConfirm={async () => {
          const s = (agent?.settings as any) ?? {};
          await supabase.from('gyeol_agents' as any).update({ settings: { ...s, mode: modeSwitchTarget } } as any).eq('id', agent?.id);
          window.location.href = '/';
        }} />
      <DeleteAccountModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onDeleted={() => { window.location.href = '/auth'; }} />
      <AnimatePresence>
        {shareCardOpen && agent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-6" onClick={() => setShareCardOpen(false)}>
            <div onClick={e => e.stopPropagation()}>
              <AgentShareCard name={agent.name} gen={agent.gen} warmth={agent.warmth} logic={agent.logic} creativity={agent.creativity}
                energy={agent.energy} humor={agent.humor} intimacy={agent.intimacy} totalConversations={agent.total_conversations}
                mood={agent.mood} level={1} onClose={() => setShareCardOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {agent && <ProfileCustomizer isOpen={profileCustomOpen} onClose={() => setProfileCustomOpen(false)} agent={agent} onUpdate={(updated) => setAgent(updated)} />}
      {agent?.id && <AgentStatsDashboard isOpen={dashboardOpen} onClose={() => setDashboardOpen(false)} agentId={agent.id} />}
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <BottomNav />
    </main>
  );
}
