/**
 * 프로필 커스터마이징 컴포넌트
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/integrations/supabase/client';

const BANNER_GRADIENTS = [
  { label: 'Indigo', value: 'from-indigo-500/30 to-primary/20' },
  { label: 'Emerald', value: 'from-[hsl(var(--success))]/30 to-teal-500/20' },
  { label: 'Rose', value: 'from-rose-500/30 to-pink-500/20' },
  { label: 'Amber', value: 'from-amber-500/30 to-orange-500/20' },
  { label: 'Cyan', value: 'from-cyan-500/30 to-blue-500/20' },
  { label: 'Slate', value: 'from-slate-500/30 to-gray-500/20' },
];

const STATUS_MESSAGES = [
  '🌟 Evolving & Learning',
  '💭 Deep in Thought',
  '🎯 On a Mission',
  '🌙 Dreaming',
  '⚡ Full Power',
  '🎨 Creating',
  '📚 Studying',
  '🏖️ Relaxing',
];

const PROFILE_BADGES = ['🔥', '⭐', '💎', '🏆', '🎭', '🌈', '👑', '🦋', '🐉', '🌸', '❄️', '🎵'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  agent: any;
  onUpdate: (agent: any) => void;
}

export function ProfileCustomizer({ isOpen, onClose, agent, onUpdate }: Props) {
  const settings = (agent?.settings as any) ?? {};
  const profile = settings.profileCustom ?? {};

  const [banner, setBanner] = useState(profile.banner ?? BANNER_GRADIENTS[0].value);
  const [statusMsg, setStatusMsg] = useState(profile.statusMsg ?? STATUS_MESSAGES[0]);
  const [customStatus, setCustomStatus] = useState(profile.customStatus ?? '');
  const [badge, setBadge] = useState(profile.badge ?? '🌟');
  const [bio, setBio] = useState(profile.bio ?? '');

  const save = async () => {
    const profileCustom = { banner, statusMsg: customStatus || statusMsg, customStatus, badge, bio };
    const ns = { ...settings, profileCustom };
    await supabase.from('gyeol_agents' as any).update({ settings: ns } as any).eq('id', agent?.id);
    onUpdate({ ...agent, settings: ns });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed inset-x-4 bottom-4 top-auto z-[80] max-h-[80vh] overflow-y-auto glass-card rounded-2xl p-5 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span aria-hidden="true" className="material-icons-round text-primary text-base">palette</span>
                Profile Customization
              </h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary/20">
                <span aria-hidden="true" className="material-icons-round text-muted-foreground text-sm">close</span>
              </button>
            </div>

            {/* Preview */}
            <div className="glass-card rounded-2xl overflow-hidden mb-4">
              <div className={`h-14 bg-gradient-to-r ${banner}`} />
              <div className="px-4 pb-3 -mt-6 flex items-end gap-3">
                <div className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-lg relative">
                  {badge}
                  <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[hsl(var(--success,142_71%_45%))] border-2 border-card" />
                </div>
                <div className="pb-1">
                  <p className="text-[11px] font-bold text-foreground">{agent?.name ?? 'GYEOL'}</p>
                  <p className="text-[9px] text-muted-foreground">{customStatus || statusMsg}</p>
                </div>
              </div>
              {bio && <p className="px-4 pb-3 text-[10px] text-foreground/60">{bio}</p>}
            </div>

            {/* Banner */}
            <div className="space-y-2 mb-4">
              <p className="text-[10px] text-muted-foreground">Banner Color</p>
              <div className="grid grid-cols-3 gap-2">
                {BANNER_GRADIENTS.map(g => (
                  <button key={g.value} onClick={() => setBanner(g.value)}
                    className={`h-8 rounded-lg bg-gradient-to-r ${g.value} transition ${banner === g.value ? 'ring-2 ring-primary' : ''}`} />
                ))}
              </div>
            </div>

            {/* Badge */}
            <div className="space-y-2 mb-4">
              <p className="text-[10px] text-muted-foreground">Profile Badge</p>
              <div className="flex gap-1 flex-wrap">
                {PROFILE_BADGES.map(b => (
                  <button key={b} onClick={() => setBadge(b)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${badge === b ? 'glass-card-selected' : 'glass-card'}`}>
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2 mb-4">
              <p className="text-[10px] text-muted-foreground">Status Message</p>
              <div className="flex gap-1 flex-wrap">
                {STATUS_MESSAGES.map(s => (
                  <button key={s} onClick={() => { setStatusMsg(s); setCustomStatus(''); }}
                    className={`px-2 py-1 rounded-full text-[9px] transition ${statusMsg === s && !customStatus ? 'bg-primary/20 text-primary' : 'glass-card text-muted-foreground'}`}>
                    {s}
                  </button>
                ))}
              </div>
              <input type="text" value={customStatus} onChange={e => setCustomStatus(e.target.value)}
                placeholder="Or type your own status..."
                maxLength={50}
                className="w-full rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-3 py-2 text-[11px] text-foreground placeholder:text-foreground/20 outline-none" />
            </div>

            {/* Bio */}
            <div className="space-y-2 mb-4">
              <p className="text-[10px] text-muted-foreground">Bio</p>
              <textarea value={bio} onChange={e => setBio(e.target.value)}
                placeholder="Tell the world about your AI companion..."
                maxLength={150} rows={2}
                className="w-full rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-3 py-2 text-[11px] text-foreground placeholder:text-foreground/20 outline-none resize-none" />
            </div>

            <button onClick={save}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-bold">
              Save Profile
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
