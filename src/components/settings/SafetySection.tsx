import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import { parseSettings } from '@/src/utils/agent-settings';

interface Props {
  agent: any;
  activeSection: string | null;
  SectionHeader: React.FC<{ id: string; icon: string; title: string }>;
  kidsSafe: boolean;
  setKidsSafe: (v: boolean) => void;
}

export function SafetySection({ agent, activeSection, SectionHeader, kidsSafe, setKidsSafe }: Props) {
  return (
    <section>
      <SectionHeader id="safety" icon="shield" title="Safety" />
      <AnimatePresence>
        {activeSection === 'safety' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2 px-1">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-[11px] text-foreground/80">Kids Safe Mode</p>
                <p className="text-[9px] text-foreground/25">Age-appropriate content filter</p>
              </div>
              <button type="button" onClick={async () => {
                const v = !kidsSafe; setKidsSafe(v);
                const s = parseSettings(agent?.settings);
                await supabase.from('gyeol_agents')
                  .update({ settings: { ...s, kidsSafe: v } } as any).eq('id', agent?.id);
              }}
                className={`w-10 h-6 rounded-full transition ${kidsSafe ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-foreground/10'}`}>
                <div className={`w-4 h-4 rounded-full bg-white mx-1 transition-transform shadow-sm ${kidsSafe ? 'translate-x-4' : ''}`} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
