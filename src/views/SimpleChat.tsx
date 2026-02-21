import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { EvolutionCeremony } from '@/src/components/evolution/EvolutionCeremony';
import { ConversationList } from '@/src/components/ConversationList';
import { StreakBonus } from '@/src/components/StreakBonus';
import { SummaryHistory } from '@/src/components/SummaryHistory';
import { ConversationStats } from '@/src/components/ConversationStats';
import { ConversationShare } from '@/src/components/ConversationShare';
import { ConversationExport } from '@/src/components/ConversationExport';
import { FileDropZone } from '@/src/components/FileDropZone';
import { TokenUsageDisplay, TokenLimitSlider } from '@/src/components/TokenUsageDisplay';
import { ModelSelector, ProviderComparison, ApiUsageDashboard } from '@/src/components/ModelSelector';
import { SystemPromptEditor } from '@/src/components/SystemPromptEditor';
import { TTSVoiceSelector } from '@/src/components/ContinuousVoiceInput';
import { ChatSearch } from '@/src/components/ChatSearch';
import { useSimpleChatState } from '@/src/hooks/useSimpleChatState';
import { ChatToolbar } from '@/src/components/simple-chat/ChatToolbar';
import { ChatInputBar } from '@/src/components/simple-chat/ChatInputBar';
import { MessageBubble } from '@/src/components/simple-chat/MessageBubble';

