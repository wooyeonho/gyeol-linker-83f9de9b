import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/hooks/useAuth';
import { Link } from 'react-router-dom';

interface AdminStats {
  totalAgents: number;
  totalConversations: number;
  totalPosts: number;
  pendingReports: number;
  dauToday: number;
}

interface Report {
  id: string;
  reporter_agent_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [authenticated, setAuthenticated] = useState(false);
  const [token, setToken] = useState('');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [killSwitch, setKillSwitch] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [tab, setTab] = useState<'overview' | 'reports' | 'system'>('overview');

  const authenticate = () => {
    const stored = localStorage.getItem('gyeol_admin_token');
    if (token === 'gyeol-admin-2026' || stored === 'gyeol-admin-2026') {
      localStorage.setItem('gyeol_admin_token', token || stored || '');
      setAuthenticated(true);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('gyeol_admin_token');
    if (stored === 'gyeol-admin-2026') setAuthenticated(true);
  }, []);

  const loadStats = useCallback(async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [agentsRes, convsRes, postsRes, reportsRes, dauRes] = await Promise.all([
      supabase.from('gyeol_agents' as any).select('id', { count: 'exact', head: true }),
      supabase.from('gyeol_conversations' as any).select('id', { count: 'exact', head: true }),
      supabase.from('gyeol_moltbook_posts' as any).select('id', { count: 'exact', head: true }),
      supabase.from('gyeol_reports' as any).select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('gyeol_login_history' as any).select('user_id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    ]);
    setStats({
      totalAgents: agentsRes.count ?? 0,
      totalConversations: convsRes.count ?? 0,
      totalPosts: postsRes.count ?? 0,
      pendingReports: reportsRes.count ?? 0,
      dauToday: dauRes.count ?? 0,
    });
  }, []);

  const loadReports = useCallback(async () => {
    const { data } = await supabase.from('gyeol_reports' as any).select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(50);
    if (data) setReports(data as any);
  }, []);

  const loadKillSwitch = useCallback(async () => {
    const { data } = await supabase.from('gyeol_system_state' as any).select('kill_switch').eq('id', 'global').maybeSingle();
    if (data) setKillSwitch((data as any).kill_switch);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    loadStats(); loadReports(); loadKillSwitch();
  }, [authenticated, loadStats, loadReports, loadKillSwitch]);

  const toggleKillSwitch = async () => {
    const newVal = !killSwitch;
    await supabase.from('gyeol_system_state' as any).update({ kill_switch: newVal, reason: newVal ? 'Admin activated' : 'Admin deactivated' } as any).eq('id', 'global');
    setKillSwitch(newVal);
  };

  const resolveReport = async (id: string, action: 'resolved' | 'dismissed') => {
    await supabase.from('gyeol_reports' as any).update({ status: action, resolved_at: new Date().toISOString() } as any).eq('id', id);
    setReports(prev => prev.filter(r => r.id !== id));
  };

  if (!authenticated) {
    return (
      <main role="main" className="min-h-screen bg-background flex items-center justify-center p-4 font-display">
        <div className="glass-panel rounded-2xl p-8 w-full max-w-sm text-center">
          <span aria-hidden="true" className="material-icons-round text-3xl text-primary mb-3">admin_panel_settings</span>
          <h1 className="text-lg font-bold text-foreground mb-4">Admin Access</h1>
          <input type="password" value={token} onChange={e => setToken(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && authenticate()}
            placeholder="Admin Token"
            className="w-full bg-muted/20 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground mb-3" />
          <button onClick={authenticate} className="w-full py-2 bg-primary/20 text-primary rounded-lg text-sm hover:bg-primary/30 transition">
            Enter
          </button>
        </div>
      </main>
    );
  }

  const TABS = [
    { id: 'overview' as const, icon: 'dashboard', label: 'Overview' },
    { id: 'reports' as const, icon: 'flag', label: 'Reports' },
    { id: 'system' as const, icon: 'settings', label: 'System' },
  ];

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 font-display relative">
      <div className="aurora-bg" />
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-bold text-foreground">GYEOL Admin</h1>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition">Back</Link>
        </div>
        <div className="flex gap-2 mb-6">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={"flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition " + (tab === t.id ? 'bg-primary/20 text-primary' : 'bg-muted/20 text-muted-foreground hover:bg-muted/40')}>
              <span aria-hidden="true" className="material-icons-round text-sm">{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Total Agents', value: stats.totalAgents, icon: 'people' },
              { label: 'Conversations', value: stats.totalConversations, icon: 'chat' },
              { label: 'Posts', value: stats.totalPosts, icon: 'article' },
              { label: 'Pending Reports', value: stats.pendingReports, icon: 'flag', color: stats.pendingReports > 0 ? 'text-destructive' : '' },
              { label: 'DAU Today', value: stats.dauToday, icon: 'trending_up' },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-panel rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span aria-hidden="true" className="material-icons-round text-sm text-primary/50">{s.icon}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</span>
                </div>
                <p className={"text-2xl font-bold " + (s.color || 'text-foreground')}>{s.value.toLocaleString()}</p>
              </motion.div>
            ))}
          </div>
        )}

        {tab === 'reports' && (
          <div className="space-y-2">
            {reports.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No pending reports</p>}
            {reports.map(r => (
              <div key={r.id} className="glass-panel rounded-xl p-4 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-foreground/80">{r.reason}</span>
                    <span className="text-[10px] text-muted-foreground">{r.target_type}</span>
                  </div>
                  {r.details && <p className="text-[10px] text-muted-foreground">{r.details}</p>}
                  <p className="text-[9px] text-muted-foreground/50 mt-1">{new Date(r.created_at).toLocaleString('ko')}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => resolveReport(r.id, 'resolved')}
                    className="px-2 py-1 text-[10px] bg-destructive/20 text-destructive rounded-md">Action</button>
                  <button onClick={() => resolveReport(r.id, 'dismissed')}
                    className="px-2 py-1 text-[10px] bg-muted/30 text-muted-foreground rounded-md">Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'system' && (
          <div className="space-y-4">
            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Kill Switch</p>
                  <p className="text-[10px] text-muted-foreground">Emergency: disable all AI responses</p>
                </div>
                <button onClick={toggleKillSwitch}
                  className={"px-4 py-2 rounded-lg text-xs font-medium transition " + (killSwitch ? 'bg-destructive text-foreground' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50')}>
                  {killSwitch ? 'ACTIVE - Turn OFF' : 'OFF - Turn ON'}
                </button>
              </div>
            </div>

            <div className="glass-panel rounded-xl p-4">
              <p className="text-sm font-medium text-foreground mb-2">Send Announcement</p>
              <textarea value={announcement} onChange={e => setAnnouncement(e.target.value)}
                placeholder="Enter announcement message..."
                className="w-full bg-muted/20 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground resize-none h-20 mb-2" />
              <button onClick={async () => {
                if (!announcement.trim()) return;
                await supabase.from('gyeol_system_state' as any).update({ announcement: announcement.trim() } as any).eq('id', 'global');
                setAnnouncement('');
              }} className="px-4 py-1.5 bg-primary/20 text-primary rounded-lg text-xs hover:bg-primary/30 transition">
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
