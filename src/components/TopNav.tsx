import { useAuth } from '@/src/hooks/useAuth';
import { useInitAgent } from '@/src/hooks/useInitAgent';

export function TopNav() {
  const { user } = useAuth();
  const { agent } = useInitAgent();

  return (
    <nav className="w-full px-6 py-5 md:px-12 md:py-6 flex justify-between items-center z-50 fixed top-0 left-0 right-0 glass-panel border-b-0 border-transparent">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
          <span className="material-icons-round text-primary-foreground text-2xl">blur_on</span>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-xl leading-none tracking-tight text-foreground">
            {agent?.name ?? 'GYEOL'}
          </span>
          <span className="text-[10px] font-semibold tracking-wider text-primary uppercase">
            Gen {agent?.gen ?? 1}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-card shadow-sm bg-secondary flex items-center justify-center">
            <span className="material-icons-round text-muted-foreground text-xl">person</span>
          </div>
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-card rounded-full" />
        </div>
      </div>
    </nav>
  );
}
