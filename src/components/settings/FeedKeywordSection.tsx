import { motion, AnimatePresence } from 'framer-motion';

type Feed = { id: string; feed_url: string; feed_name: string | null; is_active: boolean };
type Keyword = { id: string; keyword: string; category: string | null };

interface Props {
  activeSection: string | null;
  SectionHeader: React.FC<{ id: string; icon: string; title: string }>;
  feeds: Feed[];
  keywords: Keyword[];
  newFeedUrl: string; setNewFeedUrl: (v: string) => void;
  newFeedName: string; setNewFeedName: (v: string) => void;
  newKeyword: string; setNewKeyword: (v: string) => void;
  addFeed: () => void;
  removeFeed: (id: string) => void;
  addKeyword: () => void;
  removeKeyword: (id: string) => void;
}

export function FeedKeywordSection({
  activeSection, SectionHeader,
  feeds, keywords, newFeedUrl, setNewFeedUrl, newFeedName, setNewFeedName,
  newKeyword, setNewKeyword, addFeed, removeFeed, addKeyword, removeKeyword,
}: Props) {
  return (
    <>
      <section>
        <SectionHeader id="interests" icon="interests" title="Interest Keywords" />
        <AnimatePresence>
          {activeSection === 'interests' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3 pt-2">
              <p className="text-[10px] text-foreground/25 leading-relaxed">
                Add keywords your AI will actively learn about and discuss.
              </p>
              <div className="flex gap-1.5">
                <input type="text" value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
                  placeholder="e.g. AI, music, cooking..." maxLength={50}
                  onKeyDown={e => e.key === 'Enter' && addKeyword()}
                  className="flex-1 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-3 py-2 text-xs text-foreground placeholder:text-foreground/20 outline-none focus:border-primary/20" />
                <button type="button" onClick={addKeyword} disabled={!newKeyword.trim()}
                  className="rounded-lg bg-primary/10 text-primary/80 px-3 py-2 text-xs disabled:opacity-30">
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {keywords.map(k => (
                  <span key={k.id}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/8 border border-primary/10 px-2.5 py-1 text-[10px] text-primary/70">
                    {k.keyword}
                    <button type="button" onClick={() => removeKeyword(k.id)}
                      className="text-foreground/20 hover:text-destructive/60 transition">
                      <span className="material-icons-round text-[10px]">close</span>
                    </button>
                  </span>
                ))}
                {keywords.length === 0 && <p className="text-[10px] text-foreground/15">No keywords yet</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <div className="h-px bg-foreground/[0.04]" />

      <section>
        <SectionHeader id="feeds" icon="rss_feed" title="RSS Feeds" />
        <AnimatePresence>
          {activeSection === 'feeds' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3 pt-2">
              <div className="space-y-1.5">
                <input type="url" value={newFeedUrl} onChange={e => setNewFeedUrl(e.target.value)}
                  placeholder="Feed URL (https://...)" maxLength={500}
                  className="w-full rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-3 py-2 text-xs text-foreground placeholder:text-foreground/20 outline-none focus:border-primary/20" />
                <div className="flex gap-1.5">
                  <input type="text" value={newFeedName} onChange={e => setNewFeedName(e.target.value)}
                    placeholder="Feed name (optional)" maxLength={50}
                    className="flex-1 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-3 py-2 text-xs text-foreground placeholder:text-foreground/20 outline-none focus:border-primary/20" />
                  <button type="button" onClick={addFeed} disabled={!newFeedUrl.trim()}
                    className="rounded-lg bg-primary/10 text-primary/80 px-3 py-2 text-xs disabled:opacity-30">
                    Add
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                {feeds.map(f => (
                  <div key={f.id}
                    className="flex items-center justify-between rounded-lg bg-foreground/[0.02] border border-foreground/[0.04] px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-foreground/70 truncate">{f.feed_name || f.feed_url}</p>
                      {f.feed_name && <p className="text-[9px] text-foreground/20 truncate">{f.feed_url}</p>}
                    </div>
                    <button type="button" onClick={() => removeFeed(f.id)}
                      className="text-foreground/15 hover:text-destructive/60 transition ml-2">
                      <span className="material-icons-round text-sm">delete_outline</span>
                    </button>
                  </div>
                ))}
                {feeds.length === 0 && <p className="text-[10px] text-foreground/15">No feeds yet</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </>
  );
}
