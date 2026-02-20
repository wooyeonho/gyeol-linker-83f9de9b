/**
 * 계정 삭제 확인 모달
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, supabaseUrl } from '@/src/lib/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteAccountModal({ isOpen, onClose, onDeleted }: Props) {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmText === '삭제합니다';

  const handleDelete = async () => {
    if (!canDelete || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        await supabase.auth.signOut();
        onDeleted();
      } else {
        const data = await res.json();
        setError(data.error || '삭제에 실패했어요');
      }
    } catch (e) {
      setError('서버 오류가 발생했어요');
    }
    setDeleting(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          >
            <div className="glass-card rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <div className="text-center mb-4">
                <span className="text-4xl">⚠️</span>
                <h2 className="text-lg font-bold text-foreground mt-2">계정 삭제</h2>
                <p className="text-[12px] text-muted-foreground mt-2">
                  이 작업은 되돌릴 수 없습니다. 모든 대화 기록, 에이전트, 기억이 영구적으로 삭제됩니다.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    확인하려면 "삭제합니다"를 입력하세요
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    placeholder="삭제합니다"
                    className="w-full rounded-lg bg-secondary/50 border border-border/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-destructive/40"
                  />
                </div>

                {error && (
                  <p className="text-[11px] text-destructive text-center">{error}</p>
                )}

                <button
                  onClick={handleDelete}
                  disabled={!canDelete || deleting}
                  className="w-full py-3 rounded-xl bg-destructive/20 text-destructive font-bold text-sm disabled:opacity-30 transition hover:bg-destructive/30"
                >
                  {deleting ? '삭제 중...' : '영구 삭제'}
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition"
                >
                  취소
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
