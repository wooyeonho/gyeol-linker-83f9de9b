'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

/**
 * Header 애니메이션 래퍼
 * 페이지 로드 시 위에서 아래로 부드럽게 나타나는 애니메이션
 */
export default function HeaderAnimated({ children }: { children: ReactNode }) {
  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-gray-800"
      role="banner"
    >
      {children}
    </motion.header>
  );
}



