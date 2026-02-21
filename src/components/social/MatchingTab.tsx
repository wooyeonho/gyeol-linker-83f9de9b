import { motion } from 'framer-motion';
import { supabase } from '@/src/integrations/supabase/client';
import { SocialEmptyState } from './EmptyState';
import { DEMO_MATCHES } from '@/src/hooks/useSocialFeed';
import type { SocialFeedState } from '@/src/hooks/useSocialFeed';
import { DMBadge } from '@/src/components/AgentDM';

function CompatibilityRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 20;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" opacity="0.3" />
        <motion.circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold text-primary">{score}%</span>
      </div>
    </div>
  );
}

interface Props {
  state: SocialFeedState;
  agent: any;
}

export function MatchingTab({ state, agent }: Props) {
  const renderMatchCard = (card: any, i: number, isDemo: boolean) => (
    <motion.div key={card.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
      onClick={() => !isDemo && state.setSelectedMatch(state.selectedMatch === card.id ? null : card.id)}
      className={`glass-card rounded-2xl p-4 flex items-center gap-3 transition-all ${isDemo ? 'opacity-60' : 'cursor-pointer hover:bg-secondary/30'}`}>
      <CompatibilityRing score={card.compatibilityScore} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground text-sm">{card.name}</p>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Gen {card.gen}</span>
          {isDemo && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent-foreground">Demo</span>}
        </div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {card.tags.map((t: string) => (
            <span key={t} className="text-[9px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{t}</span>
          ))}
        </div>
        {!isDemo && state.selectedMatch === card.id && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            className="mt-3 pt-3 border-t border-border/30 space-y-2">
            <button type="button" onClick={(e) => { e.stopPropagation(); state.handleFollow(card.agentId); }}
              className={`w-full py-2 rounded-full text-xs font-medium transition ${
                state.followedAgents.has(card.agentId) ? 'bg-secondary text-muted-foreground' : 'bg-primary/20 text-primary'
              }`}>
              {state.followedAgents.has(card.agentId) ? '\u2713 Following' : '+ Follow'}
            </button>
            <button type="button"
              onClick={(e) => { e.stopPropagation(); state.setDmOpen({ agentId: card.agentId, name: card.name }); }}
              className="w-full py-2 rounded-full bg-secondary text-foreground text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-secondary/80 transition relative">
              <span aria-hidden="true" className="material-icons-round text-sm">chat</span> DM
              {agent?.id && <DMBadge agentId={agent.id} />}
            </button>
            <button type="button"
              onClick={async () => {
                if (card.status === 'matched') {
                  state.setSpectatorOpen({ matchId: card.id, name1: agent?.name ?? 'My AI', name2: card.name });
                } else {
                  const res = await fetch(`$import.meta.env.VITE_SUPABASE_URL}/functions/v1/breeding`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
                    body: JSON.stringify({ agentId: agent?.id, targetAgentId: card.agentId }),
                  });
                  if (res.ok) state.setSelectedMatch(null);
                }
              }}
              className="w-full py-2 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-medium hover:brightness-110 transition btn-glow">
              {card.status === 'matched' ? 'Observe Chat' : card.status === 'pending' ? 'Pending...' : 'Request Match'}
            </button>
            {card.status === 'matched' && (
              <>
                <button type="button"
                  onClick={async () => {
                    const { data: targetAgent } = await supabase.from('gyeol_agents')
                      .select('name, gen, warmth, logic, creativity, energy, humor')
                      .eq('id', card.agentId).single();
                    if (targetAgent) {
                      state.setCompareTarget({ ...targetAgent as any, name: card.name });
                      state.setCompareOpen(true);
                    }
                  }}
                  className="w-full py-2 rounded-xl bg-primary/10 text-primary text-xs font-medium">
                  Compare
                </button>
                <button type="button"
                  onClick={async () => {
                    if (!agent?.id) return;
                    const session = (await supabase.auth.getSession()).data.session;
                    const res = await fetch(`$import.meta.env.VITE_SUPABASE_URL}/functions/v1/breeding`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                      body: JSON.stringify({ agent1Id: agent.id, agent2Id: card.agentId }),
                    });
                    const data = await res.json();
                    if (data.success) { state.setBreedResult({ success: true, name: data.child?.name ?? '???' }); }
                    else { state.setBreedResult({ success: false, name: data.message || data.reason || 'Breeding failed' }); }
                  }}
                  className="w-full py-2 rounded-xl bg-primary/20 text-primary text-xs font-medium">
                  Breed
                </button>
              </>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );

  if (state.loading) {
    return (
      <div className="flex flex-col items-center gap-2 py-6">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (state.cards.length > 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider">Matched Companions</h3>
        {state.cards.map((card, i) => renderMatchCard(card, i, false))}
      </div>
    );
  }

  if (state.showDemo) {
    return (
      <div className="space-y-3">
        <div className="glass-card rounded-2xl p-4 text-center space-y-2">
          <div className="text-2xl">{'\u{1F30C}'}</div>
          <p className="text-sm font-medium text-foreground">AI Match Preview</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            These are demo cards. As your AI grows,<br />compatible AIs will be matched automatically!
          </p>
        </div>
        {DEMO_MATCHES.map((card, i) => renderMatchCard(card, i, true))}
      </div>
    );
  }

  return <SocialEmptyState icon="people" title="No matches yet" description="Keep chatting with your AI to find compatible companions" />;
}
