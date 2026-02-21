import { motion } from 'framer-motion';

interface Props {
  agentName: string;
  visible: boolean;
}

export function TypingIndicator({ agentName, visible }: Props) {
  if (!visible) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex items-center gap-2 px-4 py-1">
      <span className="text-[10px] text-primary/60">{agentName} is typing</span>
      <div className="flex gap-0.5">
        <div className="w-1 h-1 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1 h-1 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1 h-1 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </motion.div>
  );
}
