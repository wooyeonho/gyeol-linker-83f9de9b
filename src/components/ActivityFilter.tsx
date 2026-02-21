/**
 * 활동 Feed 필터 & Search — 카테고리별 필터와 텍스트 Search
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ACTIVITY_CATEGORIES = [
  { key: 'all', label: '전체', icon: 'apps' },
  { key: 'learning', label: '학습', icon: 'school' },
  { key: 'reflection', label: '반성', icon: 'psychology' },
  { key: 'social', label: '소셜', icon: 'group' },
  { key: 'proactive', label: '선행', icon: 'campaign' },
  { key: 'skill', label: '스킬', icon: 'extension' },
  { key: 'error', label: '오류', icon: 'error_outline' },
];

interface Props {
  onFilterChange: (category: string) => void;
  onSearchChange: (query: string) => void;
  activeFilter: string;
  searchQuery: string;
}

export function ActivityFilter({ onFilterChange, onSearchChange, activeFilter, searchQuery }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition"
          aria-label="활동 Search"
        >
          <span aria-hidden="true" className="material-icons-round text-sm">search</span>
        </button>
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '100%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex-1 overflow-hidden"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="활동 Search..."
                autoFocus
                className="w-full px-3 py-1.5 rounded-lg glass-card text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Category filters */}
      <div className="flex gap-1.5 overflow-x-auto gyeol-scrollbar-hide pb-1">
        {ACTIVITY_CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => onFilterChange(cat.key)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${
              activeFilter === cat.key
                ? 'bg-primary/20 text-primary'
                : 'glass-card text-muted-foreground hover:text-foreground'
            }`}
          >
            <span aria-hidden="true" className="material-icons-round text-[12px]">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
