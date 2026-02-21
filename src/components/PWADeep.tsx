import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Download, RefreshCw, Bell, Smartphone, Monitor, RotateCcw } from 'lucide-react';

export function OfflineBanner({ isOnline }: { isOnline: boolean }) {
  if (isOnline) return null;
  return (
    <motion.div initial={{ y: -40 }} animate={{ y: 0 }} exit={{ y: -40 }}
      className="fixed top-0 left-0 right-0 z-[90] bg-[hsl(var(--warning))]/90 backdrop-blur-sm px-4 py-2 text-center">
      <div className="flex items-center justify-center gap-1.5">
        <WifiOff className="w-3.5 h-3.5 text-background" />
        <span className="text-[10px] font-medium text-background">Offline Mode — Messages will sync when reconnected</span>
      </div>
    </motion.div>
  );
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return isOnline;
}

export function UpdatePrompt({ onUpdate, onDismiss }: { onUpdate: () => void; onDismiss: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-20 left-4 right-4 z-[80] glass-card rounded-2xl p-4 shadow-xl max-w-sm mx-auto">
      <div className="flex items-start gap-3">
        <RefreshCw className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-[11px] font-medium text-foreground">Update Available</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">A new version of GYEOL is ready. Refresh to update.</p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onDismiss}
          className="flex-1 py-2 rounded-xl glass-card text-[10px] text-muted-foreground">Later</button>
        <button onClick={onUpdate}
          className="flex-1 py-2 rounded-xl bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition">
          Update Now
        </button>
      </div>
    </motion.div>
  );
}

export function OfflineChatQueue({ queue }: { queue: { content: string; timestamp: string }[] }) {
  if (queue.length === 0) return null;
  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-1.5 mb-1">
        <WifiOff className="w-3 h-3 text-[hsl(var(--warning))]" />
        <span className="text-[9px] text-[hsl(var(--warning))] font-medium">{queue.length} message(s) queued</span>
      </div>
      <div className="space-y-1">
        {queue.map((msg, i) => (
          <div key={i} className="text-[9px] text-foreground/40 truncate">
            {msg.content.slice(0, 50)}...
          </div>
        ))}
      </div>
    </div>
  );
}

export function CacheStrategy({ strategy, onChange }: {
  strategy: 'network-first' | 'cache-first' | 'stale-while-revalidate';
  onChange: (s: 'network-first' | 'cache-first' | 'stale-while-revalidate') => void;
}) {
  const strategies: { value: typeof strategy; label: string; desc: string }[] = [
    { value: 'network-first', label: 'Network First', desc: 'Always fetch latest data' },
    { value: 'cache-first', label: 'Cache First', desc: 'Faster loads, may be stale' },
    { value: 'stale-while-revalidate', label: 'SWR', desc: 'Show cached, update in background' },
  ];

  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground">Cache Strategy</h4>
      {strategies.map(s => (
        <button key={s.value} onClick={() => onChange(s.value)}
          className={`w-full flex items-center gap-2 p-2 rounded-xl text-left transition ${
            strategy === s.value ? 'bg-primary/10 border border-primary/20' : 'glass-card hover:bg-muted/20'
          }`}>
          <div className={`w-3 h-3 rounded-full border-2 ${strategy === s.value ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`} />
          <div>
            <p className="text-[10px] font-medium text-foreground">{s.label}</p>
            <p className="text-[8px] text-muted-foreground">{s.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

export function PushNotificationSubscribe({ subscribed, onToggle }: { subscribed: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl glass-card">
      <div className="flex items-center gap-2">
        <Bell className={`w-4 h-4 ${subscribed ? 'text-primary' : 'text-muted-foreground'}`} />
        <div>
          <p className="text-[10px] font-medium text-foreground">Push Notifications</p>
          <p className="text-[8px] text-muted-foreground">{subscribed ? 'Subscribed' : 'Get notified about updates'}</p>
        </div>
      </div>
      <button onClick={onToggle}
        className={`w-10 h-5 rounded-full transition ${subscribed ? 'bg-primary' : 'bg-muted/30'}`}>
        <div className={`w-4 h-4 rounded-full bg-background shadow transition-transform ${subscribed ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export function ResponsiveLayoutIndicator() {
  const [layout, setLayout] = useState('mobile');
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setLayout(w >= 1024 ? 'desktop' : w >= 768 ? 'tablet' : 'mobile');
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const icons = { mobile: <Smartphone className="w-3 h-3" />, tablet: <Monitor className="w-3 h-3" />, desktop: <Monitor className="w-3 h-3" /> };
  return (
    <span className="inline-flex items-center gap-1 text-[8px] text-muted-foreground/40">
      {icons[layout as keyof typeof icons]} {layout}
    </span>
  );
}

export function AppBadge({ count }: { count: number }) {
  useEffect(() => {
    if ('setAppBadge' in navigator) {
      (navigator as any).setAppBadge(count).catch(() => {});
    }
    return () => {
      if ('clearAppBadge' in navigator) {
        (navigator as any).clearAppBadge().catch(() => {});
      }
    };
  }, [count]);
  return null;
}

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onFinish, 2000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-background flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-4"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/40 to-secondary/20 flex items-center justify-center"
        >
          <span className="text-3xl font-bold text-primary">G</span>
        </motion.div>
        <div>
          <p className="text-lg font-bold text-foreground">GYEOL</p>
          <p className="text-[10px] text-muted-foreground">AI Companion Platform</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function SafeAreaWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      paddingLeft: 'env(safe-area-inset-left, 0px)',
      paddingRight: 'env(safe-area-inset-right, 0px)',
    }}>
      {children}
    </div>
  );
}

export function LandscapeWarning() {
  const [isLandscape, setIsLandscape] = useState(false);
  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight && window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!isLandscape) return null;
  return (
    <div className="fixed inset-0 z-[150] bg-background/95 flex items-center justify-center">
      <div className="text-center space-y-3">
        <RotateCcw className="w-10 h-10 text-primary mx-auto animate-spin" style={{ animationDuration: '3s' }} />
        <p className="text-sm font-medium text-foreground">Please rotate your device</p>
        <p className="text-[10px] text-muted-foreground">GYEOL works best in portrait mode</p>
      </div>
    </div>
  );
}
