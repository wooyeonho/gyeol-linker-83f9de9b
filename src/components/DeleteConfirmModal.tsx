/**
 * 삭제 확인 모달
 */
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  title?: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function DeleteConfirmModal({ isOpen, title = '삭제 확인', message = '정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.', onConfirm, onCancel, loading }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-panel rounded-2xl p-5 max-w-xs w-full space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <span aria-hidden="true" className="material-icons-round text-destructive">warning</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{title}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{message}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 py-2 rounded-xl glass-card text-xs font-medium text-muted-foreground hover:text-foreground transition"
              >
                취소
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold transition disabled:opacity-50"
              >
                {loading ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
