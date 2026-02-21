import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  activeSection: string | null;
  SectionHeader: React.FC<{ id: string; icon: string; title: string }>;
  telegramLinked: boolean;
  telegramCode: string;
}

export function TelegramSection({ activeSection, SectionHeader, telegramLinked, telegramCode }: Props) {
  return (
    <section>
      <SectionHeader id="telegram" icon="send" title="Telegram" />
      <AnimatePresence>
        {activeSection === 'telegram' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3 pt-2">
            {telegramLinked ? (
              <div className="flex items-center gap-2 text-[hsl(var(--success,142_71%_45%)/0.7)]">
                <span className="material-icons-round text-sm">check_circle</span>
                <span className="text-xs">Telegram Connected</span>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-foreground/40 leading-relaxed">Send this code to the GYEOL bot on Telegram:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-3 py-2 text-xs text-primary/80 font-mono select-all overflow-hidden">
                    /start {telegramCode}
                  </code>
                  <button type="button" onClick={() => navigator.clipboard.writeText(`/start ${telegramCode}`)}
                    className="rounded-lg bg-primary/10 text-primary/80 px-3 py-2 text-xs">Copy</button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
