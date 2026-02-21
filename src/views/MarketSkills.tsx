import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/src/integrations/supabase/client';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { useAuth } from '@/src/hooks/useAuth';
import { BottomNav } from '../components/BottomNav';
import { PurchaseConfirmModal } from '../components/PurchaseConfirmModal';

interface SkillItem {
  id: string; name: string; description: string | null; category: string | null;
  min_gen: number; price: number; rating: number; downloads: number;
}

const CATEGORIES_UPLOAD = ['Learning', 'Social', 'Creative', 'Utility', 'Security', 'Other'] as const;

export default function MarketSkillsPage() {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [installing, setInstalling] = useState<string | null>(null);
  const { agent } = useInitAgent();
  const { user } = useAuth();

  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Other');
  const [uploading, setUploading] = useState(false);

  // Search & category
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const categories = ['All', 'Utility', 'Social', 'Creative'];

  // Purchase confirm
  const [confirmSkill, setConfirmSkill] = useState<SkillItem | null>(null);

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
      const { data } = await supabase.from('gyeol_agent_skills' as any).select('skill_id').eq('agent_id', agent.id);
      if (data) setInstalledIds(new Set((data as any[]).map((d: any) => d.skill_id)));
    })();
  }, [agent?.id]);

  // Track active/inactive state
  const [activeSkills, setActiveSkills] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!agent?.id) return;
    (async () => {
      const { data } = await supabase.from('gyeol_agent_skills' as any).select('skill_id, is_active').eq('agent_id', agent.id);
      if (data) {
        const map: Record<string, boolean> = {};
        for (const d of data as any[]) { map[d.skill_id] = d.is_active; }
        setActiveSkills(map);
      }
    })();
  }, [agent?.id]);

  const handleInstall = async (skill: SkillItem) => {
    if (!agent?.id || installing) return;
    setInstalling(skill.id);
    try {
      await supabase.from('gyeol_agent_skills' as any)
        .upsert({ agent_id: agent.id, skill_id: skill.id, is_active: true } as any, { onConflict: 'agent_id,skill_id' });
      setInstalledIds(prev => new Set(prev).add(skill.id));
      setActiveSkills(prev => ({ ...prev, [skill.id]: true }));
    } catch (err) { console.warn('Failed to install skill:', err); }
    setInstalling(null);
  };

  const toggleSkillActive = async (skillId: string) => {
    if (!agent?.id) return;
    const newActive = !(activeSkills[skillId] ?? true);
    setActiveSkills(prev => ({ ...prev, [skillId]: newActive }));
    await supabase.from('gyeol_agent_skills' as any)
      .update({ is_active: newActive } as any)
      .eq('agent_id', agent.id).eq('skill_id', skillId);
  };

  const handleUpload = async () => {
    if (!user || !uploadName.trim() || uploading) return;
    setUploading(true);
    try {
      await supabase.from('gyeol_skills' as any).insert({
        name: uploadName.trim(), description: uploadDesc.trim() || null, category: uploadCategory,
        creator_id: user.id, is_approved: false, price: 0, min_gen: 1,
      } as any);
      setUploadName(''); setUploadDesc(''); setShowUpload(false);
    } catch (err) { console.warn('Failed to upload skill:', err); }
    setUploading(false);
  };

  const filteredSkills = skills.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main role="main" className="min-h-screen bg-background font-display pb-20 relative">
      <div className="aurora-bg" />
      <div className="max-w-md mx-auto p-5 pt-6 space-y-4 relative z-10">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Market</h1>
            <p className="text-xs text-muted-foreground mt-1">Add new abilities to your AI</p>
          </div>
          {user && (
            <button type="button" onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-1 rounded-lg bg-primary/10 text-primary px-3 py-1.5 text-xs font-medium hover:bg-primary/20 transition">
              <span aria-hidden="true" className="material-icons-round text-sm">add</span>
              Submit
            </button>
          )}
        </header>

        {/* Upload Form */}
        <AnimatePresence>
          {showUpload && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="glass-card rounded-2xl p-4 space-y-3">
                <p className="text-xs font-medium text-foreground/70">Submit a Skill</p>
                <input type="text" placeholder="Skill name" value={uploadName} onChange={e => setUploadName(e.target.value)} maxLength={50}
                  className="w-full rounded-lg bg-secondary/50 border border-border/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40" />
                <textarea placeholder="Description (optional)" value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} maxLength={200} rows={2}
                  className="w-full rounded-lg bg-secondary/50 border border-border/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 resize-none" />
                <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}
                  className="w-full rounded-lg bg-secondary/50 border border-border/30 px-3 py-2 text-sm text-foreground outline-none">
                  {CATEGORIES_UPLOAD.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowUpload(false)} className="flex-1 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground transition">Cancel</button>
                  <button type="button" onClick={handleUpload} disabled={!uploadName.trim() || uploading}
                    className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 transition">
                    {uploading ? 'Submitting...' : 'Submit for Review'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skills/Skins tabs */}
        <div className="flex gap-1 bg-secondary/50 rounded-xl p-1">
          <Link to="/market/skills" className="flex-1 py-2 rounded-full text-center text-xs font-medium bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg shadow-primary/25 transition">Skills</Link>
          <Link to="/market/skins" className="flex-1 py-2 rounded-lg text-center text-xs font-medium text-muted-foreground hover:text-foreground transition">Skins</Link>
        </div>

        {/* Hero Banner */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-primary/10" />
          <div className="relative z-10">
            <span className="text-[8px] px-2 py-0.5 rounded-full bg-primary text-foreground font-bold uppercase tracking-wider">FEATURED</span>
            <h2 className="text-xl font-bold text-foreground mt-2">Featured Skill</h2>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px]">Expand your companion's abilities.</p>
            <button className="mt-3 px-4 py-2 rounded-full glass-card text-[11px] text-primary font-medium border border-primary/30">
              Explore Skills
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 glass-card rounded-full px-4 py-2.5">
          <span aria-hidden="true" className="material-icons-round text-muted-foreground text-lg">search</span>
          <input type="text" placeholder="Search skills..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto gyeol-scrollbar-hide">
          {categories.map(c => (
            <button key={c} onClick={() => setCategory(c.toLowerCase())}
              className={`px-4 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition ${
                category === c.toLowerCase()
                  ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground'
                  : 'glass-card text-muted-foreground'
              }`}>{c}</button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span aria-hidden="true" className="material-icons-round text-primary/40 text-2xl">extension</span>
            </div>
            <p className="text-sm text-foreground/60 font-medium">No skills found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSkills.map((s, i) => {
              const isInstalled = installedIds.has(s.id);
              const isInstalling = installing === s.id;
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="glass-card rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span aria-hidden="true" className="material-icons-round text-primary text-lg">extension</span>
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
                  {isInstalled ? (
                    <button type="button"
                      onClick={() => toggleSkillActive(s.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition shrink-0 ${
                        activeSkills[s.id] !== false ? 'bg-[hsl(var(--success,142_71%_45%)/0.2)] text-[hsl(var(--success,142_71%_45%))]' : 'bg-secondary text-muted-foreground'
                      }`}>
                      {activeSkills[s.id] !== false ? 'ON' : 'OFF'}
                    </button>
                  ) : (
                    <button type="button"
                      onClick={() => setConfirmSkill(s)}
                      disabled={isInstalling}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition shrink-0 bg-primary text-primary-foreground hover:brightness-110 ${isInstalling ? 'opacity-50' : ''}`}>
                      {isInstalling ? '...' : s.price === 0 ? 'Install' : `${s.price}P`}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <PurchaseConfirmModal
        open={!!confirmSkill}
        onClose={() => setConfirmSkill(null)}
        onConfirm={() => { if (confirmSkill) { handleInstall(confirmSkill); setConfirmSkill(null); } }}
        itemName={confirmSkill?.name ?? ''}
        itemPrice={confirmSkill?.price ?? 0}
        itemDescription={confirmSkill?.description ?? undefined}
      />
      <BottomNav />
    </main>
  );
}