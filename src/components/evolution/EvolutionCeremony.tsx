import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGyeolStore } from '@/store/gyeol-store';

const DURATION_MS = 3500;

function EnergyParticle({ delay, cx, cy }: { delay: number; cx: number; cy: number }) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 120 + Math.random() * 180;
  return (
    <motion.div
      className="absolute w-1.5 h-1.5 rounded-full bg-indigo-400"
      style={{ left: cx, top: cy }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        opacity: 0,
        scale: 0.3,
      }}
      transition={{ duration: 0.8, delay, ease: 'easeOut' }}
    />
  );
}

export function EvolutionCeremony() {
  const { evolutionCeremony, dismissEvolutionCeremony } = useGyeolStore();
  const [phase, setPhase] = useState<'flash' | 'burst' | 'form' | 'text'>('flash');

  const particles = useMemo(() => Array.from({ length: 40 }, (_, i) => i), []);

  useEffect(() => {
    if (!evolutionCeremony?.show) return;
    setPhase('flash');
    const t1 = setTimeout(() => setPhase('burst'), 350);
    const t2 = setTimeout(() => setPhase('form'), 1000);
    const t3 = setTimeout(() => setPhase('text'), 1600);
    const t4 = setTimeout(() => dismissEvolutionCeremony(), DURATION_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [evolutionCeremony?.show, dismissEvolutionCeremony]);

  if (!evolutionCeremony?.show) return null;
  const newGen = evolutionCeremony.newGen ?? 2;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Phase 1: White Flash */}
        {phase === 'flash' && (
          <motion.div
            className="absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.95, 0.6] }}
            transition={{ duration: 0.35, times: [0, 0.5, 1] }}
          />
        )}

        {/* Phase 2: Energy Burst - particles explode outward */}
        {phase === 'burst' && (
          <>
            <motion.div
              className="absolute inset-0 bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            />
            {particles.map((i) => (
              <EnergyParticle key={i} delay={i * 0.015} cx={window.innerWidth / 2} cy={window.innerHeight / 2} />
            ))}
            <motion.div
              className="absolute w-48 h-48 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(99,102,241,0.6) 0%, rgba(99,102,241,0) 70%)',
              }}
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: [0.2, 2.5], opacity: [0.8, 0] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </>
        )}

        {/* Phase 3: New Form materializes */}
        {phase === 'form' && (
          <>
            <motion.div className="absolute inset-0 bg-black" />
            <motion.div
              className="relative w-32 h-32 rounded-full"
              style={{
                background: `radial-gradient(circle, rgba(129,140,248,0.8) 0%, rgba(79,70,229,0.4) 50%, transparent 70%)`,
                boxShadow: '0 0 60px rgba(99,102,241,0.5), 0 0 120px rgba(99,102,241,0.2)',
              }}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: [0, 1.3, 1], rotate: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </>
        )}

        {/* Phase 4: Gen text reveal */}
        {phase === 'text' && (
          <>
            <motion.div className="absolute inset-0 bg-black" />
            <motion.div
              className="relative w-24 h-24 rounded-full mb-6"
              style={{
                background: 'radial-gradient(circle, rgba(129,140,248,0.6) 0%, rgba(79,70,229,0.3) 50%, transparent 70%)',
                boxShadow: '0 0 40px rgba(99,102,241,0.4)',
              }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute text-center px-6"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            >
              <motion.p
                className="text-5xl font-bold text-white mb-3"
                style={{ textShadow: '0 0 30px rgba(99,102,241,0.8), 0 0 60px rgba(99,102,241,0.4)' }}
              >
                Gen {newGen}
              </motion.p>
              <motion.p
                className="text-indigo-300/80 text-base"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                새로운 형태로 진화했어요
              </motion.p>
              <motion.div
                className="mt-4 h-0.5 w-20 mx-auto rounded-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              />
            </motion.div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
