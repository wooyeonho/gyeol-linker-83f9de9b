'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from '@/i18n/routing';
import { motion } from 'framer-motion';

/**
 * 페이지 전환 프로그레스 바
 * Next.js App Router의 pathname 변경 감지
 * 향상된 애니메이션과 성능 최적화
 */
export default function ProgressBar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const previousPathnameRef = useRef<string>(pathname);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 경로가 실제로 변경되었을 때만 실행
    if (previousPathnameRef.current === pathname) {
      return;
    }

    previousPathnameRef.current = pathname;

    // 기존 타이머 정리
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // 프로그레스 시작
    setIsLoading(true);
    setProgress(0);

    // 부드러운 프로그레스 시뮬레이션 (지수적 증가)
    let currentProgress = 0;
    intervalRef.current = setInterval(() => {
      // 지수적 증가로 자연스러운 진행
      currentProgress += (100 - currentProgress) * 0.15;
      if (currentProgress >= 90) {
        currentProgress = 90;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
      setProgress(currentProgress);
    }, 50);

    // 경로 변경 완료 시 프로그레스 완료
    timerRef.current = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 200);
    }, 500);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [pathname]);

  if (!isLoading) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent pointer-events-none"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="페이지 로딩 중"
    >
      <motion.div
        className="h-full bg-gradient-to-r from-primary via-primary-600 to-primary shadow-lg shadow-primary/50"
        initial={{ width: '0%' }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      />
    </div>
  );
}

