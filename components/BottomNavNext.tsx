'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', icon: 'home', label: 'Home' },
  { href: '/social', icon: 'group', label: 'Social' },
  { href: '/market/skins', icon: 'palette', label: 'Market' },
  { href: '/settings', icon: 'settings', label: 'Settings' },
] as const;

export default function BottomNavNext() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-t border-white/10"
      role="navigation" aria-label="Main navigation">
      <div className="max-w-md mx-auto flex items-center justify-around h-14">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 rounded-lg ${
                active ? 'text-indigo-400' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <span className="material-icons-round text-xl" aria-hidden="true">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
