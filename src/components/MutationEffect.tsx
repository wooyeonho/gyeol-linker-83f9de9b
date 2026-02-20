/**
 * 돌연변이 UI 연출 — 진화 과정에서 돌연변이 발생 시 글리치 효과
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MutationEffectProps {
  show: boolean;
  trait: string;       // e.g. "creativity +15"
  mutationType?: 'boost' | 'shift' | 'rare';
  onClose: () => void;
}

const TYPE_CONFIG = {
  boost: { icon: '⚡', label: '능력치 돌연변이', accent: 'from-amber-500 to-yellow-400', glow: 'shadow-amber-500/40' },
  shift: { icon: '🔀', label: '성격 시프트', accent: 'from-indigo-500 to-violet-400', glow: 'shadow-indigo-500/40' },
  rare: { icon: '💎', label: '희귀 돌연변이', accent: 'from-rose-500 to-pink-400', glow: 'shadow-rose-500/40' },
};

export function MutationEffect({ show, trait, mutationType = 'boost', onClose }: MutationEffectProps) {
  const [glitchPhase, setGlitchPhase] = useState(false);
  const config = TYPE_CONFIG[mutationType];

  useEffect(() => {
    if (!show) return;
    setGlitchPhase(true);
    const t = setTimeout(() => setGlitchPhase(false), 600);
    return () => clearTimeout(t);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-label="돌연변이 발생"
        >
          {/* Glitch overlay */}
          {glitchPhase && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
              }}
              animate={{ opacity: [1, 0.5, 1, 0.3, 1] }}
              transition={{ duration: 0.6 }}
            />
          )}

          <motion.div
            initial={{ scale: 0.2, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            className="glass-card rounded-3xl p-8 text-center max-w-xs mx-auto relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Scan line animation */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(transparent 50%, rgba(255,255,255,0.02) 50%)', backgroundSize: '100% 4px' }}
            />

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.4, 1] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${config.accent} flex items-center justify-center mb-4 shadow-lg ${config.glow}`}
            >
              <motion.span
                className="text-3xl"
                animate={{ rotate: [0, -10, 10, -5, 0] }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                {config.icon}
              </motion.span>
            </motion.div>

            <motion.p
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-bold"
            >
              MUTATION DETECTED
            </motion.p>

            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-base font-black text-foreground mb-1"
            >
              {config.label}
            </motion.h2>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className={`text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r ${config.accent} mb-6`}
            >
              {trait}
            </motion.p>

            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              onClick={onClose}
              className={`w-full py-3 rounded-2xl bg-gradient-to-r ${config.accent} text-white font-bold text-sm shadow-lg ${config.glow}`}
            >
              수용하기
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
