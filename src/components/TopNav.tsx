import { useAuth } from '@/src/hooks/useAuth';
import { useInitAgent } from '@/src/hooks/useInitAgent';

export function TopNav() {
  const { user } = useAuth();
  const { agent } = useInitAgent();

  const toggleDark = () => document.documentElement.classList.toggle('dark');

  return (
    <nav className="w-full px-6 py-5 md:px-12 md:py-6 flex justify-between items-center z-50 fixed top-0 left-0 right-0 glass-panel border-b-0 border-transparent"
      role="banner" aria-label="Top navigation">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30" aria-hidden="true">
          <span className="material-icons-round text-primary-foreground text-2xl">blur_on</span>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-xl leading-none tracking-tight text-foreground">
            {agent?.name ?? 'GYEOL'}
          </span>
          <span className="text-[10px] font-semibold tracking-wider text-primary uppercase">
            OPENCLAW
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleDark}
          aria-label="Toggle dark mode"
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
        >
          <span className="material-icons-round text-xl dark:hidden" aria-hidden="true">dark_mode</span>
          <span className="material-icons-round text-xl hidden dark:block" aria-hidden="true">light_mode</span>
        </button>
        <div className="relative" aria-label="User avatar">
          <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-card shadow-sm bg-[hsl(30,80%,75%)] flex items-center justify-center">
            <span className="material-icons-round text-foreground text-xl" aria-hidden="true">person</span>
          </div>
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[hsl(142,71%,45%)] border-2 border-card rounded-full" aria-label="Online status" />
        </div>
      </div>
    </nav>
  );
}
