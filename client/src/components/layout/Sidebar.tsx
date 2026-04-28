import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Upload, Package, AlertTriangle,
  Target, Bot, FileText, Settings, Activity
} from 'lucide-react';
import { useDataStore } from '../../store/dataStore';

const NAV_ITEMS = [
  {
    section: 'Utama',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
      { path: '/upload', icon: Upload, label: 'Upload Data RUP' },
    ]
  },
  {
    section: 'Analisis',
    items: [
      { path: '/packages', icon: Package, label: 'Semua Paket' },
      { path: '/risk-analysis', icon: AlertTriangle, label: 'Analisis Risiko' },
      { path: '/policy-check', icon: Target, label: 'Cek Kebijakan' },
      { path: '/ai-review', icon: Bot, label: 'AI Review' },
    ]
  },
  {
    section: 'Laporan',
    items: [
      { path: '/reports', icon: FileText, label: 'Export Laporan' },
      { path: '/settings', icon: Settings, label: 'Pengaturan' },
    ]
  }
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { analyzedPackages } = useDataStore();
  const criticalCount = analyzedPackages.filter(p => p.riskLevel === 'KRITIS').length;

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img 
            src="/logo-lobar.png" 
            alt="Logo Lombok Barat" 
            style={{ width: 36, height: 36, objectFit: 'contain' }} 
          />
          <div>
            <div className="sidebar-logo-title">Portal AI Bapperida</div>
            <div className="sidebar-logo-sub">Kabupaten Lombok Barat</div>
          </div>
        </div>

        {/* Data status indicator */}
        {analyzedPackages.length > 0 && (
          <div style={{
            marginTop: 12,
            padding: '6px 10px',
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <Activity size={12} color="#22C55E" />
            <span style={{ fontSize: '0.72rem', color: '#22C55E', fontWeight: 600 }}>
              {analyzedPackages.length.toLocaleString('id-ID')} paket teranalisis
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(section => (
          <React.Fragment key={section.section}>
            <div className="sidebar-section-label">{section.section}</div>
            {section.items.map(item => {
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  end={item.exact}
                >
                  <item.icon size={18} className="nav-icon" />
                  <span>{item.label}</span>
                  {item.path === '/risk-analysis' && criticalCount > 0 && (
                    <span className="nav-badge">{criticalCount}</span>
                  )}
                </NavLink>
              );
            })}
          </React.Fragment>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        textAlign: 'center'
      }}>
        Portal AI Bapperida v1.0 · Powered by AI
      </div>
    </aside>
  );
};
