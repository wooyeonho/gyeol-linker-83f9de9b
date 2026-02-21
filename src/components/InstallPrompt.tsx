/**
 * 설치 프롬프트 — PWA 설치 안내 배너
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('gyeol_install_dismissed')) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('gyeol_install_dismissed', '1');
    setDeferredPrompt(null);
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-50 glass-card rounded-2xl p-4 flex items-center gap-3 shadow-xl"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
          <span aria-hidden="true" className="material-icons-round text-foreground text-lg">install_mobile</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-foreground">GYEOL 앱 설치</p>
          <p className="text-[10px] text-muted-foreground">홈 화면에 추가하면 더 빠르게 접근할 수 있어요</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={handleDismiss} className="text-muted-foreground/50 text-[10px] px-2 py-1">
            닫기
          </button>
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground text-[10px] font-bold"
          >
            설치
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
