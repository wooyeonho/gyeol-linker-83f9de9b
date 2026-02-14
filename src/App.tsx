import { Routes, Route } from 'react-router-dom';
import GyeolPage from './views/Index';
import SettingsPage from './views/Settings';
import ActivityPage from './views/Activity';
import SocialPage from './views/Social';
import SkillsPage from './views/MarketSkills';
import SkinsPage from './views/MarketSkins';
import NotFound from './views/NotFound';

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
