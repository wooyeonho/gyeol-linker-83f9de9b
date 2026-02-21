import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, User, Camera, Shield, Clock, Smartphone, Download, Trash2, LogOut, Key, Globe } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';

export function SocialLoginButtons({ onLogin }: { onLogin: (provider: string) => void }) {
  const providers = [
    { id: 'google', label: 'Google', icon: '🔵', color: 'hover:bg-[hsl(var(--info)/0.1)]' },
    { id: 'github', label: 'GitHub', icon: '⚫', color: 'hover:bg-slate-500/10' },
    { id: 'kakao', label: 'Kakao', icon: '💛', color: 'hover:bg-[hsl(var(--warning)/0.1)]' },
  ];

  return (
    <div className="space-y-2">
      {providers.map(p => (
        <button key={p.id} onClick={() => onLogin(p.id)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl glass-card transition ${p.color}`}>
          <span className="text-lg">{p.icon}</span>
          <span className="text-[11px] font-medium text-foreground">Continue with {p.label}</span>
        </button>
      ))}
    </div>
  );
}

export function EmailChangeForm({ currentEmail, onSave }: { currentEmail: string; onSave: (email: string) => void }) {
  const [email, setEmail] = useState(currentEmail);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.auth.updateUser({ email });
      onSave(email);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] text-foreground/70 font-medium flex items-center gap-1">
        <Mail className="w-3 h-3" /> Email
      </label>
      <div className="flex gap-1">
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          className="flex-1 bg-muted/10 border border-border/20 rounded-lg px-3 py-2 text-[10px] text-foreground outline-none" />
        <button onClick={handleSave} disabled={saving || email === currentEmail}
          className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition disabled:opacity-40">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export function ProfilePictureUpload({ currentUrl, onUpload }: { currentUrl?: string; onUpload: (url: string) => void }) {
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { data } = await supabase.storage.from('avatars').upload(`avatar_${Date.now()}`, file);
      if (data?.path) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.path);
        onUpload(urlData.publicUrl);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-secondary/20 flex items-center justify-center overflow-hidden">
          {currentUrl ? (
            <img loading="lazy" src={currentUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="w-6 h-6 text-primary/50" />
          )}
        </div>
        <label className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center cursor-pointer">
          <Camera className="w-3 h-3 text-background" />
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </label>
      </div>
      <div>
        <p className="text-[10px] font-medium text-foreground">Profile Picture</p>
        <p className="text-[8px] text-muted-foreground">Tap to change</p>
      </div>
    </div>
  );
}

export function NicknameEditor({ current, onSave }: { current: string; onSave: (name: string) => void }) {
  const [name, setName] = useState(current);
  return (
    <div className="flex gap-1">
      <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={20}
        className="flex-1 bg-muted/10 border border-border/20 rounded-lg px-3 py-2 text-[10px] text-foreground outline-none" />
      <button onClick={() => onSave(name)} disabled={!name.trim() || name === current}
        className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition disabled:opacity-40">
        Save
      </button>
    </div>
  );
}

export function AccountDeactivation({ onDeactivate }: { onDeactivate: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [input, setInput] = useState('');

  return (
    <div className="space-y-2">
      {!confirm ? (
        <button onClick={() => setConfirm(true)}
          className="w-full py-2 rounded-xl bg-destructive/10 text-destructive text-[10px] font-medium hover:bg-destructive/20 transition">
          <Trash2 className="w-3 h-3 inline mr-1" /> Deactivate Account
        </button>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 p-3 rounded-xl border border-destructive/20">
          <p className="text-[10px] text-destructive font-medium">Type &quot;DELETE&quot; to confirm</p>
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            className="w-full bg-muted/10 border border-destructive/20 rounded-lg px-3 py-2 text-[10px] text-foreground outline-none" />
          <div className="flex gap-2">
            <button onClick={() => setConfirm(false)}
              className="flex-1 py-2 rounded-lg bg-muted/10 text-muted-foreground text-[10px]">Cancel</button>
            <button onClick={onDeactivate} disabled={input !== 'DELETE'}
              className="flex-1 py-2 rounded-lg bg-destructive text-background text-[10px] font-medium disabled:opacity-40">
              Confirm Delete
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export function GDPRExport({ onExport }: { onExport: () => void }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    onExport();
    await new Promise(r => setTimeout(r, 2000));
    setExporting(false);
  };

  return (
    <button onClick={handleExport} disabled={exporting}
      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl glass-card text-[10px] text-foreground/70 hover:text-foreground transition disabled:opacity-40">
      <Download className="w-3.5 h-3.5" />
      {exporting ? 'Exporting data...' : 'Export My Data (GDPR)'}
    </button>
  );
}

export function LoginHistory({ sessions }: { sessions: { device: string; ip: string; time: string; current: boolean }[] }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-primary" /> Login History
      </h4>
      {sessions.map((s, i) => (
        <div key={i} className={`flex items-center gap-2 p-2 rounded-lg ${s.current ? 'glass-card border border-primary/20' : 'glass-card'}`}>
          <Smartphone className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-foreground/70 truncate">{s.device}</p>
            <p className="text-[8px] text-muted-foreground">{s.ip} · {s.time}</p>
          </div>
          {s.current && <span className="text-[8px] text-primary">Current</span>}
        </div>
      ))}
    </div>
  );
}

export function TwoFactorSetup({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl glass-card">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-primary" />
        <div>
          <p className="text-[10px] font-medium text-foreground">Two-Factor Auth</p>
          <p className="text-[8px] text-muted-foreground">{enabled ? 'Enabled' : 'Add extra security'}</p>
        </div>
      </div>
      <button onClick={onToggle}
        className={`w-10 h-5 rounded-full transition ${enabled ? 'bg-primary' : 'bg-muted/30'}`}>
        <div className={`w-4 h-4 rounded-full bg-background shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export function SessionManager({ sessions, onRevoke }: {
  sessions: { id: string; device: string; lastActive: string; current: boolean }[];
  onRevoke: (id: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-[11px] font-bold text-foreground">Active Sessions</h4>
      {sessions.map(s => (
        <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg glass-card">
          <Smartphone className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-foreground/70">{s.device}</p>
            <p className="text-[8px] text-muted-foreground">{s.lastActive}</p>
          </div>
          {s.current ? (
            <span className="text-[8px] text-primary">Current</span>
          ) : (
            <button onClick={() => onRevoke(s.id)} className="text-[8px] text-destructive hover:text-destructive/80">
              <LogOut className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function SecuritySettings({ settings, onChange }: {
  settings: { loginNotifications: boolean; suspiciousActivityAlert: boolean; passwordExpiry: number };
  onChange: (s: any) => void;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
        <Key className="w-3.5 h-3.5 text-primary" /> Security
      </h4>
      {[
        { key: 'loginNotifications', label: 'Login Notifications', desc: 'Get notified on new logins' },
        { key: 'suspiciousActivityAlert', label: 'Suspicious Activity', desc: 'Alert on unusual activity' },
      ].map(item => (
        <div key={item.key} className="flex items-center justify-between p-2 rounded-lg glass-card">
          <div>
            <p className="text-[10px] text-foreground/70">{item.label}</p>
            <p className="text-[8px] text-muted-foreground">{item.desc}</p>
          </div>
          <button onClick={() => onChange({ ...settings, [item.key]: !settings[item.key as keyof typeof settings] })}
            className={`w-8 h-4 rounded-full transition ${settings[item.key as keyof typeof settings] ? 'bg-primary' : 'bg-muted/30'}`}>
            <div className={`w-3 h-3 rounded-full bg-background shadow transition-transform ${settings[item.key as keyof typeof settings] ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>
      ))}
    </div>
  );
}
