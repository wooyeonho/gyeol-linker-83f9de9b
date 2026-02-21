/**
 * 네트워크 상태 감지 — 오프라인 시 배너 표시
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function NetworkStatus() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[200] bg-destructive/90 backdrop-blur-sm px-4 py-2 flex items-center justify-center gap-2"
        >
          <span aria-hidden="true" className="material-icons-round text-foreground text-sm">wifi_off</span>
          <span className="text-white text-xs font-medium">오프라인 상태입니다. 인터넷 연결을 확인해주세요.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
