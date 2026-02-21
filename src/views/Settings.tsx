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
          {agent && agent?.consecutive_days > 0 && (
            <StreakCalendar streakDays={agent?.consecutive_days} longestStreak={agent?.consecutive_days} />
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
          <AppearanceSection agent={agent} setAgent={setAgent} activeSection={activeSection} SectionHeader={SectionHeader} />
          <div className="h-px bg-foreground/[0.04]" />
          <section>
            <SectionHeader id="systemprompt" icon="terminal" title="System Prompt" />
            <AnimatePresence>
              {activeSection === 'systemprompt' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2 px-1">
                  <SystemPromptEditor agent={agent} onUpdate={(ns) => { if (agent) setAgent({ ...agent, settings: ns } as never); }} />
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
                    <p className="text-[9px] text-foreground/25">{agent?.intimacy ?? 0}% \u2014 {(agent?.intimacy ?? 0) < 20 ? 'Stranger' : (agent?.intimacy ?? 0) < 50 ? 'Friend' : (agent?.intimacy ?? 0) < 80 ? 'Close Friend' : 'Soulmate'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-foreground/30 mb-2">Current Mood</p>
                  <MoodSelector currentMood={(agent?.mood as any) ?? 'neutral'} onChange={async (mood) => {
                    await supabase.from('gyeol_agents').update({ mood }).eq('id', agent?.id);
                    if (agent) setAgent({ ...agent, mood } as never);
                  }} />
                </div>
                <div>
                  <p className="text-[10px] text-foreground/30 mb-2">Persona</p>
                  <PersonaSelector current={parseSettings(agent?.settings)?.persona ?? 'friend'} onSelect={async (id) => {
                    const s = { ...parseSettings(agent?.settings), persona: id };
                    await supabase.from('gyeol_agents').update({ settings: s }).eq('id', agent?.id);
                    if (agent) setAgent({ ...agent, settings: s } as never);
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
          <PreferencesSection agent={agent} setAgent={setAgent} activeSection={activeSection} SectionHeader={SectionHeader}
            autonomyLevel={autonomyLevel} setAutonomyLevel={setAutonomyLevel}
            contentFilterOn={contentFilterOn} setContentFilterOn={setContentFilterOn}
            notificationsOn={notificationsOn} setNotificationsOn={setNotificationsOn}
            autoTTS={autoTTS} setAutoTTS={setAutoTTS} ttsSpeed={ttsSpeed} setTtsSpeed={setTtsSpeed}
            proactiveInterval={proactiveInterval} setProactiveInterval={setProactiveInterval}
            pushEnabled={pushEnabled} setPushEnabled={setPushEnabled} PROACTIVE_OPTIONS={PROACTIVE_OPTIONS} />
          <div className="h-px bg-foreground/[0.04]" />
          <TelegramSection activeSection={activeSection} SectionHeader={SectionHeader} telegramLinked={telegramLinked} telegramCode={telegramCode} />
          <div className="h-px bg-foreground/[0.04]" />
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
