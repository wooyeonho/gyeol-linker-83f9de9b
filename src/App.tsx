import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/src/hooks/useAuth';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import AuthPage from './views/Auth';
import GyeolPage from './views/Index';
import SimpleChat from './views/SimpleChat';
import SettingsPage from './views/Settings';
import ActivityPage from './views/Activity';
import SocialPage from './views/Social';
import SkillsPage from './views/MarketSkills';
import SkinsPage from './views/MarketSkins';
import NotFound from './views/NotFound';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/50 text-sm animate-pulse">Loading...</div>
      </main>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function ModeRouter() {
  const { agent, loading } = useInitAgent();
  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/50 text-sm animate-pulse">Loading...</div>
      </main>
    );
  }
  const mode = (agent?.settings as any)?.mode ?? 'advanced';
  if (mode === 'simple') return <SimpleChat />;
  return <GyeolPage />;
}

function SimpleGuard({ children }: { children: React.ReactNode }) {
  const { agent } = useInitAgent();
  const mode = (agent?.settings as any)?.mode ?? 'advanced';
  if (mode === 'simple') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/50 text-sm animate-pulse">Loading GYEOL...</div>
      </main>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/" element={<ProtectedRoute><ModeRouter /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/activity" element={<ProtectedRoute><SimpleGuard><ActivityPage /></SimpleGuard></ProtectedRoute>} />
      <Route path="/social" element={<ProtectedRoute><SimpleGuard><SocialPage /></SimpleGuard></ProtectedRoute>} />
      <Route path="/market/skills" element={<ProtectedRoute><SimpleGuard><SkillsPage /></SimpleGuard></ProtectedRoute>} />
      <Route path="/market/skins" element={<ProtectedRoute><SimpleGuard><SkinsPage /></SimpleGuard></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
