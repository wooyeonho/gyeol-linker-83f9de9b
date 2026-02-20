import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', icon: 'blur_on', label: 'Home' },
  { to: '/gamification', icon: 'military_tech', label: 'Quest' },
  { to: '/social', icon: 'group', label: 'Social' },
  { to: '/activity', icon: 'show_chart', label: 'Activity' },
  { to: '/settings', icon: 'tune', label: 'Settings' },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[70] glass-panel border-t-0"
      role="navigation" aria-label="Main navigation"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="max-w-md mx-auto grid grid-cols-5 place-items-center h-14" role="list">
        {NAV_ITEMS.map((item) => {
          const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              role="listitem"
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className="flex flex-col items-center justify-center gap-0.5 h-14 relative focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-lg"
            >
              <span className={`material-icons-round text-[22px] transition-colors duration-200 ${active ? 'text-primary' : 'text-slate-500'}`} aria-hidden="true">
                {item.icon}
              </span>
              <span className={`text-[10px] font-medium transition-colors duration-200 ${active ? 'text-primary' : 'text-slate-500'}`}>
                {item.label}
              </span>
              {active && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_6px_rgba(120,78,218,0.6)]" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
