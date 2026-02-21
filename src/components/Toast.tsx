import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Toast {
  id: string;
  type: 'success' | 'info' | 'warning' | 'achievement';
  title: string;
  message?: string;
  icon?: string;
  duration?: number;
}

let toastListeners: ((t: Toast) => void)[] = [];

export function showToast(toast: Omit<Toast, 'id'>) {
  const t = { ...toast, id: crypto.randomUUID() };
  toastListeners.forEach(fn => fn(t));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (t: Toast) => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => {
        setToasts(prev => prev.filter(x => x.id !== t.id));
      }, t.duration ?? 4000);
    };
    toastListeners.push(handler);
    return () => { toastListeners = toastListeners.filter(fn => fn !== handler); };
  }, []);

  return (
    <div aria-live="polite" className="fixed top-[max(env(safe-area-inset-top),12px)] left-0 right-0 z-[200] flex flex-col items-center gap-2 px-4 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`pointer-events-auto w-full max-w-sm rounded-2xl p-3 px-4 flex items-center gap-3 shadow-2xl backdrop-blur-xl border ${
              t.type === 'achievement'
                ? 'bg-[hsl(var(--warning)/0.2)] border-[hsl(var(--warning))]/30 shadow-amber-500/20'
                : t.type === 'success'
                ? 'bg-[hsl(var(--success,142_71%_45%)/0.2)] border-[hsl(var(--success,142_71%_45%)/0.3)] shadow-[hsl(var(--success,142_71%_45%)/0.2)]'
                : t.type === 'warning'
                ? 'bg-destructive/20 border-destructive/30 shadow-red-500/20'
                : 'bg-primary/20 border-primary/30 shadow-primary/20'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              t.type === 'achievement'
                ? 'bg-[hsl(var(--warning))]/30'
                : t.type === 'success'
                ? 'bg-[hsl(var(--success,142_71%_45%))]/30'
                : 'bg-primary/30'
            }`}>
              <span className={`material-icons-round text-lg ${
                t.type === 'achievement' ? 'text-[hsl(var(--warning))]' : t.type === 'success' ? 'text-[hsl(var(--success,142_71%_45%))]' : 'text-primary'
              }`}>
                {t.icon ?? (t.type === 'achievement' ? 'emoji_events' : t.type === 'success' ? 'check_circle' : 'info')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{t.title}</p>
              {t.message && <p className="text-[10px] text-muted-foreground mt-0.5">{t.message}</p>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
