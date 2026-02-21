/**
 * 메시지 답장/스레드 UI 컴포넌트
 */
import { motion } from 'framer-motion';
import type { Message } from '@/lib/gyeol/types';

interface ReplyPreviewProps {
  replyTo: Message;
  onClear: () => void;
}

export function ReplyPreview({ replyTo, onClear }: ReplyPreviewProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
      className="mx-4 mb-1 px-3 py-2 rounded-xl glass-card border-l-2 border-primary/40 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-[9px] text-primary/60 font-medium">
          {replyTo.role === 'user' ? '↩ 내 메시지에 답장' : '↩ AI 메시지에 답장'}
        </p>
        <p className="text-[10px] text-foreground/50 truncate">{replyTo.content.slice(0, 60)}</p>
      </div>
      <button onClick={onClear} className="text-muted-foreground hover:text-foreground transition shrink-0">
        <span aria-hidden="true" className="material-icons-round text-sm">close</span>
      </button>
    </motion.div>
  );
}

interface ReplyBubbleProps {
  originalMessage: Message | undefined;
  agentName: string;
  onClick?: () => void;
}

export function ReplyBubble({ originalMessage, agentName, onClick }: ReplyBubbleProps) {
  if (!originalMessage) return null;
  return (
    <button onClick={onClick}
      className="w-full text-left mb-1 px-2 py-1 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition">
      <p className="text-[8px] text-primary/50 font-medium">
        {originalMessage.role === 'user' ? 'You' : agentName}
      </p>
      <p className="text-[9px] text-foreground/40 truncate">{originalMessage.content.slice(0, 50)}</p>
    </button>
  );
}
