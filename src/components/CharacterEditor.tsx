import { useState } from 'react';
import { motion } from 'framer-motion';
import { Palette, Sparkles, User, Shirt, Smile, Move, Image, Save } from 'lucide-react';

interface CharacterConfig {
  bodyColor: string;
  eyeStyle: string;
  accessory: string;
  expression: string;
  pose: string;
  costume: string;
  background: string;
}

const EYE_STYLES = ['round', 'star', 'heart', 'diamond', 'cat'];
const ACCESSORIES = ['none', 'hat', 'glasses', 'crown', 'headband', 'earring', 'scarf'];
const EXPRESSIONS = ['happy', 'cool', 'wink', 'surprised', 'sleepy', 'love', 'angry'];
const POSES = ['standing', 'sitting', 'waving', 'jumping', 'dancing', 'thinking', 'sleeping'];
const COSTUMES = ['default', 'casual', 'formal', 'sporty', 'fantasy', 'sci-fi', 'holiday'];
const BACKGROUNDS = ['none', 'stars', 'clouds', 'galaxy', 'forest', 'ocean', 'city'];

export function CharacterEditorPanel({ config, onChange, onSave }: {
  config: CharacterConfig;
  onChange: (c: CharacterConfig) => void;
  onSave: () => void;
}) {
  const [tab, setTab] = useState<'body' | 'face' | 'accessory' | 'pose' | 'costume' | 'bg'>('body');

  const tabs = [
    { id: 'body' as const, icon: <User className="w-3 h-3" />, label: 'Body' },
    { id: 'face' as const, icon: <Smile className="w-3 h-3" />, label: 'Face' },
    { id: 'accessory' as const, icon: <Sparkles className="w-3 h-3" />, label: 'Items' },
    { id: 'pose' as const, icon: <Move className="w-3 h-3" />, label: 'Pose' },
    { id: 'costume' as const, icon: <Shirt className="w-3 h-3" />, label: 'Outfit' },
    { id: 'bg' as const, icon: <Image className="w-3 h-3" />, label: 'BG' },
  ];

  return (
    <div className="space-y-3">
      <div className="aspect-square max-w-[180px] mx-auto rounded-2xl relative overflow-hidden"
        style={{ background: config.background !== 'none' ? `linear-gradient(135deg, ${config.bodyColor}20, transparent)` : undefined }}>
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-20 h-20 rounded-full relative"
            style={{ background: `radial-gradient(circle, ${config.bodyColor}, ${config.bodyColor}80)` }}>
            <div className="absolute top-1/3 left-1/4 w-2.5 h-2.5 rounded-full bg-background" />
            <div className="absolute top-1/3 right-1/4 w-2.5 h-2.5 rounded-full bg-background" />
            {config.expression === 'happy' && (
              <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-6 h-3 border-b-2 border-background rounded-b-full" />
            )}
            {config.accessory === 'crown' && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg">👑</div>
            )}
            {config.accessory === 'hat' && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-lg">🎩</div>
            )}
            {config.accessory === 'glasses' && (
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-sm">👓</div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[9px] font-medium whitespace-nowrap transition ${
              tab === t.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'body' && (
        <div className="space-y-2">
          <label className="text-[9px] text-muted-foreground">Body Color</label>
          <div className="flex gap-2 flex-wrap">
            {['#8b5cf6', '#06b6d4', '#f43f5e', '#10b981', '#f59e0b', '#ec4899', '#6366f1'].map(c => (
              <button key={c} onClick={() => onChange({ ...config, bodyColor: c })}
                className={`w-8 h-8 rounded-full border-2 transition ${config.bodyColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                style={{ background: c }} />
            ))}
            <input type="color" value={config.bodyColor} onChange={e => onChange({ ...config, bodyColor: e.target.value })}
              className="w-8 h-8 rounded-full cursor-pointer" />
          </div>
        </div>
      )}

      {tab === 'face' && (
        <div className="space-y-2">
          <label className="text-[9px] text-muted-foreground">Eye Style</label>
          <div className="grid grid-cols-5 gap-1.5">
            {EYE_STYLES.map(s => (
              <button key={s} onClick={() => onChange({ ...config, eyeStyle: s })}
                className={`p-2 rounded-xl text-center text-[9px] transition ${
                  config.eyeStyle === s ? 'bg-primary/10 text-primary' : 'glass-card text-foreground/60'
                }`}>{s}</button>
            ))}
          </div>
          <label className="text-[9px] text-muted-foreground">Expression</label>
          <div className="grid grid-cols-4 gap-1.5">
            {EXPRESSIONS.map(e => (
              <button key={e} onClick={() => onChange({ ...config, expression: e })}
                className={`p-2 rounded-xl text-center text-[9px] transition ${
                  config.expression === e ? 'bg-primary/10 text-primary' : 'glass-card text-foreground/60'
                }`}>{e}</button>
            ))}
          </div>
        </div>
      )}

      {tab === 'accessory' && (
        <div className="grid grid-cols-4 gap-1.5">
          {ACCESSORIES.map(a => (
            <button key={a} onClick={() => onChange({ ...config, accessory: a })}
              className={`p-2 rounded-xl text-center text-[9px] transition ${
                config.accessory === a ? 'bg-primary/10 text-primary' : 'glass-card text-foreground/60'
              }`}>{a}</button>
          ))}
        </div>
      )}

      {tab === 'pose' && (
        <div className="grid grid-cols-4 gap-1.5">
          {POSES.map(p => (
            <button key={p} onClick={() => onChange({ ...config, pose: p })}
              className={`p-2 rounded-xl text-center text-[9px] transition ${
                config.pose === p ? 'bg-primary/10 text-primary' : 'glass-card text-foreground/60'
              }`}>{p}</button>
          ))}
        </div>
      )}

      {tab === 'costume' && (
        <div className="grid grid-cols-4 gap-1.5">
          {COSTUMES.map(c => (
            <button key={c} onClick={() => onChange({ ...config, costume: c })}
              className={`p-2 rounded-xl text-center text-[9px] transition ${
                config.costume === c ? 'bg-primary/10 text-primary' : 'glass-card text-foreground/60'
              }`}>{c}</button>
          ))}
        </div>
      )}

      {tab === 'bg' && (
        <div className="grid grid-cols-4 gap-1.5">
          {BACKGROUNDS.map(b => (
            <button key={b} onClick={() => onChange({ ...config, background: b })}
              className={`p-2 rounded-xl text-center text-[9px] transition ${
                config.background === b ? 'bg-primary/10 text-primary' : 'glass-card text-foreground/60'
              }`}>{b}</button>
          ))}
        </div>
      )}

      <button onClick={onSave}
        className="w-full py-2 rounded-xl bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition flex items-center justify-center gap-1.5">
        <Save className="w-3.5 h-3.5" /> Save Character
      </button>
    </div>
  );
}
