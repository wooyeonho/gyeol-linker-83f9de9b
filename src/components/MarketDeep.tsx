import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, Star, TrendingUp, Tag, Palette, Code, BarChart3, Megaphone, Gift, RefreshCw, ThumbsUp, ThumbsDown, ExternalLink } from 'lucide-react';

export function SkinPreviewCard({ skin, onBuy, onWishlist }: {
  skin: { id: string; name: string; preview_url: string | null; price: number; rating: number; downloads: number; creator: string; category: string | null; isNew?: boolean; discount?: number };
  onBuy: () => void;
  onWishlist: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl glass-card overflow-hidden">
      <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 to-secondary/5 relative flex items-center justify-center">
        {skin.preview_url ? (
          <img src={skin.preview_url} alt={skin.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <Palette className="w-8 h-8 text-primary/30" />
        )}
        {skin.isNew && (
          <span className="absolute top-2 left-2 text-[7px] px-1.5 py-0.5 rounded-full bg-primary text-background font-bold">NEW</span>
        )}
        {skin.discount && skin.discount > 0 && (
          <span className="absolute top-2 right-2 text-[7px] px-1.5 py-0.5 rounded-full bg-destructive text-background font-bold">-{skin.discount}%</span>
        )}
      </div>
      <div className="p-2.5 space-y-1.5">
        <p className="text-[10px] font-medium text-foreground truncate">{skin.name}</p>
        <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
          <span>by {skin.creator}</span>
          {skin.category && <span className="px-1 py-0.5 rounded bg-muted/10">{skin.category}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-[hsl(var(--warning))]">{'⭐'.repeat(Math.round(skin.rating))}</span>
          <span className="text-[8px] text-muted-foreground">{skin.downloads} downloads</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onBuy}
            className="flex-1 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition text-center">
            {skin.discount ? (
              <><s className="text-muted-foreground">{skin.price}</s> {Math.round(skin.price * (1 - skin.discount / 100))} 🪙</>
            ) : (
              <>{skin.price} 🪙</>
            )}
          </button>
          <button onClick={onWishlist}
            className="p-1.5 rounded-lg glass-card text-muted-foreground hover:text-primary transition">
            <Star className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function SkinEditor({ onSave }: { onSave: (data: any) => void }) {
  const [name, setName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#8b5cf6');
  const [secondaryColor, setSecondaryColor] = useState('#06b6d4');
  const [glowIntensity, setGlowIntensity] = useState(0.5);

  return (
    <div className="space-y-3">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <Palette className="w-3.5 h-3.5 text-primary" /> Skin Editor
      </h4>
      <div>
        <label className="text-[9px] text-muted-foreground mb-0.5 block">Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Skin name"
          className="w-full bg-muted/10 border border-border/20 rounded-lg px-2 py-1.5 text-[10px] text-foreground outline-none" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] text-muted-foreground mb-0.5 block">Primary</label>
          <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
            className="w-full h-8 rounded-lg cursor-pointer" />
        </div>
        <div>
          <label className="text-[9px] text-muted-foreground mb-0.5 block">Secondary</label>
          <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
            className="w-full h-8 rounded-lg cursor-pointer" />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-[9px] mb-0.5">
          <span className="text-muted-foreground">Glow</span>
          <span className="text-primary">{(glowIntensity * 100).toFixed(0)}%</span>
        </div>
        <input type="range" min={0} max={1} step={0.05} value={glowIntensity}
          onChange={e => setGlowIntensity(Number(e.target.value))}
          className="w-full h-1 rounded-full bg-muted/20 accent-primary appearance-none cursor-pointer" />
      </div>
      <div className="aspect-square max-w-[120px] mx-auto rounded-full relative" style={{
        background: `radial-gradient(circle, ${primaryColor}60, ${secondaryColor}30, transparent)`,
        boxShadow: `0 0 ${glowIntensity * 40}px ${primaryColor}40`,
      }}>
        <div className="absolute inset-0 flex items-center justify-center text-foreground/60 text-[10px]">Preview</div>
      </div>
      <button onClick={() => onSave({ name, primaryColor, secondaryColor, glowIntensity })}
        disabled={!name.trim()}
        className="w-full py-2 rounded-xl bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition disabled:opacity-40">
        Save Skin
      </button>
    </div>
  );
}

export function MarketSearch({ onSearch, onSort }: { onSearch: (q: string) => void; onSort: (sort: string) => void }) {
  const [query, setQuery] = useState('');
  const [sortOpen, setSortOpen] = useState(false);
  const sorts = ['Popular', 'Newest', 'Price: Low', 'Price: High', 'Rating'];

  return (
    <div className="flex gap-2">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
        <input type="text" value={query} onChange={e => { setQuery(e.target.value); onSearch(e.target.value); }}
          placeholder="Search market..."
          className="w-full bg-muted/10 border border-border/20 rounded-xl pl-8 pr-3 py-2 text-[10px] text-foreground outline-none" />
      </div>
      <div className="relative">
        <button onClick={() => setSortOpen(!sortOpen)}
          className="p-2 rounded-xl glass-card text-muted-foreground hover:text-foreground transition">
          <SlidersHorizontal className="w-4 h-4" />
        </button>
        <AnimatePresence>
          {sortOpen && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="absolute top-full mt-1 right-0 z-50 glass-card rounded-xl p-1 shadow-xl">
              {sorts.map(s => (
                <button key={s} onClick={() => { onSort(s.toLowerCase()); setSortOpen(false); }}
                  className="block w-full text-left px-3 py-1.5 rounded-lg text-[9px] text-foreground/60 hover:bg-muted/20 transition">
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function SkillTestPanel({ skill, onTest }: { skill: { name: string; description: string }; onTest: () => void }) {
  const [result, setResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    onTest();
    await new Promise(r => setTimeout(r, 1500));
    setResult(`Skill "${skill.name}" executed successfully!`);
    setTesting(false);
  };

  return (
    <div className="p-3 rounded-xl glass-card space-y-2">
      <div className="flex items-center gap-2">
        <Code className="w-4 h-4 text-primary" />
        <div>
          <p className="text-[10px] font-medium text-foreground">{skill.name}</p>
          <p className="text-[8px] text-muted-foreground">{skill.description}</p>
        </div>
      </div>
      <button onClick={handleTest} disabled={testing}
        className="w-full py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition disabled:opacity-40">
        {testing ? 'Testing...' : 'Test Skill'}
      </button>
      {result && <p className="text-[9px] text-primary/70">{result}</p>}
    </div>
  );
}

export function SkillDependencyGraph({ skill, dependencies }: { skill: string; dependencies: string[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground">Dependencies</h4>
      <div className="space-y-1">
        {dependencies.length === 0 ? (
          <p className="text-[9px] text-muted-foreground/50">No dependencies</p>
        ) : (
          dependencies.map((dep, i) => (
            <div key={i} className="flex items-center gap-2 text-[9px]">
              <div className="w-1 h-1 rounded-full bg-primary" />
              <span className="text-foreground/60">{dep}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function SellerDashboard({ stats }: { stats: { totalSales: number; totalRevenue: number; avgRating: number; totalItems: number } }) {
  return (
    <div className="space-y-3">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <BarChart3 className="w-3.5 h-3.5 text-primary" /> Seller Dashboard
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Total Sales', value: stats.totalSales, icon: '📦' },
          { label: 'Revenue', value: `${stats.totalRevenue} 🪙`, icon: '💰' },
          { label: 'Avg Rating', value: stats.avgRating.toFixed(1), icon: '⭐' },
          { label: 'Items Listed', value: stats.totalItems, icon: '🏷️' },
        ].map(s => (
          <div key={s.label} className="p-2 rounded-xl glass-card text-center">
            <span className="text-sm">{s.icon}</span>
            <p className="text-[11px] font-bold text-primary mt-0.5">{s.value}</p>
            <p className="text-[8px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarketBanner({ banner }: { banner: { title: string; subtitle: string; bgColor: string } }) {
  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/20 to-secondary/10 border border-primary/10 space-y-1">
      <p className="text-[12px] font-bold text-foreground">{banner.title}</p>
      <p className="text-[10px] text-foreground/60">{banner.subtitle}</p>
    </div>
  );
}

export function ReviewCard({ review, onHelpful }: {
  review: { author: string; rating: number; content: string; date: string; helpful: number };
  onHelpful: () => void;
}) {
  return (
    <div className="p-3 rounded-xl glass-card space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-foreground">{review.author}</span>
        <span className="text-[9px] text-[hsl(var(--warning))]">{'⭐'.repeat(review.rating)}</span>
      </div>
      <p className="text-[9px] text-foreground/70 leading-relaxed">{review.content}</p>
      <div className="flex items-center justify-between text-[8px]">
        <span className="text-muted-foreground">{review.date}</span>
        <button onClick={onHelpful} className="flex items-center gap-0.5 text-muted-foreground hover:text-primary transition">
          <ThumbsUp className="w-2.5 h-2.5" /> Helpful ({review.helpful})
        </button>
      </div>
    </div>
  );
}

export function RefundPolicy() {
  return (
    <div className="p-3 rounded-xl glass-card space-y-2">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <RefreshCw className="w-3.5 h-3.5 text-primary" /> Refund Policy
      </h4>
      <ul className="space-y-1 text-[9px] text-foreground/60">
        <li className="flex items-start gap-1"><span className="text-primary mt-0.5">•</span> Refunds within 24 hours of purchase</li>
        <li className="flex items-start gap-1"><span className="text-primary mt-0.5">•</span> Item must not have been used</li>
        <li className="flex items-start gap-1"><span className="text-primary mt-0.5">•</span> Full refund to coin balance</li>
        <li className="flex items-start gap-1"><span className="text-primary mt-0.5">•</span> One refund per item per account</li>
      </ul>
    </div>
  );
}
