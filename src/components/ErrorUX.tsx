import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import { useNavigate } from 'react-router-dom';

type ToastType = 'error' | 'warning' | 'info' | 'success';

interface ErrorToast {
  id: string;
  type: ToastType;
  message: string;
  action?: { label: string; onClick: () => void };
}

let addToastFn: ((t: Omit<ErrorToast, 'id'>) => void) | null = null;

export function showErrorToast(message: string, type: ToastType = 'error', action?: ErrorToast['action']) {
  addToastFn?.({ type, message, action });
}

export function handleApiError(error: any, context?: string) {
  const status = error?.status ?? error?.statusCode;
  if (status === 429) {
    const reset = error?.resetSeconds ?? 60;
    showErrorToast(`너무 빠르게 보내고 있어요. ${reset}초 후 다시 시도해주세요`, 'warning');
  } else if (status === 401) {
    supabase.auth.refreshSession().then(({ error: refreshErr }) => {
      if (refreshErr) {
        showErrorToast('세션이 만료되었습니다. 다시 로그인해주세요', 'error');
        setTimeout(() => { window.location.href = '/auth'; }, 1500);
      }
    });
  } else if (status === 500 || status === 502 || status === 503) {
    showErrorToast('서버가 잠시 바쁩니다. 곧 돌아올게요!', 'error');
  } else if (!navigator.onLine) {
    showErrorToast('인터넷 연결을 확인해주세요', 'warning');
  } else {
    showErrorToast(context ?? '오류가 발생했습니다. 다시 시도해주세요', 'error');
  }
}

export function ErrorToastContainer() {
  const [toasts, setToasts] = useState<ErrorToast[]>([]);

  useEffect(() => {
    addToastFn = (t) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts(prev => [...prev.slice(-4), { ...t, id }]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4000);
    };
    return () => { addToastFn = null; };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            className={`pointer-events-auto rounded-xl px-4 py-3 backdrop-blur-md border shadow-lg flex items-center gap-2 text-xs ${
              t.type === 'error' ? 'bg-destructive/20 border-destructive/30 text-destructive' :
              t.type === 'warning' ? 'bg-[hsl(var(--warning)/0.2)] border-yellow-500/30 text-[hsl(var(--warning))]' :
              t.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
              'bg-primary/20 border-primary/30 text-primary'
            }`}>
            <span aria-hidden="true" className="material-icons-round text-sm">
              {t.type === 'error' ? 'error' : t.type === 'warning' ? 'warning' : t.type === 'success' ? 'check_circle' : 'info'}
            </span>
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button onClick={t.action.onClick} className="text-primary font-medium hover:underline ml-2">
                {t.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (isOnline) return null;

  return (
    <motion.div initial={{ y: -40 }} animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-[9998] bg-yellow-500/90 text-background text-center py-2 text-xs font-medium backdrop-blur-sm">
      <span aria-hidden="true" className="material-icons-round text-xs align-middle mr-1">wifi_off</span>
      오프라인 상태입니다 — 이전 대화 읽기만 가능합니다
    </motion.div>
  );
}

interface RetryButtonProps {
  onRetry: () => void;
  label?: string;
}

export function MessageRetryButton({ onRetry, label = '다시 보내기' }: RetryButtonProps) {
  return (
    <button onClick={onRetry}
      className="inline-flex items-center gap-1 text-[10px] text-destructive hover:text-destructive/80 transition mt-1">
      <span aria-hidden="true" className="material-icons-round text-xs">refresh</span>
      {label}
    </button>
  );
}
