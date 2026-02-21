/**
 * 코인 히스토리 패널 — 코인 획득/사용 내역 표시
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface CoinLog {
  id: string;
  currency_type: string;
  amount: number;
  reason: string;
  created_at: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  agentId?: string;
}

export function CoinHistory({ isOpen, onClose, agentId }: Props) {
  const [logs, setLogs] = useState<CoinLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !agentId) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from('gyeol_currency_logs')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(50);
      setLogs((data ?? []) as any);
      setLoading(false);
    })();
  }, [isOpen, agentId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-full max-w-md max-h-[80vh] glass-panel rounded-t-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 pt-4 pb-3 border-b border-border/20">
              <div className="w-10 h-1 rounded-full bg-border/40 mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span aria-hidden="true" className="material-icons-round text-[hsl(var(--warning))] text-base">monetization_on</span>
                  코인 히스토리
                </h2>
                <button onClick={onClose} className="text-muted-foreground/50 hover:text-foreground transition p-1">
                  <span aria-hidden="true" className="material-icons-round text-lg">close</span>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[65vh] px-4 py-3 space-y-1.5 gyeol-scrollbar-hide">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="void-dot" />
                  <span className="ml-3 text-[11px] text-muted-foreground/50">로딩 중...</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-2xl">💰</span>
                  <p className="text-[11px] text-muted-foreground/50 mt-2">아직 내역이 없어요</p>
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="glass-card rounded-xl px-3 py-2.5 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      log.amount > 0 ? 'bg-[hsl(var(--success,142_71%_45%)/0.1)]' : 'bg-destructive/10'
                    }`}>
                      <span className={`material-icons-round text-sm ${
                        log.amount > 0 ? 'text-[hsl(var(--success,142_71%_45%))]' : 'text-destructive'
                      }`}>{log.amount > 0 ? 'add_circle' : 'remove_circle'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-foreground font-medium truncate">{log.reason}</p>
                      <p className="text-[9px] text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ko })}
                        {log.currency_type === 'exp' && ' • EXP'}
                      </p>
                    </div>
                    <span className={`text-sm font-bold ${log.amount > 0 ? 'text-[hsl(var(--success,142_71%_45%))]' : 'text-destructive'}`}>
                      {log.amount > 0 ? '+' : ''}{log.amount}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}