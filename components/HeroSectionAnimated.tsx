'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { ReactNode } from 'react';

/**
 * Hero Section 애니메이션 래퍼
 * 페이지 로드 시 즉시 실행되는 애니메이션
 */
interface HeroSectionAnimatedProps {
  children: ReactNode;
}

export default function HeroSectionAnimated({ children }: HeroSectionAnimatedProps) {
  const shouldReduceMotion = useReducedMotion();

  const fadeInUp: Variants = {
    initial: { 
      opacity: 0, 
      y: 10 
    },
    animate: { 
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
    return <>{children}</>;
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={fadeInUp}
    >
      {children}
    </motion.div>
  );
}


