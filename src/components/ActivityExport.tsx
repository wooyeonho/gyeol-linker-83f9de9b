/**
 * 활동 내보내기 — 로그를 CSV/JSON으로 다운로드
 */
import { motion, AnimatePresence } from 'framer-motion';

interface ActivityExportProps {
  isOpen: boolean;
  onClose: () => void;
  logs: any[];
}

export function ActivityExport({ isOpen, onClose, logs }: ActivityExportProps) {
  const download = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const data = { exportedAt: new Date().toISOString(), count: logs.length, logs };
    download(JSON.stringify(data, null, 2), `gyeol-activity-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    onClose();
  };

  const exportCSV = () => {
    const headers = 'timestamp,type,summary,sandboxed\n';
    const rows = logs.map(l =>
      `"${l.created_at}","${l.activity_type}","${(l.summary ?? '').replace(/"/g, '""')}",${l.was_sandboxed}`
    ).join('\n');
    download(headers + rows, `gyeol-activity-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}
            className="glass-card rounded-2xl p-5 w-full max-w-[280px] space-y-3">
            <div className="flex items-center gap-2">
              <span className="material-icons-round text-primary">download</span>
              <h3 className="text-sm font-bold text-foreground">활동 내보내기</h3>
            </div>
            <p className="text-[10px] text-muted-foreground">{logs.length}개 활동 로그</p>
            <button onClick={exportJSON}
              className="w-full py-3 rounded-xl glass-card flex items-center gap-3 px-4 hover:bg-primary/5 transition">
              <span className="material-icons-round text-secondary text-lg">code</span>
              <div className="text-left">
                <p className="text-[12px] font-medium text-foreground">JSON</p>
                <p className="text-[9px] text-muted-foreground">구조화된 데이터</p>
              </div>
            </button>
            <button onClick={exportCSV}
              className="w-full py-3 rounded-xl glass-card flex items-center gap-3 px-4 hover:bg-primary/5 transition">
              <span className="material-icons-round text-[hsl(var(--success,142_71%_45%))] text-lg">table_chart</span>
              <div className="text-left">
                <p className="text-[12px] font-medium text-foreground">CSV</p>
                <p className="text-[9px] text-muted-foreground">스프레드시트 호환</p>
              </div>
            </button>
            <button onClick={onClose} className="w-full py-2 text-[11px] text-muted-foreground hover:text-foreground transition">취소</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
