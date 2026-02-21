/**
 * Inventory 패널 — Owned 아이템 관리, Equip/Use
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import { useGyeolStore } from '@/store/gyeol-store';

interface InventoryItem {
  id: string;
  item_id: string;
  quantity: number;
  is_equipped: boolean;
  acquired_at: string;
}

interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
  item_data: Record<string, any>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  shopItems: ShopItem[];
  onReload: () => void;
}

export function InventoryPanel({ isOpen, onClose, inventory, shopItems, onReload }: Props) {
  const agent = useGyeolStore((s) => s.agent);
  const { setAgent } = useGyeolStore();
  const [using, setUsing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'quantity'>('recent');
  const [filterCat, setFilterCat] = useState<string>('all');

  // Get unique categories from items
  const categories = ['all', ...new Set(inventory.map(inv => {
    const item = shopItems.find(s => s.id === inv.item_id);
    return item?.category ?? 'other';
  }))];

  // Sort and filter
  const sortedInventory = [...inventory]
    .filter(inv => {
      if (filterCat === 'all') return true;
      const item = shopItems.find(s => s.id === inv.item_id);
      return item?.category === filterCat;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = shopItems.find(s => s.id === a.item_id)?.name ?? '';
        const nameB = shopItems.find(s => s.id === b.item_id)?.name ?? '';
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'quantity') return b.quantity - a.quantity;
      return new Date(b.acquired_at).getTime() - new Date(a.acquired_at).getTime();
    });

  const handleUse = async (inv: InventoryItem) => {
    if (!agent?.id || using) return;
    setUsing(inv.id);
    const item = shopItems.find(s => s.id === inv.item_id);
    if (!item) { setUsing(null); return; }

    try {
      const itemData = item.item_data ?? {};

      // Apply item effects based on category
      if (item.category === 'cosmetic' || item.category === 'skin') {
        // Toggle equip
        const newEquipped = !inv.is_equipped;
        await supabase.from('gyeol_inventory')
          .update({ is_equipped: newEquipped })
          .eq('id', inv.id);
        setMessage(newEquipped ? `${item.name} Equip! ✨` : `${item.name} 해제`);
      } else if (item.category === 'boost') {
        // Consume: reduce quantity
        if (inv.quantity <= 1) {
          await supabase.from('gyeol_inventory').delete().eq('id', inv.id);
        } else {
          await supabase.from('gyeol_inventory')
            .update({ quantity: inv.quantity - 1 })
            .eq('id', inv.id);
        }

        // Apply boost effects
        if (itemData.exp_boost) {
          await supabase.from('gyeol_gamification_profiles')
            .update({ exp: (agent as any).exp + (itemData.exp_boost as number) })
            .eq('agent_id', agent.id);
        }
        if (itemData.evolution_boost) {
          const newProgress = Math.min(100, Number(agent.evolution_progress ?? 0) + (itemData.evolution_boost as number));
          await supabase.from('gyeol_agents')
            .update({ evolution_progress: newProgress })
            .eq('id', agent.id);
          setAgent({ ...agent, evolution_progress: newProgress } as any);
        }
        setMessage(`${item.name} Use! 🎉`);
      } else {
        // Generic: toggle equip
        const newEquipped = !inv.is_equipped;
        await supabase.from('gyeol_inventory')
          .update({ is_equipped: newEquipped })
          .eq('id', inv.id);
        setMessage(newEquipped ? `${item.name} Equip!` : `${item.name} 해제`);
      }

      onReload();
    } catch {
      setMessage('Use 실패');
    }
    setUsing(null);
    setTimeout(() => setMessage(null), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-full max-w-md max-h-[80vh] glass-panel rounded-t-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 pt-4 pb-3 border-b border-border/20">
              <div className="w-10 h-1 rounded-full bg-border/40 mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>📦</span> Inventory
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{inventory.length}개</span>
                </h2>
                <button onClick={onClose} className="text-muted-foreground/50 hover:text-foreground transition p-1">
                  <span aria-hidden="true" className="material-icons-round text-lg">close</span>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[65vh] px-4 py-3 space-y-2 gyeol-scrollbar-hide">
              {message && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="text-center py-2 text-sm font-medium text-[hsl(var(--success,142_71%_45%))]">{message}</motion.div>
              )}

              {/* Sort & filter controls */}
              {inventory.length > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-1 flex-1 overflow-x-auto gyeol-scrollbar-hide">
                    {categories.map(cat => (
                      <button key={cat} onClick={() => setFilterCat(cat)}
                        className={`px-2 py-1 rounded-lg text-[9px] font-medium whitespace-nowrap transition ${
                          filterCat === cat ? 'bg-primary/20 text-primary' : 'glass-card text-muted-foreground'
                        }`}>{cat === 'all' ? '전체' : cat === 'boost' ? '부스터' : cat === 'cosmetic' ? '꾸미기' : cat}</button>
                    ))}
                  </div>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                    className="bg-transparent text-[9px] text-muted-foreground border border-border/20 rounded-lg px-1.5 py-1">
                    <option value="recent">최신순</option>
                    <option value="name">이름순</option>
                    <option value="quantity">수량순</option>
                  </select>
                </div>
              )}

              {sortedInventory.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-3xl">📦</span>
                  <p className="text-[11px] text-muted-foreground/50 mt-2">
                    {inventory.length === 0 ? '아이템이 없어요' : '해당 카테고리에 아이템이 없어요'}
                  </p>
                  <p className="text-[10px] text-muted-foreground/30 mt-1">Shop에서 아이템을 구매해보세요</p>
                </div>
              ) : (
                sortedInventory.map(inv => {
                  const item = shopItems.find(s => s.id === inv.item_id);
                  return (
                    <motion.div key={inv.id} layout
                      className={`glass-card rounded-xl p-3 flex items-center gap-3 ${inv.is_equipped ? 'glass-card-selected' : ''}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        inv.is_equipped ? 'bg-gradient-to-br from-primary/20 to-secondary/20' : 'bg-primary/10'
                      }`}>
                        <span aria-hidden="true" className="material-icons-round text-lg text-primary">{item?.icon ?? 'inventory_2'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-foreground">{item?.name ?? '아이템'}</span>
                          {inv.is_equipped && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">Equip중</span>
                          )}
                        </div>
                        <p className="text-[9px] text-muted-foreground truncate">{item?.description ?? ''}</p>
                        <span className="text-[9px] text-muted-foreground">x{inv.quantity}</span>
                      </div>
                      <button
                        onClick={() => handleUse(inv)}
                        disabled={using === inv.id}
                        className={`text-[9px] px-3 py-1.5 rounded-full font-medium transition ${
                          inv.is_equipped
                            ? 'bg-muted/20 text-muted-foreground'
                            : 'bg-gradient-to-r from-primary to-secondary text-primary-foreground'
                        }`}
                      >
                        {using === inv.id ? '...' : inv.is_equipped ? '해제' : item?.category === 'boost' ? 'Use' : 'Equip'}
                      </button>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
