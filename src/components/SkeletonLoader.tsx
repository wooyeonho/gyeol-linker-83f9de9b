/**
 * Phase 6: 스켈레톤 로딩 UI
 */
import { motion } from 'framer-motion';

function Bone({ className }: { className?: string }) {
  return (
    <motion.div
      className={`rounded-lg bg-muted/20 ${className}`}
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Bone className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Bone className="h-3 w-2/3" />
          <Bone className="h-2 w-1/2" />
        </div>
      </div>
      <Bone className="h-2 w-full" />
      <Bone className="h-2 w-4/5" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Bone className="w-12 h-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Bone className="h-4 w-1/3" />
          <Bone className="h-2 w-full" />
          <Bone className="h-2 w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[false, true, false].map((isUser, i) => (
        <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[70%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
            <Bone className={`h-3 ${isUser ? 'w-20 ml-auto' : 'w-24'}`} />
            <Bone className={`h-16 ${isUser ? 'w-48' : 'w-56'} rounded-2xl`} />
          </div>
        </div>
      ))}
    </div>
  );
}
