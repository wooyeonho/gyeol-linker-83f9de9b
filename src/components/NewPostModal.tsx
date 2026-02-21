/**
 * 새 글 Write 모달 — 소셜 Feed에 글 Write
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/integrations/supabase/client';

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId?: string;
  agentName?: string;
  agentGen?: number;
  onPosted?: () => void;
}

const POST_TYPES = [
  { key: 'reflection', emoji: '💭', label: '생각/감상' },
  { key: 'milestone', emoji: '🏆', label: 'Achievement/마일스톤' },
  { key: 'question', emoji: '❓', label: '질문' },
  { key: 'tip', emoji: '💡', label: '팁/Share' },
] as const;

export function NewPostModal({ isOpen, onClose, agentId, agentName, agentGen, onPosted }: NewPostModalProps) {
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('reflection');
  const [posting, setPosting] = useState(false);
  const [target, setTarget] = useState<'moltbook' | 'community'>('moltbook');

  const handlePost = async () => {
    if (!content.trim() || !agentId || posting) return;
    setPosting(true);
    try {
      if (target === 'moltbook') {
        await supabase.from('gyeol_moltbook_posts').insert({
          agent_id: agentId, content: content.trim(), post_type: postType,
        });
      } else {
        await supabase.from('gyeol_community_activities').insert({
          agent_id: agentId, content: content.trim(), activity_type: 'post',
          agent_name: agentName ?? 'GYEOL', agent_gen: agentGen ?? 1,
        });
      }
      setContent('');
      onPosted?.();
      onClose();
    } catch (err) {
      console.warn('Post failed:', err);
    }
    setPosting(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60" onClick={onClose}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-card rounded-t-3xl p-5 space-y-4 pb-safe">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">새 글 Write</h3>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <span aria-hidden="true" className="material-icons-round text-lg">close</span>
              </button>
            </div>

            {/* Target toggle */}
            <div className="flex gap-1 p-1 rounded-xl glass-card">
              {(['moltbook', 'community'] as const).map(t => (
                <button key={t} onClick={() => setTarget(t)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition ${
                    target === t ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
                  }`}>
                  {t === 'moltbook' ? '몰트북' : '커뮤니티'}
                </button>
              ))}
            </div>

            {/* Post type */}
            <div className="flex gap-2 overflow-x-auto gyeol-scrollbar-hide">
              {POST_TYPES.map(pt => (
                <button key={pt.key} onClick={() => setPostType(pt.key)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap transition ${
                    postType === pt.key ? 'bg-primary/20 text-primary' : 'glass-card text-muted-foreground'
                  }`}>
                  <span>{pt.emoji}</span> {pt.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="무슨 생각을 하고 있나요?"
              maxLength={500}
              rows={4}
              className="w-full rounded-xl bg-background border border-border/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/30 resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground">{content.length}/500</span>
              <button onClick={handlePost} disabled={!content.trim() || posting}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-medium disabled:opacity-40 transition btn-glow">
                {posting ? 'Post 중...' : 'Post하기'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
