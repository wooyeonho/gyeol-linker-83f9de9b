'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { ReactNode } from 'react';

/**
 * 스크롤 애니메이션 래퍼 컴포넌트
 * Apple-style Scroll Reveal 효과
 */
interface MotionViewportProps {
  children: ReactNode;
  className?: string;
}

export default function MotionViewport({ children, className }: MotionViewportProps) {
  const shouldReduceMotion = useReducedMotion();

  const fadeInUp: Variants = {
    hidden: { 
      opacity: 0, 
      y: 20 
    },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.6,
        ease: [0.16, 1, 0.3, 1] as const, // Apple Curve: cubic-bezier(0.16, 1, 0.3, 1)
      }
    }
  };

  // 접근성: 애니메이션 감소 설정 시 즉시 표시
  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
      variants={fadeInUp}
      className={className}
    >
      {children}
    </motion.div>
  );
}

