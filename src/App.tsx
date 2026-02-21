import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/src/hooks/useAuth';
import { useInitAgent } from '@/src/hooks/useInitAgent';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';
import { AchievementPopup } from './components/AchievementPopup';
import { NetworkStatus } from './components/NetworkStatus';
import { AnimatePresence, motion } from 'framer-motion';
import AuthPage from './views/Auth';
import GyeolPage from './views/Index';
import SimpleChat from './views/SimpleChat';
import SettingsPage from './views/Settings';
import ActivityPage from './views/Activity';
import SocialPage from './views/Social';
import SkillsPage from './views/MarketSkills';
import SkinsPage from './views/MarketSkins';
import GamificationPage from './views/Gamification';
import NotFound from './views/NotFound';
import ServerError from './views/ServerError';
import Terms from './views/Terms';
import Privacy from './views/Privacy';
import ResetPasswordPage from './views/ResetPassword';
import AdminPage from './views/Admin';
import { OfflineBanner, useOnlineStatus } from './components/PWADeep';
import { ErrorToastContainer, OfflineIndicator } from './components/ErrorUX';
import { JsonLdSchema } from './components/SEO';

const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

function PageWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div {...pageTransition} transition={{ duration: 0.2, ease: 'easeOut' }} className="h-full">
      {children}
    </motion.div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-foreground/50 text-sm animate-pulse">Loading...</div>
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
        <div className="text-foreground/50 text-sm animate-pulse">Loading...</div>
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
  const location = useLocation();
  const isOnline = useOnlineStatus();

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-foreground/50 text-sm animate-pulse">Loading GYEOL...</div>
      </main>
    );
  }

  return (
    <ErrorBoundary>
      <NetworkStatus />
      <ToastContainer />
      <AchievementPopup />
      <OfflineBanner isOnline={isOnline} />
      <ErrorToastContainer />
      <OfflineIndicator />
      <JsonLdSchema />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/auth" element={user ? <Navigate to="/" replace /> : <PageWrap><AuthPage /></PageWrap>} />
          <Route path="/reset-password" element={<PageWrap><ResetPasswordPage /></PageWrap>} />
          <Route path="/terms" element={<PageWrap><Terms /></PageWrap>} />
          <Route path="/privacy" element={<PageWrap><Privacy /></PageWrap>} />
          <Route path="/" element={<ProtectedRoute><ModeRouter /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><PageWrap><SettingsPage /></PageWrap></ProtectedRoute>} />
          <Route path="/activity" element={<ProtectedRoute><SimpleGuard><PageWrap><ActivityPage /></PageWrap></SimpleGuard></ProtectedRoute>} />
          <Route path="/social" element={<ProtectedRoute><SimpleGuard><PageWrap><SocialPage /></PageWrap></SimpleGuard></ProtectedRoute>} />
          <Route path="/market/skills" element={<ProtectedRoute><SimpleGuard><PageWrap><SkillsPage /></PageWrap></SimpleGuard></ProtectedRoute>} />
          <Route path="/market/skins" element={<ProtectedRoute><SimpleGuard><PageWrap><SkinsPage /></PageWrap></SimpleGuard></ProtectedRoute>} />
          <Route path="/gamification" element={<ProtectedRoute><SimpleGuard><PageWrap><GamificationPage /></PageWrap></SimpleGuard></ProtectedRoute>} />
          <Route path="/admin" element={<PageWrap><AdminPage /></PageWrap>} />
          <Route path="/500" element={<PageWrap><ServerError /></PageWrap>} />
          <Route path="*" element={<PageWrap><NotFound /></PageWrap>} />
        </Routes>
      </AnimatePresence>
    </ErrorBoundary>
  );
}

export default App;
