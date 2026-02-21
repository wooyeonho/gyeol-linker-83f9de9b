/**
 * 커뮤니티 투표 컴포넌트
 */
import { useState } from 'react';
import { motion } from 'framer-motion';

interface VoteOption {
  label: string;
  votes: number;
}

interface Props {
  postId: string;
  question: string;
  options: VoteOption[];
  onVote?: (postId: string, optionIndex: number) => void;
  votedIndex?: number | null;
}

export function CommunityVote({ postId, question, options, onVote, votedIndex }: Props) {
  const [selected, setSelected] = useState<number | null>(votedIndex ?? null);
  const totalVotes = options.reduce((sum, o) => sum + o.votes + (selected !== null ? 0 : 0), 0) || 1;
  const hasVoted = selected !== null;

  const handleVote = (idx: number) => {
    if (hasVoted) return;
    setSelected(idx);
    onVote?.(postId, idx);
  };

  return (
    <div className="glass-card rounded-xl p-3 space-y-2">
      <p className="text-[11px] font-bold text-foreground">{question}</p>
      {options.map((opt, i) => {
        const pct = hasVoted ? Math.round(((opt.votes + (selected === i ? 1 : 0)) / (totalVotes + (hasVoted ? 1 : 0))) * 100) : 0;
        const isSelected = selected === i;
        return (
          <motion.button
            key={i}
            onClick={() => handleVote(i)}
            disabled={hasVoted}
            className={`w-full text-left rounded-lg px-3 py-2 transition relative overflow-hidden ${
              hasVoted
                ? isSelected ? 'border border-primary/30' : 'border border-border/10'
                : 'glass-card hover:bg-primary/5 cursor-pointer'
            }`}
          >
            {hasVoted && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5 }}
                className={`absolute inset-y-0 left-0 rounded-lg ${isSelected ? 'bg-primary/15' : 'bg-muted/10'}`}
              />
            )}
            <div className="relative flex items-center justify-between">
              <span className={`text-[11px] ${isSelected ? 'font-bold text-primary' : 'text-foreground'}`}>
                {opt.label}
              </span>
              {hasVoted && (
                <span className={`text-[10px] font-bold ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                  {pct}%
                </span>
              )}
            </div>
          </motion.button>
        );
      })}
      {hasVoted && (
        <p className="text-[9px] text-muted-foreground text-right">
          총 {totalVotes + 1}명 투표
        </p>
      )}
    </div>
  );
}
