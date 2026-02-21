/**
 * 다크/라이트 테마 토글 컴포넌트
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('gyeol-theme') as 'dark' | 'light') ?? 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('gyeol-theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return { theme, toggle };
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-between w-full py-2"
    >
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="material-icons-round text-sm text-primary/50">
          {theme === 'dark' ? 'dark_mode' : 'light_mode'}
        </span>
        <div>
          <p className="text-[11px] text-foreground/80">테마</p>
          <p className="text-[9px] text-muted-foreground">{theme === 'dark' ? '다크 모드' : '라이트 모드'}</p>
        </div>
      </div>
      <motion.div
        className={`w-10 h-6 rounded-full transition flex items-center px-1 ${theme === 'dark' ? 'bg-primary/30' : 'bg-[hsl(var(--warning))]/30'}`}
      >
        <motion.div
          className={`w-4 h-4 rounded-full shadow-sm ${theme === 'dark' ? 'bg-primary' : 'bg-[hsl(var(--warning))]'}`}
          animate={{ x: theme === 'dark' ? 0 : 16 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </motion.div>
    </button>
  );
}
