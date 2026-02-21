/**
 * Delete Account Confirm 모달 — 3단계 Confirm 프로세스
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, supabaseUrl } from '@/src/lib/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

const WARNINGS = [
  { icon: 'chat_bubble', text: '모든 대화 기록이 영구 삭제됩니다' },
  { icon: 'psychology', text: 'AI Personality과 기억이 모두 사라집니다' },
  { icon: 'emoji_events', text: 'Achievement, Level, Coins이 초기화됩니다' },
  { icon: 'group', text: '소셜 활동과 Follow가 삭제됩니다' },
];

export function DeleteAccountModal({ isOpen, onClose, onDeleted }: Props) {
  const [step, setStep] = useState(0); // 0: warning, 1: confirm text, 2: final
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
    } catch {
      setError('서버 오류가 발생했어요');
    }
    setDeleting(false);
  };

  const reset = () => {
    setStep(0);
    setConfirmText('');
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" onClick={reset} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            role="alertdialog" aria-label="Delete Account Confirm" aria-modal="true"
          >
            <div className="glass-card rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              {/* Step indicator */}
              <div className="flex justify-center gap-2 mb-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className={`w-8 h-1 rounded-full transition ${i <= step ? 'bg-destructive/60' : 'bg-muted/20'}`} />
                ))}
              </div>

              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="space-y-4">
                    <div className="text-center">
                      <span className="text-4xl">⚠️</span>
                      <h2 className="text-base font-bold text-foreground mt-2">정말 삭제하시겠어요?</h2>
                      <p className="text-[11px] text-muted-foreground mt-1">이 작업은 되돌릴 수 없습니다</p>
                    </div>
                    <div className="space-y-2">
                      {WARNINGS.map(w => (
                        <div key={w.icon} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-destructive/5">
                          <span aria-hidden="true" className="material-icons-round text-destructive/50 text-sm">{w.icon}</span>
                          <p className="text-[11px] text-foreground/70">{w.text}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={reset}
                        className="flex-1 py-3 rounded-xl bg-muted/10 text-foreground/70 text-sm font-medium transition hover:bg-muted/20">
                        Cancel
                      </button>
                      <button onClick={() => setStep(1)}
                        className="flex-1 py-3 rounded-xl bg-destructive/10 text-destructive text-sm font-medium transition hover:bg-destructive/20">
                        계속
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="space-y-4">
                    <div className="text-center">
                      <h2 className="text-base font-bold text-foreground">Confirm 입력</h2>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Confirm하려면 <strong className="text-destructive">"삭제합니다"</strong>를 입력하세요
                      </p>
                    </div>
                    <input
                      type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
                      placeholder="삭제합니다"
                      className="w-full rounded-xl bg-secondary/50 border border-border/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-destructive/40 transition"
                      aria-label="삭제 Confirm 텍스트 입력"
                      autoComplete="off"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setStep(0)}
                        className="flex-1 py-3 rounded-xl bg-muted/10 text-foreground/70 text-sm font-medium transition hover:bg-muted/20">
                        뒤로
                      </button>
                      <button onClick={() => canDelete && setStep(2)} disabled={!canDelete}
                        className="flex-1 py-3 rounded-xl bg-destructive/10 text-destructive text-sm font-medium transition hover:bg-destructive/20 disabled:opacity-30">
                        Next
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="space-y-4">
                    <div className="text-center">
                      <span className="text-4xl">🔥</span>
                      <h2 className="text-base font-bold text-destructive mt-2">최종 Confirm</h2>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        이 버튼을 누르면 모든 데이터가<br />영구적으로 삭제됩니다
                      </p>
                    </div>
                    {error && <p className="text-[11px] text-destructive text-center">{error}</p>}
                    <button onClick={handleDelete} disabled={deleting}
                      className="w-full py-3 rounded-xl bg-destructive/20 text-destructive font-bold text-sm disabled:opacity-50 transition hover:bg-destructive/30 flex items-center justify-center gap-2">
                      {deleting ? (
                        <><div className="void-dot w-3 h-3" /> 삭제 중...</>
                      ) : (
                        <><span aria-hidden="true" className="material-icons-round text-sm">delete_forever</span> 영구 삭제</>
                      )}
                    </button>
                    <button onClick={() => setStep(1)}
                      className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition">
                      뒤로
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
