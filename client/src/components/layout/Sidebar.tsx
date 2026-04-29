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
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
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

const ICON_STYLES: Record<string, { bg: string, color: string, border: string }> = {
  '/dashboard': { bg: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: '#FFFFFF', border: 'rgba(59,130,246,0.5)' },
  '/upload': { bg: 'linear-gradient(135deg, #10B981, #059669)', color: '#FFFFFF', border: 'rgba(16,185,129,0.5)' },
  '/packages': { bg: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#FFFFFF', border: 'rgba(245,158,11,0.5)' },
  '/risk-analysis': { bg: 'linear-gradient(135deg, #EF4444, #DC2626)', color: '#FFFFFF', border: 'rgba(239,68,68,0.5)' },
  '/policy-check': { bg: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', color: '#FFFFFF', border: 'rgba(139,92,246,0.5)' },
  '/ai-review': { bg: 'linear-gradient(135deg, #EC4899, #DB2777)', color: '#FFFFFF', border: 'rgba(236,72,153,0.5)' },
  '/reports': { bg: 'linear-gradient(135deg, #06B6D4, #0891B2)', color: '#FFFFFF', border: 'rgba(6,182,212,0.5)' },
  '/settings': { bg: 'linear-gradient(135deg, #64748B, #475569)', color: '#FFFFFF', border: 'rgba(100,116,139,0.5)' },
};

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
              const style = ICON_STYLES[item.path] || { bg: 'var(--bg-glass)', color: 'var(--text-secondary)', border: 'transparent' };
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  end={item.exact}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: 8,
                    background: style.bg,
                    boxShadow: `0 2px 4px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.25), 0 0 0 1px ${style.border}`,
                    marginRight: 4,
                    flexShrink: 0
                  }}>
                    <item.icon size={15} color={style.color} strokeWidth={2.5} />
                  </div>
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
