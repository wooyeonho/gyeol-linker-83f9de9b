import { motion } from 'framer-motion';
import { Coins } from 'lucide-react';

interface Props {
  tokensUsed?: number | null;
  dailyTotal?: number;
  maxTokens?: number;
}

export function TokenUsageDisplay({ tokensUsed, dailyTotal, maxTokens = 4096 }: Props) {
  if (!tokensUsed) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-flex items-center gap-1 text-[9px] text-muted-foreground/50 mt-0.5"
    >
      <Coins className="w-2.5 h-2.5" />
      <span>{tokensUsed.toLocaleString()} tokens</span>
      {dailyTotal != null && (
        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted/10 text-[8px]">
          today: {dailyTotal.toLocaleString()}
        </span>
      )}
    </motion.div>
  );
}

export function TokenLimitSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] text-foreground/80 font-medium">Max Tokens</label>
        <span className="text-[10px] text-primary font-mono">{value}</span>
      </div>
      <input
        type="range"
        min={256}
        max={4096}
        step={256}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full bg-muted/20 accent-primary appearance-none cursor-pointer"
      />
      <div className="flex justify-between text-[8px] text-muted-foreground/40">
        <span>256</span>
        <span>4096</span>
      </div>
    </div>
  );
}
