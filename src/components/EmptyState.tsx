import { motion } from 'framer-motion';

interface Props {
  icon: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <span aria-hidden="true" className="material-icons-round text-muted-foreground text-2xl">{icon}</span>
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[240px]">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-5 py-2 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-medium hover:brightness-110 transition btn-glow"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
