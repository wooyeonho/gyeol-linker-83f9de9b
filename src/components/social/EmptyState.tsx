import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
}

export function SocialEmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 gap-4"
    >
      {/* Animated glow orb */}
      <div className="relative w-20 h-20 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-primary/5 blur-xl animate-pulse" />
        <span aria-hidden="true" className="material-icons-round text-[36px] text-primary/30">{icon}</span>
      </div>

      <div className="text-center space-y-1.5">
        <p className="text-sm font-medium text-foreground/60">{title}</p>
        <p className="text-[11px] text-muted-foreground/50 max-w-[200px] leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  );
}
