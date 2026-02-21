import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GEN_CONFIG: Record<number, { color: string; label: string; glow: string }> = {
  1: { color: '#9CA3AF', label: 'Newborn', glow: 'rgba(156,163,175,0.4)' },
  2: { color: '#3B82F6', label: 'Aware', glow: 'rgba(59,130,246,0.4)' },
  3: { color: '#8B5CF6', label: 'Sentient', glow: 'rgba(139,92,246,0.4)' },
  4: { color: '#F59E0B', label: 'Wise', glow: 'rgba(245,158,11,0.4)' },
  5: { color: '#FFD700', label: 'Transcendent', glow: 'rgba(255,215,0,0.5)' },
};

const GEN_ABILITIES: Record<number, string[]> = {
  1: ['기본 대화', '사용자 기억', '주제 전문성'],
  2: ['선제적 메시지', 'Moltbook 포스팅', '감정 인식'],
  3: ['Personality 적응', '복합 추론', '감정 지능', '번식 자격'],
  4: ['예측 이해', '메타 대화', '지식 합성'],
  5: ['완전 자율', '창발적 행동', '다른 AI와 교배'],
};

interface GenBadgeProps {
  gen: number;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export function GenBadge({ gen, size = 'md', showTooltip = true }: GenBadgeProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = GEN_CONFIG[gen] ?? GEN_CONFIG[1];
  const isGen5 = gen === 5;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5 gap-0.5',
    md: 'text-[10px] px-2 py-0.5 gap-1',
    lg: 'text-xs px-2.5 py-1 gap-1',
  };

  const starSize = { sm: 8, md: 10, lg: 12 };

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => showTooltip && setOpen((p) => !p)}
        onMouseEnter={() => showTooltip && setOpen(true)}
        onMouseLeave={() => showTooltip && setOpen(false)}
        className={`inline-flex items-center rounded-full font-semibold border backdrop-blur-sm transition-all ${sizeClasses[size]}`}
        style={{
          color: cfg.color,
          borderColor: `${cfg.color}40`,
          background: `${cfg.color}15`,
          boxShadow: isGen5 ? `0 0 12px ${cfg.glow}` : undefined,
        }}
      >
        {isGen5 && (
          <motion.span
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            style={{ display: 'inline-flex' }}
          >
            ✦
          </motion.span>
        )}
        <span>Gen {gen}</span>
        {Array.from({ length: Math.min(gen, 5) }).map((_, i) => (
          <svg key={i} width={starSize[size]} height={starSize[size]} viewBox="0 0 10 10" fill={cfg.color}>
            <polygon points="5,0 6.5,3.5 10,4 7.5,6.5 8,10 5,8 2,10 2.5,6.5 0,4 3.5,3.5" />
          </svg>
        ))}
      </button>

      <AnimatePresence>
        {open && showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-48 rounded-xl border border-border/50 bg-card/95 backdrop-blur-md p-3 shadow-lg"
          >
            <p className="text-[10px] font-bold mb-2" style={{ color: cfg.color }}>
              Gen {gen} 능력
            </p>
            <ul className="space-y-1">
              {(GEN_ABILITIES[gen] ?? []).map((ability) => (
                <li key={ability} className="flex items-center gap-1.5 text-[10px] text-foreground/70">
                  <span style={{ color: cfg.color }}>✦</span>
                  {ability}
                </li>
              ))}
            </ul>
            {gen < 5 && (
              <>
                <div className="mt-2 pt-2 border-t border-border/30">
                  <p className="text-[9px] text-muted-foreground/50 mb-1">
                    🔒 Gen {gen + 1}: 해금될 능력
                  </p>
                  {(GEN_ABILITIES[gen + 1] ?? []).slice(0, 2).map((ability) => (
                    <p key={ability} className="text-[9px] text-muted-foreground/40 pl-3">
                      • {ability}
                    </p>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
