/**
 * 온보딩 튜토리얼 오버레이 — 주요 기능 소개 가이드
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  {
    icon: '💬',
    title: '대화하기',
    desc: '하단 입력창에 메시지를 입력하세요. AI가 당신의 말투와 관심사를 학습합니다.',
  },
  {
    icon: '🧬',
    title: '진화 시스템',
    desc: '대화를 나눌수록 AI가 성장합니다. Gen 1부터 시작해 최대 Gen 5까지 진화할 수 있어요.',
  },
  {
    icon: '💜',
    title: '친밀도',
    desc: '꾸준히 대화하면 친밀도가 올라갑니다. 높을수록 AI가 더 깊은 대화를 나눠요.',
  },
  {
    icon: '🔥',
    title: '연속 접속',
    desc: '매일 접속하면 스트릭 보너스를 받아요. 연속 접속이 길어질수록 보상이 커집니다.',
  },
  {
    icon: '🏆',
    title: '퀘스트 & 업적',
    desc: '하단 내비게이션의 퀘스트 탭에서 일일/주간 미션을 확인하고 보상을 받으세요.',
  },
  {
    icon: '⚙️',
    title: '설정',
    desc: 'Simple/Advanced 모드 전환, 캐릭터 변경, 성격 조절 등을 설정에서 할 수 있어요.',
  },
];

interface OnboardingTutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingTutorial({ isOpen, onClose }: OnboardingTutorialProps) {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md"
        onClick={onClose}
        role="dialog"
        aria-label="온보딩 튜토리얼"
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="glass-card rounded-3xl p-6 max-w-xs mx-auto text-center"
          onClick={e => e.stopPropagation()}
        >
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === step ? 'w-6 bg-primary' : i < step ? 'w-2 bg-primary/40' : 'w-2 bg-muted/20'
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12 }}
            className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4"
          >
            <span className="text-3xl">{current.icon}</span>
          </motion.div>

          <h3 className="text-base font-bold text-foreground mb-2">{current.title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed mb-6">{current.desc}</p>

          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-2.5 rounded-xl bg-muted/10 text-muted-foreground text-sm font-medium hover:bg-muted/20 transition"
              >
                이전
              </button>
            )}
            <button
              onClick={() => {
                if (isLast) { onClose(); setStep(0); }
                else setStep(s => s + 1);
              }}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-sm font-bold shadow-lg shadow-primary/20"
            >
              {isLast ? '시작하기' : '다음'}
            </button>
          </div>

          <button
            onClick={() => { onClose(); setStep(0); }}
            className="mt-3 text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition"
          >
            건너뛰기
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
