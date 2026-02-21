/**
 * 브리딩 연출 — DNA 결합 애니메이션 + 탄생 이펙트
 */
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  show: boolean;
  parentAName: string;
  parentBName: string;
  childName: string;
  onComplete: () => void;
}

export function BreedingCeremony({ show, parentAName, parentBName, childName, onComplete }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-lg"
          onClick={onComplete}
        >
          <motion.div
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-xs text-center"
          >
            {/* DNA helix animation */}
            <div className="relative h-48 flex items-center justify-center mb-6">
              {/* Parent A orb */}
              <motion.div
                className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/40 to-blue-600/20 border border-blue-500/30 flex items-center justify-center"
                initial={{ x: -80, y: -40, opacity: 0 }}
                animate={{
                  x: [- 80, -40, 0],
                  y: [-40, 0, 0],
                  opacity: [0, 1, 0.5],
                  scale: [1, 1.1, 0.6],
                }}
                transition={{ duration: 2, ease: 'easeInOut' }}
              >
                <span className="text-[10px] text-blue-400 font-bold">{parentAName.slice(0, 4)}</span>
              </motion.div>

              {/* Parent B orb */}
              <motion.div
                className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/40 to-pink-600/20 border border-pink-500/30 flex items-center justify-center"
                initial={{ x: 80, y: 40, opacity: 0 }}
                animate={{
                  x: [80, 40, 0],
                  y: [40, 0, 0],
                  opacity: [0, 1, 0.5],
                  scale: [1, 1.1, 0.6],
                }}
                transition={{ duration: 2, ease: 'easeInOut' }}
              >
                <span className="text-[10px] text-pink-400 font-bold">{parentBName.slice(0, 4)}</span>
              </motion.div>

              {/* Merge explosion */}
              <motion.div
                className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-primary/50 to-secondary/30 border-2 border-primary/40"
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 0, 0, 1.5, 1],
                  opacity: [0, 0, 0, 1, 0.8],
                }}
                transition={{ duration: 3, ease: 'easeOut' }}
              >
                <motion.div
                  className="w-full h-full rounded-full flex items-center justify-center"
                  animate={{
                    boxShadow: [
                      '0 0 0 0 hsl(var(--primary) / 0)',
                      '0 0 40px 10px hsl(var(--primary) / 0.4)',
                      '0 0 20px 5px hsl(var(--primary) / 0.2)',
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: 2.5 }}
                >
                  <span className="text-lg font-bold text-primary">✦</span>
                </motion.div>
              </motion.div>

              {/* Particle burst */}
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (360 / 12) * i;
                const rad = (angle * Math.PI) / 180;
                return (
                  <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-primary"
                    initial={{ x: 0, y: 0, opacity: 0 }}
                    animate={{
                      x: [0, 0, Math.cos(rad) * 80],
                      y: [0, 0, Math.sin(rad) * 80],
                      opacity: [0, 0, 1, 0],
                      scale: [0, 0, 1.5, 0],
                    }}
                    transition={{ duration: 3, ease: 'easeOut', delay: 0.1 * i }}
                  />
                );
              })}
            </div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.5 }}
              className="space-y-2"
            >
              <h2 className="text-xl font-black text-foreground">🎉 탄생!</h2>
              <p className="text-sm text-muted-foreground">
                <span className="text-blue-400">{parentAName}</span>
                {' × '}
                <span className="text-pink-400">{parentBName}</span>
              </p>
              <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                {childName}
              </p>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3.5 }}
                onClick={onComplete}
                className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/30"
              >
                만나기
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
