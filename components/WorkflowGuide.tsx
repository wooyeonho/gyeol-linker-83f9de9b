'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { CheckCircle } from 'lucide-react';

interface WorkflowGuideProps {
  instructions?: string | null;
}

/**
 * 워크플로우 가이드 컴포넌트
 * 프롬프트 사용 방법에 대한 단계별 가이드 제공
 */
export default function WorkflowGuide({ instructions }: WorkflowGuideProps) {
  const t = useTranslations('prompts');

  // 기본 가이드 (instructions가 없을 때)
  const defaultSteps = [
    '프롬프트 원문을 위 섹션에서 복사하세요',
    '선호하는 AI 모델 (예: GPT-4, Claude)에 붙여넣으세요',
    '필요에 따라 변수나 파라미터를 조정하세요',
    '결과를 확인하고 반복적으로 개선하세요',
  ];

  // instructions가 있으면 파싱하여 사용, 없으면 기본 가이드 사용
  const steps = instructions
    ? instructions
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => line.replace(/^[-*]\s*/, '').trim())
    : defaultSteps;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 md:p-8 space-y-4"
    >
      <h2 className="text-xl font-semibold text-white tracking-[-0.02em]">
        {t('instructions')}
      </h2>
      <ol className="space-y-3">
        {steps.map((step, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.2, delay: index * 0.1 }}
            className="flex items-start gap-3 text-gray-300 leading-relaxed"
          >
            <CheckCircle
              className="w-5 h-5 text-primary flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span className="flex-1">{step}</span>
          </motion.li>
        ))}
      </ol>
    </motion.section>
  );
}



