/**
 * 대화 공유 링크 생성 컴포넌트
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Message } from '@/lib/gyeol/types';

interface ConversationShareProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  agentName: string;
}

export function ConversationShare({ isOpen, onClose, messages, agentName }: ConversationShareProps) {
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<'text' | 'markdown'>('text');

  const generateShareText = () => {
    const header = `🤖 ${agentName}과의 대화 (${messages.length}개 메시지)\n${'─'.repeat(30)}\n\n`;
    const body = messages.slice(-20).map(m => {
      const sender = m.role === 'user' ? '👤 You' : `🤖 ${agentName}`;
      const time = new Date(m.created_at).toLocaleTimeString('ko', { hour: '2-digit', minute: '2-digit' });
      if (format === 'markdown') {
        return `**${sender}** _(${time})_\n${m.content}\n`;
      }
      return `[${time}] ${sender}\n${m.content}\n`;
    }).join('\n');
    return header + body;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateShareText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${agentName}과의 대화`,
          text: generateShareText(),
        });
      } catch {}
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
          onClick={e => e.stopPropagation()}
          className="glass-card rounded-2xl p-5 w-full max-w-[340px] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="material-icons-round text-primary text-base">share</span>
              대화 공유
            </h3>
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary/20">
              <span className="material-icons-round text-muted-foreground text-sm">close</span>
            </button>
          </div>

          <div className="flex gap-2">
            {(['text', 'markdown'] as const).map(f => (
              <button key={f} onClick={() => setFormat(f)}
                className={`flex-1 py-2 rounded-lg text-[11px] font-medium transition border ${
                  format === f ? 'bg-primary/15 text-primary border-primary/30' : 'border-border/20 text-muted-foreground'
                }`}>
                {f === 'text' ? '📝 텍스트' : '📋 마크다운'}
              </button>
            ))}
          </div>

          <div className="glass-card rounded-xl p-3 max-h-40 overflow-y-auto">
            <pre className="text-[9px] text-foreground/60 whitespace-pre-wrap font-mono leading-relaxed">
              {generateShareText().slice(0, 500)}
              {generateShareText().length > 500 && '...'}
            </pre>
          </div>

          <p className="text-[9px] text-muted-foreground text-center">최근 20개 메시지가 포함됩니다</p>

          <div className="flex gap-2">
            <button onClick={handleCopy}
              className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition flex items-center justify-center gap-1">
              <span className="material-icons-round text-sm">{copied ? 'check' : 'content_copy'}</span>
              {copied ? '복사됨!' : '복사'}
            </button>
            {typeof navigator.share === 'function' && (
              <button onClick={handleWebShare}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-secondary/10 text-secondary-foreground border border-secondary/20 hover:bg-secondary/15 transition flex items-center justify-center gap-1">
                <span className="material-icons-round text-sm">ios_share</span>
                공유
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
