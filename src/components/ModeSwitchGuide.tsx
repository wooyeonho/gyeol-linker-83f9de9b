/**
 * 모드 전환 안내 — Simple ↔ Advanced 전환 시 표시
 */
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  targetMode: 'simple' | 'advanced';
  onConfirm: () => void;
}

const MODE_INFO = {
  simple: {
    icon: '💬',
    title: 'Simple Mode',
    features: ['깔끔한 채팅 인터페이스', '자동 음성 읽기', '캐릭터 선택', '프로액티브 메시지'],
    missing: ['대시보드 위젯', '소셜 기능', '마켓', '게이미피케이션 상세'],
  },
  advanced: {
    icon: '🧬',
    title: 'Advanced Mode',
    features: ['전체 대시보드', '소셜 & 매칭', '스킨/스킬 마켓', '업적 & 퀘스트', '리더보드'],
    missing: ['캐릭터 표시 (설정에서 가능)', '자동 TTS (설정에서 가능)'],
  },
};

export function ModeSwitchGuide({ isOpen, onClose, targetMode, onConfirm }: Props) {
  const info = MODE_INFO[targetMode];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="glass-card rounded-3xl p-6 w-full max-w-sm relative z-10"
          >
            <div className="text-center mb-4">
              <span className="text-4xl block mb-2">{info.icon}</span>
              <h2 className="text-lg font-bold text-foreground">{info.title}로 전환</h2>
              <p className="text-[11px] text-muted-foreground mt-1">모드를 변경하면 인터페이스가 바뀝니다</p>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <p className="text-[10px] text-primary font-bold mb-1.5">✅ 포함 기능</p>
                <div className="space-y-1">
                  {info.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-[11px] text-foreground/70">
                      <span className="text-[hsl(var(--success,142_71%_45%))] text-[10px]">●</span> {f}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-bold mb-1.5">ℹ️ 제외 기능</p>
                <div className="space-y-1">
                  {info.missing.map(f => (
                    <div key={f} className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
                      <span className="text-muted-foreground/30 text-[10px]">●</span> {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground glass-card transition">
                취소
              </button>
              <button onClick={onConfirm}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-primary to-secondary text-primary-foreground btn-glow transition">
                전환하기
              </button>
            </div>

            <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground/40 hover:text-foreground">
              <span aria-hidden="true" className="material-icons-round text-lg">close</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
