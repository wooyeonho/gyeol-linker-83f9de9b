import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Calendar, Tag, Search, X } from 'lucide-react';

interface FilterState {
  dateFrom?: string;
  dateTo?: string;
  tags: string[];
  keyword: string;
}

interface Props {
  onFilter: (filters: FilterState) => void;
  availableTags?: string[];
}

export function ConversationFilter({ onFilter, availableTags = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ tags: [], keyword: '' });

  const apply = (updated: FilterState) => {
    setFilters(updated);
    onFilter(updated);
  };

  const clear = () => {
    const empty: FilterState = { tags: [], keyword: '' };
    setFilters(empty);
    onFilter(empty);
  };

  const hasFilters = filters.keyword || filters.tags.length > 0 || filters.dateFrom || filters.dateTo;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] transition ${
          hasFilters ? 'bg-primary/10 text-primary' : 'glass-card text-muted-foreground hover:text-foreground'
        }`}
      >
        <Filter className="w-3 h-3" />
        <span>Filter</span>
        {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full mt-1 right-0 z-50 w-64 glass-card rounded-xl p-3 shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-foreground">Filters</span>
              {hasFilters && (
                <button onClick={clear} className="text-[8px] text-destructive/60 hover:text-destructive">Clear all</button>
              )}
            </div>

            <div>
              <label className="text-[9px] text-muted-foreground font-medium flex items-center gap-1 mb-1">
                <Search className="w-2.5 h-2.5" /> Keyword
              </label>
              <input
                type="text"
                value={filters.keyword}
                onChange={e => apply({ ...filters, keyword: e.target.value })}
                placeholder="Search messages..."
                className="w-full bg-muted/10 border border-border/20 rounded-lg px-2 py-1.5 text-[10px] text-foreground outline-none"
              />
            </div>

            <div>
              <label className="text-[9px] text-muted-foreground font-medium flex items-center gap-1 mb-1">
                <Calendar className="w-2.5 h-2.5" /> Date Range
              </label>
              <div className="flex gap-1">
                <input type="date" value={filters.dateFrom ?? ''}
                  onChange={e => apply({ ...filters, dateFrom: e.target.value || undefined })}
                  className="flex-1 bg-muted/10 border border-border/20 rounded-lg px-2 py-1 text-[9px] text-foreground outline-none" />
                <span className="text-muted-foreground/40 text-[9px] self-center">~</span>
                <input type="date" value={filters.dateTo ?? ''}
                  onChange={e => apply({ ...filters, dateTo: e.target.value || undefined })}
                  className="flex-1 bg-muted/10 border border-border/20 rounded-lg px-2 py-1 text-[9px] text-foreground outline-none" />
              </div>
            </div>

            {availableTags.length > 0 && (
              <div>
                <label className="text-[9px] text-muted-foreground font-medium flex items-center gap-1 mb-1">
                  <Tag className="w-2.5 h-2.5" /> Tags
                </label>
                <div className="flex flex-wrap gap-1">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => {
                        const tags = filters.tags.includes(tag)
                          ? filters.tags.filter(t => t !== tag)
                          : [...filters.tags, tag];
                        apply({ ...filters, tags });
                      }}
                      className={`text-[8px] px-2 py-0.5 rounded-full transition ${
                        filters.tags.includes(tag)
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted/10 text-muted-foreground hover:bg-muted/20'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => setOpen(false)}
              className="w-full py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition">
              Done
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
