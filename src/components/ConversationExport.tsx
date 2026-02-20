/**
 * 대화 내보내기 모달 — 텍스트/JSON/Markdown 형식으로 대화 기록 다운로드
 */
import { motion, AnimatePresence } from 'framer-motion';
import type { Message } from '@/lib/gyeol/types';

interface ConversationExportProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  agentName: string;
}

const FORMATS = [
  { id: 'txt', icon: 'description', color: 'text-primary', label: '텍스트 (.txt)', desc: '읽기 쉬운 텍스트 형식' },
  { id: 'md', icon: 'article', color: 'text-emerald-400', label: '마크다운 (.md)', desc: '포맷 유지 마크다운' },
  { id: 'json', icon: 'code', color: 'text-secondary', label: 'JSON (.json)', desc: '구조화된 데이터 형식' },
] as const;

export function ConversationExport({ isOpen, onClose, messages, agentName }: ConversationExportProps) {
  const download = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportAs = (fmt: string) => {
    const ts = new Date().toISOString().slice(0, 10);
    const header = `GYEOL 대화 기록\n에이전트: ${agentName}\n날짜: ${ts}\n메시지 수: ${messages.length}`;

    if (fmt === 'json') {
      const data = {
        agent: agentName, exportedAt: new Date().toISOString(), messageCount: messages.length,
        messages: messages.map(m => ({ role: m.role, content: m.content, timestamp: m.created_at })),
      };
      download(JSON.stringify(data, null, 2), `gyeol-chat-${ts}.json`, 'application/json');
    } else if (fmt === 'md') {
      const lines = messages.map(m => {
        const sender = m.role === 'user' ? '**You**' : `**${agentName}**`;
        const time = new Date(m.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        return `### ${sender} _${time}_\n\n${m.content}`;
      });
      download(`# ${header.replace(/\n/g, '\n\n')}\n\n---\n\n${lines.join('\n\n---\n\n')}`, `gyeol-chat-${ts}.md`, 'text/markdown');
    } else {
      const lines = messages.map(m => {
        const time = new Date(m.created_at).toLocaleString();
        return `[${time}] ${m.role === 'user' ? 'You' : agentName}: ${m.content}`;
      });
      download(`=== ${header} ===\n${'='.repeat(40)}\n\n${lines.join('\n\n')}`, `gyeol-chat-${ts}.txt`, 'text/plain');
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-6" onClick={onClose}
          role="dialog" aria-label="대화 내보내기" aria-modal="true">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="glass-card rounded-2xl p-5 w-full max-w-[320px] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-icons-round text-primary text-lg">download</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">대화 내보내기</h3>
                <p className="text-[10px] text-muted-foreground">{messages.length}개 메시지</p>
              </div>
            </div>

            <div className="space-y-2">
              {FORMATS.map(f => (
                <button key={f.id} onClick={() => exportAs(f.id)}
                  className="w-full py-3 rounded-xl glass-card flex items-center gap-3 px-4 hover:bg-primary/5 transition"
                  aria-label={`${f.label} 형식으로 내보내기`}>
                  <span className={`material-icons-round ${f.color} text-lg`}>{f.icon}</span>
                  <div className="text-left">
                    <p className="text-[12px] font-medium text-foreground">{f.label}</p>
                    <p className="text-[9px] text-muted-foreground">{f.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={onClose} className="w-full py-2 text-[11px] text-muted-foreground hover:text-foreground transition">취소</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
