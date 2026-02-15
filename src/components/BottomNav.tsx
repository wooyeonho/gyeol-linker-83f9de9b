import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: 'blur_on' },
  { to: '/activity', label: 'Activity', icon: 'monitoring' },
  { to: '/social', label: 'Social', icon: 'group' },
  { to: '/market/skills', label: 'Market', icon: 'extension' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/20">
      <div className="max-w-md mx-auto flex justify-around items-center h-14">
        {NAV_ITEMS.map((item) => {
          const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors"
            >
              <span className={`material-icons-round text-lg transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                {item.icon}
              </span>
              <span className={`text-[9px] font-medium transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
              {active && (
                <span className="absolute -top-0.5 w-4 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
