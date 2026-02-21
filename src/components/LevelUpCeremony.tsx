/**
 * Level업 연출 컴포넌트 — Level업 시 팝업 애니메이션
 */
import { motion, AnimatePresence } from 'framer-motion';

interface LevelUpCeremonyProps {
  show: boolean;
  newLevel: number;
  onClose: () => void;
}

export function LevelUpCeremony({ show, newLevel, onClose }: LevelUpCeremonyProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="glass-card rounded-3xl p-8 text-center max-w-xs mx-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Glow ring */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.3, 1], opacity: [0, 1, 0.8] }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center mb-4 relative"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30"
              />
              <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-primary to-secondary">
                {newLevel}
              </span>
            </motion.div>

            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xl font-black text-foreground mb-1"
            >
              LEVEL UP!
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-muted-foreground mb-6"
            >
              Level {newLevel}에 도달했어요! 🎉
            </motion.p>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex justify-center gap-3 text-[10px] text-muted-foreground mb-6"
            >
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary">새로운 Quest 해금</span>
              <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary">Shop 아이템 해금</span>
            </motion.div>

            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9 }}
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/30"
            >
              Confirm
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}