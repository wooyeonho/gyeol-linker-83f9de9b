interface VoidCoreProps {
  isThinking?: boolean;
}

export function VoidCore({ isThinking }: VoidCoreProps) {
  return (
    <div className="relative w-[200px] h-[200px] flex items-center justify-center pointer-events-none select-none">
      <div className="absolute w-[120px] h-[120px] void-ring" style={{ animationDelay: '0s' }} />
      <div className="absolute w-[80px] h-[80px] void-ring" style={{ animationDelay: '2s' }} />
      <div className="absolute w-[160px] h-[160px] void-ring" style={{ animationDelay: '4s' }} />
      <div className={`void-dot ${isThinking ? 'void-dot-thinking' : ''}`} />
    </div>
  );
}
