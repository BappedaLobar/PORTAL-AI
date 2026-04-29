import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { useSettingsStore } from './store/settingsStore';
import { useDataStore } from './store/dataStore';
import './styles/index.css';

// Separate component for route handling to use useLocation
const AppRoutes = () => {
  const location = useLocation();
  const [shouldShowStoryboard, setShouldShowStoryboard] = useState<boolean | null>(null);

  useEffect(() => {
    const seen = localStorage.getItem('storyboard_seen');
    setShouldShowStoryboard(!seen);
  }, []);

  if (shouldShowStoryboard === null) return null;

  return (
    <Routes>
      <Route 
        path="/" 
        element={shouldShowStoryboard ? <Navigate to="/storyboard" replace /> : <DashboardPage />} 
      />
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
