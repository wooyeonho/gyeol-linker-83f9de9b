/**
 * 메시지 리액션 컴포넌트
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const REACTIONS = ['👍', '❤️', '😂', '😢', '🤔', '🔥'];

interface Props {
  messageId: string;
  onReact?: (messageId: string, emoji: string) => void;
  currentReaction?: string;
}

export function MessageReactions({ messageId, onReact, currentReaction }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [selected, setSelected] = useState<string | null>(currentReaction ?? null);

  const handleReact = (emoji: string) => {
    const newVal = selected === emoji ? null : emoji;
    setSelected(newVal);
    setShowPicker(false);
    if (newVal) onReact?.(messageId, newVal);
  };

  return (
    <div className="relative inline-flex items-center">
      {selected && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => handleReact(selected)}
          className="text-sm hover:scale-125 transition-transform"
        >
          {selected}
        </motion.button>
      )}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 transition ml-1"
      >
        {selected ? '' : '😀'}
      </button>

      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-full left-0 mb-1 flex gap-1 p-1.5 rounded-xl glass-card shadow-xl z-50"
          >
            {REACTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted/30 transition text-sm ${
                  selected === emoji ? 'bg-primary/20' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
