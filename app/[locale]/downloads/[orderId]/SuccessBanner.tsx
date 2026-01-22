'use client';

import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

interface SuccessBannerProps {
  title: string;
  message: string;
}

/**
 * 성공 배너 컴포넌트
 * 구매 완료 메시지를 표시
 */
export default function SuccessBanner({ title, message }: SuccessBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6 md:mb-8"
    >
      <div className="bg-primary/20 border border-primary/30 rounded-lg p-4 flex items-center gap-3">
        <CheckCircle
          className="w-6 h-6 md:w-8 md:h-8 text-primary flex-shrink-0"
          aria-hidden="true"
        />
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-primary tracking-[-0.02em]">
            {title}
          </h1>
          <p className="text-sm md:text-base text-gray-300 mt-1">{message}</p>
        </div>
      </div>
    </motion.div>
  );
}



