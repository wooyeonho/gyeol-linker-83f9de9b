import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoidCore } from '@/src/components/PearlSpheres';

interface AnimatedCharacterProps {
  mood: string;
  isThinking: boolean;
  reaction?: string | null;
  skinId?: string | null;
  characterPreset?: string | null;
  gen: number;
  size?: 'sm' | 'lg';
}

// === REACTION ANIMATIONS ===
const REACTION_VARIANTS: Record<string, any> = {
  laugh: { y: [0, -8, 0, -6, 0, -4, 0], transition: { duration: 0.6 } },
  nod: { y: [0, 6, 0, 4, 0], transition: { duration: 0.5 } },
  think: { rotate: [0, -5, 5, -3, 0], transition: { duration: 0.8 } },
  sad: { scale: [1, 0.9, 0.92], opacity: [1, 0.7, 0.75], transition: { duration: 0.6 } },
  excited: { scale: [1, 1.2, 1.15, 1.2, 1], transition: { duration: 0.6 } },
  neutral: {},
};

// === MOOD COLORS (16 moods) ===
const MOOD_COLORS: Record<string, { primary: string; secondary: string }> = {
  happy: { primary: '#6EE7B7', secondary: '#34D399' },
  excited: { primary: '#FBBF24', secondary: '#F59E0B' },
  sad: { primary: '#93C5FD', secondary: '#6366F1' },
  lonely: { primary: '#C4B5FD', secondary: '#8B5CF6' },
  tired: { primary: '#9CA3AF', secondary: '#6B7280' },
  neutral: { primary: '#818CF8', secondary: '#6366F1' },
  anxious: { primary: '#FB923C', secondary: '#EA580C' },
  curious: { primary: '#22D3EE', secondary: '#06B6D4' },
  proud: { primary: '#F43F5E', secondary: '#E11D48' },
  grateful: { primary: '#F9A8D4', secondary: '#EC4899' },
  playful: { primary: '#FDE047', secondary: '#EAB308' },
  focused: { primary: '#6366F1', secondary: '#4F46E5' },
  melancholic: { primary: '#A78BFA', secondary: '#7C3AED' },
  hopeful: { primary: '#2DD4BF', secondary: '#14B8A6' },
  surprised: { primary: '#EF4444', secondary: '#DC2626' },
  loving: { primary: '#F472B6', secondary: '#DB2777' },
};

// === JELLY CHARACTER ===
function JellyCharacter({ mood, isThinking, reaction, gen }: { mood: string; isThinking: boolean; reaction?: string | null; gen: number }) {
  const colors = MOOD_COLORS[mood] ?? MOOD_COLORS.neutral;
  
  return (
    <motion.div
      className="relative flex items-center justify-center"
      animate={reaction && reaction !== 'neutral' ? REACTION_VARIANTS[reaction] : (isThinking ? { scale: [0.95, 1.05, 0.95] } : {})}
      transition={isThinking ? { duration: 1, repeat: Infinity } : undefined}
    >
      {/* Body */}
      <motion.div
        className="rounded-[40%_40%_50%_50%] relative"
        style={{
          width: '100%', height: '100%',
          background: `linear-gradient(135deg, ${colors.primary}80, ${colors.secondary}60)`,
          backdropFilter: 'blur(8px)',
        }}
        animate={{ borderRadius: ['40% 40% 50% 50%', '45% 35% 48% 52%', '40% 40% 50% 50%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Glow (gen >= 2) */}
        {gen >= 2 && (
          <div className="absolute inset-0 rounded-[inherit]"
            style={{ boxShadow: `0 0 20px 4px ${colors.primary}40` }} />
        )}
        
        {/* Eyes (gen >= 3) */}
        {gen >= 3 && (
          <div className="absolute top-[35%] left-1/2 -translate-x-1/2 flex gap-[20%]">
            <motion.div className="w-[8%] h-[8%] rounded-full bg-foreground/80"
              animate={{ scaleY: [1, 0.1, 1] }}
              transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 4 }} />
            <motion.div className="w-[8%] h-[8%] rounded-full bg-foreground/80"
              animate={{ scaleY: [1, 0.1, 1] }}
              transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 4 }} />
          </div>
        )}
        
        {/* Blush (gen >= 4) */}
        {gen >= 4 && (
          <>
            <div className="absolute top-[48%] left-[18%] w-[12%] h-[6%] rounded-full bg-accent-pink/30" />
            <div className="absolute top-[48%] right-[18%] w-[12%] h-[6%] rounded-full bg-accent-pink/30" />
          </>
        )}
      </motion.div>
      
      {/* Thinking dots */}
      {isThinking && <ThinkingDots />}
    </motion.div>
  );
}

