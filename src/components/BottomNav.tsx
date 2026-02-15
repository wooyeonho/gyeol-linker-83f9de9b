import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { to: '/', label: '홈', icon: '◉' },
  { to: '/activity', label: '활동', icon: '◷' },
  { to: '/social', label: '소셜', icon: '◈' },
  { to: '/market/skills', label: '마켓', icon: '◆' },
  { to: '/settings', label: '설정', icon: '⚙' },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl border-t border-white/5">
      <div className="max-w-md mx-auto flex justify-around items-center h-16">
        {NAV_ITEMS.map((item) => {
          const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex flex-col items-center gap-0.5 px-3 py-2"
            >
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-px left-2 right-2 h-0.5 rounded-full bg-indigo-500"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <span className={`text-lg ${active ? 'text-indigo-400' : 'text-white/40'}`}>
                {item.icon}
              </span>
              <span className={`text-[10px] ${active ? 'text-indigo-400' : 'text-white/40'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
