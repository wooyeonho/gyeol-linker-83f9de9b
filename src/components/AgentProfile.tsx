/**
 * Phase 5: 에이전트 공개 프로필 모달 — 배지 시스템 포함
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PersonalityRadar } from './PersonalityRadar';
import { MoodHistory } from './MoodHistory';
import { supabase } from '@/src/lib/supabase';

interface AgentProfileProps {
  isOpen: boolean;
  onClose: () => void;
  onShareCard?: () => void;
  agent: {
    id: string;
    name: string;
    gen: number;
    warmth: number;
    logic: number;
    creativity: number;
    energy: number;
    humor: number;
    intimacy: number;
    mood: string;
    total_conversations: number;
    consecutive_days: number;
    created_at: string;
    settings?: any;
  } | null;
}

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊', excited: '🤩', neutral: '🙂', sad: '😢',
  lonely: '🥺', tired: '😴', anxious: '😰', curious: '🤔',
  proud: '😤', grateful: '🥹', playful: '😜', focused: '🧐',
  melancholic: '😔', hopeful: '✨', surprised: '😲', loving: '🥰',
};

export function AgentProfile({ isOpen, onClose, onShareCard, agent }: AgentProfileProps) {
  const [badges, setBadges] = useState<{ name: string; icon: string; rarity: string }[]>([]);

  useEffect(() => {
    if (!agent?.id || !isOpen) return;
    (async () => {
      const { data: unlocks } = await supabase.from('gyeol_achievement_unlocks')
        .select('achievement_id').eq('agent_id', agent.id);
      if (unlocks && unlocks.length > 0) {
        const ids = unlocks.map((u: any) => u.achievement_id);
        const { data: achs } = await supabase.from('gyeol_achievements')
          .select('name, icon, rarity').in('id', ids);
        setBadges((achs ?? []).slice(0, 6) as any);
      }
    })();
  }, [agent?.id, isOpen]);

  if (!agent) return null;

  const daysSinceCreation = Math.floor((Date.now() - new Date(agent.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const persona = agent.settings?.persona;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto relative z-10 gyeol-scrollbar-hide"
          >
            {/* Header */}
            <div className="relative h-28 bg-gradient-to-br from-primary/30 to-secondary/20 rounded-t-3xl">
              <button onClick={onClose} className="absolute top-4 right-4 text-foreground/40 hover:text-foreground">
                <span className="material-icons-round">close</span>
              </button>
              <div className="absolute -bottom-8 left-6">
                <div className="w-16 h-16 rounded-2xl glass-panel flex items-center justify-center shadow-xl">
                  <span className="text-2xl">{MOOD_EMOJI[agent.mood] ?? '🙂'}</span>
                </div>
              </div>
            </div>

            <div className="px-6 pt-12 pb-8 space-y-6">
              {/* Name & Info */}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{agent.name}</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">Gen {agent.gen}</span>
                </div>
                {persona && (
                  <p className="text-[11px] text-muted-foreground mt-1">✦ {persona}</p>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Talks', value: agent.total_conversations },
                  { label: 'Days', value: daysSinceCreation },
                  { label: 'Streak', value: `${agent.consecutive_days}🔥` },
                  { label: 'Bond', value: `${agent.intimacy}%` },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-sm font-bold text-foreground">{s.value}</p>
                    <p className="text-[8px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Badges */}
              {badges.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold text-foreground mb-2">🏅 배지</h3>
                  <div className="flex flex-wrap gap-2">
                    {badges.map((b, i) => {
                      const rarityColor: Record<string, string> = {
                        common: 'text-muted-foreground', uncommon: 'text-[hsl(var(--success,142_71%_45%))]',
                        rare: 'text-blue-400', epic: 'text-purple-400', legendary: 'text-amber-400',
                      };
                      return (
                        <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-full glass-card text-[9px]">
                          <span className={`material-icons-round text-[12px] ${rarityColor[b.rarity] ?? 'text-primary'}`}>{b.icon}</span>
                          <span className="text-foreground/70">{b.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Personality Radar */}
              <div className="flex justify-center">
                <PersonalityRadar
                  warmth={agent.warmth}
                  logic={agent.logic}
                  creativity={agent.creativity}
                  energy={agent.energy}
                  humor={agent.humor}
                  size={180}
                />
              </div>

              {/* Mood History */}
              <MoodHistory agentId={agent.id} />

              {/* Share Card Button */}
              {onShareCard && (
                <button onClick={onShareCard}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 text-primary text-[11px] font-medium hover:from-primary/20 hover:to-secondary/20 transition flex items-center justify-center gap-2">
                  <span className="material-icons-round text-sm">share</span>
                  프로필 카드 공유
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