// === CAT CHARACTER ===
function CatCharacter({ mood, isThinking, reaction, gen }: { mood: string; isThinking: boolean; reaction?: string | null; gen: number }) {
  const isSad = mood === 'sad' || mood === 'lonely';
  
  return (
    <motion.div
      className="relative flex items-center justify-center"
      animate={reaction && reaction !== 'neutral' ? REACTION_VARIANTS[reaction] : (isThinking ? { scale: [0.95, 1.05, 0.95] } : {})}
      transition={isThinking ? { duration: 1, repeat: Infinity } : undefined}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Ears */}
        <motion.polygon
          points="25,40 35,15 45,40"
          fill="#D4B896"
          stroke="#C4A882"
          strokeWidth="1"
          animate={gen >= 4 && isSad ? { points: ['25,40 35,15 45,40', '25,40 33,20 45,40'] } : {}}
          transition={{ duration: 0.5 }}
        />
        <motion.polygon
          points="55,40 65,15 75,40"
          fill="#D4B896"
          stroke="#C4A882"
          strokeWidth="1"
          animate={gen >= 4 && isSad ? { points: ['55,40 65,15 75,40', '55,40 67,20 75,40'] } : {}}
          transition={{ duration: 0.5 }}
        />
        {/* Body */}
        <ellipse cx="50" cy="58" rx="28" ry="30" fill="#E8D5B7" />
        {/* Glow */}
        {gen >= 2 && <ellipse cx="50" cy="58" rx="32" ry="34" fill="none" stroke="#E8D5B730" strokeWidth="4" />}
        {/* Eyes (gen >= 3) */}
        {gen >= 3 && (
          <>
            <motion.ellipse cx="40" cy="52" rx="3" ry="3.5" fill="#4B3621"
              animate={{ ry: [3.5, 0.5, 3.5] }}
              transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 4 }} />
            <motion.ellipse cx="60" cy="52" rx="3" ry="3.5" fill="#4B3621"
              animate={{ ry: [3.5, 0.5, 3.5] }}
              transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 4 }} />
          </>
        )}
        {/* Nose */}
        <polygon points="48,58 52,58 50,60" fill="#C4A882" />
        {/* Tail */}
        <motion.path
          d="M 78,65 Q 90,55 85,40"
          fill="none" stroke="#D4B896" strokeWidth="3" strokeLinecap="round"
          animate={{ d: ['M 78,65 Q 90,55 85,40', 'M 78,65 Q 95,60 90,45', 'M 78,65 Q 90,55 85,40'] }}
          transition={{ duration: gen >= 4 && mood === 'happy' ? 1.5 : 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
      {isThinking && <ThinkingDots />}
    </motion.div>
  );
}

