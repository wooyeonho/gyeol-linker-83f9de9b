import { AnimatePresence, motion } from 'framer-motion';
import { ThemeToggle } from '../ThemeToggle';
import { supabase } from '@/src/lib/supabase';
import { getLocale, setLocale, getAvailableLocales } from '@/src/lib/i18n';
import { parseSettings } from '@/src/utils/agent-settings';

function hexToHSL(hex: string): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

interface AppearanceSectionProps {
  agent: any;
  setAgent: (a: any) => void;
  activeSection: string | null;
  SectionHeader: React.FC<{ id: string; icon: string; title: string }>;
}

export function AppearanceSection({ agent, setAgent, activeSection, SectionHeader }: AppearanceSectionProps) {
  return (
    <>
      <section className="glass-card rounded-2xl overflow-hidden p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <span aria-hidden="true" className="material-icons-round text-primary text-sm">palette</span>
          <h2 className="text-sm font-semibold text-foreground">Appearance</h2>
        </div>
        <ThemeToggle />
        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="text-[11px] text-foreground/80">Custom Primary Color</p>
            <p className="text-[9px] text-foreground/25">Customize theme color</p>
          </div>
          <input type="color"
            defaultValue={(() => { const c = parseSettings(agent?.settings)?.customThemeColor; return c || '#784EDC'; })()}
            onChange={async (e) => {
              const color = e.target.value;
              document.documentElement.style.setProperty('--primary', `${hexToHSL(color)}`);
              const s = { ...parseSettings(agent?.settings), customThemeColor: color };
              await supabase.from('gyeol_agents').update({ settings: s }).eq('id', agent?.id);
              if (agent) setAgent({ ...agent, settings: s } as never);
            }}
            className="w-8 h-8 rounded-lg border border-foreground/10 cursor-pointer bg-transparent" />
        </div>
      </section>

      <div className="h-px bg-foreground/[0.04]" />

      <section>
        <SectionHeader id="language" icon="language" title="Language" />
        <AnimatePresence>
          {activeSection === 'language' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2 px-1">
              <div className="grid grid-cols-3 gap-2">
                {getAvailableLocales().map(loc => (
                  <button key={loc.code} type="button" onClick={() => { setLocale(loc.code); window.location.reload(); }}
                    className={`p-3 rounded-xl text-center transition ${getLocale() === loc.code ? 'glass-card-selected' : 'glass-card'}`}>
                    <span className="text-sm block">{loc.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </>
  );
}
