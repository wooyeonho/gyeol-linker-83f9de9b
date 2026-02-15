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
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t-0">
      <div className="max-w-md mx-auto flex justify-around items-center h-16">
        {NAV_ITEMS.map((item) => {
          const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex flex-col items-center gap-0.5 px-3 py-2 transition-colors"
            >
              <span className={`material-icons-round text-xl ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                {item.icon}
              </span>
              <span className={`text-[10px] font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
