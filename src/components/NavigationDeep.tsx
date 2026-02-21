import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Home, Menu, X, Activity, Download, Filter, BarChart3, Target, Flame, Award, Globe, Keyboard } from 'lucide-react';

export function Breadcrumbs({ items }: { items: { label: string; path?: string }[] }) {
  return (
    <nav className="flex items-center gap-1 text-[9px] text-muted-foreground overflow-x-auto py-1" aria-label="Breadcrumb">
      <Home className="w-3 h-3 flex-shrink-0" />
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1 flex-shrink-0">
          <ChevronRight className="w-2.5 h-2.5" />
          <span className={i === items.length - 1 ? 'text-foreground font-medium' : 'hover:text-foreground cursor-pointer transition'}>
            {item.label}
          </span>
        </span>
      ))}
    </nav>
  );
}

export function Sidebar({ open, onClose, items, activeItem, onSelect }: {
  open: boolean;
  onClose: () => void;
  items: { id: string; label: string; icon: React.ReactNode; badge?: number }[];
  activeItem: string;
  onSelect: (id: string) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm" />
          <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] z-[70] glass-card border-r border-border/10 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-bold text-foreground">GYEOL</span>
              <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="space-y-1" aria-label="Main navigation">
              {items.map(item => (
                <button key={item.id} onClick={() => { onSelect(item.id); onClose(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-medium transition ${
                    activeItem === item.id ? 'bg-primary/10 text-primary' : 'text-foreground/60 hover:text-foreground hover:bg-muted/10'
                  }`}>
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="w-5 h-5 rounded-full bg-destructive/10 text-destructive text-[9px] flex items-center justify-center font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function NavigationAnimation({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

export function ActivityExportButton({ onExport }: { onExport: (format: 'csv' | 'json') => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-xl glass-card text-[10px] text-foreground/60 hover:text-foreground transition">
        <Download className="w-3 h-3" /> Export
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute top-full mt-1 right-0 z-50 glass-card rounded-xl p-1 shadow-xl">
            {(['csv', 'json'] as const).map(fmt => (
              <button key={fmt} onClick={() => { onExport(fmt); setOpen(false); }}
                className="block w-full text-left px-3 py-1.5 rounded-lg text-[9px] text-foreground/60 hover:bg-muted/20 transition uppercase">
                {fmt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ActivitySummary({ data }: { data: { chats: number; exp: number; coins: number; quests: number; streak: number } }) {
  const items = [
    { label: 'Chats', value: data.chats, icon: '💬' },
    { label: 'EXP', value: data.exp, icon: '⚡' },
    { label: 'Coins', value: data.coins, icon: '🪙' },
    { label: 'Quests', value: data.quests, icon: '🎯' },
    { label: 'Streak', value: data.streak, icon: '🔥' },
  ];

  return (
    <div className="grid grid-cols-5 gap-1.5">
      {items.map(item => (
        <div key={item.label} className="p-2 rounded-xl glass-card text-center">
          <span className="text-sm">{item.icon}</span>
          <p className="text-[11px] font-bold text-primary mt-0.5">{item.value}</p>
          <p className="text-[7px] text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export function ActivityComparison({ current, previous }: {
  current: { label: string; value: number }[];
  previous: { label: string; value: number }[];
}) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <BarChart3 className="w-3.5 h-3.5 text-primary" /> This Week vs Last Week
      </h4>
      {current.map((c, i) => {
        const prev = previous[i]?.value ?? 0;
        const diff = c.value - prev;
        const pct = prev > 0 ? Math.round((diff / prev) * 100) : 0;
        return (
          <div key={c.label} className="flex items-center gap-2 p-2 rounded-lg glass-card text-[9px]">
            <span className="text-foreground/60 flex-1">{c.label}</span>
            <span className="text-primary font-mono">{c.value}</span>
            <span className={`text-[8px] ${diff >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {diff >= 0 ? '+' : ''}{pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ActivityGoals({ goals }: { goals: { title: string; current: number; target: number; icon: string }[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <Target className="w-3.5 h-3.5 text-primary" /> Goals
      </h4>
      {goals.map(g => (
        <div key={g.title} className="p-2 rounded-xl glass-card space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{g.icon}</span>
            <span className="text-[10px] text-foreground/70 flex-1">{g.title}</span>
            <span className="text-[9px] text-primary font-mono">{g.current}/{g.target}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted/20">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (g.current / g.target) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityStreakDisplay({ streak, bestStreak }: { streak: number; bestStreak: number }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl glass-card">
      <div className="text-center">
        <Flame className="w-5 h-5 text-amber-400 mx-auto" />
        <p className="text-lg font-bold text-foreground mt-0.5">{streak}</p>
        <p className="text-[8px] text-muted-foreground">Current</p>
      </div>
      <div className="h-8 w-px bg-border/20" />
      <div className="text-center">
        <Award className="w-5 h-5 text-primary mx-auto" />
        <p className="text-lg font-bold text-foreground mt-0.5">{bestStreak}</p>
        <p className="text-[8px] text-muted-foreground">Best</p>
      </div>
    </div>
  );
}

export function ActivityBadges({ badges }: { badges: { name: string; icon: string; earned: boolean; date?: string }[] }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {badges.map(b => (
        <div key={b.name} className={`p-2 rounded-xl text-center ${b.earned ? 'glass-card' : 'glass-card opacity-40'}`}>
          <span className="text-lg">{b.icon}</span>
          <p className="text-[8px] text-foreground/70 mt-0.5 truncate">{b.name}</p>
          {b.earned && b.date && <p className="text-[7px] text-muted-foreground">{b.date}</p>}
        </div>
      ))}
    </div>
  );
}

const translations: Record<string, Record<string, string>> = {
  ko: { chat: '채팅', settings: '설정', social: '소셜', market: '마켓', activity: '활동', evolution: '진화', gamification: '게임화', onboarding: '온보딩' },
  en: { chat: 'Chat', settings: 'Settings', social: 'Social', market: 'Market', activity: 'Activity', evolution: 'Evolution', gamification: 'Gamification', onboarding: 'Onboarding' },
  ja: { chat: 'チャット', settings: '設定', social: 'ソーシャル', market: 'マーケット', activity: 'アクティビティ', evolution: '進化', gamification: 'ゲーミフィケーション', onboarding: 'オンボーディング' },
};

export function useI18n(locale: string = 'ko') {
  const t = (key: string) => translations[locale]?.[key] ?? translations['en']?.[key] ?? key;
  return { t, locale };
}

export function LanguageSelector({ locale, onChange }: { locale: string; onChange: (l: string) => void }) {
  const languages = [
    { code: 'ko', label: '한국어', flag: '🇰🇷' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
  ];

  return (
    <div className="space-y-1.5">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <Globe className="w-3.5 h-3.5 text-primary" /> Language
      </h4>
      {languages.map(l => (
        <button key={l.code} onClick={() => onChange(l.code)}
          className={`w-full flex items-center gap-2 p-2 rounded-xl transition ${
            locale === l.code ? 'bg-primary/10 border border-primary/20' : 'glass-card hover:bg-muted/20'
          }`}>
          <span>{l.flag}</span>
          <span className="text-[10px] text-foreground/70">{l.label}</span>
          {locale === l.code && <span className="ml-auto text-primary text-[10px]">✓</span>}
        </button>
      ))}
    </div>
  );
}

export function KeyboardShortcuts({ shortcuts }: { shortcuts: { key: string; action: string }[] }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <Keyboard className="w-3.5 h-3.5 text-primary" /> Keyboard Shortcuts
      </h4>
      {shortcuts.map(s => (
        <div key={s.key} className="flex items-center justify-between p-2 rounded-lg glass-card text-[9px]">
          <span className="text-foreground/60">{s.action}</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted/20 text-foreground/70 font-mono text-[8px]">{s.key}</kbd>
        </div>
      ))}
    </div>
  );
}

export function AccessibilitySettings({ settings, onChange }: {
  settings: { reducedMotion: boolean; highContrast: boolean; fontSize: 'normal' | 'large' | 'xlarge' };
  onChange: (s: any) => void;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground">Accessibility</h4>
      <div className="flex items-center justify-between p-2 rounded-lg glass-card">
        <span className="text-[10px] text-foreground/70">Reduced Motion</span>
        <button onClick={() => onChange({ ...settings, reducedMotion: !settings.reducedMotion })}
          className={`w-8 h-4 rounded-full transition ${settings.reducedMotion ? 'bg-primary' : 'bg-muted/30'}`}>
          <div className={`w-3 h-3 rounded-full bg-background shadow transition-transform ${settings.reducedMotion ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <div className="flex items-center justify-between p-2 rounded-lg glass-card">
        <span className="text-[10px] text-foreground/70">High Contrast</span>
        <button onClick={() => onChange({ ...settings, highContrast: !settings.highContrast })}
          className={`w-8 h-4 rounded-full transition ${settings.highContrast ? 'bg-primary' : 'bg-muted/30'}`}>
          <div className={`w-3 h-3 rounded-full bg-background shadow transition-transform ${settings.highContrast ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <div>
        <span className="text-[10px] text-foreground/70 block mb-1">Font Size</span>
        <div className="flex gap-1.5">
          {(['normal', 'large', 'xlarge'] as const).map(size => (
            <button key={size} onClick={() => onChange({ ...settings, fontSize: size })}
              className={`flex-1 py-1.5 rounded-lg text-center transition ${
                settings.fontSize === size ? 'bg-primary/10 text-primary' : 'glass-card text-foreground/60'
              }`}>
              <span className={`${size === 'normal' ? 'text-[10px]' : size === 'large' ? 'text-[12px]' : 'text-[14px]'}`}>Aa</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
