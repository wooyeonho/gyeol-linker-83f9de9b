import { useNavigate } from 'react-router-dom';
import { AnimatedCharacter } from '@/src/components/AnimatedCharacter';
import { ConversationFilter } from '@/src/components/ConversationFilter';
import type { SimpleChatState } from '@/src/hooks/useSimpleChatState';

interface ChatToolbarProps {
  state: SimpleChatState;
}

export function ChatToolbar({ state }: ChatToolbarProps) {
  const navigate = useNavigate();
  const {
    agent, agentName, settings, hasCharacter, isLoading, lastReaction,
    intimacyEmoji, intimacyLevel,
    setConvListOpen, setSearchOpen, setStatsOpen, setShareOpen,
    setExportOpen, setSummaryHistoryOpen, handleSummarize,
    setActiveFilters, allTags, setShowProviderPanel,
  } = state;

  if (hasCharacter) {
    return (
      <div className="flex-shrink-0 flex flex-col items-center justify-center pt-6 pb-2 relative z-10"
        style={{ height: '30vh' }}>
        <div className="absolute top-4 left-4 flex gap-2">
          <button onClick={() => setConvListOpen(true)}
            aria-label="Conversation history"
            className="w-11 h-11 rounded-full flex items-center justify-center glass-card focus-visible:outline-2 focus-visible:outline-primary">
            <span aria-hidden="true" className="material-icons-round text-lg text-muted-foreground">history</span>
          </button>
          <button onClick={() => setSearchOpen(true)}
            aria-label="Search messages"
            className="w-11 h-11 rounded-full flex items-center justify-center glass-card focus-visible:outline-2 focus-visible:outline-primary">
            <span aria-hidden="true" className="material-icons-round text-lg text-muted-foreground">search</span>
          </button>
        </div>
        <div className="absolute top-4 right-4 flex gap-2">
          <ConversationFilter onFilter={setActiveFilters} availableTags={allTags} />
          <button onClick={() => setStatsOpen(true)}
            aria-label="Stats"
            className="w-11 h-11 rounded-full flex items-center justify-center glass-card focus-visible:outline-2 focus-visible:outline-primary">
            <span aria-hidden="true" className="material-icons-round text-lg text-muted-foreground">bar_chart</span>
          </button>
          <button onClick={() => setShareOpen(true)}
            aria-label="Share conversation"
            className="w-11 h-11 rounded-full flex items-center justify-center glass-card focus-visible:outline-2 focus-visible:outline-primary">
            <span aria-hidden="true" className="material-icons-round text-lg text-muted-foreground">share</span>
          </button>
          <button onClick={() => setExportOpen(true)}
            aria-label="Export conversation"
            className="w-11 h-11 rounded-full flex items-center justify-center glass-card focus-visible:outline-2 focus-visible:outline-primary">
            <span aria-hidden="true" className="material-icons-round text-lg text-muted-foreground">download</span>
          </button>
          <button onClick={() => setSummaryHistoryOpen(true)}
            aria-label="Summary history"
            className="w-11 h-11 rounded-full flex items-center justify-center glass-card focus-visible:outline-2 focus-visible:outline-primary">
            <span aria-hidden="true" className="material-icons-round text-lg text-muted-foreground">history_edu</span>
          </button>
          <button onClick={handleSummarize}
            aria-label="Summarize conversation"
            className="w-11 h-11 rounded-full flex items-center justify-center glass-card focus-visible:outline-2 focus-visible:outline-primary">
            <span aria-hidden="true" className="material-icons-round text-lg text-muted-foreground">summarize</span>
          </button>
          <button onClick={() => navigate('/settings')}
            aria-label="Settings"
            className="w-11 h-11 rounded-full flex items-center justify-center glass-card focus-visible:outline-2 focus-visible:outline-primary">
            <span aria-hidden="true" className="material-icons-round text-lg text-muted-foreground">settings</span>
          </button>
        </div>
        <AnimatedCharacter
          mood={(agent as any)?.mood ?? 'neutral'}
          isThinking={isLoading}
          reaction={lastReaction}
          characterPreset={settings.characterPreset as string | undefined}
          skinId={(agent as any)?.skin_id}
          gen={agent?.gen ?? 1}
          size="lg"
        />
        <div className="mt-2 flex items-center gap-2">
          <p className="text-base font-medium text-foreground">{agentName}</p>
          <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--success,142_71%_45%))] shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[10px] text-[hsl(var(--success,142_71%_45%)/0.7)]">Online</p>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/70">{intimacyEmoji} {intimacyLevel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 glass-panel z-10 relative">
      <div className="flex items-center gap-2">
        <button onClick={() => setConvListOpen(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition">
          <span aria-hidden="true" className="material-icons-round text-lg">history</span>
        </button>
        <button onClick={() => setSearchOpen(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition">
          <span aria-hidden="true" className="material-icons-round text-lg">search</span>
        </button>
        <p className="text-base font-medium text-foreground">{agentName}</p>
        <div className="w-2 h-2 rounded-full bg-[hsl(var(--success,142_71%_45%))] shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
      </div>
      <div className="flex items-center gap-1">
        <ConversationFilter onFilter={setActiveFilters} availableTags={allTags} />
        <button onClick={() => setShowProviderPanel(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition"
          aria-label="AI Provider settings">
          <span aria-hidden="true" className="material-icons-round text-lg">tune</span>
        </button>
        <button onClick={() => navigate('/settings')}
          className="w-11 h-11 rounded-full flex items-center justify-center glass-card">
          <span aria-hidden="true" className="material-icons-round text-lg text-muted-foreground">settings</span>
        </button>
      </div>
    </div>
  );
}