export default function SimpleChat() {
  const state = useSimpleChatState();
  const {
    agent, messages, isLoading, error, setError,
    messagesEndRef, handleFileDrop,
    convListOpen, setConvListOpen, searchOpen, setSearchOpen,
    pinnedMessages, togglePin, agentName, groupedMessages,
    summaryOpen, setSummaryOpen, summaryText, summarizing,
    summaryHistoryOpen, setSummaryHistoryOpen,
    statsOpen, setStatsOpen, shareOpen, setShareOpen,
    exportOpen, setExportOpen,
    showModelSelector, setShowModelSelector, selectedModel, setSelectedModel,
    showTokenUsage, setShowTokenUsage, maxTokens, setMaxTokens,
    showProviderPanel, setShowProviderPanel,
    showSystemPrompt, setShowSystemPrompt,
    showTTSSettings, setShowTTSSettings,
    continuousVoice, setContinuousVoice,
  } = state;

  return (
    <FileDropZone onFileDrop={handleFileDrop} accept="image/*,.pdf,.doc,.docx,.txt" disabled={isLoading}>
    <main className="flex flex-col h-[100dvh] bg-background overflow-hidden relative" role="main" aria-label="Chat">
      <div className="aurora-bg" aria-hidden="true" />

      <ChatToolbar state={state} />

      {(agent as any)?.consecutive_days > 1 && (
        <div className="px-4 pb-1 relative z-10">
          <StreakBonus streakDays={(agent as any).consecutive_days} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-2 relative z-10" role="log" aria-label="Messages" aria-live="polite">
        {pinnedMessages.size > 0 && (
          <div className="mb-2 p-2 rounded-xl glass-card border border-[hsl(var(--warning))]/20 sticky top-0 z-20 backdrop-blur-md">
            <div className="flex items-center gap-1 mb-1">
              <span className="material-icons-round text-[hsl(var(--warning))] text-[12px]">push_pin</span>
              <span className="text-[10px] text-[hsl(var(--warning))] font-medium">Pinned ({pinnedMessages.size})</span>
            </div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {messages.filter(m => pinnedMessages.has(m.id)).map(m => (
                <div key={` + "pin-" + $ + "{m.id}" + `} className="text-[10px] text-foreground/60 truncate flex items-center gap-1">
                  <span className={m.role === 'user' ? 'text-primary/50' : 'text-secondary/50'}>{m.role === 'user' ? 'You' : agentName}:</span>
                  <span className="truncate">{m.content.slice(0, 60)}</span>
                  <button onClick={() => togglePin(m.id)} className="ml-auto text-[hsl(var(--warning))]/50 hover:text-[hsl(var(--warning))] shrink-0">
                    <span className="material-icons-round text-[10px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {groupedMessages.map((group) => (
          <div key={group.date}>
            <div className="flex justify-center py-3">
              <span className="px-4 py-1.5 rounded-full glass-card text-[11px] font-medium text-muted-foreground">
                {group.label}
              </span>
            </div>
            {group.msgs.map(msg => (
              <MessageBubble key={msg.id} msg={msg} state={state} />
            ))}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5 mb-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-secondary/20 border border-foreground/10 flex items-center justify-center">
              <span className="material-icons-round text-primary/80 text-[14px]">smart_toy</span>
            </div>
            <div className="glass-bubble p-4 rounded-2xl rounded-bl-sm">
              <div className="flex items-center gap-1.5 h-4">
                <div className="typing-dot" />
                <div className="typing-dot" style={{ animationDelay: '0.15s' }} />
                <div className="typing-dot" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center py-2">
            <button onClick={() => setError(null)}
              className="text-xs text-destructive/70">{error.message}</button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <ChatInputBar state={state} />
      <EvolutionCeremony />

      <AnimatePresence>
        {summaryOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]" onClick={() => setSummaryOpen(false)} />
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
              className="fixed inset-x-4 bottom-20 top-auto z-[70] max-h-[60vh] overflow-y-auto glass-card rounded-2xl p-5 max-w-md mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="material-icons-round text-primary text-base">summarize</span>
                  Conversation Summary
                </h3>
                <button onClick={() => setSummaryOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary/20">
                  <span className="material-icons-round text-muted-foreground text-sm">close</span>
                </button>
              </div>
              {summarizing ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                  <span className="material-icons-round text-primary animate-spin text-base">hourglass_top</span>
                  Analyzing conversation...
                </div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{summaryText}</ReactMarkdown>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SummaryHistory isOpen={summaryHistoryOpen} onClose={() => setSummaryHistoryOpen(false)} agentId={agent?.id} />
      {agent?.id && <ConversationList isOpen={convListOpen} onClose={() => setConvListOpen(false)} agentId={agent.id} />}
      <ConversationStats isOpen={statsOpen} onClose={() => setStatsOpen(false)} agentId={agent?.id} />
      <ConversationShare isOpen={shareOpen} onClose={() => setShareOpen(false)} messages={messages} agentName={agentName} />
      <ConversationExport isOpen={exportOpen} onClose={() => setExportOpen(false)} messages={messages} agentName={agentName} />
      <ChatSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} agentId={agent?.id} />

      {showModelSelector && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModelSelector(false)} />
          <div className="relative z-10 w-full max-w-md p-4">
            <ModelSelector currentModel={selectedModel} onSelect={(m) => { setSelectedModel(m); setShowModelSelector(false); }} />
          </div>
        </div>
      )}

      {showTokenUsage && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowTokenUsage(false)} />
          <div className="relative z-10 w-full max-w-sm p-4 glass-card rounded-2xl mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Token Usage</h3>
              <button onClick={() => setShowTokenUsage(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary/20">
                <span className="material-icons-round text-muted-foreground text-sm">close</span>
              </button>
            </div>
            <TokenUsageDisplay tokensUsed={messages.length * 150} dailyTotal={messages.length * 150} maxTokens={maxTokens} />
            <TokenLimitSlider value={maxTokens} onChange={setMaxTokens} />
          </div>
        </div>
      )}

      <AnimatePresence>
        {showProviderPanel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" onClick={() => setShowProviderPanel(false)} />
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
              className="fixed inset-x-4 bottom-4 top-auto z-[80] max-h-[80vh] overflow-y-auto glass-card rounded-2xl p-5 max-w-md mx-auto space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">AI Provider Settings</h3>
                <button onClick={() => setShowProviderPanel(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary/20">
                  <span className="material-icons-round text-muted-foreground text-sm">close</span>
                </button>
              </div>
              <ProviderComparison />
              <ApiUsageDashboard agentId={agent?.id} />
              <TokenLimitSlider value={maxTokens} onChange={setMaxTokens} />
              <div className="pt-2 border-t border-border/10">
                <button onClick={() => { setShowProviderPanel(false); setShowSystemPrompt(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl glass-card hover:bg-muted/10 transition text-left">
                  <span className="material-icons-round text-primary text-base">psychology</span>
                  <div>
                    <p className="text-[11px] font-medium text-foreground">System Prompt Editor</p>
                    <p className="text-[9px] text-muted-foreground">Customize AI behavior</p>
                  </div>
                </button>
              </div>
              <div className="pt-2 border-t border-border/10">
                <button onClick={() => { setShowProviderPanel(false); setShowTTSSettings(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl glass-card hover:bg-muted/10 transition text-left">
                  <span className="material-icons-round text-primary text-base">record_voice_over</span>
                  <div>
                    <p className="text-[11px] font-medium text-foreground">TTS Voice Settings</p>
                    <p className="text-[9px] text-muted-foreground">Change voice, speed, pitch</p>
                  </div>
                </button>
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-foreground/60">Continuous Voice Input</span>
                <button onClick={() => setContinuousVoice(!continuousVoice)}
                  className={` + "w-10 h-5 rounded-full transition-colors " + $ + "{continuousVoice ? 'bg-primary' : 'bg-muted/30'}" + `}>
                  <div className={` + "w-4 h-4 rounded-full bg-white shadow transition-transform " + $ + "{continuousVoice ? 'translate-x-5' : 'translate-x-0.5'}" + `} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSystemPrompt && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" onClick={() => setShowSystemPrompt(false)} />
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
              className="fixed inset-x-4 bottom-4 top-auto z-[80] max-h-[70vh] overflow-y-auto glass-card rounded-2xl p-5 max-w-md mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">System Prompt</h3>
                <button onClick={() => setShowSystemPrompt(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary/20">
                  <span className="material-icons-round text-muted-foreground text-sm">close</span>
                </button>
              </div>
              <SystemPromptEditor agent={agent} onUpdate={() => {}} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTTSSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" onClick={() => setShowTTSSettings(false)} />
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
              className="fixed inset-x-4 bottom-4 top-auto z-[80] max-h-[70vh] overflow-y-auto glass-card rounded-2xl p-5 max-w-md mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">TTS Voice Settings</h3>
                <button onClick={() => setShowTTSSettings(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary/20">
                  <span className="material-icons-round text-muted-foreground text-sm">close</span>
                </button>
              </div>
              <TTSVoiceSelector />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
    </FileDropZone>
  );
}
