import type { PersonalityParams } from '@/lib/gyeol/types';

interface PearlSpheresProps {
  personality?: PersonalityParams;
  isThinking?: boolean;
}

export function PearlSpheres({ isThinking }: PearlSpheresProps) {
  return (
    <div className="relative w-[300px] h-[300px] flex items-center justify-center pointer-events-none select-none">
      <div
        className={`absolute w-40 h-40 rounded-full pearl-sphere sphere-1 z-20 backdrop-blur-md ${isThinking ? 'animate-pulse' : ''}`}
      />
      <div className="absolute w-28 h-28 rounded-full pearl-sphere sphere-2 -translate-x-16 translate-y-8 z-10 opacity-90 backdrop-blur-sm" />
      <div className="absolute w-24 h-24 rounded-full pearl-sphere sphere-3 translate-x-14 -translate-y-10 z-10 opacity-80 backdrop-blur-sm" />
      <div className="absolute w-16 h-16 rounded-full pearl-sphere sphere-2 translate-x-10 translate-y-12 z-0 opacity-60 blur-[1px]" />
      <div className="absolute w-12 h-12 rounded-full pearl-sphere sphere-1 -translate-x-8 -translate-y-16 z-0 opacity-50 blur-[2px]" />
    </div>
  );
}
