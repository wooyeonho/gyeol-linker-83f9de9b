import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { useAuth } from '@/src/hooks/useAuth';
import { BottomNav } from '../components/BottomNav';

interface SkinItem {
  id: string; name: string; description: string | null; price: number;
  preview_url: string | null; rating: number; downloads: number; category: string | null;
}

const SKIN_CATEGORIES = ['Abstract', 'Nature', 'Cyberpunk', 'Minimal', 'Anime', 'Other'] as const;

export default function MarketSkinsPage() {
  const [skins, setSkins] = useState<SkinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const { agent } = useInitAgent();
  const { user } = useAuth();

  // Upload form
  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Other');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (agent?.skin_id) setAppliedId(agent.skin_id as string);
  }, [agent?.skin_id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('gyeol_skins' as any)
        .select('id, name, description, price, preview_url, rating, downloads, category')
        .eq('is_approved', true).order('downloads', { ascending: false }).limit(50);
      setSkins((data as any[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const handleApply = async (skin: SkinItem) => {
    if (!agent?.id || applying) return;
    setApplying(skin.id);
    try {
      await supabase.from('gyeol_agents' as any)
        .update({ skin_id: skin.id } as any)
        .eq('id', agent.id);
      await supabase.from('gyeol_agent_skins' as any)
        .upsert({ agent_id: agent.id, skin_id: skin.id, is_equipped: true } as any,
          { onConflict: 'agent_id,skin_id' });
      setAppliedId(skin.id);
    } catch (err) {
      console.warn('Failed to apply skin:', err);
    }
    setApplying(null);
  };

  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!user || !uploadName.trim() || uploading) return;
    setUploading(true);
    try {
      let uploadedUrl: string | null = null;
      if (previewFile) {
        const ext = previewFile.name.split('.').pop() ?? 'png';
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('skin-previews')
          .upload(path, previewFile, { contentType: previewFile.type });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('skin-previews').getPublicUrl(path);
          uploadedUrl = urlData?.publicUrl ?? null;
        }
      }
      await supabase.from('gyeol_skins' as any).insert({
        name: uploadName.trim(),
        description: uploadDesc.trim() || null,
        category: uploadCategory,
        creator_id: user.id,
        is_approved: false,
        price: 0,
        preview_url: uploadedUrl,
      } as any);
      setUploadName('');
      setUploadDesc('');
      setPreviewFile(null);
      setPreviewUrl(null);
      setShowUpload(false);
    } catch (err) {
      console.warn('Failed to upload skin:', err);
    }
    setUploading(false);
  };

  return (
    <main className="min-h-screen bg-background font-display pb-20">
      <div className="max-w-md mx-auto p-5 pt-6 space-y-5">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Market</h1>
            <p className="text-xs text-muted-foreground mt-1">Customize your AI's appearance</p>
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
                <p className="text-xs font-medium text-foreground/70">Submit a Skin</p>
                <input type="text" placeholder="Skin name" value={uploadName} onChange={e => setUploadName(e.target.value)} maxLength={50}
                  className="w-full rounded-lg bg-secondary/50 border border-border/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40" />
                <textarea placeholder="Description (optional)" value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} maxLength={200} rows={2}
                  className="w-full rounded-lg bg-secondary/50 border border-border/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 resize-none" />
                <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}
                  className="w-full rounded-lg bg-secondary/50 border border-border/30 px-3 py-2 text-sm text-foreground outline-none">
                  {SKIN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Preview Image (optional)</label>
                  <input type="file" accept="image/*" onChange={handleFileChange}
                    className="w-full text-xs text-muted-foreground file:mr-2 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:px-3 file:py-1.5 file:text-xs file:font-medium" />
                  {previewUrl && (
                    <img src={previewUrl} alt="Preview" className="w-full h-24 object-cover rounded-lg border border-border/30" />
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowUpload(false)} className="flex-1 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground transition">Cancel</button>
                  <button type="button" onClick={handleUpload} disabled={!uploadName.trim() || uploading}
                    className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 transition">
                    {uploading ? 'Submitting...' : 'Submit for Review'}
                  </button>
                </div>
                <p className="text-[9px] text-muted-foreground text-center">Submitted skins will be reviewed before appearing in the market</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-1 bg-secondary/50 rounded-xl p-1">
          <Link to="/market/skills"
            className="flex-1 py-2 rounded-lg text-center text-xs font-medium text-muted-foreground hover:text-foreground transition">
            Skills
          </Link>
          <Link to="/market/skins"
            className="flex-1 py-2 rounded-lg text-center text-xs font-medium bg-primary text-primary-foreground shadow-glow-xs transition">
            Skins
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {skins.map((s, i) => {
              const isApplied = appliedId === s.id;
              const isApplying = applying === s.id;
              return (
                <motion.div key={s.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                  className="section-card !p-0 overflow-hidden">
                  <div className="aspect-square bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center relative overflow-hidden">
                    {s.preview_url ? (
                      <img src={s.preview_url} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      <motion.div className="w-10 h-10 rounded-full pearl-sphere"
                        animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }} />
                    )}
                    {isApplied && (
                      <div className="absolute top-2 right-2 text-[8px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">
                        Equipped
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-1.5">
                    <p className="font-medium text-foreground text-xs truncate">{s.name}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{s.description ?? '-'}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-primary text-[10px] font-medium">{s.price === 0 ? 'Free' : `${s.price}P`}</span>
                      <span className="text-[9px] text-muted-foreground">★ {s.rating}</span>
                    </div>
                    <button type="button" onClick={() => handleApply(s)}
                      disabled={isApplied || isApplying}
                      className={`w-full py-1.5 rounded-lg text-[10px] font-medium transition shadow-glow-xs
                        ${isApplied
                          ? 'bg-secondary text-muted-foreground cursor-default'
                          : 'bg-primary text-primary-foreground hover:brightness-110'
                        } ${isApplying ? 'opacity-50' : ''}`}>
                      {isApplying ? 'Applying...' : isApplied ? '✓ Applied' : 'Apply'}
                    </button>
                  </div>
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
