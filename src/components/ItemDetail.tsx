/**
 * 아이템 상세 보기 모달 — 아이템 정보, 효과, 사용 안내
 */
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: {
    name: string;
    description: string | null;
    icon: string;
    category: string;
    price_coins: number;
    item_data: Record<string, any> | null;
    is_limited: boolean;
    stock: number | null;
    min_level: number;
  } | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  boost: '부스터', cosmetic: '꾸미기', consumable: '소모품', skin: '스킨', other: '기타',
};

export function ItemDetail({ isOpen, onClose, item }: Props) {
  if (!item) return null;

  const effects = item.item_data ?? {};

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="glass-card rounded-2xl p-6 w-full max-w-sm"
          >
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center">
                <span className="material-icons-round text-primary text-2xl">{item.icon}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-foreground">{item.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {CATEGORY_LABELS[item.category] ?? item.category}
                  </span>
                  {item.is_limited && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">
                      한정판
                    </span>
                  )}
                  {item.min_level > 1 && (
                    <span className="text-[9px] text-muted-foreground">Lv.{item.min_level}+</span>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="text-muted-foreground/50 hover:text-foreground">
                <span className="material-icons-round text-lg">close</span>
              </button>
            </div>

            {/* Description */}
            <p className="text-[12px] text-muted-foreground leading-relaxed mb-4">
              {item.description ?? '상세 설명이 없습니다.'}
            </p>

            {/* Effects */}
            {Object.keys(effects).length > 0 && (
              <div className="glass-card rounded-xl p-3 space-y-1.5 mb-4">
                <p className="text-[10px] font-bold text-foreground/60 uppercase">효과</p>
                {effects.exp_boost && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="material-icons-round text-secondary text-xs">bolt</span>
                    <span className="text-foreground">EXP +{effects.exp_boost}</span>
                  </div>
                )}
                {effects.evolution_boost && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="material-icons-round text-[hsl(var(--success,142_71%_45%))] text-xs">trending_up</span>
                    <span className="text-foreground">진화 진행도 +{effects.evolution_boost}%</span>
                  </div>
                )}
                {effects.coin_boost && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="material-icons-round text-amber-400 text-xs">monetization_on</span>
                    <span className="text-foreground">코인 +{effects.coin_boost}</span>
                  </div>
                )}
              </div>
            )}

            {/* Price & Stock */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-icons-round text-amber-400 text-sm">monetization_on</span>
                <span className="text-sm font-bold text-foreground">{item.price_coins}</span>
              </div>
              {item.stock !== null && (
                <span className="text-[10px] text-muted-foreground">
                  재고: {item.stock}개
                </span>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
