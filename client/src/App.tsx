import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/Dashboard';
import { UploadPage } from './pages/Upload';
import { PackagesPage } from './pages/Packages';
import { RiskAnalysisPage } from './pages/RiskAnalysis';
import { PolicyCheckPage } from './pages/PolicyCheck';
import { AIReviewPage } from './pages/AIReview';
import { ReportsPage } from './pages/Reports';
import { SettingsPage } from './pages/Settings';
import { StoryboardPage } from './pages/Storyboard';
import { IntroPage } from './pages/Intro';
import { useSettingsStore } from './store/settingsStore';
import { useDataStore } from './store/dataStore';
import './styles/index.css';

// Separate component for route handling to use useLocation
const AppRoutes = () => {
  const [shouldShowIntro, setShouldShowIntro] = useState<boolean | null>(null);

  useEffect(() => {
    const seen = localStorage.getItem('storyboard_seen');
    setShouldShowIntro(!seen);
  }, []);

  if (shouldShowIntro === null) return null;

  return (
    <Routes>
      <Route 
        path="/" 
        element={shouldShowIntro ? <Navigate to="/intro" replace /> : <DashboardPage />} 
      />
      <Route path="/intro" element={<IntroPage />} />
      <Route path="/storyboard" element={<StoryboardPage />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/packages" element={<PackagesPage />} />
      <Route path="/risk-analysis" element={<RiskAnalysisPage />} />
      <Route path="/policy-check" element={<PolicyCheckPage />} />
      <Route path="/ai-review" element={<AIReviewPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
};

function App() {
  const { theme } = useSettingsStore(state => state.settings);
  const fetchSettings = useSettingsStore(state => state.fetchSettings);
  const fetchPackages = useDataStore(state => state.fetchPackages);

  useEffect(() => {
    fetchSettings();
    fetchPackages();
  }, [fetchSettings, fetchPackages]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <Layout>
        <AppRoutes />
      </Layout>
    </BrowserRouter>
  );
}

export default App;
