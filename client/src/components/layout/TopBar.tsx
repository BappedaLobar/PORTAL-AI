import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Upload, Wifi, WifiOff, Sun, Moon } from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import { useSettingsStore } from '../../store/settingsStore';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard Utama',
  '/upload': 'Upload Data RUP',
  '/packages': 'Semua Paket',
  '/risk-analysis': 'Analisis Risiko',
  '/policy-check': 'Cek Kebijakan',
  '/ai-review': 'AI Review',
  '/reports': 'Export Laporan',
  '/settings': 'Pengaturan',
};

export const TopBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { analyzedPackages, stats } = useDataStore();
  const { settings, updateSettings } = useSettingsStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  const title = PAGE_TITLES[location.pathname] || 'Portal AI Bapperida';

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check backend health
  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => setBackendOk(d.status === 'ok'))
      .catch(() => setBackendOk(false));
  }, []);

  const criticalCount = analyzedPackages.filter(p => p.riskLevel === 'KRITIS').length;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
            {title}
          </h2>
          {stats && (
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Dianalisis: {new Date(stats.analyzedAt!).toLocaleString('id-ID')}
            </p>
          )}
        </div>
      </div>

      <div className="topbar-right">
        {/* Backend & Network Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isOnline ? (
            <Wifi size={14} color="var(--color-normal)" />
          ) : (
            <WifiOff size={14} color="var(--color-kritis)" />
          )}
          <span style={{ fontSize: '0.75rem', color: backendOk ? 'var(--color-normal)' : 'var(--color-sedang)' }}>
            {backendOk === null ? 'Connecting...' : backendOk ? 'Server OK' : 'Server Offline'}
          </span>
          <div className={`status-dot ${!isOnline ? 'offline' : ''}`} />
        </div>

        {/* Notifications */}
        {criticalCount > 0 && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/risk-analysis')}
            style={{ position: 'relative' }}
          >
            <Bell size={15} />
            <span>{criticalCount} Kritis</span>
            <span style={{
              position: 'absolute', top: -6, right: -6,
              background: 'var(--color-kritis)', color: 'white',
              borderRadius: '50%', width: 18, height: 18,
              fontSize: '0.65rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {criticalCount > 99 ? '99+' : criticalCount}
            </span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          className="btn btn-secondary btn-icon"
          onClick={() => updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' })}
          title="Toggle Theme"
          style={{ padding: '8px 10px' }}
        >
          {settings.theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
        </button>

        {/* Quick Upload */}
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/upload')}>
          <Upload size={15} />
          Upload Data
        </button>
      </div>
    </header>
  );
};
