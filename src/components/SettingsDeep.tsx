import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, EyeOff, AlertTriangle, Moon, Sun, Palette, Bell, BellOff, Volume2, Clock, Tag, Key, BarChart3, Thermometer, Lock, History } from 'lucide-react';

export function SafetyContentFilter({ level, onChange }: { level: 'low' | 'medium' | 'high'; onChange: (l: 'low' | 'medium' | 'high') => void }) {
  const levels: { value: 'low' | 'medium' | 'high'; label: string; desc: string }[] = [
    { value: 'low', label: 'Low', desc: 'Minimal filtering' },
    { value: 'medium', label: 'Medium', desc: 'Standard protection' },
    { value: 'high', label: 'High', desc: 'Maximum safety' },
  ];

  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-primary" /> Content Safety
      </h4>
      <div className="grid grid-cols-3 gap-1.5">
        {levels.map(l => (
          <button key={l.value} onClick={() => onChange(l.value)}
            className={`p-2 rounded-xl text-center transition ${
              level === l.value ? 'bg-primary/10 border border-primary/20' : 'glass-card hover:bg-muted/20'
            }`}>
            <p className="text-[10px] font-medium text-foreground">{l.label}</p>
            <p className="text-[8px] text-muted-foreground">{l.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export function PIIFilter({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl glass-card">
      <div className="flex items-center gap-2">
        {enabled ? <EyeOff className="w-4 h-4 text-primary" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
        <div>
          <p className="text-[10px] font-medium text-foreground">PII Filter</p>
          <p className="text-[8px] text-muted-foreground">Auto-redact personal information</p>
        </div>
      </div>
      <button onClick={onToggle}
        className={`w-10 h-5 rounded-full transition ${enabled ? 'bg-primary' : 'bg-muted/30'}`}>
        <div className={`w-4 h-4 rounded-full bg-background shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export function CustomBlocklist({ words, onAdd, onRemove }: { words: string[]; onAdd: (w: string) => void; onRemove: (w: string) => void }) {
  const [input, setInput] = useState('');

  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-[hsl(var(--warning))]" /> Custom Blocklist
      </h4>
      <div className="flex gap-1">
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          placeholder="Add blocked word..."
          className="flex-1 bg-muted/10 border border-border/20 rounded-lg px-2 py-1 text-[10px] text-foreground outline-none" />
        <button onClick={() => { if (input.trim()) { onAdd(input.trim()); setInput(''); } }}
          className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-[10px]">Add</button>
      </div>
      <div className="flex flex-wrap gap-1">
        {words.map(w => (
          <span key={w} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[9px]">
            {w}
            <button onClick={() => onRemove(w)} className="text-destructive/50 hover:text-destructive">×</button>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ParentalMode({ enabled, onToggle, pin, onSetPin }: {
  enabled: boolean; onToggle: () => void; pin: string; onSetPin: (p: string) => void;
}) {
  const [showPin, setShowPin] = useState(false);
  const [newPin, setNewPin] = useState('');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between p-3 rounded-xl glass-card">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-[hsl(var(--warning))]" />
          <div>
            <p className="text-[10px] font-medium text-foreground">Parental Mode</p>
            <p className="text-[8px] text-muted-foreground">Restrict mature content and features</p>
          </div>
        </div>
        <button onClick={onToggle}
          className={`w-10 h-5 rounded-full transition ${enabled ? 'bg-[hsl(var(--warning))]' : 'bg-muted/30'}`}>
          <div className={`w-4 h-4 rounded-full bg-background shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
      {enabled && (
        <div className="flex gap-1">
          <input type={showPin ? 'text' : 'password'} value={newPin} onChange={e => setNewPin(e.target.value)}
            placeholder="Set PIN (4 digits)" maxLength={4}
            className="flex-1 bg-muted/10 border border-border/20 rounded-lg px-2 py-1 text-[10px] text-foreground outline-none" />
          <button onClick={() => setShowPin(!showPin)} className="px-2 text-muted-foreground">
            {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
          <button onClick={() => { if (newPin.length === 4) { onSetPin(newPin); setNewPin(''); } }}
            className="px-3 py-1 rounded-lg bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] text-[10px]">Set</button>
        </div>
      )}
    </div>
  );
}

export function SafetyLogs({ logs }: { logs: { date: string; action: string; severity: string }[] }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <History className="w-3.5 h-3.5 text-primary" /> Safety Logs
      </h4>
      {logs.map((l, i) => (
        <div key={i} className="flex items-center gap-2 p-2 rounded-lg glass-card text-[9px]">
          <span className={`w-1.5 h-1.5 rounded-full ${
            l.severity === 'high' ? 'bg-destructive' : l.severity === 'medium' ? 'bg-[hsl(var(--warning))]' : 'bg-primary'
          }`} />
          <span className="text-foreground/70 flex-1 truncate">{l.action}</span>
          <span className="text-muted-foreground/40 flex-shrink-0">{l.date}</span>
        </div>
      ))}
    </div>
  );
}

export function ThemeModePreview({ mode, onSelect }: { mode: 'dark' | 'light' | 'system'; onSelect: (m: 'dark' | 'light' | 'system') => void }) {
  const modes: { value: 'dark' | 'light' | 'system'; icon: React.ReactNode; label: string }[] = [
    { value: 'dark', icon: <Moon className="w-4 h-4" />, label: 'Dark' },
    { value: 'light', icon: <Sun className="w-4 h-4" />, label: 'Light' },
    { value: 'system', icon: <Palette className="w-4 h-4" />, label: 'System' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {modes.map(m => (
        <button key={m.value} onClick={() => onSelect(m.value)}
          className={`p-3 rounded-xl text-center transition ${
            mode === m.value ? 'bg-primary/10 border border-primary/20' : 'glass-card hover:bg-muted/20'
          }`}>
          <div className={`mx-auto mb-1 ${mode === m.value ? 'text-primary' : 'text-muted-foreground'}`}>{m.icon}</div>
          <p className="text-[10px] font-medium text-foreground">{m.label}</p>
        </button>
      ))}
    </div>
  );
}

export function CustomColorPicker({ colors, onChange }: {
  colors: { primary: string; secondary: string; accent: string };
  onChange: (colors: { primary: string; secondary: string; accent: string }) => void;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground">Custom Colors</h4>
      {(['primary', 'secondary', 'accent'] as const).map(key => (
        <div key={key} className="flex items-center gap-2">
          <input type="color" value={colors[key]}
            onChange={e => onChange({ ...colors, [key]: e.target.value })}
            className="w-8 h-8 rounded-lg cursor-pointer border-none" />
          <span className="text-[10px] text-foreground/60 capitalize flex-1">{key}</span>
          <span className="text-[9px] text-muted-foreground font-mono">{colors[key]}</span>
        </div>
      ))}
    </div>
  );
}

export function ThemePresetGallery({ presets, onApply }: {
  presets: { name: string; colors: { primary: string; secondary: string } }[];
  onApply: (preset: any) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {presets.map((p, i) => (
        <button key={i} onClick={() => onApply(p)}
          className="p-2 rounded-xl glass-card hover:bg-muted/20 transition text-center">
          <div className="flex gap-1 justify-center mb-1">
            <div className="w-4 h-4 rounded-full" style={{ background: p.colors.primary }} />
            <div className="w-4 h-4 rounded-full" style={{ background: p.colors.secondary }} />
          </div>
          <p className="text-[8px] text-foreground/60">{p.name}</p>
        </button>
      ))}
    </div>
  );
}

export function NotificationTimeRange({ start, end, onChange }: {
  start: string; end: string; onChange: (start: string, end: string) => void;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-primary" /> Notification Hours
      </h4>
      <div className="flex items-center gap-2">
        <input type="time" value={start} onChange={e => onChange(e.target.value, end)}
          className="flex-1 bg-muted/10 border border-border/20 rounded-lg px-2 py-1.5 text-[10px] text-foreground outline-none" />
        <span className="text-muted-foreground text-[10px]">to</span>
        <input type="time" value={end} onChange={e => onChange(start, e.target.value)}
          className="flex-1 bg-muted/10 border border-border/20 rounded-lg px-2 py-1.5 text-[10px] text-foreground outline-none" />
      </div>
    </div>
  );
}

export function NotificationCategoryFilter({ categories, enabled, onToggle }: {
  categories: string[];
  enabled: Record<string, boolean>;
  onToggle: (cat: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      {categories.map(cat => (
        <div key={cat} className="flex items-center justify-between p-2 rounded-lg glass-card">
          <span className="text-[10px] text-foreground/70 capitalize">{cat}</span>
          <button onClick={() => onToggle(cat)}
            className={`w-8 h-4 rounded-full transition ${enabled[cat] ? 'bg-primary' : 'bg-muted/30'}`}>
            <div className={`w-3 h-3 rounded-full bg-background shadow transition-transform ${enabled[cat] ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function DNDToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl glass-card">
      <div className="flex items-center gap-2">
        {enabled ? <BellOff className="w-4 h-4 text-[hsl(var(--warning))]" /> : <Bell className="w-4 h-4 text-muted-foreground" />}
        <div>
          <p className="text-[10px] font-medium text-foreground">Do Not Disturb</p>
          <p className="text-[8px] text-muted-foreground">Silence all notifications</p>
        </div>
      </div>
      <button onClick={onToggle}
        className={`w-10 h-5 rounded-full transition ${enabled ? 'bg-[hsl(var(--warning))]' : 'bg-muted/30'}`}>
        <div className={`w-4 h-4 rounded-full bg-background shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export function NotificationHistory({ notifications }: { notifications: { title: string; body: string; time: string; read: boolean }[] }) {
  return (
    <div className="space-y-1.5">
      {notifications.map((n, i) => (
        <div key={i} className={`p-2.5 rounded-xl glass-card ${n.read ? 'opacity-60' : ''}`}>
          <p className="text-[10px] font-medium text-foreground">{n.title}</p>
          <p className="text-[9px] text-muted-foreground">{n.body}</p>
          <p className="text-[8px] text-muted-foreground/40 mt-0.5">{n.time}</p>
        </div>
      ))}
    </div>
  );
}

export function AIBrainSettings({ settings, onChange }: {
  settings: { model: string; temperature: number; maxTokens: number; byokKey?: string };
  onChange: (s: any) => void;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-[11px] font-bold text-foreground">AI Brain Settings</h4>
      <div>
        <label className="text-[9px] text-muted-foreground mb-0.5 block">Model</label>
        <select value={settings.model} onChange={e => onChange({ ...settings, model: e.target.value })}
          className="w-full bg-muted/10 border border-border/20 rounded-lg px-2 py-1.5 text-[10px] text-foreground outline-none">
          <option value="lovable">Lovable AI</option>
          <option value="groq">Groq (BYOK)</option>
        </select>
      </div>
      <div>
        <div className="flex justify-between text-[9px] mb-0.5">
          <span className="text-muted-foreground flex items-center gap-1"><Thermometer className="w-2.5 h-2.5" /> Temperature</span>
          <span className="text-primary">{settings.temperature.toFixed(1)}</span>
        </div>
        <input type="range" min={0} max={2} step={0.1} value={settings.temperature}
          onChange={e => onChange({ ...settings, temperature: Number(e.target.value) })}
          className="w-full h-1 rounded-full bg-muted/20 accent-primary appearance-none cursor-pointer" />
      </div>
      <div>
        <div className="flex justify-between text-[9px] mb-0.5">
          <span className="text-muted-foreground">Max Tokens</span>
          <span className="text-primary">{settings.maxTokens}</span>
        </div>
        <input type="range" min={256} max={4096} step={256} value={settings.maxTokens}
          onChange={e => onChange({ ...settings, maxTokens: Number(e.target.value) })}
          className="w-full h-1 rounded-full bg-muted/20 accent-primary appearance-none cursor-pointer" />
      </div>
      {settings.model === 'groq' && (
        <div>
          <label className="text-[9px] text-muted-foreground mb-0.5 flex items-center gap-1"><Key className="w-2.5 h-2.5" /> BYOK API Key</label>
          <input type="password" value={settings.byokKey ?? ''} onChange={e => onChange({ ...settings, byokKey: e.target.value })}
            placeholder="Enter your API key"
            className="w-full bg-muted/10 border border-border/20 rounded-lg px-2 py-1.5 text-[10px] text-foreground outline-none" />
        </div>
      )}
    </div>
  );
}

export function FeedKeywordCategories({ keywords, onAdd, onRemove }: { keywords: string[]; onAdd: (k: string) => void; onRemove: (k: string) => void }) {
  const [input, setInput] = useState('');

  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <Tag className="w-3.5 h-3.5 text-primary" /> Feed Keywords
      </h4>
      <div className="flex gap-1">
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          placeholder="Add keyword..."
          className="flex-1 bg-muted/10 border border-border/20 rounded-lg px-2 py-1 text-[10px] text-foreground outline-none" />
        <button onClick={() => { if (input.trim()) { onAdd(input.trim()); setInput(''); } }}
          className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-[10px]">Add</button>
      </div>
      <div className="flex flex-wrap gap-1">
        {keywords.map(k => (
          <span key={k} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px]">
            {k}
            <button onClick={() => onRemove(k)} className="text-primary/50 hover:text-primary">×</button>
          </span>
        ))}
      </div>
    </div>
  );
}

export function APIUsageStats({ stats }: { stats: { model: string; calls: number; tokens: number; cost: string }[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <BarChart3 className="w-3.5 h-3.5 text-primary" /> API Usage
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px]">
          <thead>
            <tr className="text-muted-foreground border-b border-border/20">
              <th className="text-left py-1">Model</th>
              <th className="text-center py-1">Calls</th>
              <th className="text-center py-1">Tokens</th>
              <th className="text-right py-1">Cost</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(s => (
              <tr key={s.model} className="border-b border-border/10">
                <td className="py-1.5 text-foreground/70">{s.model}</td>
                <td className="py-1.5 text-center text-foreground/60">{s.calls}</td>
                <td className="py-1.5 text-center text-foreground/60">{s.tokens.toLocaleString()}</td>
                <td className="py-1.5 text-right text-primary">{s.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
