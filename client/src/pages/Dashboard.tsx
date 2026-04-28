import React, { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, AlertTriangle, TrendingUp, DollarSign,
  Building2, ChevronRight, ArrowUpRight, ShieldAlert
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useDataStore } from '../store/dataStore';
import { RiskBadge } from '../components/ui/RiskBadge';
import type { RUPPackage } from '../types';

const RISK_COLORS = {
  KRITIS: '#EF4444',
  TINGGI: '#F97316',
  SEDANG: '#EAB308',
  NORMAL: '#22C55E',
};

const formatRupiah = (v: number) => {
  if (v >= 1_000_000_000_000) return `Rp ${(v / 1_000_000_000_000).toFixed(2)}T`;
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(2)}M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}Jt`;
  return `Rp ${v.toLocaleString('id-ID')}`;
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: 10, padding: '10px 14px', fontSize: '0.8rem'
      }}>
        <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: 'var(--text-secondary)' }}>
            {p.name}: <strong style={{ color: 'var(--text-primary)' }}>{typeof p.value === 'number' && p.value > 1000 ? formatRupiah(p.value) : p.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { analyzedPackages, stats, fileName, fetchPackages } = useDataStore();

  useEffect(() => {
    if (analyzedPackages.length === 0) {
      fetchPackages();
    }
  }, [analyzedPackages.length, fetchPackages]);

  const hasData = analyzedPackages.length > 0;

  // Donut chart data
  const riskDistData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Kritis', value: stats.criticalCount, color: RISK_COLORS.KRITIS },
      { name: 'Tinggi', value: stats.highCount, color: RISK_COLORS.TINGGI },
      { name: 'Sedang', value: stats.mediumCount, color: RISK_COLORS.SEDANG },
      { name: 'Normal', value: stats.normalCount, color: RISK_COLORS.NORMAL },
    ].filter(d => d.value > 0);
  }, [stats]);

  // Top SKPD by risk
  const topSKPDData = useMemo(() => {
    if (!analyzedPackages.length) return [];
    const skpdMap = new Map<string, { critical: number; high: number; total: number; value: number }>();
    analyzedPackages.forEach(p => {
      const skpd = p.namaSatuanKerja || 'Unknown';
      const short = skpd.length > 30 ? skpd.substring(0, 30) + '...' : skpd;
      if (!skpdMap.has(short)) skpdMap.set(short, { critical: 0, high: 0, total: 0, value: 0 });
      const d = skpdMap.get(short)!;
      d.total++;
      d.value += p.totalNilai || 0;
      if (p.riskLevel === 'KRITIS') d.critical++;
      if (p.riskLevel === 'TINGGI') d.high++;
    });
    return Array.from(skpdMap.entries())
      .map(([name, data]) => ({ name, ...data, riskCount: data.critical + data.high }))
      .sort((a, b) => b.riskCount - a.riskCount)
      .slice(0, 8);
  }, [analyzedPackages]);

  // Method distribution
  const methodData = useMemo(() => {
    if (!analyzedPackages.length) return [];
    const map = new Map<string, number>();
    analyzedPackages.forEach(p => {
      const m = p.metodePengadaan || 'Lainnya';
      map.set(m, (map.get(m) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [analyzedPackages]);

  // Top high-risk packages
  const topRiskPackages = useMemo(() => {
    return [...analyzedPackages]
      .filter(p => p.riskLevel === 'KRITIS' || p.riskLevel === 'TINGGI')
      .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
      .slice(0, 8);
  }, [analyzedPackages]);

  // Jenis pengadaan distribution
  const jenisData = useMemo(() => {
    if (!analyzedPackages.length) return [];
    const map = new Map<string, { count: number; value: number }>();
    analyzedPackages.forEach(p => {
      const j = p.jenisPengadaan || 'Lainnya';
      if (!map.has(j)) map.set(j, { count: 0, value: 0 });
      const d = map.get(j)!;
      d.count++;
      d.value += p.totalNilai || 0;
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value);
  }, [analyzedPackages]);

  if (!hasData) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h1>Dashboard Audit</h1>
          <p>Analisis risiko belanja pengadaan daerah</p>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">
            <ShieldAlert size={40} />
          </div>
          <h3>Belum Ada Data</h3>
          <p>Upload file RUP dari SIRUP LKPP untuk memulai analisis</p>
          <button className="btn btn-primary" onClick={() => navigate('/upload')} style={{ marginTop: 8 }}>
            <ArrowUpRight size={16} /> Upload Data Sekarang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Dashboard Audit</h1>
          <p style={{ marginTop: 4 }}>
            {fileName} · Dianalisis: {stats?.analyzedAt && new Date(stats.analyzedAt).toLocaleString('id-ID')}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/upload')}>
          <ArrowUpRight size={15} /> Upload Baru
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid-kpi section-gap">
        <div className="kpi-card" style={{ '--kpi-accent': '#3B82F6', '--kpi-accent-bg': 'rgba(59,130,246,0.12)' } as React.CSSProperties}>
          <div className="kpi-icon"><Package size={20} /></div>
          <div className="kpi-label">Total Paket</div>
          <div className="kpi-value">{stats!.totalPackages.toLocaleString('id-ID')}</div>
          <div className="kpi-sub">{stats!.skpdCount} Satuan Kerja</div>
        </div>

        <div className="kpi-card" style={{ '--kpi-accent': '#22C55E', '--kpi-accent-bg': 'rgba(34,197,94,0.12)' } as React.CSSProperties}>
          <div className="kpi-icon"><DollarSign size={20} /></div>
          <div className="kpi-label">Total Nilai Anggaran</div>
          <div className="kpi-value" style={{ fontSize: '1.4rem' }}>{formatRupiah(stats!.totalValue)}</div>
          <div className="kpi-sub">{stats!.totalPackages.toLocaleString('id-ID')} paket</div>
        </div>

        <div className="kpi-card" style={{ '--kpi-accent': '#EF4444', '--kpi-accent-bg': 'rgba(239,68,68,0.12)' } as React.CSSProperties}>
          <div className="kpi-icon"><AlertTriangle size={20} /></div>
          <div className="kpi-label">Paket Berisiko (Kritis+Tinggi)</div>
          <div className="kpi-value" style={{ color: 'var(--color-kritis)' }}>
            {(stats!.criticalCount + stats!.highCount).toLocaleString('id-ID')}
          </div>
          <div className="kpi-sub">
            {stats!.criticalCount} Kritis · {stats!.highCount} Tinggi
          </div>
        </div>

        <div className="kpi-card" style={{ '--kpi-accent': '#F97316', '--kpi-accent-bg': 'rgba(249,115,22,0.12)' } as React.CSSProperties}>
          <div className="kpi-icon"><TrendingUp size={20} /></div>
          <div className="kpi-label">Nilai Terindikasi Risiko</div>
          <div className="kpi-value" style={{ color: 'var(--color-tinggi)', fontSize: '1.4rem' }}>
            {formatRupiah(stats!.suspiciousValue)}
          </div>
          <div className="kpi-sub">
            {stats!.totalValue > 0
              ? `${((stats!.suspiciousValue / stats!.totalValue) * 100).toFixed(1)}% dari total anggaran`
              : '-'}
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid-2 section-gap" style={{ alignItems: 'start' }}>
        {/* Risk Distribution Donut */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><AlertTriangle size={16} /> Distribusi Risiko</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={riskDistData} cx="50%" cy="50%" innerRadius={65} outerRadius={100}
                dataKey="value" paddingAngle={3}>
                {riskDistData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => [`${v} paket`, '']} contentStyle={{
                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                borderRadius: 10, fontSize: '0.8rem'
              }} />
              <Legend formatter={(value) => <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid-2 mt-2" style={{ gap: 8 }}>
            {[
              { label: 'Kritis', count: stats!.criticalCount, color: RISK_COLORS.KRITIS },
              { label: 'Tinggi', count: stats!.highCount, color: RISK_COLORS.TINGGI },
              { label: 'Sedang', count: stats!.mediumCount, color: RISK_COLORS.SEDANG },
              { label: 'Normal', count: stats!.normalCount, color: RISK_COLORS.NORMAL },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', background: 'var(--bg-glass-light)',
                borderRadius: 8, border: `1px solid ${item.color}33`
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '0.9rem', color: item.color }}>
                  {item.count.toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Method Distribution */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><Package size={16} /> Metode Pengadaan</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={methodData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis type="category" dataKey="name" width={140}
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Jumlah Paket" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top SKPD Risk Chart */}
      <div className="card section-gap">
        <div className="card-header">
          <span className="card-title"><Building2 size={16} /> Top SKPD Berisiko Tertinggi</span>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/risk-analysis')}>
            Lihat Semua <ChevronRight size={14} />
          </button>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={topSKPDData} margin={{ left: 0, right: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
              angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="critical" name="Kritis" stackId="a" fill={RISK_COLORS.KRITIS} radius={[0, 0, 0, 0]} />
            <Bar dataKey="high" name="Tinggi" stackId="a" fill={RISK_COLORS.TINGGI} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Jenis Pengadaan */}
      <div className="card section-gap">
        <div className="card-header">
          <span className="card-title"><TrendingUp size={16} /> Nilai per Jenis Pengadaan</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={jenisData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => formatRupiah(v)} />
            <Tooltip formatter={(v: any) => [formatRupiah(v), 'Total Nilai']} contentStyle={{
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: 10, fontSize: '0.8rem'
            }} />
            <Bar dataKey="value" name="Total Nilai" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Risk Packages Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><ShieldAlert size={16} /> Paket Risiko Tertinggi</span>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/risk-analysis')}>
            Lihat Semua <ChevronRight size={14} />
          </button>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nama Paket</th>
                <th>SKPD</th>
                <th>Metode</th>
                <th>Nilai</th>
                <th>Risk Score</th>
                <th>Level</th>
              </tr>
            </thead>
            <tbody>
              {topRiskPackages.map((pkg: RUPPackage) => (
                <tr key={pkg.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/risk-analysis')}>
                  <td className="truncate text-primary" style={{ maxWidth: 280 }} title={pkg.namaPaket}>
                    {pkg.kodeRUP ? (
                      <a href={`https://data.inaproc.id/rup?kode=${pkg.kodeRUP}&sumber=${pkg.caraPengadaan?.toLowerCase().includes('swakelola') ? 'Swakelola' : 'Penyedia'}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'inherit' }} onClick={e => e.stopPropagation()}>
                        {pkg.namaPaket}
                      </a>
                    ) : (
                      pkg.namaPaket
                    )}
                  </td>
                  <td className="truncate" style={{ maxWidth: 180 }} title={pkg.namaSatuanKerja}>
                    {pkg.namaSatuanKerja}
                  </td>
                  <td>{pkg.metodePengadaan}</td>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {formatRupiah(pkg.totalNilai)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        height: 6, borderRadius: 3,
                        width: `${pkg.riskScore || 0}%`,
                        maxWidth: 80, minWidth: 20,
                        background: pkg.riskLevel === 'KRITIS' ? RISK_COLORS.KRITIS :
                          pkg.riskLevel === 'TINGGI' ? RISK_COLORS.TINGGI :
                            pkg.riskLevel === 'SEDANG' ? RISK_COLORS.SEDANG : RISK_COLORS.NORMAL
                      }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{pkg.riskScore}</span>
                    </div>
                  </td>
                  <td><RiskBadge level={pkg.riskLevel!} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