// === FLAME CHARACTER ===
function FlameCharacter({ mood, isThinking, reaction, gen }: { mood: string; isThinking: boolean; reaction?: string | null; gen: number }) {
  const isSad = mood === 'sad' || mood === 'lonely';
  const grad = isSad ? ['#60A5FA', '#3B82F6'] : ['#FB923C', '#EF4444'];
  
  return (
    <motion.div
      className="relative flex items-center justify-center"
      animate={reaction && reaction !== 'neutral' ? REACTION_VARIANTS[reaction] : (isThinking ? { scale: [0.95, 1.05, 0.95] } : {})}
      transition={isThinking ? { duration: 1, repeat: Infinity } : undefined}
    >
      <svg viewBox="0 0 100 120" className="w-full h-full">
        <defs>
          <linearGradient id="flameGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={grad[1]} />
            <stop offset="100%" stopColor={grad[0]} />
          </linearGradient>
        </defs>
        <motion.path
          d="M 50,10 Q 70,30 65,55 Q 75,40 70,65 Q 80,55 72,80 Q 65,100 50,105 Q 35,100 28,80 Q 20,55 30,65 Q 25,40 35,55 Q 30,30 50,10"
          fill="url(#flameGrad)"
          animate={{
            d: [
              'M 50,10 Q 70,30 65,55 Q 75,40 70,65 Q 80,55 72,80 Q 65,100 50,105 Q 35,100 28,80 Q 20,55 30,65 Q 25,40 35,55 Q 30,30 50,10',
              'M 50,8 Q 72,28 67,52 Q 77,38 72,62 Q 82,52 74,78 Q 67,98 50,103 Q 33,98 26,78 Q 18,52 28,62 Q 23,38 33,52 Q 28,28 50,8',
              'M 50,10 Q 70,30 65,55 Q 75,40 70,65 Q 80,55 72,80 Q 65,100 50,105 Q 35,100 28,80 Q 20,55 30,65 Q 25,40 35,55 Q 30,30 50,10',
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Glow */}
        {gen >= 2 && (
          <ellipse cx="50" cy="65" rx="30" ry="35" fill="none" stroke={`${grad[0]}30`} strokeWidth="6" />
        )}
        {/* Eyes (gen >= 3) */}
        {gen >= 3 && (
          <>
            <ellipse cx="42" cy="60" rx="3" ry="2.5" fill="white" opacity="0.9" />
            <ellipse cx="58" cy="60" rx="3" ry="2.5" fill="white" opacity="0.9" />
          </>
        )}
        {/* Sparks (gen >= 5) */}
        {gen >= 5 && (
          <>
            {[...Array(5)].map((_, i) => (
              <motion.circle key={i} cx={30 + i * 10} cy={20 + i * 5} r={1.5}
                fill={grad[0]}
                animate={{ y: [0, -15, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} />
            ))}
          </>
        )}
      </svg>
      {isThinking && <ThinkingDots />}
    </motion.div>
  );
}

// === CLOUD CHARACTER ===
function CloudCharacter({ mood, isThinking, reaction, gen }: { mood: string; isThinking: boolean; reaction?: string | null; gen: number }) {
  const isHappy = mood === 'happy' || mood === 'excited';
  
  return (
    <motion.div
      className="relative flex items-center justify-center"
      animate={
        reaction && reaction !== 'neutral'
          ? REACTION_VARIANTS[reaction]
          : isThinking
            ? { scale: [0.95, 1.05, 0.95] }
            : { y: [-5, 5, -5] }
      }
      transition={isThinking ? { duration: 1, repeat: Infinity } : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 120 80" className="w-full h-full">
        <defs>
          <linearGradient id="cloudGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" />
            <stop offset="100%" stopColor="#E5E7EB" />
          </linearGradient>
          {gen >= 4 && isHappy && (
            <linearGradient id="rainbowGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#EF444420" />
              <stop offset="25%" stopColor="#F59E0B20" />
              <stop offset="50%" stopColor="#10B98120" />
              <stop offset="75%" stopColor="#3B82F620" />
              <stop offset="100%" stopColor="#8B5CF620" />
            </linearGradient>
          )}
        </defs>
        {/* Cloud body */}
        <ellipse cx="60" cy="45" rx="40" ry="25" fill="url(#cloudGrad)" />
        <ellipse cx="40" cy="42" rx="22" ry="20" fill="url(#cloudGrad)" />
        <ellipse cx="80" cy="42" rx="22" ry="20" fill="url(#cloudGrad)" />
        <ellipse cx="55" cy="32" rx="20" ry="16" fill="url(#cloudGrad)" />
        
        {/* Glow */}
        {gen >= 2 && <ellipse cx="60" cy="45" rx="45" ry="30" fill="none" stroke="white" strokeWidth="2" opacity="0.15" />}
        
        {/* Rainbow reflection (gen >= 4, happy) */}
        {gen >= 4 && isHappy && (
          <ellipse cx="60" cy="45" rx="38" ry="23" fill="url(#rainbowGrad)" />
        )}
        
        {/* Eyes (gen >= 3) — sleepy dashes */}
        {gen >= 3 && (
          <>
            <line x1="48" y1="44" x2="55" y2="44" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
            <line x1="65" y1="44" x2="72" y2="44" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </svg>
      {isThinking && <ThinkingDots />}
    </motion.div>
  );
}

// === THINKING DOTS ===
function ThinkingDots() {
  return (
    <div className="absolute -bottom-4 flex gap-1">
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-foreground/40"
          animate={{ opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
      ))}
    </div>
  );
}

// === MAIN COMPONENT ===
export function AnimatedCharacter(props: AnimatedCharacterProps) {
  const { mood, isThinking, reaction, skinId, characterPreset, gen, size = 'sm' } = props;

  // characterPreset이 null이면 아무것도 렌더하지 않음 (문자전용 모드)
  if (characterPreset === null || characterPreset === undefined) return null;

  // 'void' = 기존 VoidCore 그대로
  if (characterPreset === 'void' && !skinId) {
    return <VoidCore isThinking={isThinking} mood={mood} />;
  }

  const sizeClass = size === 'lg' ? 'w-32 h-32' : 'w-20 h-20';

  return (
    <div className={`relative flex items-center justify-center ${sizeClass}`}>
      {characterPreset === 'jelly' && <JellyCharacter mood={mood} isThinking={isThinking} reaction={reaction} gen={gen} />}
      {characterPreset === 'cat' && <CatCharacter mood={mood} isThinking={isThinking} reaction={reaction} gen={gen} />}
      {characterPreset === 'flame' && <FlameCharacter mood={mood} isThinking={isThinking} reaction={reaction} gen={gen} />}
      {characterPreset === 'cloud' && <CloudCharacter mood={mood} isThinking={isThinking} reaction={reaction} gen={gen} />}
    </div>
  );
}
