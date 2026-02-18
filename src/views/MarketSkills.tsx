import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { useAuth } from '@/src/hooks/useAuth';
import { BottomNav } from '../components/BottomNav';

interface SkillItem {
  id: string; name: string; description: string | null; category: string | null;
  min_gen: number; price: number; rating: number; downloads: number;
}

const CATEGORIES = ['Learning', 'Social', 'Creative', 'Utility', 'Security', 'Other'] as const;

export default function MarketSkillsPage() {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [installing, setInstalling] = useState<string | null>(null);
  const { agent } = useInitAgent();
  const { user } = useAuth();

  // Upload form state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Other');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('gyeol_skills' as any)
        .select('id, name, description, category, min_gen, price, rating, downloads')
        .eq('is_approved', true).order('downloads', { ascending: false }).limit(50);
      setSkills((data as any[]) ?? []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!agent?.id) return;
    (async () => {
      const { data } = await supabase.from('gyeol_agent_skills' as any)
        .select('skill_id').eq('agent_id', agent.id);
      if (data) setInstalledIds(new Set((data as any[]).map((d: any) => d.skill_id)));
    })();
  }, [agent?.id]);

  const handleInstall = async (skill: SkillItem) => {
    if (!agent?.id || installing) return;
    setInstalling(skill.id);
    try {
      await supabase.from('gyeol_agent_skills' as any)
        .upsert({ agent_id: agent.id, skill_id: skill.id, is_active: true } as any,
          { onConflict: 'agent_id,skill_id' });
      setInstalledIds(prev => new Set(prev).add(skill.id));
    } catch { /* ignore */ }
    setInstalling(null);
  };

  const handleUpload = async () => {
    if (!user || !uploadName.trim() || uploading) return;
    setUploading(true);
    try {
      await supabase.from('gyeol_skills' as any).insert({
        name: uploadName.trim(),
        description: uploadDesc.trim() || null,
        category: uploadCategory,
        creator_id: user.id,
        is_approved: false,
        price: 0,
        min_gen: 1,
      } as any);
      setUploadName('');
      setUploadDesc('');
      setShowUpload(false);
    } catch { /* ignore */ }
    setUploading(false);
  };

  return (
    <main className="min-h-screen bg-background font-display pb-20">
      <div className="max-w-md mx-auto p-5 pt-6 space-y-5">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Market</h1>
            <p className="text-xs text-muted-foreground mt-1">Add new abilities to your AI</p>
          </div>
          {user && (
            <button type="button" onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-1 rounded-lg bg-primary/10 text-primary px-3 py-1.5 text-xs font-medium hover:bg-primary/20 transition">
              <span className="material-icons-round text-sm">add</span>
              Submit
            </button>
          )}
        </header>

        {/* Upload Form */}
        <AnimatePresence>
          {showUpload && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="section-card !p-4 space-y-3">
                <p className="text-xs font-medium text-foreground/70">Submit a Skill</p>
                <input type="text" placeholder="Skill name" value={uploadName} onChange={e => setUploadName(e.target.value)} maxLength={50}
                  className="w-full rounded-lg bg-secondary/50 border border-border/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40" />
                <textarea placeholder="Description (optional)" value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} maxLength={200} rows={2}
                  className="w-full rounded-lg bg-secondary/50 border border-border/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 resize-none" />
                <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}
                  className="w-full rounded-lg bg-secondary/50 border border-border/30 px-3 py-2 text-sm text-foreground outline-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowUpload(false)} className="flex-1 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground transition">Cancel</button>
                  <button type="button" onClick={handleUpload} disabled={!uploadName.trim() || uploading}
                    className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 transition">
                    {uploading ? 'Submitting...' : 'Submit for Review'}
                  </button>
                </div>
                <p className="text-[9px] text-muted-foreground text-center">Submitted skills will be reviewed before appearing in the market</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-1 bg-secondary/50 rounded-xl p-1">
          <Link to="/market/skills"
            className="flex-1 py-2 rounded-lg text-center text-xs font-medium bg-primary text-primary-foreground shadow-glow-xs transition">
            Skills
          </Link>
          <Link to="/market/skins"
            className="flex-1 py-2 rounded-lg text-center text-xs font-medium text-muted-foreground hover:text-foreground transition">
            Skins
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {skills.map((s, i) => {
              const isInstalled = installedIds.has(s.id);
              const isInstalling = installing === s.id;
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="section-card !p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-icons-round text-primary text-lg">extension</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-foreground text-sm">{s.name}</p>
                      {s.min_gen > 1 && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Gen {s.min_gen}+</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{s.description ?? '-'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{s.category ?? 'Other'}</span>
                      <span className="text-[9px] text-muted-foreground">★ {s.rating} · {s.downloads}x</span>
                    </div>
                  </div>
                  <button type="button"
                    onClick={() => handleInstall(s)}
                    disabled={isInstalled || isInstalling}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition shrink-0 shadow-glow-xs
                      ${isInstalled
                        ? 'bg-secondary text-muted-foreground cursor-default'
                        : 'bg-primary text-primary-foreground hover:brightness-110'
                      } ${isInstalling ? 'opacity-50' : ''}`}>
                    {isInstalling ? '...' : isInstalled ? '✓ Installed' : s.price === 0 ? 'Install' : `${s.price}P`}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
