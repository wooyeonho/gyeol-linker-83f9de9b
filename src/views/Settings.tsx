import { AnimatePresence, motion } from 'framer-motion';
import { useSettingsState } from '@/src/hooks/useSettingsState';
import { supabase } from '@/src/lib/supabase';
import { BottomNav } from '../components/BottomNav';
import { ModeSwitchGuide } from '@/src/components/ModeSwitchGuide';
import { DeleteAccountModal } from '@/src/components/DeleteAccountModal';
import { AgentShareCard } from '@/src/components/AgentShareCard';
import { StreakCalendar } from '@/src/components/StreakCalendar';
import { ProfileCustomizer } from '@/src/components/ProfileCustomizer';
import { AgentStatsDashboard } from '@/src/components/AgentStatsDashboard';
import { SystemPromptEditor } from '@/src/components/SystemPromptEditor';
import { IntimacyEmoji } from '@/src/components/IntimacySystem';
import { MoodSelector } from '@/src/components/MoodSelector';
import { PersonaSelector } from '@/src/components/PersonaSystem';
import { FeedbackDialog } from '@/src/components/FeedbackDialog';
import { PersonalitySection } from '@/src/components/settings/PersonalitySection';
import { BYOKSection } from '@/src/components/settings/BYOKSection';
import { FeedKeywordSection } from '@/src/components/settings/FeedKeywordSection';
import { SafetySection } from '@/src/components/settings/SafetySection';
import { TelegramSection } from '@/src/components/settings/TelegramSection';
import { AnalysisDomainSection } from '@/src/components/settings/AnalysisDomainSection';
import { ModeCharacterSection } from '@/src/components/settings/ModeCharacterSection';
import { AppearanceSection } from '@/src/components/settings/AppearanceSection';
import { PreferencesSection } from '@/src/components/settings/PreferencesSection';
import { InfoSection } from '@/src/components/settings/InfoSection';
import { parseSettings } from '@/src/utils/agent-settings';
import { ChevronDown, Settings, Palette, Share2, BarChart3, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const state = useSettingsState();
  const {
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
    currentMode, kidsSafe, setKidsSafe,
    charPreset, setCharPreset, activeSection, toggleSection,
    modeSwitchOpen, setModeSwitchOpen, modeSwitchTarget, setModeSwitchTarget,
    deleteModalOpen, setDeleteModalOpen, shareCardOpen, setShareCardOpen,
    profileCustomOpen, setProfileCustomOpen, dashboardOpen, setDashboardOpen,
    safetyLevel, setSafetyLevel, piiFilterOn, setPiiFilterOn,
    feedbackOpen, setFeedbackOpen, exportData, exporting,
    referralCode, referralCount, loadOrCreateCode, applyReferralCode,
    referralInput, setReferralInput, referralMsg, setReferralMsg,
    PROACTIVE_OPTIONS,
  } = state;

  const SectionHeader = ({ id, icon, title }: { id: string; icon: string; title: string }) => (
    <button type="button" onClick={() => toggleSection(id)}
      aria-expanded={activeSection === id} aria-controls={`section-${id}`}
      className="w-full flex items-center justify-between py-2.5 group rounded-lg">
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{title}</p>
      <ChevronDown size={14} className={`text-muted-foreground transition-transform ${activeSection === id ? 'rotate-180' : ''}`} />
    </button>
  );

  return (
    <main className="min-h-screen bg-background pb-20 relative" role="main" aria-label="Settings">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-4 space-y-4 relative z-10">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">Settings</h1>
          <button type="button" onClick={signOut}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition">
            <LogOut size={14} /> Sign out
          </button>
        </header>

        {/* Profile Card */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">{(agent?.name ?? 'G')[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{agent?.name ?? 'GYEOL'}</p>
              <p className="text-[11px] text-muted-foreground">Gen {agent?.gen ?? 1} · {user?.email}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setDashboardOpen(true)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition" aria-label="Dashboard">
                <BarChart3 size={16} />
              </button>
              <button onClick={() => setProfileCustomOpen(true)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition" aria-label="Customize">
                <Palette size={16} />
              </button>
              <button onClick={() => setShareCardOpen(true)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition" aria-label="Share">
                <Share2 size={16} />
              </button>
            </div>
          </div>
          {agent && agent?.consecutive_days > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <StreakCalendar streakDays={agent?.consecutive_days} longestStreak={agent?.consecutive_days} />
            </div>
          )}
        </div>

        {/* General */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">General</h2>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>

        {/* AI Section */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <h2 className="text-sm font-semibold text-foreground mb-2">AI</h2>
          <ModeCharacterSection agent={agent} activeSection={activeSection} SectionHeader={SectionHeader}
            currentMode={currentMode} setModeSwitchTarget={setModeSwitchTarget} setModeSwitchOpen={setModeSwitchOpen}
            charPreset={charPreset} setCharPreset={setCharPreset} />
          <div className="h-px bg-border" />
          <AppearanceSection agent={agent} setAgent={setAgent} activeSection={activeSection} SectionHeader={SectionHeader} />
          <div className="h-px bg-border" />
          <section>
            <SectionHeader id="systemprompt" icon="terminal" title="System Prompt" />
            <AnimatePresence>
              {activeSection === 'systemprompt' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2">
                  <SystemPromptEditor agent={agent} onUpdate={(ns) => { if (agent) setAgent({ ...agent, settings: ns } as never); }} />
                </motion.div>
              )}
            </AnimatePresence>
          </section>
          <div className="h-px bg-border" />
          <SafetySection agent={agent} activeSection={activeSection} SectionHeader={SectionHeader} kidsSafe={kidsSafe} setKidsSafe={setKidsSafe} />
          <div className="h-px bg-border" />
          <PersonalitySection agent={agent} activeSection={activeSection} toggleSection={toggleSection} SectionHeader={SectionHeader}
            warmth={warmth} setWarmth={setWarmth} logic={logic} setLogic={setLogic}
            creativity={creativity} setCreativity={setCreativity} energy={energy} setEnergy={setEnergy}
            humor={humor} setHumor={setHumor} agentName={agentName} setAgentName={setAgentName}
            nameEditing={nameEditing} setNameEditing={setNameEditing}
            personalitySaving={personalitySaving} savePersonality={savePersonality} setError={setError} />
        </div>

        {/* Mood & Intimacy */}
        <div className="bg-card border border-border rounded-xl p-4">
          <SectionHeader id="mood" icon="mood" title="Mood & Intimacy" />
          <AnimatePresence>
            {activeSection === 'mood' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-4 pt-2">
                <div className="flex items-center gap-3">
                  <IntimacyEmoji intimacy={agent?.intimacy ?? 0} />
                  <div>
                    <p className="text-xs text-foreground">Intimacy Level</p>
                    <p className="text-[10px] text-muted-foreground">{agent?.intimacy ?? 0}% — {(agent?.intimacy ?? 0) < 20 ? 'Stranger' : (agent?.intimacy ?? 0) < 50 ? 'Friend' : (agent?.intimacy ?? 0) < 80 ? 'Close Friend' : 'Soulmate'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-2">Current Mood</p>
                  <MoodSelector currentMood={(agent?.mood as any) ?? 'neutral'} onChange={async (mood) => {
                    await supabase.from('gyeol_agents').update({ mood }).eq('id', agent?.id);
                    if (agent) setAgent({ ...agent, mood } as never);
                  }} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-2">Persona</p>
                  <PersonaSelector current={parseSettings(agent?.settings)?.persona ?? 'friend'} onSelect={async (id) => {
                    const s = { ...parseSettings(agent?.settings), persona: id };
                    await supabase.from('gyeol_agents').update({ settings: s }).eq('id', agent?.id);
                    if (agent) setAgent({ ...agent, settings: s } as never);
                  }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Integrations */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <h2 className="text-sm font-semibold text-foreground mb-2">Integrations</h2>
          <FeedKeywordSection activeSection={activeSection} SectionHeader={SectionHeader}
            feeds={feeds} keywords={keywords}
            newFeedUrl={newFeedUrl} setNewFeedUrl={setNewFeedUrl}
            newFeedName={newFeedName} setNewFeedName={setNewFeedName}
            newKeyword={newKeyword} setNewKeyword={setNewKeyword}
            addFeed={addFeed} removeFeed={removeFeed} addKeyword={addKeyword} removeKeyword={removeKeyword} />
          <div className="h-px bg-border" />
          <AnalysisDomainSection agent={agent} activeSection={activeSection} SectionHeader={SectionHeader}
            analysisDomains={analysisDomains} setAnalysisDomains={setAnalysisDomains} />
          <div className="h-px bg-border" />
          <PreferencesSection agent={agent} setAgent={setAgent} activeSection={activeSection} SectionHeader={SectionHeader}
            autonomyLevel={autonomyLevel} setAutonomyLevel={setAutonomyLevel}
            contentFilterOn={contentFilterOn} setContentFilterOn={setContentFilterOn}
            notificationsOn={notificationsOn} setNotificationsOn={setNotificationsOn}
            autoTTS={autoTTS} setAutoTTS={setAutoTTS} ttsSpeed={ttsSpeed} setTtsSpeed={setTtsSpeed}
            proactiveInterval={proactiveInterval} setProactiveInterval={setProactiveInterval}
            pushEnabled={pushEnabled} setPushEnabled={setPushEnabled} PROACTIVE_OPTIONS={PROACTIVE_OPTIONS} />
          <div className="h-px bg-border" />
          <TelegramSection activeSection={activeSection} SectionHeader={SectionHeader} telegramLinked={telegramLinked} telegramCode={telegramCode} />
          <div className="h-px bg-border" />
          <BYOKSection agent={agent} user={user} activeSection={activeSection} SectionHeader={SectionHeader}
            byokList={byokList} setByokList={setByokList} byokOpen={byokOpen} setByokOpen={setByokOpen}
            byokKey={byokKey} setByokKey={setByokKey} byokSaving={byokSaving} setByokSaving={setByokSaving}
            safetyLevel={safetyLevel} setSafetyLevel={setSafetyLevel} piiFilterOn={piiFilterOn} setPiiFilterOn={setPiiFilterOn}
            killSwitchActive={killSwitchActive} toggleKillSwitch={toggleKillSwitch} setDeleteModalOpen={setDeleteModalOpen} />
        </div>

        <InfoSection feedbackOpen={feedbackOpen} setFeedbackOpen={setFeedbackOpen}
          referralCode={referralCode} referralCount={referralCount} loadOrCreateCode={loadOrCreateCode}
          referralInput={referralInput} setReferralInput={setReferralInput}
          referralMsg={referralMsg} setReferralMsg={setReferralMsg}
          applyReferralCode={applyReferralCode} exportData={exportData} exporting={exporting} />
      </div>

      <ModeSwitchGuide isOpen={modeSwitchOpen} onClose={() => setModeSwitchOpen(false)} targetMode={modeSwitchTarget}
        onConfirm={async () => {
          const s = parseSettings(agent?.settings);
          await supabase.from('gyeol_agents').update({ settings: { ...s, mode: modeSwitchTarget } } as any).eq('id', agent?.id);
          window.location.href = '/';
        }} />
      <DeleteAccountModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onDeleted={() => { window.location.href = '/auth'; }} />
      <AnimatePresence>
        {shareCardOpen && agent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-background/60 backdrop-blur-sm p-6" onClick={() => setShareCardOpen(false)}>
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
