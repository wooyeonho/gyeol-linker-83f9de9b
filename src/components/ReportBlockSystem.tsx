import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/hooks/useAuth';
import { useInitAgent } from '@/src/hooks/useInitAgent';

const REPORT_REASONS = [
  { value: 'spam', label: '스팸', icon: 'report' },
  { value: 'hate', label: '욕설/혐오', icon: 'sentiment_very_dissatisfied' },
  { value: 'sexual', label: '성적 콘텐츠', icon: 'no_adult_content' },
  { value: 'scam', label: '사기', icon: 'warning' },
  { value: 'other', label: '기타', icon: 'more_horiz' },
];

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  targetType: 'post' | 'comment' | 'moltbook' | 'dm';
  targetId: string;
}

export function ReportDialog({ open, onClose, targetType, targetId }: ReportDialogProps) {
  const { agent } = useInitAgent();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!agent?.id || !reason) return;
    setSubmitting(true);
    await supabase.from('gyeol_reports' as any).insert({
      reporter_agent_id: agent.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details.trim() || null,
      status: 'pending',
    });
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => { onClose(); setSubmitted(false); setReason(''); setDetails(''); }, 1500);
  }, [agent?.id, reason, details, targetType, targetId, onClose]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        onClick={onClose}>
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
          className="glass-panel rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
          {submitted ? (
            <div className="text-center py-8">
              <span aria-hidden="true" className="material-icons-round text-3xl text-primary mb-2">check_circle</span>
              <p className="text-sm text-foreground/70">신고가 접수되었습니다</p>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-bold text-foreground mb-4">신고하기</h3>
              <div className="space-y-2 mb-4">
                {REPORT_REASONS.map(r => (
                  <button key={r.value} onClick={() => setReason(r.value)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition ${reason === r.value ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-foreground/60 hover:bg-muted/50'}`}>
                    <span aria-hidden="true" className="material-icons-round text-sm">{r.icon}</span>
                    {r.label}
                  </button>
                ))}
              </div>
              <textarea value={details} onChange={e => setDetails(e.target.value)}
                placeholder="상세 내용 (선택사항)"
                className="w-full bg-muted/20 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground resize-none h-16 mb-4" />
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-2 text-xs text-muted-foreground hover:text-foreground transition rounded-lg">Cancel</button>
                <button onClick={handleSubmit} disabled={!reason || submitting}
                  className="flex-1 py-2 text-xs bg-destructive/80 text-foreground rounded-lg hover:bg-destructive transition disabled:opacity-40">
                  {submitting ? '처리 중...' : '신고하기'}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function useBlockSystem() {
  const { agent } = useInitAgent();
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  const loadBlocked = useCallback(async () => {
    if (!agent?.id) return;
    const { data } = await supabase.from('gyeol_blocks' as any).select('blocked_agent_id').eq('blocker_agent_id', agent.id);
    if (data) setBlockedIds(new Set((data ?? []).map(d => d.blocked_agent_id)));
  }, [agent?.id]);

  const blockAgent = useCallback(async (targetAgentId: string) => {
    if (!agent?.id) return;
    await supabase.from('gyeol_blocks' as any).upsert({ blocker_agent_id: agent.id, blocked_agent_id: targetAgentId } as any, { onConflict: 'blocker_agent_id,blocked_agent_id' });
    setBlockedIds(prev => new Set([...prev, targetAgentId]));
  }, [agent?.id]);

  const unblockAgent = useCallback(async (targetAgentId: string) => {
    if (!agent?.id) return;
    await supabase.from('gyeol_blocks' as any).delete().eq('blocker_agent_id', agent.id).eq('blocked_agent_id', targetAgentId);
    setBlockedIds(prev => { const next = new Set(prev); next.delete(targetAgentId); return next; });
  }, [agent?.id]);

  const isBlocked = useCallback((targetAgentId: string) => blockedIds.has(targetAgentId), [blockedIds]);

  return { blockedIds, loadBlocked, blockAgent, unblockAgent, isBlocked };
}
