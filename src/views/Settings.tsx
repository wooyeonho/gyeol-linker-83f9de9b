import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { useAuth } from '@/src/hooks/useAuth';
import { useGyeolStore } from '@/store/gyeol-store';
import { supabase, supabaseUrl } from '@/src/lib/supabase';
import { BottomNav } from '../components/BottomNav';
import { ThemeToggle } from '../components/ThemeToggle';
import { AnimatedCharacter } from '@/src/components/AnimatedCharacter';
import { ModeSwitchGuide } from '@/src/components/ModeSwitchGuide';
import { DeleteAccountModal } from '@/src/components/DeleteAccountModal';
import { AgentShareCard } from '@/src/components/AgentShareCard';
import { StreakCalendar } from '@/src/components/StreakCalendar';
import { subscribePush, unsubscribePush } from '@/lib/gyeol/push';
import { getLocale, setLocale, getAvailableLocales, type Locale } from '@/src/lib/i18n';
import { NotificationSettings } from '@/src/components/NotificationSettings';
import { ProfileCustomizer } from '@/src/components/ProfileCustomizer';
import { AgentStatsDashboard } from '@/src/components/AgentStatsDashboard';
import { SystemPromptEditor } from '@/src/components/SystemPromptEditor';
import { AgentListPanel } from '@/src/components/AgentManager';
import { PersonalityPresetSelector } from '@/src/components/PersonalityPresets';
import { IntimacyEmoji } from '@/src/components/IntimacySystem';
import { MoodSelector } from '@/src/components/MoodSelector';
import { PersonaSelector } from '@/src/components/PersonaSystem';
import { SafetyContentFilter, PIIFilter } from '@/src/components/SettingsDeep';
import { CharacterEditorPanel } from '@/src/components/CharacterEditor';
import { SocialLoginButtons, ProfilePictureUpload } from '@/src/components/AuthDeep';
import { FeedbackDialog } from '@/src/components/FeedbackDialog';
import { useDataExport } from '@/src/hooks/useDataExport';
import { useReferralSystem } from '@/src/hooks/useReferralSystem';

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

const PERSONALITY_PRESETS = [
  { label: '🌊 Calm', warmth: 70, logic: 40, creativity: 50, energy: 30, humor: 40 },
  { label: '⚡ Energetic', warmth: 50, logic: 40, creativity: 60, energy: 80, humor: 70 },
  { label: '🧠 Analytical', warmth: 40, logic: 80, creativity: 50, energy: 50, humor: 30 },
  { label: '🎨 Creative', warmth: 50, logic: 30, creativity: 80, energy: 60, humor: 60 },
  { label: '💝 Caring', warmth: 90, logic: 30, creativity: 40, energy: 60, humor: 50 },
  { label: '🤡 Witty', warmth: 60, logic: 50, creativity: 70, energy: 70, humor: 90 },
];

const BYOK_PROVIDERS = ['openai', 'anthropic', 'deepseek', 'groq', 'gemini'] as const;

type Feed = { id: string; feed_url: string; feed_name: string | null; is_active: boolean };
type Keyword = { id: string; keyword: string; category: string | null };

