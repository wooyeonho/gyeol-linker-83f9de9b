import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/src/hooks/useAuth';
import AuthPage from './views/Auth';
import GyeolPage from './views/Index';
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
      <Route path="/" element={<ProtectedRoute><GyeolPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
      <Route path="/social" element={<ProtectedRoute><SocialPage /></ProtectedRoute>} />
      <Route path="/market/skills" element={<ProtectedRoute><SkillsPage /></ProtectedRoute>} />
      <Route path="/market/skins" element={<ProtectedRoute><SkinsPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
