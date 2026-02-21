/**
 * 업적 공유 카드
 */
import { motion, AnimatePresence } from 'framer-motion';

interface AchievementShareProps {
  show: boolean;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  onClose: () => void;
}

export function AchievementShare({ show, name, description, icon, rarity, onClose }: AchievementShareProps) {
  const shareText = `🏆 GYEOL 업적 달성!\n${name}\n${description}\n\n#GYEOL #AI동반자`;

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: `GYEOL 업적: ${name}`, text: shareText });
    } else {
      await navigator.clipboard.writeText(shareText);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}
            className="glass-card rounded-2xl p-6 w-full max-w-[280px] text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto">
              <span className="material-icons-round text-3xl text-primary">{icon}</span>
            </div>
            <div>
              <span className="text-[8px] px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase font-bold">{rarity}</span>
              <h3 className="text-lg font-bold text-foreground mt-2">{name}</h3>
              <p className="text-[11px] text-muted-foreground mt-1">{description}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 rounded-xl glass-card text-xs text-muted-foreground">닫기</button>
              <button onClick={handleShare}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1">
                <span className="material-icons-round text-sm">share</span> 공유
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
