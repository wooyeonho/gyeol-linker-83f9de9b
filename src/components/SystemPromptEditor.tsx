/**
 * 커스텀 시스템 프롬프트 편집기
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import { useGyeolStore } from '@/store/gyeol-store';

interface SystemPromptEditorProps {
  agent: any;
  onUpdate: (settings: any) => void;
}

const TEMPLATES = [
  { label: '기본', icon: '💬', prompt: '' },
  { label: '학습 도우미', icon: '📚', prompt: '너는 사용자의 학습을 도와주는 튜터야. 개념을 쉽게 설명하고, 퀴즈를 내고, 복습을 도와줘.' },
  { label: '창작 파트너', icon: '✍️', prompt: '너는 창작 파트너야. 글쓰기, 시, 스토리 아이디어를 함께 발전시키고, 창의적인 피드백을 줘.' },
  { label: '코딩 멘토', icon: '💻', prompt: '너는 프로그래밍 멘토야. 코드 리뷰, 디버깅 도움, 알고리즘 설명을 해줘. 항상 베스트 프랙티스를 권장해.' },
  { label: '감정 케어', icon: '💝', prompt: '너는 공감 능력이 뛰어난 상담사야. 사용자의 감정을 먼저 인정하고, 따뜻하게 대화해줘.' },
  { label: '토론 상대', icon: '⚖️', prompt: '너는 지적 토론 상대야. 사용자의 주장에 건설적인 반론을 제시하고, 다양한 관점을 탐구해.' },
];

export function SystemPromptEditor({ agent, onUpdate }: SystemPromptEditorProps) {
  const settings = (agent?.settings as any) ?? {};
  const [prompt, setPrompt] = useState(settings.customSystemPrompt ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { setAgent } = useGyeolStore();

  const save = async (newPrompt: string) => {
    if (!agent?.id) return;
    setSaving(true);
    const ns = { ...settings, customSystemPrompt: newPrompt };
    await supabase.from('gyeol_agents' as any).update({ settings: ns } as any).eq('id', agent.id);
    setAgent({ ...agent, settings: ns } as any);
    onUpdate(ns);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-foreground/25 leading-relaxed">
        AI의 기본 성격과 행동 방식을 커스터마이즈하세요. 대화 시작 시 시스템 프롬프트로 사용됩니다.
      </p>

      {/* Templates */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {TEMPLATES.map(t => (
          <button key={t.label} type="button"
            onClick={() => { setPrompt(t.prompt); if (t.prompt) save(t.prompt); }}
            className={`flex-shrink-0 px-3 py-2 rounded-xl text-center transition ${
              prompt === t.prompt ? 'glass-card-selected' : 'glass-card'
            }`}>
            <span className="text-sm block">{t.icon}</span>
            <span className="text-[9px] text-foreground/40 mt-0.5 block whitespace-nowrap">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Editor */}
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="예: 너는 친절한 한국어 튜터야. 항상 예시를 들어 설명하고, 격려를 잊지 마..."
        maxLength={1000}
        rows={4}
        className="w-full rounded-xl bg-foreground/[0.03] border border-foreground/[0.06] px-3 py-2.5 text-xs text-foreground placeholder:text-foreground/15 outline-none focus:border-primary/20 resize-none leading-relaxed"
      />

      <div className="flex items-center justify-between">
        <span className="text-[9px] text-foreground/15">{prompt.length}/1000</span>
        <div className="flex items-center gap-2">
          {saved && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-[10px] text-[hsl(var(--success,142_71%_45%))] flex items-center gap-1">
              <span aria-hidden="true" className="material-icons-round text-[12px]">check</span> 저장됨
            </motion.span>
          )}
          <button type="button" onClick={() => save(prompt)} disabled={saving}
            className="px-4 py-1.5 rounded-lg bg-primary/10 text-primary/80 text-[11px] font-medium hover:bg-primary/15 transition disabled:opacity-40">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
