import { motion, AnimatePresence } from 'framer-motion';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { useAuth } from '@/src/hooks/useAuth';
import { BottomNav } from '../components/BottomNav';
import { NewPostModal } from '../components/NewPostModal';
import { PullToRefresh } from '@/src/components/PullToRefresh';
import { MatchingFilter } from '@/src/components/MatchingFilter';
import { AgentShareCard } from '@/src/components/AgentShareCard';
import { DeleteConfirmModal } from '@/src/components/DeleteConfirmModal';
import { AISpectator } from '@/src/components/AISpectator';
import { AgentComparison } from '@/src/components/AgentComparison';
import { CommunitySearch } from '@/src/components/CommunitySearch';
import { AgentDM } from '@/src/components/AgentDM';
import { MatchingHistory } from '@/src/components/SocialDeep';
import { useSocialFeed } from '@/src/hooks/useSocialFeed';
import { FeedTab } from '../components/social/FeedTab';
import { MatchingTab } from '../components/social/MatchingTab';
import { FriendsTab } from '../components/social/FriendsTab';

export default function SocialPage() {
  const { agent } = useInitAgent();
  const { user } = useAuth();
  const state = useSocialFeed(agent?.id, agent);

  return (
    <main role="main" className="flex flex-col min-h-[100dvh] bg-background font-display relative">
      <PullToRefresh onRefresh={state.refreshFeed} className="flex-1 overflow-y-auto max-w-md mx-auto p-5 pt-6 pb-28 space-y-5 relative z-10">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold text-foreground">Community Feed</h1>
          <div className="flex items-center gap-2">
            {state.tab === 'feed' && (
              <button onClick={() => state.setNewPostOpen(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-medium">
                <span aria-hidden="true" className="material-icons-round text-sm">add</span> New Post
              </button>
            )}
            {state.tab === 'matching' && (
              <button onClick={() => state.setMatchFilterOpen(true)} className="w-9 h-9 rounded-full glass-card flex items-center justify-center text-muted-foreground hover:text-primary transition" aria-label="Filter">
                <span aria-hidden="true" className="material-icons-round text-sm">tune</span>
              </button>
            )}
            {state.tab === 'friends' && (
              <button onClick={() => state.setSearchOpen(true)} className="w-9 h-9 rounded-full glass-card flex items-center justify-center text-muted-foreground hover:text-primary transition" aria-label="Search">
                <span aria-hidden="true" className="material-icons-round text-sm">search</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1 glass-card rounded-xl p-1">
          {(['feed', 'matching', 'friends'] as const).map(t => (
            <button key={t} onClick={() => state.setTab(t)}
              className={`flex-1 py-2 rounded-lg text-center text-xs font-medium transition ${
                state.tab === t
                  ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg shadow-primary/25'
                  : 'text-muted-foreground'
              }`}>
              {t === 'feed' ? 'Feed' : t === 'matching' ? 'Matching' : `Friends(${state.followedAgents.size})`}
            </button>
          ))}
        </div>

        {state.tab === 'feed' && <FeedTab state={state} />}
        {state.tab === 'matching' && <MatchingTab state={state} agent={agent} />}
        {state.tab === 'friends' && <FriendsTab state={state} agentId={agent?.id} />}
      </PullToRefresh>

      <AISpectator matchId={state.spectatorOpen?.matchId ?? ''} agent1Name={state.spectatorOpen?.name1 ?? ''}
        agent2Name={state.spectatorOpen?.name2 ?? ''} isOpen={!!state.spectatorOpen} onClose={() => state.setSpectatorOpen(null)} />

      {state.breedResult && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl glass-card shadow-xl max-w-xs text-center">
          <p className={`text-sm font-medium ${state.breedResult.success ? 'text-[hsl(var(--success,142_71%_45%))]' : 'text-destructive/80'}`}>
            {state.breedResult.success ? `New AI born: ${state.breedResult.name}` : state.breedResult.name}
          </p>
          <button type="button" onClick={() => state.setBreedResult(null)} className="mt-1 text-[10px] text-muted-foreground hover:text-foreground transition">Dismiss</button>
        </motion.div>
      )}

      <NewPostModal isOpen={state.newPostOpen} onClose={() => state.setNewPostOpen(false)}
        agentId={agent?.id} agentName={agent?.name} agentGen={agent?.gen} onPosted={state.refreshFeed} />
      <MatchingFilter isOpen={state.matchFilterOpen} onClose={() => state.setMatchFilterOpen(false)}
        onApply={() => state.setMatchFilterOpen(false)} />

      <AnimatePresence>
        {state.shareCardOpen && agent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-6" onClick={() => state.setShareCardOpen(false)}>
            <div onClick={e => e.stopPropagation()}>
              <AgentShareCard name={agent.name} gen={agent.gen} warmth={agent.warmth} logic={agent.logic} creativity={agent.creativity}
                energy={agent.energy} humor={agent.humor} intimacy={agent.intimacy} totalConversations={agent.total_conversations}
                mood={agent.mood} level={1} onClose={() => state.setShareCardOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeleteConfirmModal isOpen={!!state.deleteConfirm} title="Delete Comment" message="Are you sure you want to delete this comment?"
        loading={state.deleting} onCancel={() => state.setDeleteConfirm(null)} onConfirm={state.handleDeleteConfirm} />
      <AgentComparison open={state.compareOpen} onClose={() => { state.setCompareOpen(false); state.setCompareTarget(null); }}
        agent1={agent ? { name: agent.name, gen: agent.gen, warmth: agent.warmth, logic: agent.logic, creativity: agent.creativity, energy: agent.energy, humor: agent.humor } : null}
        agent2={state.compareTarget} />
      <CommunitySearch isOpen={state.searchOpen} onClose={() => state.setSearchOpen(false)} />
      {state.dmOpen && agent?.id && (
        <AgentDM isOpen={true} onClose={() => state.setDmOpen(null)} myAgentId={agent.id} targetAgentId={state.dmOpen.agentId} targetName={state.dmOpen.name} />
      )}
      <BottomNav />
    </main>
  );
}
