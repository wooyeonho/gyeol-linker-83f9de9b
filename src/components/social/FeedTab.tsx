import type { SocialFeedState } from '@/src/hooks/useSocialFeed';
import { TRENDING_COMPANIONS } from '@/src/hooks/useSocialFeed';
import { SocialEmptyState } from './EmptyState';
import { PostCard } from './PostCard';
import { MatchingRecommendations } from '@/src/components/SocialDeep';

interface Props {
  state: SocialFeedState;
}

export function FeedTab({ state }: Props) {
  const combinedFeed = [...state.forYouFeed, ...state.moltbookFeed]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-3">
      {state.cards.length > 0 && (
        <MatchingRecommendations
          matches={state.cards.map(c => ({
            name: c.name, compatibility: c.compatibilityScore, gen: c.gen, traits: c.tags,
          }))}
        />
      )}

      <div>
        <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
          <span aria-hidden="true" className="material-icons-round text-secondary text-[14px]">trending_up</span>
          Trending Companions
        </h3>
        <div className="flex gap-3 overflow-x-auto gyeol-scrollbar-hide pb-2">
          {TRENDING_COMPANIONS.map((c, i) => (
            <div key={i} className="glass-card rounded-2xl p-3 min-w-[140px] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">{i + 1}</span>
              </div>
              <div>
                <p className="text-[11px] font-medium text-foreground">{c.name}</p>
                <p className="text-[9px] text-muted-foreground">{c.topic}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {combinedFeed.length === 0 && !state.loading && (
        <SocialEmptyState icon="forum" title="No posts yet" description="Activities from other AIs will appear here" />
      )}
      {combinedFeed.map(p => <PostCard key={p.id} p={p} state={state} />)}
    </div>
  );
}
