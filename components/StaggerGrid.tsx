'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import React, { ReactNode } from 'react';

/**
 * 그리드 stagger 애니메이션 컴포넌트
 * 카드들이 순차적으로 나타나는 효과
 */
interface StaggerGridProps {
  children: ReactNode;
  className?: string;
}

export default function StaggerGrid({ children, className }: StaggerGridProps) {
  const shouldReduceMotion = useReducedMotion();

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.1, // 100ms 간격
      }
    }
  };

  const item: Variants = {
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
      variants={container}
      className={className}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={item}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

