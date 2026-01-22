'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  step: number;
  total: number;
  className?: string;
}

/**
 * 업로드 폼 진행 단계 표시 컴포넌트
 * 모바일 퍼스트 반응형 디자인
 */
export default function ProgressIndicator({
  step,
  total,
  className,
}: ProgressIndicatorProps) {
  const percentage = (step / total) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('mb-8 text-center', className)}
    >
      <p className="text-gray-400 text-sm md:text-base mb-2">
        Step {step} of {total}
      </p>
      <div className="w-full bg-gray-800 rounded-full h-2 md:h-2.5">
        <motion.div
          className="bg-primary h-full rounded-full transition-all duration-300"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}



