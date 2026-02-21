/**
 * 온보딩 Tutorial 오버레이 — 주요 기능 소개 가이드
 * 첫 방문 시 자동 표시, localStorage로 표시 여부 관리
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  {
    icon: '💬',
    title: 'Chat',
    desc: '하단 입력창에 메시지를 입력하세요. AI가 당신의 말투와 관심사를 학습합니다.',
    tip: '한국어, 영어, 일본어 등 Supports multiple languages!',
  },
  {
    icon: '🧬',
    title: 'Evolution 시스템',
    desc: '대화를 나눌수록 AI가 성장합니다. Gen 1부터 시작해 최대 Gen 5까지 Evolution할 수 있어요.',
    tip: 'Evolution할 때마다 새로운 Personality 특성이 해금됩니다.',
  },
  {
    icon: '💜',
    title: 'Intimacy',
    desc: '꾸준히 대화하면 Intimacy가 올라갑니다. 높을수록 AI가 더 깊은 대화를 나눠요.',
    tip: '20/40/60/80 Level 달성 시 특별 이벤트!',
  },
  {
    icon: '🔥',
    title: 'Login Streak',
    desc: '매일 접속하면 스트릭 보너스를 받아요. Login Streak이 길어질수록 보상이 커집니다.',
    tip: '7일 연속 → EXP 2배 보너스!',
  },
  {
    icon: '🏆',
    title: 'Quest & Achievement',
    desc: '하단 내비게이션의 Quest 탭에서 일일/주간 미션을 Confirm하고 보상을 받으세요.',
    tip: 'Done된 Quest는 "Claim Reward" 버튼을 눌러 claim your reward.',
  },
  {
    icon: '⚙️',
    title: 'Settings',
    desc: 'Simple/Advanced 모드 전환, 캐릭터 변경, Personality 조절 등을 Settings에서 할 수 있어요.',
    tip: 'BYOK로 자신의 API 키를 등록할 수도 있어요.',
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
        aria-label="온보딩 Tutorial"
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

          {/* Step counter */}
          <span className="text-[9px] text-muted-foreground/50 mb-2 block">
            {step + 1} / {STEPS.length}
          </span>

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
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">{current.desc}</p>
          
          {/* Tip */}
          {current.tip && (
            <div className="px-3 py-2 rounded-xl bg-primary/5 border border-primary/10 mb-5">
              <p className="text-[10px] text-primary/80 flex items-center gap-1 justify-center">
                <span aria-hidden="true" className="material-icons-round text-[12px]">lightbulb</span>
                {current.tip}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-2.5 rounded-xl bg-muted/10 text-muted-foreground text-sm font-medium hover:bg-muted/20 transition"
              >
                Previous
              </button>
            )}
            <button
              onClick={() => {
                if (isLast) { onClose(); setStep(0); }
                else setStep(s => s + 1);
              }}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20"
            >
              {isLast ? 'Get Started 🚀' : 'Next'}
            </button>
          </div>

          <button
            onClick={() => { onClose(); setStep(0); }}
            className="mt-3 text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition"
          >
            Skip
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
