import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/src/integrations/supabase/client';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { useAuth } from '@/src/hooks/useAuth';
import { useGamification } from '@/src/hooks/useGamification';
import { BottomNav } from '../components/BottomNav';
import { PurchaseConfirmModal } from '../components/PurchaseConfirmModal';
import { showToast } from '../components/Toast';
import { SkinPreviewCard, MarketSearch } from '@/src/components/MarketDeep';

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
  const { profile, reload: reloadGamification } = useGamification();

  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Other');
  const [uploading, setUploading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const categories = ['All', 'Themes', 'Visual', 'Special'];

  const [confirmSkin, setConfirmSkin] = useState<SkinItem | null>(null);
  const [purchasing, setPurchasing] = useState(false);

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

  const handlePurchaseAndApply = async (skin: SkinItem) => {
    if (!agent?.id || applying || purchasing) return;
    setPurchasing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast({ type: 'warning', title: 'Login required' });
        setPurchasing(false);
        return;
      }

      // Use server-side Edge Function for secure purchase
      const res = await supabase.functions.invoke('market-purchase', {
        body: { action: 'buy_skin', agentId: agent.id, skinId: skin.id },
      });

      if (res.error || res.data?.error) {
        showToast({ type: 'warning', title: res.data?.error || 'Purchase failed' });
        setPurchasing(false);
        return;
      }

      setAppliedId(skin.id);
      showToast({ type: 'success', title: 'Skin applied!', message: skin.price > 0 ? `${skin.price} GP deducted` : 'Free skin equipped' });
      reloadGamification();
    } catch (err) {
      console.warn('Failed to apply skin:', err);
      showToast({ type: 'warning', title: 'Failed to apply skin' });
    }
    setApplying(null);
    setPurchasing(false);
    setConfirmSkin(null);
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
        const { error: uploadError } = await supabase.storage.from('skin-previews').upload(path, previewFile, { contentType: previewFile.type });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('skin-previews').getPublicUrl(path);
          uploadedUrl = urlData?.publicUrl ?? null;
        }
      }
      await supabase.from('gyeol_skins' as any).insert({
        name: uploadName.trim(), description: uploadDesc.trim() || null, category: uploadCategory,
        creator_id: user.id, is_approved: false, price: 0, preview_url: uploadedUrl,
      } as any);
      setUploadName(''); setUploadDesc(''); setPreviewFile(null); setPreviewUrl(null); setShowUpload(false);
      showToast({ type: 'success', title: 'Skin submitted for review!' });
    } catch (err) { console.warn('Failed to upload skin:', err); }
    setUploading(false);
  };

  const filteredSkins = skins.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-background font-display pb-20 relative">
      <div className="aurora-bg" />
      <div className="max-w-md mx-auto p-5 pt-6 space-y-4 relative z-10">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Market</h1>
            <p className="text-xs text-muted-foreground mt-1">Customize your AI's appearance</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Coin balance */}
            {profile && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full glass-card text-xs">
                <span className="material-icons-round text-[hsl(var(--warning))] text-sm">monetization_on</span>
                <span className="font-medium text-foreground">{profile.coins.toLocaleString()}</span>
              </div>
            )}
            {user && (
              <button type="button" onClick={() => setShowUpload(!showUpload)}
                className="flex items-center gap-1 rounded-lg bg-primary/10 text-primary px-3 py-1.5 text-xs font-medium hover:bg-primary/20 transition">
                <span className="material-icons-round text-sm">add</span>
                Submit
              </button>
            )}
          </div>
        </header>

        {/* Upload Form */}
        <AnimatePresence>
          {showUpload && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="glass-card rounded-2xl p-4 space-y-3">
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
                  {previewUrl && <img src={previewUrl} alt="Preview" className="w-full h-24 object-cover rounded-lg border border-border/30" />}
                </div>
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
          <Link to="/market/skills" className="flex-1 py-2 rounded-lg text-center text-xs font-medium text-muted-foreground hover:text-foreground transition">Skills</Link>
          <Link to="/market/skins" className="flex-1 py-2 rounded-full text-center text-xs font-medium bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg shadow-primary/25 transition">Skins</Link>
        </div>

        {/* Hero Banner */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/10" />
          <div className="relative z-10">
            <span className="text-[8px] px-2 py-0.5 rounded-full bg-secondary text-foreground font-bold uppercase tracking-wider">NEW ARRIVAL</span>
            <h2 className="text-xl font-bold text-foreground mt-2">Featured Skin</h2>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px]">Transform your companion's visual identity.</p>
            <button className="mt-3 px-4 py-2 rounded-full glass-card text-[11px] text-secondary font-medium border border-secondary/30">
              Browse Collection
            </button>
          </div>
        </div>

        {/* B16: Market Search */}
        <MarketSearch
          onSearch={(q) => setSearchQuery(q)}
          onSort={(sort) => console.log('Sort by:', sort)}
        />

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
        ) : filteredSkins.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="material-icons-round text-primary/40 text-2xl">palette</span>
            </div>
            <p className="text-sm text-foreground/60 font-medium">No skins found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filteredSkins.map((s, i) => {
              const isApplied = appliedId === s.id;
              const isApplying = applying === s.id;
              return (
                <motion.div key={s.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                  className="glass-card rounded-2xl p-0 overflow-hidden">
                  <div className="aspect-square bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center relative overflow-hidden">
                    {s.preview_url ? (
                      <img src={s.preview_url} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      <motion.div className="w-10 h-10 rounded-full pearl-sphere"
                        animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }} />
                    )}
                    {isApplied && (
                      <div className="absolute top-2 right-2 text-[8px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">Equipped</div>
                    )}
                  </div>
                  <div className="p-3 space-y-1.5">
                    <p className="font-medium text-foreground text-xs truncate">{s.name}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{s.description ?? '-'}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-primary text-[10px] font-medium">
                        {s.price === 0 ? 'Free' : (
                          <span className="flex items-center gap-0.5">
                            <span className="material-icons-round text-[hsl(var(--warning))] text-[10px]">monetization_on</span>
                            {s.price}
                          </span>
                        )}
                      </span>
                      <span className="text-[9px] text-muted-foreground">★ {s.rating}</span>
                    </div>
                    <button type="button" onClick={() => setConfirmSkin(s)}
                      disabled={isApplied || isApplying}
                      className={`w-full py-1.5 rounded-lg text-[10px] font-medium transition ${
                        isApplied ? 'bg-secondary text-muted-foreground cursor-default' : 'bg-primary text-primary-foreground hover:brightness-110'
                      } ${isApplying ? 'opacity-50' : ''}`}>
                      {isApplying ? 'Applying...' : isApplied ? '✓ Applied' : s.price > 0 ? `Buy & Apply` : 'Apply'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <PurchaseConfirmModal
        open={!!confirmSkin}
        onClose={() => setConfirmSkin(null)}
        onConfirm={() => { if (confirmSkin) handlePurchaseAndApply(confirmSkin); }}
        itemName={confirmSkin?.name ?? ''}
        itemPrice={confirmSkin?.price ?? 0}
        itemDescription={confirmSkin?.description ?? undefined}
        currentBalance={profile?.coins ?? 0}
        loading={purchasing}
      />
      <BottomNav />
    </main>
  );
}