export default function SettingsPage() {
  const { agent } = useInitAgent();
  const { user, signOut } = useAuth();
  const { setAgent } = useGyeolStore();

  // Personality sliders
  const [warmth, setWarmth] = useState(50);
  const [logic, setLogic] = useState(50);
  const [creativity, setCreativity] = useState(50);
  const [energy, setEnergy] = useState(50);
  const [humor, setHumor] = useState(50);
  const [personalitySaving, setPersonalitySaving] = useState(false);

  // Agent name
  const [agentName, setAgentName] = useState('GYEOL');
  const [nameEditing, setNameEditing] = useState(false);

  // Feeds & Keywords
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedName, setNewFeedName] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  // Existing settings
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
  const [pushEnabled, setPushEnabled] = useState(false);
  const [error, setError] = useState<{ message: string } | null>(null);

  // Proactive message interval
  const PROACTIVE_OPTIONS = [
    { value: 0, label: 'OFF' },
    { value: 1, label: '1시간' },
    { value: 2, label: '2시간' },
    { value: 4, label: '4시간' },
    { value: 6, label: '6시간' },
  ];
  const [proactiveInterval, setProactiveInterval] = useState(6);

  // Analysis domains
  const ANALYSIS_DOMAINS = [
    { key: 'crypto', icon: 'currency_bitcoin', label: '암호화폐/온체인', desc: 'CDD, CVDD, MVRV, NUPL, 공포탐욕 등' },
    { key: 'stocks', icon: 'trending_up', label: '주식', desc: 'PER, PBR, ROE, RSI, VIX 등' },
    { key: 'forex', icon: 'currency_exchange', label: '외환(FX)', desc: 'DXY, 캐리트레이드, PPP, REER 등' },
    { key: 'commodities', icon: 'oil_barrel', label: '원자재', desc: '금은비율, 콘탱고, WTI, CFTC 등' },
    { key: 'macro', icon: 'account_balance', label: '거시경제/채권', desc: '수익률곡선, CPI, PMI, M2 등' },
    { key: 'academic', icon: 'school', label: '논문/학술', desc: 'arXiv, PubMed 등 논문 분석' },
  ] as const;
  const [analysisDomains, setAnalysisDomains] = useState<Record<string, boolean>>({});
  // Mode, Safety, Character
  const [currentMode, setCurrentMode] = useState<'simple' | 'advanced'>('advanced');
  const [kidsSafe, setKidsSafe] = useState(false);
  const [charPreset, setCharPreset] = useState<string | null>('void');
  const CHARS = [
    { key: null, emoji: '✉️', label: 'Text Only' },
    { key: 'void', emoji: '●', label: 'Void' },
    { key: 'jelly', emoji: '🫧', label: 'Jelly' },
    { key: 'cat', emoji: '🐱', label: 'Cat' },
    { key: 'flame', emoji: '🔥', label: 'Flame' },
    { key: 'cloud', emoji: '☁️', label: 'Cloud' },
  ];

  // Active section for mobile-friendly collapsible sections
  const [activeSection, setActiveSection] = useState<string | null>('personality');
  const [modeSwitchOpen, setModeSwitchOpen] = useState(false);
  const [modeSwitchTarget, setModeSwitchTarget] = useState<'simple' | 'advanced'>('simple');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [shareCardOpen, setShareCardOpen] = useState(false);
  const [profileCustomOpen, setProfileCustomOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [safetyLevel, setSafetyLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [piiFilterOn, setPiiFilterOn] = useState(false);
  const [charEditorOpen, setCharEditorOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { exportData, exporting } = useDataExport();
  const { referralCode, referralCount, loadOrCreateCode, applyReferralCode } = useReferralSystem();
  const [referralInput, setReferralInput] = useState('');
  const [referralMsg, setReferralMsg] = useState('');
  useEffect(() => {
    if (!agent) return;
    setWarmth(agent.warmth);
    setLogic(agent.logic);
    setCreativity(agent.creativity);
    setEnergy(agent.energy);
    setHumor(agent.humor);
    setAgentName(agent.name);
    const s = (agent as any).settings ?? {};
    if (typeof s.autoTTS === 'boolean') setAutoTTS(s.autoTTS);
    if (typeof s.ttsSpeed === 'number') setTtsSpeed(s.ttsSpeed);
    if (s.analysisDomains) setAnalysisDomains(s.analysisDomains);
    if (typeof s.proactiveInterval === 'number') setProactiveInterval(s.proactiveInterval);
    if (s.mode) setCurrentMode(s.mode);
    if (typeof s.kidsSafe === 'boolean') setKidsSafe(s.kidsSafe);
    setCharPreset(s.characterPreset ?? 'void');
    
    setTelegramCode(agent.id);

    // Load feeds & keywords
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
    await supabase.from('gyeol_agents' as any).update({
      warmth, logic, creativity, energy, humor, name: agentName,
    } as any).eq('id', agent.id);
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
    const { data, error } = await supabase.from('gyeol_user_feeds' as any).insert({
      agent_id: agent.id, feed_url: newFeedUrl.trim(), feed_name: newFeedName.trim() || null,
    } as any).select().single();
    if (data && !error) {
      setFeeds(prev => [data as any, ...prev]);
      setNewFeedUrl(''); setNewFeedName('');
    }
  };

  const removeFeed = async (id: string) => {
    await supabase.from('gyeol_user_feeds' as any).delete().eq('id', id);
    setFeeds(prev => prev.filter(f => f.id !== id));
  };

  const addKeyword = async () => {
    if (!agent || !newKeyword.trim()) return;
    const { data, error } = await supabase.from('gyeol_user_keywords' as any).insert({
      agent_id: agent.id, keyword: newKeyword.trim(),
    } as any).select().single();
    if (data && !error) {
      setKeywords(prev => [data as any, ...prev]);
      setNewKeyword('');
    }
  };

  const removeKeyword = async (id: string) => {
    await supabase.from('gyeol_user_keywords' as any).delete().eq('id', id);
    setKeywords(prev => prev.filter(k => k.id !== id));
  };

  const saveByok = async (provider: string) => {
    if (!byokKey.trim() || !user) return;
    setByokSaving(true);
    try {
      await supabase.from('gyeol_byok_keys' as any).upsert({ user_id: user.id, provider, encrypted_key: byokKey.trim() } as any, { onConflict: 'user_id,provider' });
      setByokList(prev => [...prev.filter(x => x.provider !== provider), { provider, masked: '****' + byokKey.trim().slice(-4) }]);
      setByokOpen(null); setByokKey('');
    } finally { setByokSaving(false); }
  };

  const deleteByok = async (provider: string) => {
    if (!user) return;
    await supabase.from('gyeol_byok_keys' as any).delete().eq('user_id', user.id).eq('provider', provider);
    setByokList(prev => prev.filter(x => x.provider !== provider));
  };

  const toggleKillSwitch = async () => {
    const newVal = !killSwitchActive;
    await supabase.from('gyeol_system_state' as any).update({ kill_switch: newVal, reason: newVal ? 'User activated' : 'User deactivated' } as any).eq('id', 'global');
    setKillSwitchActive(newVal);
  };

  const toggleSection = (s: string) => setActiveSection(prev => prev === s ? null : s);

  const SectionHeader = ({ id, icon, title }: { id: string; icon: string; title: string }) => (
    <button type="button" onClick={() => toggleSection(id)}
      aria-expanded={activeSection === id}
      aria-controls={`section-${id}`}
      className="w-full flex items-center justify-between py-2 group focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-lg">
      <div className="flex items-center gap-2">
        <span className="material-icons-round text-primary/50 text-sm" aria-hidden="true">{icon}</span>
        <p className="text-[11px] text-foreground/40 uppercase tracking-widest font-medium">{title}</p>
      </div>
      <span className="material-icons-round text-foreground/15 text-sm transition-transform group-hover:text-foreground/30" aria-hidden="true"
        style={{ transform: activeSection === id ? 'rotate(180deg)' : 'rotate(0deg)' }}>
        expand_more
      </span>
    </button>
  );

  const personality = [warmth, logic, creativity, energy, humor];
  const labels = ['Warm', 'Logic', 'Create', 'Energy', 'Humor'];
  const setters = [setWarmth, setLogic, setCreativity, setEnergy, setHumor];

  return (
    <main className="min-h-screen bg-background font-display pb-16 relative" role="main" aria-label="Settings">
      <div className="max-w-md mx-auto px-5 pt-6 pb-4 space-y-4 relative z-10">
        <header className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-foreground/80">Settings</h1>
          <button type="button" onClick={signOut}
            className="text-[10px] text-muted-foreground hover:text-foreground transition">Sign out</button>
        </header>

        {/* Profile Card */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="h-16 bg-gradient-to-r from-primary/30 to-secondary/20" />
          <div className="px-5 pb-5 -mt-8 flex items-end gap-3">
            <div className="relative">
              <div className="w-16 h-16 rounded-full glass-panel flex items-center justify-center">
                <div className="void-dot" />
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[hsl(var(--success,142_71%_45%))] border-2 border-card shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            </div>
            <div className="pb-1 flex-1">
              <p className="text-sm font-bold text-foreground">{agent?.name ?? 'GYEOL'}</p>
              <p className="text-[10px] text-primary/60">Generation {agent?.gen ?? 1}</p>
              <p className="text-[9px] text-muted-foreground/50">Status: Evolving & Learning</p>
            </div>
            <button onClick={() => setDashboardOpen(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary transition"
              aria-label="대시보드">
              <span className="material-icons-round text-sm">dashboard</span>
            </button>
            <button onClick={() => setProfileCustomOpen(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary transition"
              aria-label="프로필 커스터마이즈">
              <span className="material-icons-round text-sm">palette</span>
            </button>
            <button onClick={() => setShareCardOpen(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary transition"
              aria-label="프로필 공유">
              <span className="material-icons-round text-sm">share</span>
            </button>
          </div>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2"><span className="material-icons-round text-primary text-sm">settings</span><h2 className="text-sm font-semibold text-foreground">General</h2></div>
          {/* Account */}
        <section className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Account</p>
          <p className="text-sm text-foreground/60">{user?.email}</p>
        </section>

        {/* Streak Calendar */}
        {agent && (agent as any).consecutive_days > 0 && (
          <StreakCalendar
            streakDays={(agent as any).consecutive_days}
            longestStreak={(agent as any).consecutive_days}
          />
        )}

        </div>

        <div className="h-px bg-foreground/[0.04]" />

        <div className="glass-card rounded-2xl overflow-hidden p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2"><span className="material-icons-round text-primary text-sm">smart_toy</span><h2 className="text-sm font-semibold text-foreground">AI</h2></div>
          {/* ====== MODE ====== */}
        <section>
          <SectionHeader id="mode" icon="toggle_on" title="Mode" />
          <AnimatePresence>
            {activeSection === 'mode' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2">
                <div className="grid grid-cols-2 gap-3 px-1">
                  {[
                    { key: 'simple' as const, icon: '💬', label: 'Simple' },
                    { key: 'advanced' as const, icon: '🧬', label: 'Advanced' },
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
                      <span className="text-xl">{m.icon}</span>
                      <p className="text-[11px] text-foreground/80 mt-1">{m.label}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="h-px bg-foreground/[0.04]" />
        {/* ====== THEME ====== */}
        <section className="glass-card rounded-2xl overflow-hidden p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2"><span className="material-icons-round text-primary text-sm">palette</span><h2 className="text-sm font-semibold text-foreground">Appearance</h2></div>
          <ThemeToggle />
          {/* Custom Theme Color */}
          <div className="flex items-center justify-between mt-3">
            <div>
              <p className="text-[11px] text-foreground/80">Custom Primary Color</p>
              <p className="text-[9px] text-foreground/25">테마 색상 커스터마이즈</p>
            </div>
            <input type="color"
              defaultValue={(() => {
                const c = (agent?.settings as any)?.customThemeColor;
                return c || '#784EDC';
              })()}
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

        {/* ====== LANGUAGE ====== */}
        <section>
          <SectionHeader id="language" icon="language" title="Language" />
          <AnimatePresence>
            {activeSection === 'language' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2 px-1">
                <div className="grid grid-cols-3 gap-2">
                  {getAvailableLocales().map(loc => (
                    <button key={loc.code} type="button" onClick={() => {
                      setLocale(loc.code);
                      window.location.reload();
                    }}
                      className={`p-3 rounded-xl text-center transition ${
                        getLocale() === loc.code ? 'glass-card-selected' : 'glass-card'
                      }`}>
                      <span className="text-sm block">{loc.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="h-px bg-foreground/[0.04]" />

        {/* ====== SYSTEM PROMPT ====== */}
        <section>
          <SectionHeader id="systemprompt" icon="terminal" title="System Prompt" />
          <AnimatePresence>
            {activeSection === 'systemprompt' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2 px-1">
                <SystemPromptEditor agent={agent} onUpdate={(ns) => {
                  if (agent) setAgent({ ...agent, settings: ns } as any);
                }} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="h-px bg-foreground/[0.04]" />

        {/* ====== SAFETY ====== */}
        <section>
          <SectionHeader id="safety" icon="shield" title="Safety" />
          <AnimatePresence>
            {activeSection === 'safety' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2 px-1">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-[11px] text-foreground/80">Kids Safe Mode</p>
                    <p className="text-[9px] text-foreground/25">Age-appropriate content filter</p>
                  </div>
                  <button type="button" onClick={async () => {
                    const v = !kidsSafe; setKidsSafe(v);
                    const s = (agent?.settings as any) ?? {};
                    await supabase.from('gyeol_agents' as any)
                      .update({ settings: { ...s, kidsSafe: v } } as any).eq('id', agent?.id);
                  }}
                    className={`w-10 h-6 rounded-full transition ${kidsSafe ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-foreground/10'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white mx-1 transition-transform shadow-sm ${kidsSafe ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="h-px bg-foreground/[0.04]" />

        {/* ====== CHARACTER ====== */}
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
                      <span className="text-lg">{c.emoji}</span>
                      <span className="text-[9px] text-foreground/30 mt-1">{c.label}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Character Creator */}
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
                        {['🌟', '🔮', '💎', '🌙', '⭐', '🦋', '🐉', '🌸', '🍀', '❄️', '🌈', '🎭'].map(emoji => (
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
                    {/* Preview */}
                    <div className="flex justify-center py-2">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                        style={{
                          background: `radial-gradient(circle, ${(agent?.settings as any)?.customChar?.color1 ?? '#7C3AED'}, ${(agent?.settings as any)?.customChar?.color2 ?? '#A78BFA'})`,
                          boxShadow: `0 0 ${((agent?.settings as any)?.customChar?.glow ?? 50) / 3}px ${(agent?.settings as any)?.customChar?.color1 ?? '#7C3AED'}`,
                        }}>
                        {(agent?.settings as any)?.customChar?.emoji ?? '🌟'}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="h-px bg-foreground/[0.04]" />

        {/* ====== PERSONALITY ====== */}
        <section>
          <SectionHeader id="personality" icon="psychology" title="Personality" />
          <AnimatePresence>
            {activeSection === 'personality' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-4 pt-2">
                {/* Name with duplicate check */}
                <div className="flex items-center gap-2">
                  {nameEditing ? (
                    <div className="flex-1 space-y-1">
                      <input type="text" value={agentName} onChange={e => setAgentName(e.target.value)}
                        onBlur={async () => {
                          if (agentName.trim() && agentName !== agent?.name) {
                            const { data: dup } = await supabase.from('gyeol_agents' as any)
                              .select('id').eq('name', agentName.trim()).neq('id', agent?.id ?? '').limit(1);
                            if (dup && (dup as any[]).length > 0) {
                              setError?.({ message: '이미 사용 중인 이름입니다' });
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
                      <span className="material-icons-round text-foreground/20 text-xs">edit</span>
                    </button>
                  )}
                  <span className="text-[10px] text-foreground/20 bg-foreground/[0.03] px-2 py-0.5 rounded">Gen {agent?.gen ?? 1}</span>
                </div>

                {/* Personality Lock Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-foreground/80">Personality Lock 🔒</p>
                    <p className="text-[9px] text-foreground/25">잠그면 대화로 성격이 변하지 않아요</p>
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

                {/* Custom Persona Text */}
                <div className="space-y-1">
                  <p className="text-[10px] text-foreground/30">Custom Persona</p>
                  <select value={(agent?.settings as any)?.persona ?? 'friend'} onChange={async (e) => {
                    const s = { ...(agent?.settings as any), persona: e.target.value };
                    await supabase.from('gyeol_agents' as any).update({ settings: s } as any).eq('id', agent?.id);
                    if (agent) setAgent({ ...agent, settings: s } as any);
                  }}
                    className="w-full rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-3 py-2 text-xs text-foreground outline-none">
                    <option value="friend">친구</option>
                    <option value="mentor">멘토</option>
                    <option value="assistant">비서</option>
                    <option value="philosopher">철학자</option>
                    <option value="comedian">코미디언</option>
                    <option value="teacher">선생님</option>
                  </select>
                  <input type="text" placeholder="또는 직접 입력 (예: 츤데레 고양이)"
                    defaultValue={(agent?.settings as any)?.personaCustom ?? ''}
                    onBlur={async (e) => {
                      const val = e.target.value.trim();
                      const s = { ...(agent?.settings as any), personaCustom: val, ...(val ? { persona: val } : {}) };
                      await supabase.from('gyeol_agents' as any).update({ settings: s } as any).eq('id', agent?.id);
                      if (agent) setAgent({ ...agent, settings: s } as any);
                    }}
                    className="w-full rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-3 py-2 text-xs text-foreground placeholder:text-foreground/20 outline-none" />
                </div>

                {/* Personality Balance Score */}
                <div className="glass-card rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-foreground/30">Balance Score</p>
                    <span className="text-sm font-bold text-primary">
                      {(() => {
                        const vals = [warmth, logic, creativity, energy, humor];
                        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
                        const variance = vals.reduce((a, v) => a + Math.pow(v - avg, 2), 0) / vals.length;
                        return Math.round(100 - Math.sqrt(variance));
                      })()}
                    </span>
                  </div>
                  <p className="text-[9px] text-foreground/20">수치가 높을수록 균형 잡힌 성격</p>
                </div>

                {/* Personality Presets */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-foreground/30">Quick Presets</p>
                    <button type="button" onClick={async () => {
                      const preset = { label: `Custom ${new Date().toLocaleTimeString('ko', { hour: '2-digit', minute: '2-digit' })}`, warmth, logic, creativity, energy, humor };
                      const s = (agent?.settings as any) ?? {};
                      const saved = s.savedPresets ?? [];
                      const updated = [...saved, preset].slice(-6);
                      const ns = { ...s, savedPresets: updated };
                      await supabase.from('gyeol_agents' as any).update({ settings: ns } as any).eq('id', agent?.id);
                      if (agent) setAgent({ ...agent, settings: ns } as any);
                    }}
                      className="text-[9px] px-2 py-1 rounded-full bg-primary/10 text-primary/70 hover:bg-primary/20 transition flex items-center gap-1">
                      <span className="material-icons-round text-[10px]">save</span> Save Current
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PERSONALITY_PRESETS.map(p => (
                      <button key={p.label} type="button" onClick={() => {
                        setWarmth(p.warmth); setLogic(p.logic); setCreativity(p.creativity);
                        setEnergy(p.energy); setHumor(p.humor);
                      }}
                        className="p-2 rounded-lg glass-card text-center hover:border-primary/20 transition">
                        <span className="text-sm block">{p.label.split(' ')[0]}</span>
                        <span className="text-[8px] text-muted-foreground">{p.label.split(' ')[1]}</span>
                      </button>
                    ))}
                  </div>
                  {/* Saved custom presets */}
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
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive/80 text-foreground text-[8px] flex items-center justify-center opacity-0 group-hover/preset:opacity-100 transition">×</button>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Personality sliders */}
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
                  {personalitySaving ? 'Saving...' : (agent?.settings as any)?.personalityLocked ? '🔒 Locked' : 'Save Personality'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        </div>

        {/* ====== MOOD & INTIMACY (B12) ====== */}
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
                  <MoodSelector
                    currentMood={(agent?.mood as any) ?? 'neutral'}
                    onChange={async (mood) => {
                      await supabase.from('gyeol_agents' as any).update({ mood } as any).eq('id', agent?.id);
                      if (agent) setAgent({ ...agent, mood } as any);
                    }}
                  />
                </div>
                <div>
                  <p className="text-[10px] text-foreground/30 mb-2">Persona</p>
                  <PersonaSelector
                    current={(agent?.settings as any)?.persona ?? 'friend'}
                    onSelect={async (id) => {
                      const s = { ...(agent?.settings as any), persona: id };
                      await supabase.from('gyeol_agents' as any).update({ settings: s } as any).eq('id', agent?.id);
                      if (agent) setAgent({ ...agent, settings: s } as any);
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="glass-card rounded-2xl overflow-hidden p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2"><span className="material-icons-round text-primary text-sm">extension</span><h2 className="text-sm font-semibold text-foreground">Integrations</h2></div>

        {/* ====== INTERESTS & KEYWORDS ====== */}
        <section>
          <SectionHeader id="interests" icon="interests" title="Interest Keywords" />
          <AnimatePresence>
            {activeSection === 'interests' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3 pt-2">
                <p className="text-[10px] text-foreground/25 leading-relaxed">
                  Add keywords your AI will actively learn about and discuss.
                </p>
                <div className="flex gap-1.5">
                  <input type="text" value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
                    placeholder="e.g. AI, music, cooking..." maxLength={50}
                    onKeyDown={e => e.key === 'Enter' && addKeyword()}
                    className="flex-1 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-3 py-2 text-xs text-foreground placeholder:text-foreground/20 outline-none focus:border-primary/20" />
                  <button type="button" onClick={addKeyword} disabled={!newKeyword.trim()}
                    className="rounded-lg bg-primary/10 text-primary/80 px-3 py-2 text-xs disabled:opacity-30">
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map(k => (
                    <span key={k.id}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/8 border border-primary/10 px-2.5 py-1 text-[10px] text-primary/70">
                      {k.keyword}
                      <button type="button" onClick={() => removeKeyword(k.id)}
                        className="text-foreground/20 hover:text-destructive/60 transition">
                        <span className="material-icons-round text-[10px]">close</span>
                      </button>
                    </span>
                  ))}
                  {keywords.length === 0 && <p className="text-[10px] text-foreground/15">No keywords yet</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="h-px bg-foreground/[0.04]" />

        {/* ====== RSS FEEDS ====== */}
        <section>
          <SectionHeader id="feeds" icon="rss_feed" title="RSS Feeds" />
          <AnimatePresence>
            {activeSection === 'feeds' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3 pt-2">
                <p className="text-[10px] text-foreground/25 leading-relaxed">
                  Subscribe to RSS feeds for your AI to learn from automatically.
                </p>
                <div className="space-y-1.5">
                  <input type="url" value={newFeedUrl} onChange={e => setNewFeedUrl(e.target.value)}
                    placeholder="https://example.com/rss"
                    className="w-full rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-3 py-2 text-xs text-foreground placeholder:text-foreground/20 outline-none focus:border-primary/20" />
                  <div className="flex gap-1.5">
                    <input type="text" value={newFeedName} onChange={e => setNewFeedName(e.target.value)}
                      placeholder="Feed name (optional)" maxLength={50}
                      className="flex-1 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-3 py-2 text-xs text-foreground placeholder:text-foreground/20 outline-none focus:border-primary/20" />
                    <button type="button" onClick={addFeed} disabled={!newFeedUrl.trim()}
                      className="rounded-lg bg-primary/10 text-primary/80 px-3 py-2 text-xs disabled:opacity-30">
                      Add
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {feeds.map(f => (
                    <div key={f.id}
                      className="flex items-center justify-between rounded-lg bg-foreground/[0.02] border border-foreground/[0.04] px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-foreground/70 truncate">{f.feed_name || f.feed_url}</p>
                        {f.feed_name && <p className="text-[9px] text-foreground/20 truncate">{f.feed_url}</p>}
                      </div>
                      <button type="button" onClick={() => removeFeed(f.id)}
                        className="text-foreground/15 hover:text-destructive/60 transition ml-2">
                        <span className="material-icons-round text-sm">delete_outline</span>
                      </button>
                    </div>
                  ))}
                  {feeds.length === 0 && <p className="text-[10px] text-foreground/15">No feeds yet</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="h-px bg-foreground/[0.04]" />

        {/* ====== ANALYSIS DOMAINS ====== */}
        <section>
          <SectionHeader id="analysis" icon="analytics" title="Analysis Domains" />
          <AnimatePresence>
            {activeSection === 'analysis' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3 pt-2">
                <p className="text-[10px] text-foreground/25 leading-relaxed">
                  관심 있는 분석 분야를 켜면 대화에서 해당 전문 분석을 제공해요.
                </p>
                <div className="space-y-2">
                  {ANALYSIS_DOMAINS.map(d => {
                    const enabled = analysisDomains[d.key] ?? false;
                    return (
                      <div key={d.key} className="flex items-center justify-between rounded-lg bg-foreground/[0.02] border border-foreground/[0.04] px-3 py-2.5">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="material-icons-round text-primary/40 text-sm">{d.icon}</span>
                          <div className="min-w-0">
                            <p className="text-[11px] text-foreground/70">{d.label}</p>
                            <p className="text-[9px] text-foreground/20 truncate">{d.desc}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => {
                          const next = { ...analysisDomains, [d.key]: !enabled };
                          setAnalysisDomains(next);
                          if (agent) supabase.from('gyeol_agents' as any)
                            .update({ settings: { ...(agent as any).settings, analysisDomains: next } } as any)
                            .eq('id', agent.id);
                        }}
                          className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-foreground/[0.06]'}`}>
                          <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all ${enabled ? 'ml-[18px]' : 'ml-1'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="h-px bg-foreground/[0.04]" />

        {/* ====== PROACTIVE MESSAGE ====== */}
        <section>
          <SectionHeader id="proactive" icon="notifications_active" title="Proactive Message" />
          <AnimatePresence>
            {activeSection === 'proactive' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3 pt-2">
                <p className="text-[10px] text-foreground/25 leading-relaxed">
                  AI가 먼저 연락하는 미접속 시간을 설정해요. 설정한 시간 동안 대화가 없으면 텔레그램으로 먼저 메시지를 보내요.
                </p>
                <div className="flex gap-2">
                  {PROACTIVE_OPTIONS.map(opt => (
                    <button key={opt.value} type="button"
                      onClick={async () => {
                        setProactiveInterval(opt.value);
                        if (agent) {
                          const newSettings = { ...(agent as any).settings, proactiveInterval: opt.value };
                          await supabase.from('gyeol_agents' as any)
                            .update({ settings: newSettings } as any)
                            .eq('id', agent.id);
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

        {/* ====== PREFERENCES ====== */}
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
                          onChange={(e) => (item.onChange as (v: number) => void)(Number(e.target.value))}
                          className="w-20 accent-primary" />
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
                    const next = !autoTTS;
                    setAutoTTS(next);
                    if (agent) supabase.from('gyeol_agents' as any)
                      .update({ settings: { ...(agent as any).settings, autoTTS: next } } as any)
                      .eq('id', agent.id);
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
                      onChange={e => {
                        const v = Number(e.target.value);
                        setTtsSpeed(v);
                        if (agent) supabase.from('gyeol_agents' as any)
                          .update({ settings: { ...(agent as any).settings, ttsSpeed: v } } as any)
                          .eq('id', agent.id);
                      }}
                      className="w-20 accent-primary" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="h-px bg-foreground/[0.04]" />

        {/* ====== NOTIFICATION SETTINGS ====== */}
        <section>
          <SectionHeader id="notifications" icon="notifications" title="Notification Settings" />
          <AnimatePresence>
            {activeSection === 'notifications' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2 px-1">
                <NotificationSettings agent={agent} onUpdate={(ns) => {
                  if (agent) setAgent({ ...agent, settings: ns } as any);
                }} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="h-px bg-foreground/[0.04]" />

        {/* ====== PUSH NOTIFICATIONS ====== */}
        <section>
          <SectionHeader id="push" icon="notifications_active" title="Push Notifications" />
          <AnimatePresence>
            {activeSection === 'push' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3 pt-2">
                <p className="text-[10px] text-foreground/25 leading-relaxed">
                  브라우저 푸시 알림을 활성화하면 AI가 먼저 말을 걸 때 알림을 받아요.
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-foreground/80">Push Notifications</p>
                  <button type="button" onClick={async () => {
                    if (!agent?.id) return;
                    if (pushEnabled) {
                      await unsubscribePush();
                      setPushEnabled(false);
                    } else {
                      const ok = await subscribePush(agent.id);
                      setPushEnabled(ok);
                    }
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

        {/* ====== TELEGRAM ====== */}
        <section>
          <SectionHeader id="telegram" icon="send" title="Telegram" />
          <AnimatePresence>
            {activeSection === 'telegram' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3 pt-2">
                {telegramLinked ? (
                  <div className="flex items-center gap-2 text-[hsl(var(--success,142_71%_45%)/0.7)]">
                    <span className="material-icons-round text-sm">check_circle</span>
                    <span className="text-xs">Telegram Connected</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] text-foreground/40 leading-relaxed">Send this code to the GYEOL bot on Telegram:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-3 py-2 text-xs text-primary/80 font-mono select-all overflow-hidden">
                        /start {telegramCode}
                      </code>
                      <button type="button" onClick={() => navigator.clipboard.writeText(`/start ${telegramCode}`)}
                        className="rounded-lg bg-primary/10 text-primary/80 px-3 py-2 text-xs">Copy</button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="h-px bg-foreground/[0.04]" />

        {/* ====== ADVANCED ====== */}
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
                {/* B17: Safety Content Filter */}
                <div className="space-y-3">
                  <p className="text-[10px] text-foreground/30">Safety Content Filter</p>
                  <SafetyContentFilter level={safetyLevel} onChange={(l) => setSafetyLevel(l)} />
                  <PIIFilter enabled={piiFilterOn} onToggle={() => setPiiFilterOn(!piiFilterOn)} />
                </div>

                {/* B20: Account */}
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

                {/* Account Deletion */}
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

        </div>

        <div className="glass-card rounded-2xl overflow-hidden p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2"><span className="material-icons-round text-primary text-sm">info</span><h2 className="text-sm font-semibold text-foreground">Info</h2></div>
        {/* Launch Readiness: Feedback, Referral, Export */}
        <section className="px-4 mt-6 space-y-3">
          <button type="button" onClick={() => setFeedbackOpen(true)}
            className="w-full py-2.5 rounded-xl text-xs font-medium border border-primary/20 bg-primary/5 text-primary/70 hover:bg-primary/10 transition flex items-center justify-center gap-2">
            <span className="material-icons-round text-sm" aria-hidden="true">feedback</span>
            Send Feedback
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
            <span className="material-icons-round text-sm" aria-hidden="true">download</span>
            {exporting ? 'Preparing...' : 'Export My Data (JSON)'}
          </button>
        </section>

        {/* Legal links */}
        <div className="flex gap-3 justify-center mt-4 mb-8">
          <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground underline decoration-border underline-offset-2 transition">Terms</Link>
          <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground underline decoration-border underline-offset-2 transition">Privacy</Link>
          <Link to="/admin" className="text-xs text-muted-foreground hover:text-foreground underline decoration-border underline-offset-2 transition">Admin</Link>
        </div>
        </div>
      </div>

      <ModeSwitchGuide
        isOpen={modeSwitchOpen}
        onClose={() => setModeSwitchOpen(false)}
        targetMode={modeSwitchTarget}
        onConfirm={async () => {
          const s = (agent?.settings as any) ?? {};
          await supabase.from('gyeol_agents' as any)
            .update({ settings: { ...s, mode: modeSwitchTarget } } as any).eq('id', agent?.id);
          window.location.href = '/';
        }}
      />

      <DeleteAccountModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onDeleted={() => { window.location.href = '/auth'; }}
      />

      {/* Share Card Modal */}
      <AnimatePresence>
        {shareCardOpen && agent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-6" onClick={() => setShareCardOpen(false)}>
            <div onClick={e => e.stopPropagation()}>
              <AgentShareCard
                name={agent.name} gen={agent.gen}
                warmth={agent.warmth} logic={agent.logic} creativity={agent.creativity}
                energy={agent.energy} humor={agent.humor}
                intimacy={agent.intimacy} totalConversations={agent.total_conversations}
                mood={agent.mood} level={1}
                onClose={() => setShareCardOpen(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Customizer */}
      {agent && (
        <ProfileCustomizer
          isOpen={profileCustomOpen}
          onClose={() => setProfileCustomOpen(false)}
          agent={agent}
          onUpdate={(updated) => setAgent(updated)}
        />
      )}

      {/* Agent Stats Dashboard */}
      {agent?.id && (
        <AgentStatsDashboard isOpen={dashboardOpen} onClose={() => setDashboardOpen(false)} agentId={agent.id} />
      )}

      {/* Feedback Dialog */}
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

      <BottomNav />
    </main>
  );
}
