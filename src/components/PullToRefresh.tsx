/**
 * Pull-to-refresh 래퍼 컴포넌트
 */
import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0 && diff < 120) {
      setPullDistance(diff);
    }
  }, [pulling]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 60 && !refreshing) {
      setRefreshing(true);
      setPullDistance(40);
      await onRefresh();
      setRefreshing(false);
    }
    setPulling(false);
    setPullDistance(0);
  }, [pullDistance, refreshing, onRefresh]);

  return (
    <div
      ref={containerRef}
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {pullDistance > 0 && (
        <motion.div
          className="flex items-center justify-center py-2"
          style={{ height: pullDistance }}
          animate={{ opacity: pullDistance > 30 ? 1 : pullDistance / 30 }}
        >
          <motion.div
            animate={refreshing ? { rotate: 360 } : { rotate: pullDistance * 3 }}
            transition={refreshing ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : { duration: 0 }}
          >
            <span className="material-icons-round text-primary text-lg">refresh</span>
          </motion.div>
          <span className="text-[10px] text-muted-foreground ml-2">
            {refreshing ? '새로고침 중...' : pullDistance > 60 ? '놓으면 새로고침' : '아래로 당겨 새로고침'}
          </span>
        </motion.div>
      )}
      {children}
    </div>
  );
}
