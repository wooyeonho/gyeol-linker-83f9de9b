import { motion } from 'framer-motion';

interface Props {
  sent: boolean;
  read: boolean;
  timestamp?: string;
}

export function ReadReceipt({ sent, read, timestamp }: Props) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[8px] text-muted-foreground/50" title={timestamp}>
      {read ? (
        <motion.span initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-primary/60">✓✓</motion.span>
      ) : sent ? (
        <span>✓</span>
      ) : null}
    </span>
  );
}
