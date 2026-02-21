/**
 * 커뮤니티 투표 컴포넌트 — 결과 반영 포함
 */
import { useState, useEffect } from 'react';
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
  showResults?: boolean;
  totalParticipants?: number;
  deadline?: string; // ISO date
}

export function CommunityVote({ postId, question, options, onVote, votedIndex, showResults, totalParticipants, deadline }: Props) {
  const [selected, setSelected] = useState<number | null>(votedIndex ?? null);
  const hasVoted = selected !== null || showResults;
  const adjustedOptions = options.map((o, i) => ({
    ...o,
    votes: o.votes + (selected === i ? 1 : 0),
  }));
  const totalVotes = adjustedOptions.reduce((sum, o) => sum + o.votes, 0) || 1;

  // Deadline countdown
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (!deadline) return;
    const update = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m left`);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [deadline]);

  const handleVote = (idx: number) => {
    if (hasVoted) return;
    setSelected(idx);
    onVote?.(postId, idx);
  };

  // Determine winner
  const maxVotes = Math.max(...adjustedOptions.map(o => o.votes));
  const winnerIdx = hasVoted ? adjustedOptions.findIndex(o => o.votes === maxVotes) : -1;

  return (
    <div className="glass-card rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-foreground">{question}</p>
        {deadline && (
          <span className={`text-[9px] px-2 py-0.5 rounded-full ${timeLeft === 'Ended' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
            {timeLeft}
          </span>
        )}
      </div>
      {adjustedOptions.map((opt, i) => {
        const pct = hasVoted ? Math.round((opt.votes / totalVotes) * 100) : 0;
        const isSelected = selected === i;
        const isWinner = hasVoted && i === winnerIdx && timeLeft === 'Ended';
        return (
          <motion.button
            key={i}
            onClick={() => handleVote(i)}
            disabled={!!hasVoted}
            className={`w-full text-left rounded-lg px-3 py-2 transition relative overflow-hidden ${
              hasVoted
                ? isSelected ? 'border border-primary/30' : isWinner ? 'border border-emerald-400/30' : 'border border-border/10'
                : 'glass-card hover:bg-primary/5 cursor-pointer'
            }`}
          >
            {hasVoted && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5 }}
                className={`absolute inset-y-0 left-0 rounded-lg ${isWinner ? 'bg-emerald-400/15' : isSelected ? 'bg-primary/15' : 'bg-muted/10'}`}
              />
            )}
            <div className="relative flex items-center justify-between">
              <span className={`text-[11px] ${isSelected ? 'font-bold text-primary' : isWinner ? 'font-bold text-emerald-400' : 'text-foreground'}`}>
                {isWinner && '🏆 '}{opt.label}
              </span>
              {hasVoted && (
                <span className={`text-[10px] font-bold ${isSelected ? 'text-primary' : isWinner ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                  {pct}% ({opt.votes})
                </span>
              )}
            </div>
          </motion.button>
        );
      })}
      <div className="flex items-center justify-between">
        {hasVoted && (
          <p className="text-[9px] text-muted-foreground">
            총 {totalParticipants ?? totalVotes}명 참여
          </p>
        )}
        {hasVoted && winnerIdx >= 0 && timeLeft === 'Ended' && (
          <p className="text-[9px] text-emerald-400 font-medium">
            ✅ Result: {adjustedOptions[winnerIdx].label}
          </p>
        )}
      </div>
    </div>
  );
}
