import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface VoidCoreProps {
  isThinking?: boolean;
  mood?: string;
}

const MOOD_CONFIG: Record<string, { hue: string; speed: string; scale: string; particleColor: string }> = {
  happy:   { hue: '142 63% 52%', speed: '3s',   scale: '1.2',  particleColor: 'hsl(142 63% 52%)' },
  excited: { hue: '38 92% 55%',  speed: '2s',   scale: '1.3',  particleColor: 'hsl(38 92% 55%)' },
  sad:     { hue: '220 60% 45%', speed: '6s',   scale: '0.95', particleColor: 'hsl(220 60% 45%)' },
  lonely:  { hue: '260 40% 40%', speed: '7s',   scale: '0.9',  particleColor: 'hsl(260 40% 40%)' },
  tired:   { hue: '0 0% 35%',    speed: '8s',   scale: '0.85', particleColor: 'hsl(0 0% 35%)' },
  neutral: { hue: '244 63% 52%', speed: '4s',   scale: '1',    particleColor: 'hsl(244 63% 52%)' },
};

interface Particle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

function generateParticles(mood: string): Particle[] {
  const count = mood === 'excited' ? 14 : mood === 'happy' ? 10 : mood === 'sad' ? 5 : 8;
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (360 / count) * i + Math.random() * 30,
    distance: 50 + Math.random() * 45,
    size: 2 + Math.random() * 3,
    duration: 4 + Math.random() * 6,
    delay: Math.random() * 4,
    opacity: 0.2 + Math.random() * 0.5,
  }));
}

export function VoidCore({ isThinking, mood = 'neutral' }: VoidCoreProps) {
  const cfg = MOOD_CONFIG[mood] ?? MOOD_CONFIG.neutral;
  const particles = useMemo(() => generateParticles(mood), [mood]);

  return (
    <div className="relative w-[200px] h-[200px] flex items-center justify-center pointer-events-none select-none">
      {/* Rings with mood color */}
      {[120, 80, 160].map((size, i) => (
        <div
          key={size}
          className="absolute rounded-full void-ring"
          style={{
            width: size,
            height: size,
            animationDelay: `${i * 2}s`,
            borderColor: `hsl(${cfg.hue} / 0.2)`,
          }}
        />
      ))}

      {/* Floating particles */}
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const x = Math.cos(rad) * p.distance;
        const y = Math.sin(rad) * p.distance;
        return (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              background: cfg.particleColor,
              left: '50%',
              top: '50%',
              marginLeft: -p.size / 2,
              marginTop: -p.size / 2,
            }}
            animate={{
              x: [x, x + 8, x - 5, x],
              y: [y, y - 10, y + 6, y],
              opacity: [p.opacity * 0.3, p.opacity, p.opacity * 0.5, p.opacity * 0.3],
              scale: [0.8, 1.2, 0.9, 0.8],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: p.delay,
            }}
          />
        );
      })}

      {/* Mood glow aura */}
      <div
        className="absolute rounded-full blur-[40px] transition-all duration-[2000ms]"
        style={{
          width: 100,
          height: 100,
          background: `radial-gradient(circle, hsl(${cfg.hue} / 0.25) 0%, transparent 70%)`,
          transform: `scale(${cfg.scale})`,
        }}
      />

      {/* Core dot */}
      <div
        className={`void-dot ${isThinking ? 'void-dot-thinking' : ''}`}
        style={{
          background: `hsl(${cfg.hue})`,
          boxShadow: `0 0 20px 4px hsl(${cfg.hue} / 0.4), 0 0 60px 10px hsl(${cfg.hue} / 0.15)`,
          animationDuration: isThinking ? '1.5s' : cfg.speed,
        }}
      />
    </div>
  );
}
