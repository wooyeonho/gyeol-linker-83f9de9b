interface VoidCoreProps {
  isThinking?: boolean;
  mood?: string;
}

const MOOD_CONFIG: Record<string, { hue: string; speed: string; scale: string }> = {
  happy:   { hue: '142 63% 52%', speed: '3s',   scale: '1.2'  },
  excited: { hue: '38 92% 55%',  speed: '2s',   scale: '1.3'  },
  sad:     { hue: '220 60% 45%', speed: '6s',   scale: '0.95' },
  lonely:  { hue: '260 40% 40%', speed: '7s',   scale: '0.9'  },
  tired:   { hue: '0 0% 35%',    speed: '8s',   scale: '0.85' },
  neutral: { hue: '244 63% 52%', speed: '4s',   scale: '1'    },
};

export function VoidCore({ isThinking, mood = 'neutral' }: VoidCoreProps) {
  const cfg = MOOD_CONFIG[mood] ?? MOOD_CONFIG.neutral;

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
