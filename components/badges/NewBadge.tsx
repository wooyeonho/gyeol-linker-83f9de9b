'use client';

import { Sparkles } from 'lucide-react';

export function NewBadge() {
  return (
    <div className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00A86B]/10 border border-[#00A86B]/30 backdrop-blur-sm">
      {/* Animated glow */}
      <div className="absolute inset-0 rounded-full bg-[#00A86B]/20 blur-md animate-pulse" />
      
      {/* Content */}
      <Sparkles className="relative z-10 size-3.5 text-[#00A86B]" />
      <span className="relative z-10 text-xs font-semibold text-[#00A86B] tracking-tight">
        New
      </span>
    </div>
  );
}

export default NewBadge;
