import { Routes, Route } from 'react-router-dom';
import GyeolPage from './pages/Index';
import SettingsPage from './pages/Settings';
import ActivityPage from './pages/Activity';
import SocialPage from './pages/Social';
import SkillsPage from './pages/MarketSkills';
import SkinsPage from './pages/MarketSkins';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Routes>
      <Route path="/" element={<GyeolPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/activity" element={<ActivityPage />} />
      <Route path="/social" element={<SocialPage />} />
      <Route path="/market/skills" element={<SkillsPage />} />
      <Route path="/market/skins" element={<SkinsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
