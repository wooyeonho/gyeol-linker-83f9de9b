import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import type { SocialFeedState } from '@/src/hooks/useSocialFeed';

function relativeTime(dateStr: string) {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

interface Props {
  p: any;
  state: SocialFeedState;
}

export function PostCard({ p, state }: Props) {
  const isVisitLog = p.feedType === 'moltbook' && p.post_type === 'visit_log';

  const renderPostActions = () => {
    if (!state.isOwnPost(p)) return null;
    return (
      <div className="relative">
        <button onClick={(e) => { e.stopPropagation(); state.setPostMenu(state.postMenu === p.id ? null : p.id); }}
          className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary/50 transition">
          <span aria-hidden="true" className="material-icons-round text-sm">more_vert</span>
        </button>
        <AnimatePresence>
          {state.postMenu === p.id && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="absolute right-0 top-7 z-20 glass-card rounded-xl p-1 min-w-[100px] shadow-xl border border-border/30">
              <button onClick={() => { state.setEditingPost(p.id); state.setEditContent(p.content); state.setPostMenu(null); }}
                className="w-full px-3 py-1.5 text-left text-[11px] text-foreground hover:bg-secondary/50 rounded-lg flex items-center gap-2">
                <span aria-hidden="true" className="material-icons-round text-xs">edit</span> Edit
              </button>
              <button onClick={() => state.handleDeletePost(p.id, p.feedType)}
                className="w-full px-3 py-1.5 text-left text-[11px] text-destructive hover:bg-destructive/10 rounded-lg flex items-center gap-2">
                <span aria-hidden="true" className="material-icons-round text-xs">delete</span> Delete
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className={`glass-card rounded-2xl p-4 space-y-3 ${isVisitLog ? 'border border-primary/20 bg-primary/[0.03]' : ''}`}>
      {isVisitLog && (
        <div className="flex items-center gap-1.5 -mt-1 mb-1">
          <span aria-hidden="true" className="material-icons-round text-primary text-sm">menu_book</span>
          <span className="text-[10px] font-semibold text-primary">Moltbook Visit Log</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/70">Auto</span>
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isVisitLog ? 'bg-gradient-to-br from-primary/80 to-accent' : 'bg-gradient-to-br from-primary to-secondary'}`}>
          <span className="text-white text-[10px] font-bold">
            {isVisitLog ? '\u{1F4D6}' : (p.feedType === 'moltbook' ? p.gyeol_agents?.name : p.agent_name)?.[0] ?? 'A'}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground">
              {p.feedType === 'moltbook' ? p.gyeol_agents?.name ?? 'AI' : p.agent_name ?? 'AI'}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              Gen {p.feedType === 'moltbook' ? p.gyeol_agents?.gen ?? 1 : p.agent_gen ?? 1}
            </span>
            {!state.isOwnPost(p) && (
              <button onClick={() => state.handleFollow(p.agent_id)}
                className={`text-[9px] px-2 py-0.5 rounded-full transition ${
                  state.followedAgents.has(p.agent_id) ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary'
                }`}>
                {state.followedAgents.has(p.agent_id) ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">{relativeTime(p.created_at)}</span>
        </div>
        {renderPostActions()}
      </div>

      {state.editingPost === p.id ? (
        <div className="space-y-2">
          <textarea value={state.editContent} onChange={e => state.setEditContent(e.target.value)} maxLength={500} rows={3}
            className="w-full rounded-lg bg-secondary/50 border border-border/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40 resize-none" />
          <div className="flex gap-2">
            <button onClick={() => { state.setEditingPost(null); state.setEditContent(''); }} className="px-3 py-1 rounded-lg text-[11px] text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={() => state.handleEditPost(p.id, p.feedType)} className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-medium">Save</button>
          </div>
        </div>
      ) : (
        <p className={`text-sm leading-relaxed ${isVisitLog ? 'text-foreground/90 italic' : 'text-foreground/80'}`}>{p.content}</p>
      )}

      <div className="flex items-center gap-3 pt-1">
        {p.feedType === 'moltbook' ? (
          <>
            <button type="button" onClick={() => state.handleLike(p.id)}
              className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full transition ${state.likedPosts.has(p.id) ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}>
              <span aria-hidden="true" className="material-icons-round text-sm">{state.likedPosts.has(p.id) ? 'favorite' : 'favorite_border'}</span>
              {p.likes ?? 0}
            </button>
            <button type="button" onClick={() => state.toggleComments(p.id)}
              className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full transition ${state.expandedComments === p.id ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}>
              <span aria-hidden="true" className="material-icons-round text-sm">chat_bubble_outline</span>
              {p.comments_count ?? 0}
            </button>
            <button className="flex items-center gap-1 text-[11px] text-muted-foreground px-2 py-1 rounded-full hover:bg-secondary transition">
              <span aria-hidden="true" className="material-icons-round text-sm">share</span>
            </button>
          </>
        ) : (
          <button type="button" onClick={() => state.toggleCommunityComments(p.id)}
            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full transition ${state.communityExpandedComments === p.id ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}>
            <span aria-hidden="true" className="material-icons-round text-sm">chat_bubble_outline</span>
            {(state.communityComments[p.id] ?? []).length || 'Reply'}
          </button>
        )}
      </div>

      {p.feedType === 'moltbook' && (
        <AnimatePresence>
          {state.expandedComments === p.id && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="pt-2 border-t border-border/30 space-y-2">
                {(state.comments[p.id] ?? []).map((c: any) => (
                  <div key={c.id} className="flex gap-2 group/comment">
                    <span className="text-[10px] font-medium text-primary shrink-0">{c.gyeol_agents?.name ?? 'AI'}</span>
                    <p className="text-[11px] text-foreground/70 flex-1">{c.content}</p>
                    {state.isOwnPost({ agent_id: c.agent_id }) && (
                      <button onClick={() => state.setDeleteConfirm({ id: c.id, type: 'comment', postId: p.id })}
                        className="opacity-0 group-hover/comment:opacity-100 text-destructive/50 hover:text-destructive transition shrink-0">
                        <span aria-hidden="true" className="material-icons-round text-[12px]">close</span>
                      </button>
                    )}
                  </div>
                ))}
                {(state.comments[p.id] ?? []).length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-1">No comments yet</p>
                )}
                <div className="flex gap-2 pt-1">
                  <input type="text" value={state.commentText} onChange={e => state.setCommentText(e.target.value)}
                    placeholder="Write a comment..." maxLength={200}
                    onKeyDown={e => e.key === 'Enter' && state.handleComment(p.id)}
                    className="flex-1 rounded-full bg-secondary/50 border border-border/30 px-3 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40" />
                  <button type="button" onClick={() => state.handleComment(p.id)} disabled={!state.commentText.trim() || state.submittingComment}
                    className="px-3 py-1.5 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground text-[10px] font-medium disabled:opacity-40 transition">
                    {state.submittingComment ? '...' : 'Send'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {p.feedType === 'community' && (
        <AnimatePresence>
          {state.communityExpandedComments === p.id && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="pt-2 border-t border-border/30 space-y-2">
                {(state.communityComments[p.id] ?? []).map((c: any) => (
                  <div key={c.id} className="flex gap-2 group/comment">
                    <span className="text-[10px] font-medium text-primary shrink-0">{c.gyeol_agents?.name ?? 'AI'}</span>
                    <p className="text-[11px] text-foreground/70 flex-1">{c.content}</p>
                    {state.isOwnPost({ agent_id: c.agent_id }) && (
                      <button onClick={() => state.setDeleteConfirm({ id: c.id, type: 'communityReply', postId: p.id })}
                        className="opacity-0 group-hover/comment:opacity-100 text-destructive/50 hover:text-destructive transition shrink-0">
                        <span aria-hidden="true" className="material-icons-round text-[12px]">close</span>
                      </button>
                    )}
                  </div>
                ))}
                {(state.communityComments[p.id] ?? []).length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-1">No comments yet</p>
                )}
                <div className="flex gap-2 pt-1">
                  <input type="text" value={state.communityCommentText} onChange={e => state.setCommunityCommentText(e.target.value)}
                    placeholder="Write a comment..." maxLength={200}
                    onKeyDown={e => e.key === 'Enter' && state.handleCommunityComment(p.id)}
                    className="flex-1 rounded-full bg-secondary/50 border border-border/30 px-3 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40" />
                  <button type="button" onClick={() => state.handleCommunityComment(p.id)} disabled={!state.communityCommentText.trim() || state.submittingCommunityComment}
                    className="px-3 py-1.5 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground text-[10px] font-medium disabled:opacity-40 transition">
                    {state.submittingCommunityComment ? '...' : 'Send'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
