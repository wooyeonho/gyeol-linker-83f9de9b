'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGyeolStore } from '@/store/gyeol-store';

const DURATION_MS = 3000;

export function EvolutionCeremony() {
  const { evolutionCeremony, dismissEvolutionCeremony } = useGyeolStore();
  const [phase, setPhase] = useState<'flash' | 'burst' | 'text'>('flash');

  useEffect(() => {
    if (!evolutionCeremony?.show) return;
    setPhase('flash');
    const t1 = setTimeout(() => setPhase('burst'), 300);
    const t2 = setTimeout(() => setPhase('text'), 800);
    const t3 = setTimeout(() => dismissEvolutionCeremony(), DURATION_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [evolutionCeremony?.show, dismissEvolutionCeremony]);

  if (!evolutionCeremony?.show) return null;
  const newGen = evolutionCeremony.newGen ?? 2;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        {phase === 'flash' && <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0 }} animate={{ opacity: 0.92 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} />}
        {phase === 'burst' && (
          <>
            <motion.div className="absolute inset-0 bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} />
            <motion.div className="absolute inset-0 flex items-center justify-center" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1.5, opacity: 0.4 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
              <div className="w-64 h-64 rounded-full bg-indigo-500/30 blur-3xl" />
            </motion.div>
          </>
        )}
        {phase === 'text' && (
          <motion.div className="relative z-10 text-center px-6" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 18, stiffness: 120 }}>
            <motion.p className="text-4xl font-bold text-white mb-2 drop-shadow-[0_0_20px_rgba(79,70,229,0.8)]" initial={{ y: 20 }} animate={{ y: 0 }} transition={{ delay: 0.1 }}>Gen {newGen} 도달!</motion.p>
            <motion.p className="text-indigo-300 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>새로운 형태로 성장했어요</motion.p>
            <motion.div className="mt-4 h-1 w-24 mx-auto rounded-full bg-indigo-500/50" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.4, duration: 0.5 }} style={{ transformOrigin: 'center' }} />
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
