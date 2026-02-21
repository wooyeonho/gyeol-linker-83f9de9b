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
    desc: 'Type a message in the input box below. The AI learns your style and interests.',
    tip: 'Supports Korean, English, Japanese and more!',
  },
  {
    icon: '🧬',
    title: 'Evolution System',
    desc: 'The more you chat, the more your AI grows. Start from Gen 1 and evolve up to Gen 5.',
    tip: 'New personality traits unlock with each evolution.',
  },
  {
    icon: '💜',
    title: 'Intimacy',
    desc: 'Regular conversations increase intimacy. Higher intimacy unlocks deeper conversations.',
    tip: 'Special events at levels 20/40/60/80!',
  },
  {
    icon: '🔥',
    title: 'Login Streak',
    desc: 'Daily logins earn streak bonuses. Longer streaks mean bigger rewards.',
    tip: '7-day streak → 2x EXP bonus!',
  },
  {
    icon: '🏆',
    title: 'Quest & Achievement',
    desc: 'Check daily/weekly missions in the Quest tab and claim your rewards.',
    tip: 'Completed quests can be claimed with the "Claim Reward" button.',
  },
  {
    icon: '⚙️',
    title: 'Settings',
    desc: 'Switch between Simple/Advanced mode, change characters, and adjust personality in Settings.',
    tip: 'You can also register your own API key with BYOK.',
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
        aria-label="Onboarding Tutorial"
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
