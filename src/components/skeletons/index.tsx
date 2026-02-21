import { motion } from 'framer-motion';

function Pulse({ className }: { className?: string }) {
  return (
    <motion.div
      className={`rounded-lg bg-muted animate-pulse ${className ?? ''}`}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  );
}

export function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="glass-card rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Pulse className="w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Pulse className="h-3 w-24" />
              <Pulse className="h-2 w-16" />
            </div>
          </div>
          <Pulse className="h-4 w-full" />
          <Pulse className="h-4 w-3/4" />
          <div className="flex gap-3 pt-1">
            <Pulse className="h-6 w-16 rounded-full" />
            <Pulse className="h-6 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivitySkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="glass-card rounded-xl p-3 flex items-center gap-3">
          <Pulse className="w-8 h-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Pulse className="h-3 w-3/4" />
            <Pulse className="h-2 w-1/2" />
          </div>
          <Pulse className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

export function QuestSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="glass-card rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Pulse className="w-10 h-10 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <Pulse className="h-3.5 w-32" />
              <Pulse className="h-2.5 w-48" />
            </div>
          </div>
          <Pulse className="h-2 w-full rounded-full" />
          <div className="flex justify-between">
            <Pulse className="h-2.5 w-16" />
            <Pulse className="h-2.5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map(i => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[70%] rounded-2xl p-3 space-y-2 ${i % 2 === 0 ? 'bg-primary/10' : 'glass-bubble'}`}>
            <Pulse className="h-3 w-full" />
            <Pulse className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-4 p-5">
      <Pulse className="h-6 w-32 mb-4" />
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="glass-card rounded-2xl p-4 space-y-3">
          <Pulse className="h-4 w-24" />
          <Pulse className="h-10 w-full rounded-lg" />
          <Pulse className="h-10 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
