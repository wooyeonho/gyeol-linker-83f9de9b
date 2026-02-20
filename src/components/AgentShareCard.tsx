/**
 * 에이전트 공유 카드 — 스탯 이미지 생성 + 클립보드 복사
 */
import { useRef, useState } from 'react';
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
  onClose?: () => void;
}

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊', excited: '🤩', neutral: '🙂', sad: '😢',
  lonely: '🥺', tired: '😴', anxious: '😰', curious: '🤔',
  proud: '😤', grateful: '🥹', playful: '😜', focused: '🧐',
  melancholic: '😔', hopeful: '✨', surprised: '😲', loving: '🥰',
};

export function AgentShareCard(props: AgentShareCardProps) {
  const { name, gen, warmth, logic, creativity, energy, humor, intimacy, totalConversations, mood, level, title, onClose } = props;
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const copyAsText = () => {
    const text = `🌀 ${name} — Gen ${gen} | Lv.${level ?? 1}
${title ? `🏅 ${title}\n` : ''}Mood: ${MOOD_EMOJI[mood] ?? '🙂'} ${mood}
Stats: ❤️${warmth} 🧠${logic} 🎨${creativity} ⚡${energy} 😂${humor}
💬 ${totalConversations} conversations | 💕 ${intimacy}% intimacy
— GYEOL AI Companion`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-[320px] glass-card rounded-3xl p-6 relative overflow-hidden"
      ref={cardRef}
      id="agent-share-card"
      role="article"
      aria-label={`${name}의 프로필 카드`}
    >
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
          <div className="flex items-center gap-2">
            <span className="text-2xl">{MOOD_EMOJI[mood] ?? '🙂'}</span>
            {onClose && (
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition" aria-label="닫기">
                <span className="material-icons-round text-sm">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Radar */}
        <div className="flex justify-center">
          <PersonalityRadar warmth={warmth} logic={logic} creativity={creativity} energy={energy} humor={humor} size={140} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: totalConversations, label: 'Conversations' },
            { value: `${intimacy}%`, label: 'Intimacy' },
            { value: `Lv.${level ?? 1}`, label: 'Level' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">{s.value}</span>
              <p className="text-[8px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Copy & Share */}
        <div className="flex gap-2">
          <button onClick={copyAsText}
            className="flex-1 py-2 rounded-xl bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition flex items-center justify-center gap-1.5"
            aria-label="프로필 텍스트 복사">
            <span className="material-icons-round text-sm">{copied ? 'check' : 'content_copy'}</span>
            {copied ? '복사됨!' : '텍스트 복사'}
          </button>
        </div>

        <div className="text-center">
          <span className="text-[8px] text-muted-foreground/40">GYEOL — AI Companion that evolves with you</span>
        </div>
      </div>
    </motion.div>
  );
}
