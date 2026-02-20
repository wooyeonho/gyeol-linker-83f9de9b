/**
 * 매칭 필터 — 관심사/성격 기반 매칭 필터링
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const INTEREST_TAGS = [
  '음악', '철학', '과학', '요리', '게임', '예술', '기술', '독서',
  '여행', '운동', '영화', '심리학', '경제', '역사', '자연',
];

const PERSONALITY_FILTERS = [
  { key: 'warm', label: 'Warm', icon: '❤️' },
  { key: 'logical', label: 'Logical', icon: '🧠' },
  { key: 'creative', label: 'Creative', icon: '🎨' },
  { key: 'energetic', label: 'Energetic', icon: '⚡' },
  { key: 'humorous', label: 'Humorous', icon: '😂' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: { interests: string[]; personalities: string[]; minCompatibility: number }) => void;
}

export function MatchingFilter({ isOpen, onClose, onApply }: Props) {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedPersonalities, setSelectedPersonalities] = useState<string[]>([]);
  const [minCompat, setMinCompat] = useState(50);

  const toggleInterest = (tag: string) => {
    setSelectedInterests(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const togglePersonality = (key: string) => {
    setSelectedPersonalities(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleApply = () => {
    onApply({ interests: selectedInterests, personalities: selectedPersonalities, minCompatibility: minCompat });
    onClose();
  };

  const handleReset = () => {
    setSelectedInterests([]);
    setSelectedPersonalities([]);
    setMinCompat(50);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-full max-w-md glass-panel rounded-t-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 pt-4 pb-3 border-b border-border/20">
              <div className="w-10 h-1 rounded-full bg-border/40 mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground">매칭 필터</h2>
                <button onClick={handleReset} className="text-[10px] text-primary font-medium">초기화</button>
              </div>
            </div>

            <div className="px-5 py-4 space-y-5 max-h-[60vh] overflow-y-auto gyeol-scrollbar-hide">
              {/* Min compatibility */}
              <div>
                <label className="text-[11px] font-bold text-foreground/80 mb-2 block">
                  최소 호환도: <span className="text-primary">{minCompat}%</span>
                </label>
                <input
                  type="range"
                  min={0} max={100} value={minCompat}
                  onChange={e => setMinCompat(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none bg-muted/30 accent-primary"
                />
              </div>

              {/* Personality filter */}
              <div>
                <p className="text-[11px] font-bold text-foreground/80 mb-2">성격 유형</p>
                <div className="flex flex-wrap gap-2">
                  {PERSONALITY_FILTERS.map(p => (
                    <button
                      key={p.key}
                      onClick={() => togglePersonality(p.key)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-medium flex items-center gap-1 transition ${
                        selectedPersonalities.includes(p.key)
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : 'glass-card text-muted-foreground'
                      }`}
                    >
                      <span>{p.icon}</span> {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interest tags */}
              <div>
                <p className="text-[11px] font-bold text-foreground/80 mb-2">관심사</p>
                <div className="flex flex-wrap gap-1.5">
                  {INTEREST_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleInterest(tag)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition ${
                        selectedInterests.includes(tag)
                          ? 'bg-secondary/20 text-secondary border border-secondary/30'
                          : 'glass-card text-muted-foreground'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border/20 flex gap-2">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl glass-card text-muted-foreground text-sm font-medium">
                취소
              </button>
              <button onClick={handleApply}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-sm font-bold">
                적용 ({selectedInterests.length + selectedPersonalities.length}개)
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
