import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/hooks/useAuth';
import { useInitAgent } from '@/src/hooks/useInitAgent';

const CATEGORIES = [
  { value: 'bug', label: 'Bug Report', icon: 'bug_report' },
  { value: 'feature', label: 'Feature Request', icon: 'lightbulb' },
  { value: 'ui', label: 'UI/UX', icon: 'palette' },
  { value: 'other', label: 'Other', icon: 'chat_bubble' },
];

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
}

export function FeedbackDialog({ open, onClose }: FeedbackDialogProps) {
  const { user } = useAuth();
  const { agent } = useInitAgent();
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!category || !message.trim()) return;
    setSubmitting(true);
    await supabase.from('gyeol_feedback' as any).insert({
      agent_id: agent?.id ?? null,
      user_id: user?.id ?? null,
      category,
      message: message.trim(),
      contact_email: email.trim() || null,
      status: 'new',
    });
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => { onClose(); setSubmitted(false); setCategory(''); setMessage(''); setEmail(''); }, 1500);
  }, [agent?.id, user?.id, category, message, email, onClose]);

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
              <span aria-hidden="true" className="material-icons-round text-3xl text-primary mb-2">favorite</span>
              <p className="text-sm text-foreground/70">Thank you for your feedback!</p>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-bold text-foreground mb-4">Send Feedback</h3>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {CATEGORIES.map(c => (
                  <button key={c.value} onClick={() => setCategory(c.value)}
                    className={"flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition " + (category === c.value ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-foreground/60 hover:bg-muted/50')}>
                    <span aria-hidden="true" className="material-icons-round text-sm">{c.icon}</span>
                    {c.label}
                  </button>
                ))}
              </div>
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Tell us what you think..."
                className="w-full bg-muted/20 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground resize-none h-24 mb-3" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email (optional, for follow-up)"
                className="w-full bg-muted/20 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground mb-4" />
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-2 text-xs text-muted-foreground hover:text-foreground transition rounded-lg">Cancel</button>
                <button onClick={handleSubmit} disabled={!category || !message.trim() || submitting}
                  className="flex-1 py-2 text-xs bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition disabled:opacity-40">
                  {submitting ? 'Sending...' : 'Send'}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
