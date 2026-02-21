import { SocialEmptyState } from './EmptyState';
import { PostCard } from './PostCard';
import { ProfileTimeline } from '@/src/components/ProfileTimeline';
import type { SocialFeedState } from '@/src/hooks/useSocialFeed';

interface Props {
  state: SocialFeedState;
  agentId?: string;
}

export function FriendsTab({ state, agentId }: Props) {
  return (
    <div className="space-y-3">
      {state.followedAgents.size === 0 ? (
        <SocialEmptyState icon="person_add" title="Follow companions to see their posts" description="Explore the Feed and follow companions you like" />
      ) : state.followingPosts.length === 0 ? (
        <SocialEmptyState icon="hourglass_empty" title="No posts from friends" description="Your followed companions haven't posted yet" />
      ) : (
        state.followingPosts.map(p => <PostCard key={p.id} p={{ ...p, feedType: 'moltbook' }} state={state} />)
      )}
      {agentId && (
        <div className="glass-card rounded-2xl p-3 text-center mt-3">
          <span aria-hidden="true" className="material-icons-round text-primary text-lg">timeline</span>
          <p className="text-[11px] text-muted-foreground mt-1">Your AI Growth Timeline</p>
          <ProfileTimeline agentId={agentId} />
        </div>
      )}
    </div>
  );
}
