/**
 * Phase 5: 에이전트 공유 카드 — 스탯 이미지 생성용
 */
import { motion } from 'framer-motion';
import { PersonalityRadar } from './PersonalityRadar';

interface AgentShareCardProps {
  name: string;
  gen: number;
  warmth: number;
  logic: number;
  creativity: number;
  energy: number;
  humor: number;
  intimacy: number;
  totalConversations: number;
  mood: string;
  level?: number;
  title?: string;
}

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊', excited: '🤩', neutral: '🙂', sad: '😢',
  lonely: '🥺', tired: '😴', anxious: '😰', curious: '🤔',
  proud: '😤', grateful: '🥹', playful: '😜', focused: '🧐',
  melancholic: '😔', hopeful: '✨', surprised: '😲', loving: '🥰',
};

export function AgentShareCard(props: AgentShareCardProps) {
  const { name, gen, warmth, logic, creativity, energy, humor, intimacy, totalConversations, mood, level, title } = props;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-[320px] glass-card rounded-3xl p-6 relative overflow-hidden"
      id="agent-share-card"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/5 pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">{name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">Gen {gen}</span>
              {title && <span className="text-[9px] text-muted-foreground">{title}</span>}
            </div>
          </div>
          <span className="text-2xl">{MOOD_EMOJI[mood] ?? '🙂'}</span>
        </div>

        {/* Radar */}
        <div className="flex justify-center">
          <PersonalityRadar warmth={warmth} logic={logic} creativity={creativity} energy={energy} humor={humor} size={140} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">{totalConversations}</span>
            <p className="text-[8px] text-muted-foreground">Conversations</p>
          </div>
          <div className="text-center">
            <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">{intimacy}%</span>
            <p className="text-[8px] text-muted-foreground">Intimacy</p>
          </div>
          <div className="text-center">
            <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Lv.{level ?? 1}</span>
            <p className="text-[8px] text-muted-foreground">Level</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <span className="text-[8px] text-muted-foreground/40">GYEOL — AI Companion that evolves with you</span>
        </div>
      </div>
    </motion.div>
  );
}
