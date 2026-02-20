/**
 * 대화 내보내기 모달 — 텍스트/JSON 형식으로 대화 기록 다운로드
 */
import { motion, AnimatePresence } from 'framer-motion';
import type { Message } from '@/lib/gyeol/types';

interface ConversationExportProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  agentName: string;
}

export function ConversationExport({ isOpen, onClose, messages, agentName }: ConversationExportProps) {
  const exportAsText = () => {
    const lines = messages.map(m => {
      const time = new Date(m.created_at).toLocaleString();
      const sender = m.role === 'user' ? 'You' : agentName;
      return `[${time}] ${sender}: ${m.content}`;
    });
    const text = `=== GYEOL 대화 기록 ===\n에이전트: ${agentName}\n날짜: ${new Date().toLocaleDateString()}\n메시지 수: ${messages.length}\n${'='.repeat(40)}\n\n${lines.join('\n\n')}`;
    download(text, `gyeol-chat-${Date.now()}.txt`, 'text/plain');
    onClose();
  };

  const exportAsJson = () => {
    const data = {
      agent: agentName,
      exportedAt: new Date().toISOString(),
      messageCount: messages.length,
      messages: messages.map(m => ({
        role: m.role, content: m.content, timestamp: m.created_at,
      })),
    };
    download(JSON.stringify(data, null, 2), `gyeol-chat-${Date.now()}.json`, 'application/json');
    onClose();
  };

  const download = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="glass-card rounded-2xl p-5 w-full max-w-[320px] space-y-4">
            <h3 className="text-sm font-bold text-foreground">대화 내보내기</h3>
            <p className="text-[11px] text-muted-foreground">{messages.length}개 메시지를 내보냅니다.</p>
            <div className="space-y-2">
              <button onClick={exportAsText}
                className="w-full py-3 rounded-xl glass-card flex items-center gap-3 px-4 hover:bg-primary/5 transition">
                <span className="material-icons-round text-primary text-lg">description</span>
                <div className="text-left">
                  <p className="text-[12px] font-medium text-foreground">텍스트 (.txt)</p>
                  <p className="text-[9px] text-muted-foreground">읽기 쉬운 텍스트 형식</p>
                </div>
              </button>
              <button onClick={exportAsJson}
                className="w-full py-3 rounded-xl glass-card flex items-center gap-3 px-4 hover:bg-primary/5 transition">
                <span className="material-icons-round text-secondary text-lg">code</span>
                <div className="text-left">
                  <p className="text-[12px] font-medium text-foreground">JSON (.json)</p>
                  <p className="text-[9px] text-muted-foreground">구조화된 데이터 형식</p>
                </div>
              </button>
            </div>
            <button onClick={onClose} className="w-full py-2 text-[11px] text-muted-foreground hover:text-foreground transition">취소</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
