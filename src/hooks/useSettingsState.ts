import { useEffect, useState, useCallback, useRef } from 'react';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { useAuth } from '@/src/hooks/useAuth';
import { useGyeolStore } from '@/store/gyeol-store';
import { supabase } from '@/src/lib/supabase';
import { useDataExport } from '@/src/hooks/useDataExport';
import { useReferralSystem } from '@/src/hooks/useReferralSystem';

type Feed = { id: string; feed_url: string; feed_name: string | null; is_active: boolean };
type Keyword = { id: string; keyword: string; category: string | null };

export function useSettingsState() {
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
    const s = agent?.settings ?? {};
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
        supabase.from('gyeol_user_feeds').select('*').eq('agent_id', agent.id).order('created_at', { ascending: false }),
        supabase.from('gyeol_user_keywords' as any).select('*').eq('agent_id', agent.id).order('created_at', { ascending: false }),
        supabase.from('gyeol_telegram_links').select('id').eq('agent_id', agent.id).limit(1),
      ]);
      if (feedsRes.data) setFeeds(feedsRes.data as any[]);
      if (keywordsRes.data) setKeywords(keywordsRes.data as any[]);
      if (telegramRes.data && (telegramRes.data as any[]).length > 0) setTelegramLinked(true);
    })();
  }, [agent]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('gyeol_byok_keys').select('provider, encrypted_key').eq('user_id', user.id);
      if (data) setByokList((data ?? []).map((x: any) => ({ provider: x.provider, masked: '****' + (x.encrypted_key?.slice(-4) ?? '') })));
    })();
  }, [user]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('gyeol_system_state').select('kill_switch').eq('id', 'global').maybeSingle();
      if (data) setKillSwitchActive((data as any).kill_switch);
    })();
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savePersonality = useCallback(async () => {
    if (!agent) return;
    setPersonalitySaving(true);
    await supabase.from('gyeol_agents').update({ warmth, logic, creativity, energy, humor, name: agentName }).eq('id', agent.id);
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
    const { data, error } = await supabase.from('gyeol_user_feeds').insert({ agent_id: agent.id, feed_url: newFeedUrl.trim(), feed_name: newFeedName.trim() || null }).select().single();
    if (data && !error) { setFeeds(prev => [data as any, ...prev]); setNewFeedUrl(''); setNewFeedName(''); }
  };
  const removeFeed = async (id: string) => { await supabase.from('gyeol_user_feeds').delete().eq('id', id); setFeeds(prev => prev.filter(f => f.id !== id)); };
  const addKeyword = async () => {
    if (!agent || !newKeyword.trim()) return;
    const { data, error } = await supabase.from('gyeol_user_keywords' as any).insert({ agent_id: agent.id, keyword: newKeyword.trim() }).select().single();
    if (data && !error) { setKeywords(prev => [data as any, ...prev]); setNewKeyword(''); }
  };
  const removeKeyword = async (id: string) => { await supabase.from('gyeol_user_keywords' as any).delete().eq('id', id); setKeywords(prev => prev.filter(k => k.id !== id)); };
  const toggleKillSwitch = async () => {
    const newVal = !killSwitchActive;
    await supabase.from('gyeol_system_state').update({ kill_switch: newVal, reason: newVal ? 'User activated' : 'User deactivated' }).eq('id', 'global');
    setKillSwitchActive(newVal);
  };
  const toggleSection = (s: string) => setActiveSection(prev => prev === s ? null : s);

  return {
    agent, user, signOut, setAgent,
    warmth, setWarmth, logic, setLogic, creativity, setCreativity, energy, setEnergy, humor, setHumor,
    personalitySaving, savePersonality, agentName, setAgentName, nameEditing, setNameEditing,
    feeds, keywords, newFeedUrl, setNewFeedUrl, newFeedName, setNewFeedName, newKeyword, setNewKeyword,
    addFeed, removeFeed, addKeyword, removeKeyword,
    autonomyLevel, setAutonomyLevel, contentFilterOn, setContentFilterOn,
    notificationsOn, setNotificationsOn, autoTTS, setAutoTTS, ttsSpeed, setTtsSpeed,
    byokList, setByokList, byokOpen, setByokOpen, byokKey, setByokKey, byokSaving, setByokSaving,
    killSwitchActive, toggleKillSwitch,
    telegramLinked, telegramCode, pushEnabled, setPushEnabled,
    error, setError, proactiveInterval, setProactiveInterval,
    analysisDomains, setAnalysisDomains,
    currentMode, setCurrentMode, kidsSafe, setKidsSafe,
    charPreset, setCharPreset, activeSection, toggleSection,
    modeSwitchOpen, setModeSwitchOpen, modeSwitchTarget, setModeSwitchTarget,
    deleteModalOpen, setDeleteModalOpen, shareCardOpen, setShareCardOpen,
    profileCustomOpen, setProfileCustomOpen, dashboardOpen, setDashboardOpen,
    safetyLevel, setSafetyLevel, piiFilterOn, setPiiFilterOn,
    feedbackOpen, setFeedbackOpen, exportData, exporting,
    referralCode, referralCount, loadOrCreateCode, applyReferralCode,
    referralInput, setReferralInput, referralMsg, setReferralMsg,
    PROACTIVE_OPTIONS,
  };
}
