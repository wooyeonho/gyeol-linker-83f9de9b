/**
 * 대화 목록 패널 — 과거 대화를 날짜별로 보여주고 삭제 가능
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/integrations/supabase/client';
import { useGyeolStore } from '@/store/gyeol-store';
import { format, isToday, isYesterday } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ConvGroup {
  date: string;
  label: string;
  customName?: string;
  messages: { id: string; content: string; role: string; created_at: string }[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  onSelectDate?: (date: string) => void;
}

export function ConversationList({ isOpen, onClose, agentId, onSelectDate }: Props) {
  const [groups, setGroups] = useState<ConvGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [renamingDate, setRenamingDate] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const { setMessages } = useGyeolStore();

  // Persist custom names in localStorage
  const getCustomNames = (): Record<string, string> => {
    try { return JSON.parse(localStorage.getItem(`conv_names_${agentId}`) ?? '{}'); } catch { return {}; }
  };
  const saveCustomName = (date: string, name: string) => {
    const names = getCustomNames();
    names[date] = name;
    localStorage.setItem(`conv_names_${agentId}`, JSON.stringify(names));
  };

  const load = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    const { data } = await supabase
      .from('gyeol_conversations')
      .select('id, content, role, created_at')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (!data) { setLoading(false); return; }

    const map = new Map<string, ConvGroup>();
    const customNames = getCustomNames();
    for (const m of data) {
      const dateKey = format(new Date(m.created_at), 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        const d = new Date(m.created_at);
        const label = isToday(d) ? '오늘' : isYesterday(d) ? '어제' : format(d, 'M월 d일 (EEE)', { locale: ko });
        map.set(dateKey, { date: dateKey, label, customName: customNames[dateKey], messages: [] });
      }
      map.get(dateKey)!.messages.push(m);
    }
    setGroups(Array.from(map.values()));
    setLoading(false);
  }, [agentId]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  const deleteDay = async (date: string) => {
    setDeleting(date);
    const group = groups.find(g => g.date === date);
    if (group) {
      const ids = group.messages.map(m => m.id);
      await supabase.from('gyeol_conversations').delete().in('id', ids);
      setGroups(prev => prev.filter(g => g.date !== date));
      // Also remove from store
      setMessages((prev: any[]) => prev.filter(m => !ids.includes(m.id)));
    }
    setDeleting(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[80]" onClick={onClose} />
          <motion.div
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed top-0 left-0 bottom-0 w-[85%] max-w-[360px] bg-background z-[81] flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/20">
              <h2 className="text-sm font-bold text-foreground">대화 기록</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground">
                <span aria-hidden="true" className="material-icons-round text-lg">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-20"><div className="void-dot" /></div>
              ) : groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <span aria-hidden="true" className="material-icons-round text-4xl text-muted-foreground/20">chat_bubble_outline</span>
                  <p className="text-sm text-muted-foreground">아직 대화가 없어요</p>
                </div>
              ) : (
                <div className="divide-y divide-border/10">
                  {groups.map(g => {
                    const msgCount = g.messages.length;
                    const preview = g.messages.find(m => m.role === 'user')?.content?.slice(0, 60) || '...';
                    return (
                      <div key={g.date} className="px-5 py-3 flex items-center gap-3 group">
                        <button
                          className="flex-1 min-w-0 text-left"
                          onClick={() => { onSelectDate?.(g.date); onClose(); }}
                        >
                          {renamingDate === g.date ? (
                            <input
                              type="text" value={renameValue} autoFocus maxLength={30}
                              onChange={e => setRenameValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  saveCustomName(g.date, renameValue.trim());
                                  setGroups(prev => prev.map(gg => gg.date === g.date ? { ...gg, customName: renameValue.trim() } : gg));
                                  setRenamingDate(null);
                                }
                                if (e.key === 'Escape') setRenamingDate(null);
                              }}
                              onBlur={() => {
                                if (renameValue.trim()) {
                                  saveCustomName(g.date, renameValue.trim());
                                  setGroups(prev => prev.map(gg => gg.date === g.date ? { ...gg, customName: renameValue.trim() } : gg));
                                }
                                setRenamingDate(null);
                              }}
                              onClick={e => e.stopPropagation()}
                              className="w-full bg-transparent border border-primary/30 rounded px-2 py-0.5 text-[12px] text-foreground outline-none focus:border-primary"
                            />
                          ) : (
                            <p className="text-[12px] font-bold text-foreground">{g.customName || g.label}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{preview}</p>
                          <p className="text-[9px] text-muted-foreground/60 mt-0.5">{msgCount}개 메시지</p>
                        </button>
                        <button
                          onClick={() => { setRenamingDate(g.date); setRenameValue(g.customName || g.label); }}
                          className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition shrink-0"
                        >
                          <span aria-hidden="true" className="material-icons-round text-sm">edit</span>
                        </button>
                        <button
                          onClick={() => deleteDay(g.date)}
                          disabled={deleting === g.date}
                          className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition shrink-0"
                        >
                          <span aria-hidden="true" className="material-icons-round text-sm">
                            {deleting === g.date ? 'hourglass_empty' : 'delete_outline'}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
