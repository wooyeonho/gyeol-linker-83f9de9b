/**
 * 진화 조건 안내 카드 — 현재 진화 조건과 확률을 표시
 */
import { motion } from 'framer-motion';

interface Props {
  gen: number;
  evolutionProgress: number;
  totalConversations: number;
  intimacy: number;
}

const GEN_REQUIREMENTS = [
  { gen: 1, baseRate: 60, minConv: 10, desc: 'Gen 2로 진화' },
  { gen: 2, baseRate: 40, minConv: 50, desc: 'Gen 3로 진화' },
  { gen: 3, baseRate: 20, minConv: 150, desc: 'Gen 4로 진화' },
  { gen: 4, baseRate: 5, minConv: 500, desc: 'Gen 5 (최종)' },
];

export function EvolutionGuide({ gen, evolutionProgress, totalConversations, intimacy }: Props) {
  const current = GEN_REQUIREMENTS.find(r => r.gen === gen);
  if (!current || gen >= 5) {
    return (
      <div className="glass-card rounded-2xl p-4 text-center">
        <span className="text-2xl">👑</span>
        <p className="text-[11px] text-foreground font-bold mt-2">최고 단계에 도달했습니다!</p>
        <p className="text-[9px] text-muted-foreground mt-1">Gen 5 — 최종 진화 완료</p>
      </div>
    );
  }

  // Estimate current probability
  const progressBonus = Math.min(20, evolutionProgress / 5);
  const estimatedRate = Math.min(95, current.baseRate + progressBonus);
  const ready = evolutionProgress >= 100;

  const conditions = [
    { label: '진화 진행도', value: `${Math.round(evolutionProgress)}%`, met: evolutionProgress >= 100, icon: 'trending_up' },
    { label: '총 대화 수', value: `${totalConversations}회`, met: totalConversations >= current.minConv, icon: 'chat' },
    { label: '친밀도', value: `${intimacy}%`, met: intimacy >= 20, icon: 'favorite' },
  ];

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold text-foreground/80 flex items-center gap-1.5">
          <span className="material-icons-round text-secondary text-sm">info</span>
          {current.desc}
        </h3>
        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
          ready ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted/20 text-muted-foreground'
        }`}>
          {ready ? '준비 완료!' : '진행 중'}
        </span>
      </div>

      {/* Conditions */}
      <div className="space-y-2">
        {conditions.map(c => (
          <div key={c.label} className="flex items-center gap-2">
            <span className={`material-icons-round text-xs ${c.met ? 'text-emerald-400' : 'text-muted-foreground/30'}`}>
              {c.met ? 'check_circle' : 'radio_button_unchecked'}
            </span>
            <span className="text-[10px] text-foreground/70 flex-1">{c.label}</span>
            <span className={`text-[10px] font-medium ${c.met ? 'text-foreground' : 'text-muted-foreground'}`}>
              {c.value}
            </span>
          </div>
        ))}
      </div>

      {/* Estimated rate */}
      <div className="flex items-center justify-between pt-2 border-t border-border/10">
        <span className="text-[9px] text-muted-foreground">예상 성공 확률</span>
        <motion.span
          className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary"
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {Math.round(estimatedRate)}%
        </motion.span>
      </div>
    </div>
  );
}
