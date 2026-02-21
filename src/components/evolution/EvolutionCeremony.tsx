import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGyeolStore } from '@/store/gyeol-store';

const DURATION_MS = 6000;

function Particle({ delay, cx, cy, color }: { delay: number; cx: number; cy: number; color: string }) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 80 + Math.random() * 250;
  return (
    <motion.div
      className="absolute rounded-full"
      style={{ left: cx, top: cy, width: 2 + Math.random() * 4, height: 2 + Math.random() * 4, background: color }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0, scale: 0.2 }}
      transition={{ duration: 0.9 + Math.random() * 0.4, delay, ease: 'easeOut' }}
    />
  );
}

function FloatingRing({ delay, size }: { delay: number; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full border border-primary/40"
      style={{ width: size, height: size }}
      initial={{ scale: 0, opacity: 0.8 }}
      animate={{ scale: [0, 2.5, 3], opacity: [0.8, 0.3, 0] }}
      transition={{ duration: 1.5, delay, ease: 'easeOut' }}
    />
  );
}

const GEN_COLORS: Record<number, { primary: string; glow: string; particles: string[] }> = {
  2: { primary: '#818CF8', glow: 'rgba(99,102,241,0.6)', particles: ['#818CF8', '#A5B4FC', '#6366F1'] },
  3: { primary: '#34D399', glow: 'rgba(52,211,153,0.6)', particles: ['#34D399', '#6EE7B7', '#059669'] },
  4: { primary: '#F59E0B', glow: 'rgba(245,158,11,0.6)', particles: ['#F59E0B', '#FCD34D', '#D97706'] },
  5: { primary: '#EC4899', glow: 'rgba(236,72,153,0.6)', particles: ['#EC4899', '#F9A8D4', '#DB2777'] },
};

export function EvolutionCeremony() {
  const { evolutionCeremony, dismissEvolutionCeremony } = useGyeolStore();
  const [phase, setPhase] = useState<'flash' | 'burst' | 'form' | 'text'>('flash');

  const particles = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  useEffect(() => {
    if (!evolutionCeremony?.show) return;
    setPhase('flash');
    const t1 = setTimeout(() => setPhase('burst'), 400);
    const t2 = setTimeout(() => setPhase('form'), 1400);
    const t3 = setTimeout(() => setPhase('text'), 2400);
    const t4 = setTimeout(() => dismissEvolutionCeremony(), DURATION_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [evolutionCeremony?.show, dismissEvolutionCeremony]);

  if (!evolutionCeremony?.show) return null;
  const newGen = evolutionCeremony.newGen ?? 2;
  const colors = GEN_COLORS[newGen] ?? GEN_COLORS[2]!;
  const cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 200;
  const cy = typeof window !== 'undefined' ? window.innerHeight / 2 : 400;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={dismissEvolutionCeremony}
      >
        {/* Phase 1: Dramatic Flash */}
        {phase === 'flash' && (
          <motion.div
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle at center, ${colors.glow}, white 60%)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.7] }}
            transition={{ duration: 0.4, times: [0, 0.4, 1] }}
          />
        )}

        {/* Phase 2: Particle Explosion */}
        {phase === 'burst' && (
          <>
            <motion.div className="absolute inset-0 bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} />
            {particles.map((i) => (
              <Particle key={i} delay={i * 0.012} cx={cx} cy={cy} color={colors.particles[i % colors.particles.length]} />
            ))}
            <FloatingRing delay={0} size={100} />
            <FloatingRing delay={0.15} size={160} />
            <FloatingRing delay={0.3} size={220} />
            <motion.div
              className="absolute rounded-full"
              style={{ width: 200, height: 200, background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)` }}
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: [0.2, 3], opacity: [1, 0] }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </>
        )}

        {/* Phase 3: New Form Materializes */}
        {phase === 'form' && (
          <>
            <motion.div className="absolute inset-0 bg-black" />
            {/* Rotating outer ring */}
            <motion.div
              className="absolute w-44 h-44 rounded-full border-2"
              style={{ borderColor: `${colors.primary}40` }}
              initial={{ scale: 0, rotate: 0 }}
              animate={{ scale: [0, 1.2, 1], rotate: 360 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            />
            {/* Core orb */}
            <motion.div
              className="relative w-32 h-32 rounded-full"
              style={{
                background: `radial-gradient(circle, ${colors.primary}cc 0%, ${colors.primary}66 50%, transparent 70%)`,
                boxShadow: `0 0 80px ${colors.glow}, 0 0 160px ${colors.glow}`,
              }}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: [0, 1.4, 1], rotate: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          </>
        )}

        {/* Phase 4: Gen Text Reveal */}
        {phase === 'text' && (
          <>
            <motion.div className="absolute inset-0 bg-black" />
            {/* Breathing orb */}
            <motion.div
              className="relative w-24 h-24 rounded-full mb-8"
              style={{
                background: `radial-gradient(circle, ${colors.primary}99 0%, ${colors.primary}4d 50%, transparent 70%)`,
                boxShadow: `0 0 50px ${colors.glow}`,
              }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute text-center px-6"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 18, stiffness: 90 }}
            >
              <motion.p
                className="text-6xl font-black tracking-tight mb-2"
                style={{ color: colors.primary, textShadow: `0 0 40px ${colors.glow}, 0 0 80px ${colors.glow}` }}
              >
                Gen {newGen}
              </motion.p>
              <motion.p
                className="text-foreground/60 text-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                새로운 형태로 Evolution했어요 ✨
              </motion.p>
              <motion.div
                className="mt-5 h-0.5 w-24 mx-auto rounded-full"
                style={{ background: `linear-gradient(90deg, transparent, ${colors.primary}, transparent)` }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
              <motion.p
                className="mt-4 text-[10px] text-muted-foreground/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                탭하여 계속
              </motion.p>
            </motion.div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
