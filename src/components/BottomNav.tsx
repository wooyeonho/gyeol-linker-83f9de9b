import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', icon: 'blur_on', label: '홈' },
  { to: '/social', icon: 'group', label: '소셜' },
  { to: '/activity', icon: 'monitoring', label: '활동' },
  { to: '/market/skins', icon: 'palette', label: '마켓' },
  { to: '/settings', icon: 'tune', label: '설정' },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-t border-white/[0.04]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="max-w-md mx-auto flex justify-around items-center h-12">
        {NAV_ITEMS.map((item) => {
          const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex flex-col items-center justify-center gap-0.5 w-12 h-12"
            >
              <span className={`material-icons-round text-[18px] transition-colors duration-200 ${active ? 'text-primary' : 'text-white/20'}`}>
                {item.icon}
              </span>
              <span className={`text-[8px] font-medium transition-colors duration-200 ${active ? 'text-primary' : 'text-white/15'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
