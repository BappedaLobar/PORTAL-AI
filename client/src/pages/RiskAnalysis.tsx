import React, { useState, useMemo } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Shield, Activity, Zap } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { RiskBadge } from '../components/ui/RiskBadge';
import type { RiskLevel, RUPPackage, RiskFlag } from '../types';
import { useNavigate } from 'react-router-dom';

const formatRupiah = (v: number) => {
  if (!v) return 'Rp 0';
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(2)}M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}Jt`;
  return `Rp ${v.toLocaleString('id-ID')}`;
};

const FLAG_TYPE_COLOR: Record<string, string> = {
  STATISTICAL: '#0EA5E9',
  RULE: '#F97316',
  AI: '#8B5CF6',
};

const FlagItem: React.FC<{ flag: RiskFlag }> = ({ flag }) => (
  <div style={{
    padding: '8px 12px',
    background: 'var(--bg-surface)',
    border: `1px solid ${
      flag.severity === 'KRITIS' ? 'var(--color-kritis-border)' :
      flag.severity === 'TINGGI' ? 'var(--color-tinggi-border)' :
      flag.severity === 'SEDANG' ? 'var(--color-sedang-border)' :
      'var(--border-color)'
    }`,
    borderRadius: 8,
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
  }}>
    <span style={{
      fontSize: '0.65rem', fontWeight: 700, color: FLAG_TYPE_COLOR[flag.type] || 'var(--text-muted)',
      background: `${FLAG_TYPE_COLOR[flag.type]}22`, border: `1px solid ${FLAG_TYPE_COLOR[flag.type]}44`,
      padding: '2px 6px', borderRadius: 4, flexShrink: 0, whiteSpace: 'nowrap', marginTop: 1,
    }}>
      {flag.type}
    </span>
    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
      {flag.message}
    </span>
    <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: '0.78rem', fontWeight: 700,
      color: flag.severity === 'KRITIS' ? 'var(--color-kritis)' :
        flag.severity === 'TINGGI' ? 'var(--color-tinggi)' :
        flag.severity === 'SEDANG' ? 'var(--color-sedang)' : 'var(--color-normal)'
    }}>
      +{flag.score}
    </span>
  </div>
);

const PackageDetail: React.FC<{ pkg: RUPPackage; onClose: () => void }> = ({ pkg, onClose }) => {
  const statScore = pkg.riskFlags?.filter(f => f.type === 'STATISTICAL').reduce((sum, f) => sum + f.score, 0) ?? 0;
  const ruleScore = pkg.riskFlags?.filter(f => f.type === 'RULE').reduce((sum, f) => sum + f.score, 0) ?? 0;
  const aiScore = pkg.riskFlags?.filter(f => f.type === 'AI').reduce((sum, f) => sum + f.score, 0) ?? 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '85vh',
        overflow: 'auto', padding: 28
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <RiskBadge level={pkg.riskLevel!} score={pkg.riskScore} showScore />
            <h3 style={{ marginTop: 8, lineHeight: 1.3 }}>
              {pkg.kodeRUP ? (
                <a href={`https://data.inaproc.id/rup?kode=${pkg.kodeRUP}&sumber=${pkg.caraPengadaan?.toLowerCase().includes('swakelola') ? 'Swakelola' : 'Penyedia'}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'inherit' }}>
                  {pkg.namaPaket}
                </a>
              ) : (
                pkg.namaPaket
              )}
            </h3>
            <p style={{ marginTop: 4, fontSize: '0.85rem' }}>{pkg.namaSatuanKerja}</p>
          </div>
          <button className="btn btn-secondary btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Kode RUP', value: pkg.kodeRUP || '-' },
            { label: 'Cara Pengadaan', value: pkg.caraPengadaan || '-' },
            { label: 'Metode', value: pkg.metodePengadaan || '-' },
            { label: 'Jenis', value: pkg.jenisPengadaan || '-' },
            { label: 'Sumber Dana', value: pkg.sumberDana || '-' },
            { label: 'Produk DN', value: pkg.produkDalamNegeri || '-' },
          ].map(item => (
            <div key={item.label} style={{
              padding: '10px 12px', background: 'var(--bg-surface)',
              borderRadius: 8, border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Total Nilai */}
        <div style={{
          padding: '14px 16px', background: 'rgba(59,130,246,0.08)',
          border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, marginBottom: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Nilai Paket</span>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary-light)' }}>
            {pkg.totalNilai?.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
          </span>
        </div>

        {/* Score Breakdown */}
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ marginBottom: 12 }}>📊 Breakdown Risk Score</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Statistikal (40%)', score: statScore, color: FLAG_TYPE_COLOR.STATISTICAL, icon: <Activity size={16} /> },
              { label: 'Rule Engine (35%)', score: ruleScore, color: FLAG_TYPE_COLOR.RULE, icon: <Shield size={16} /> },
              { label: 'AI Score (25%)', score: aiScore, color: FLAG_TYPE_COLOR.AI, icon: <Zap size={16} /> },
            ].map(item => (
              <div key={item.label} style={{
                padding: '12px 14px', background: 'var(--bg-surface)',
                border: `1px solid ${item.color}44`, borderRadius: 10, textAlign: 'center'
              }}>
                <div style={{ color: item.color, marginBottom: 6 }}>{item.icon}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: item.color }}>{Math.min(100, item.score)}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Flags/Evidence */}
        {(pkg.riskFlags?.length ?? 0) > 0 && (
          <div>
            <h4 style={{ marginBottom: 12 }}>⚠️ Temuan & Evidence</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pkg.riskFlags!.map((flag, i) => <FlagItem key={i} flag={flag} />)}
            </div>
          </div>
        )}

        {/* AI Analysis */}
        {pkg.aiAnalysis && (
          <div style={{ marginTop: 20 }}>
            <h4 style={{ marginBottom: 12 }}>🤖 Analisis AI</h4>
            <div style={{
              padding: 16, background: 'rgba(139,92,246,0.08)',
              border: '1px solid rgba(139,92,246,0.25)', borderRadius: 10
            }}>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{pkg.aiAnalysis.summary}</p>
              {pkg.aiAnalysis.markupIndicators?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--color-kritis)' }}>Indikator Mark-Up:</strong>
                  <ul style={{ paddingLeft: 16, marginTop: 6 }}>
                    {pkg.aiAnalysis.markupIndicators.map((m, i) => (
                      <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4 }}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const RiskAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { analyzedPackages } = useDataStore();
  const [activeLevel, setActiveLevel] = useState<RiskLevel | 'ALL'>('ALL');
  const [selectedPkg, setSelectedPkg] = useState<RUPPackage | null>(null);
  const [expandedSKPD, setExpandedSKPD] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'skpd'>('list');

  const filtered = useMemo(() => {
    const base = [...analyzedPackages];
    if (activeLevel === 'ALL') return base.sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));
    return base.filter(p => p.riskLevel === activeLevel).sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));
  }, [analyzedPackages, activeLevel]);

  const skpdGroups = useMemo(() => {
    const map = new Map<string, { packages: RUPPackage[]; maxScore: number; critCount: number; totalValue: number }>();
    filtered.forEach(p => {
      const skpd = p.namaSatuanKerja || 'Unknown';
      if (!map.has(skpd)) map.set(skpd, { packages: [], maxScore: 0, critCount: 0, totalValue: 0 });
      const d = map.get(skpd)!;
      d.packages.push(p);
      d.maxScore = Math.max(d.maxScore, p.riskScore ?? 0);
      if (p.riskLevel === 'KRITIS') d.critCount++;
      d.totalValue += p.totalNilai ?? 0;
    });
    return Array.from(map.entries()).sort((a, b) => b[1].maxScore - a[1].maxScore);
  }, [filtered]);

  const counts = useMemo(() => ({
    ALL: analyzedPackages.length,
    KRITIS: analyzedPackages.filter(p => p.riskLevel === 'KRITIS').length,
    TINGGI: analyzedPackages.filter(p => p.riskLevel === 'TINGGI').length,
    SEDANG: analyzedPackages.filter(p => p.riskLevel === 'SEDANG').length,
    NORMAL: analyzedPackages.filter(p => p.riskLevel === 'NORMAL').length,
  }), [analyzedPackages]);

  if (!analyzedPackages.length) {
    return (
      <div className="animate-fade-in">
        <div className="page-header"><h1>Analisis Risiko</h1></div>
        <div className="empty-state">
          <div className="empty-state-icon"><AlertTriangle size={40} /></div>
          <h3>Belum Ada Data</h3>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/upload')}>Upload Data</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {selectedPkg && <PackageDetail pkg={selectedPkg} onClose={() => setSelectedPkg(null)} />}

      <div className="page-header">
        <h1>Analisis Risiko</h1>
        <p>Temuan & evidence detail per paket pengadaan</p>
      </div>

      {/* Level Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {(['ALL', 'KRITIS', 'TINGGI', 'SEDANG', 'NORMAL'] as const).map(level => {
          const colors: Record<string, string> = {
            ALL: '#3B82F6', KRITIS: '#EF4444', TINGGI: '#F97316', SEDANG: '#EAB308', NORMAL: '#22C55E'
          };
          const active = activeLevel === level;
          return (
            <button key={level} onClick={() => { setActiveLevel(level); }}
              style={{
                padding: '8px 18px', borderRadius: 30, border: `1px solid ${active ? colors[level] : 'var(--border-color)'}`,
                background: active ? `${colors[level]}22` : 'var(--bg-glass-light)',
                color: active ? colors[level] : 'var(--text-secondary)',
                fontWeight: active ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all 0.15s',
              }}>
              {level === 'ALL' ? 'Semua' : level} ({counts[level]})
            </button>
          );
        })}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('list')}>
            List View
          </button>
          <button className={`btn btn-sm ${viewMode === 'skpd' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('skpd')}>
            Per SKPD
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.slice(0, 100).map(pkg => (
            <div key={pkg.id} className="card"
              style={{
                borderLeft: `4px solid ${
                  pkg.riskLevel === 'KRITIS' ? 'var(--color-kritis)' :
                  pkg.riskLevel === 'TINGGI' ? 'var(--color-tinggi)' :
                  pkg.riskLevel === 'SEDANG' ? 'var(--color-sedang)' : 'var(--color-normal)'}`,
                cursor: 'pointer', transition: 'all 0.2s'
              }}
              onClick={() => setSelectedPkg(pkg)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <RiskBadge level={pkg.riskLevel!} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Score: {pkg.riskScore}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pkg.kodeRUP}</span>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.4 }}>
                    {pkg.namaPaket}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {pkg.namaSatuanKerja} · {pkg.metodePengadaan}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {formatRupiah(pkg.totalNilai)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {pkg.riskFlags?.length ?? 0} temuan
                  </div>
                </div>
              </div>

              {/* Mini flags preview */}
              {(pkg.riskFlags?.length ?? 0) > 0 && (
                <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {pkg.riskFlags!.slice(0, 3).map((flag, i) => (
                    <span key={i} style={{
                      fontSize: '0.7rem', padding: '3px 8px',
                      background: `${FLAG_TYPE_COLOR[flag.type]}15`,
                      border: `1px solid ${FLAG_TYPE_COLOR[flag.type]}40`,
                      color: FLAG_TYPE_COLOR[flag.type],
                      borderRadius: 4, fontWeight: 500
                    }}>
                      {flag.code.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {pkg.riskFlags!.length > 3 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '3px 0' }}>
                      +{pkg.riskFlags!.length - 3} lainnya
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
          {filtered.length > 100 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: 16 }}>
              Menampilkan 100 dari {filtered.length} paket. Gunakan filter untuk mempersempit hasil.
            </p>
          )}
        </div>
      ) : (
        /* SKPD Group View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {skpdGroups.map(([skpd, data]) => (
            <div key={skpd} className="card">
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => setExpandedSKPD(expandedSKPD === skpd ? null : skpd)}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{skpd}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 16 }}>
                    <span>{data.packages.length} paket</span>
                    {data.critCount > 0 && <span style={{ color: 'var(--color-kritis)' }}>{data.critCount} kritis</span>}
                    <span>{formatRupiah(data.totalValue)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    fontWeight: 800, fontSize: '1.1rem',
                    color: data.maxScore >= 75 ? 'var(--color-kritis)' :
                      data.maxScore >= 50 ? 'var(--color-tinggi)' :
                      data.maxScore >= 25 ? 'var(--color-sedang)' : 'var(--color-normal)'
                  }}>
                    Max: {data.maxScore}
                  </span>
                  {expandedSKPD === skpd ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              {expandedSKPD === skpd && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.packages.map(pkg => (
                    <div key={pkg.id} style={{
                      padding: '10px 12px', background: 'var(--bg-surface)',
                      borderRadius: 8, border: '1px solid var(--border-color)',
                      cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center'
                    }} onClick={() => setSelectedPkg(pkg)}>
                      <RiskBadge level={pkg.riskLevel!} />
                      <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {pkg.namaPaket}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {formatRupiah(pkg.totalNilai)}
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {pkg.riskScore}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
