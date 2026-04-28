import React, { useState, useMemo } from 'react';
import { Target, Plus, Trash2, Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { usePolicyStore } from '../store/policyStore';
import { useDataStore } from '../store/dataStore';
import { parsePrioritasExcel } from '../lib/excel-parser';

const formatRupiah = (v: number) => {
  if (!v) return 'Rp 0';
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(2)}M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}Jt`;
  return `Rp ${v.toLocaleString('id-ID')}`;
};

export const PolicyCheckPage: React.FC = () => {
  const { priorities, addPriority, addPriorities, removePriority, clearPriorities } = usePolicyStore();
  const { analyzedPackages } = useDataStore();

  const [newProgram, setNewProgram] = useState('');
  const [newBidang, setNewBidang] = useState('');
  const [newDeskripsi, setNewDeskripsi] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'input' | 'analysis'>('input');

  const handleAddManual = () => {
    if (!newProgram.trim()) return;
    addPriority({
      namaProgram: newProgram.trim(),
      bidang: newBidang.trim(),
      deskripsi: newDeskripsi.trim(),
      keywords: newProgram.trim().toLowerCase().split(/\s+/).filter(k => k.length > 3),
    });
    setNewProgram(''); setNewBidang(''); setNewDeskripsi('');
  };

  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    setUploadMsg('');
    try {
      const data = await parsePrioritasExcel(f);
      addPriorities(data);
      setUploadMsg(`✅ ${data.length} program prioritas berhasil diimpor`);
    } catch (err) {
      setUploadMsg(`❌ Gagal: ${err instanceof Error ? err.message : 'Error'}`);
    } finally {
      setUploading(false);
    }
  };

  // Policy alignment analysis
  const policyAnalysis = useMemo(() => {
    if (!analyzedPackages.length || !priorities.length) return null;

    const matched: { pkg: typeof analyzedPackages[0]; programs: string[] }[] = [];
    const notMatched: typeof analyzedPackages = [];

    analyzedPackages.forEach(pkg => {
      const nameLower = (pkg.namaPaket || '').toLowerCase();
      const matchedPrograms: string[] = [];

      priorities.forEach(priority => {
        const isMatch = priority.keywords.some(kw => nameLower.includes(kw)) ||
          nameLower.includes(priority.namaProgram.toLowerCase());
        if (isMatch) matchedPrograms.push(priority.namaProgram);
      });

      if (matchedPrograms.length > 0) matched.push({ pkg, programs: matchedPrograms });
      else notMatched.push(pkg);
    });

    const priorityCoverage = priorities.map(priority => {
      const covered = analyzedPackages.filter(pkg => {
        const nameLower = (pkg.namaPaket || '').toLowerCase();
        return priority.keywords.some(kw => nameLower.includes(kw)) ||
          nameLower.includes(priority.namaProgram.toLowerCase());
      });
      return {
        priority,
        count: covered.length,
        value: covered.reduce((sum, p) => sum + (p.totalNilai || 0), 0),
        hasData: covered.length > 0,
      };
    });

    return {
      matched: matched.length,
      notMatched: notMatched.length,
      matchRate: ((matched.length / analyzedPackages.length) * 100).toFixed(1),
      priorityCoverage,
      uncoveredPriorities: priorityCoverage.filter(p => !p.hasData),
      topNotMatched: notMatched
        .filter(p => p.riskLevel === 'KRITIS' || p.riskLevel === 'TINGGI')
        .slice(0, 10),
    };
  }, [analyzedPackages, priorities]);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Cek Kebijakan</h1>
        <p>Mapping paket pengadaan terhadap program prioritas kepala daerah</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {(['input', 'analysis'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'} btn-sm`}>
            {tab === 'input' ? '📋 Program Prioritas' : '📊 Analisis Kesesuaian'}
          </button>
        ))}
      </div>

      {activeTab === 'input' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
          {/* Input Manual */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title"><Plus size={16} /> Tambah Program Prioritas Manual</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Nama Program Prioritas *</label>
                  <input className="form-input" value={newProgram}
                    onChange={e => setNewProgram(e.target.value)}
                    placeholder="Contoh: Peningkatan Infrastruktur Jalan Desa" />
                </div>
                <div className="form-group">
                  <label className="form-label">Bidang / Urusan</label>
                  <input className="form-input" value={newBidang}
                    onChange={e => setNewBidang(e.target.value)}
                    placeholder="Contoh: Pekerjaan Umum & Penataan Ruang" />
                </div>
                <div className="form-group">
                  <label className="form-label">Deskripsi</label>
                  <textarea className="form-textarea" rows={2} value={newDeskripsi}
                    onChange={e => setNewDeskripsi(e.target.value)}
                    placeholder="Uraian singkat program..." />
                </div>
                <button className="btn btn-primary" onClick={handleAddManual} disabled={!newProgram.trim()}>
                  <Plus size={16} /> Tambah Program
                </button>
              </div>
            </div>

            {/* List Priorities */}
            <div className="card">
              <div className="card-header">
                <span className="card-title"><Target size={16} /> Daftar Program Prioritas ({priorities.length})</span>
                {priorities.length > 0 && (
                  <button className="btn btn-secondary btn-sm" onClick={clearPriorities}
                    style={{ color: 'var(--color-kritis)' }}>
                    <Trash2 size={13} /> Hapus Semua
                  </button>
                )}
              </div>
              {priorities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                  Belum ada program prioritas. Tambah manual atau upload Excel.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {priorities.map(p => (
                    <div key={p.id} style={{
                      padding: '10px 12px', background: 'var(--bg-surface)',
                      borderRadius: 8, border: '1px solid var(--border-color)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {p.namaProgram}
                        </div>
                        {p.bidang && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{p.bidang}</div>}
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                          {p.keywords.slice(0, 4).map(kw => (
                            <span key={kw} style={{
                              fontSize: '0.65rem', padding: '1px 6px',
                              background: 'rgba(59,130,246,0.1)', color: 'var(--color-primary-light)',
                              border: '1px solid rgba(59,130,246,0.2)', borderRadius: 4
                            }}>{kw}</span>
                          ))}
                        </div>
                      </div>
                      <button className="btn btn-secondary btn-icon btn-sm" onClick={() => removePriority(p.id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upload Excel */}
          <div className="card">
            <div className="card-header">
              <span className="card-title"><Upload size={16} /> Import dari Excel</span>
            </div>
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{
                width: 56, height: 56, background: 'rgba(59,130,246,0.1)',
                borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', color: 'var(--color-primary)'
              }}>
                <Upload size={26} />
              </div>
              <h4 style={{ marginBottom: 8 }}>Upload File Excel</h4>
              <p style={{ fontSize: '0.82rem', marginBottom: 16 }}>
                Format: kolom Nama Program, Bidang, Deskripsi, Kata Kunci
              </p>
              <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                {uploading ? '⏳ Mengupload...' : '📁 Pilih File Excel'}
                <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
                  onChange={handleUploadExcel} disabled={uploading} />
              </label>
              {uploadMsg && (
                <div className={`alert ${uploadMsg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}
                  style={{ marginTop: 16, textAlign: 'left' }}>
                  {uploadMsg}
                </div>
              )}
            </div>

            <div className="divider" />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Template kolom Excel:</strong>
              <ul style={{ paddingLeft: 16, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li>Kolom A: Nama Program</li>
                <li>Kolom B: Bidang/Urusan</li>
                <li>Kolom C: Deskripsi (opsional)</li>
                <li>Kolom D: Kata Kunci (pisahkan dengan koma)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analysis' && (
        <div>
          {!analyzedPackages.length || !priorities.length ? (
            <div className="alert alert-warning">
              <AlertCircle size={18} />
              <span>
                {!analyzedPackages.length ? 'Upload data RUP terlebih dahulu.' : 'Tambah program prioritas terlebih dahulu.'} 
              </span>
            </div>
          ) : policyAnalysis && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Summary Cards */}
              <div className="grid-4">
                <div className="kpi-card" style={{ '--kpi-accent': '#22C55E', '--kpi-accent-bg': 'rgba(34,197,94,0.12)' } as React.CSSProperties}>
                  <div className="kpi-icon"><CheckCircle size={20} /></div>
                  <div className="kpi-label">Sesuai Prioritas</div>
                  <div className="kpi-value" style={{ color: 'var(--color-normal)' }}>{policyAnalysis.matched.toLocaleString('id-ID')}</div>
                  <div className="kpi-sub">{policyAnalysis.matchRate}% dari total paket</div>
                </div>
                <div className="kpi-card" style={{ '--kpi-accent': '#EF4444', '--kpi-accent-bg': 'rgba(239,68,68,0.12)' } as React.CSSProperties}>
                  <div className="kpi-icon"><XCircle size={20} /></div>
                  <div className="kpi-label">Tidak Sesuai</div>
                  <div className="kpi-value" style={{ color: 'var(--color-kritis)' }}>{policyAnalysis.notMatched.toLocaleString('id-ID')}</div>
                  <div className="kpi-sub">Perlu justifikasi</div>
                </div>
                <div className="kpi-card" style={{ '--kpi-accent': '#EAB308', '--kpi-accent-bg': 'rgba(234,179,8,0.12)' } as React.CSSProperties}>
                  <div className="kpi-icon"><Target size={20} /></div>
                  <div className="kpi-label">Prioritas Tanpa Data</div>
                  <div className="kpi-value" style={{ color: 'var(--color-sedang)' }}>{policyAnalysis.uncoveredPriorities.length}</div>
                  <div className="kpi-sub">Dari {priorities.length} total prioritas</div>
                </div>
                <div className="kpi-card" style={{ '--kpi-accent': '#F97316' } as React.CSSProperties}>
                  <div className="kpi-icon"><AlertCircle size={20} /></div>
                  <div className="kpi-label">Tidak Sesuai + Berisiko</div>
                  <div className="kpi-value" style={{ color: 'var(--color-tinggi)' }}>{policyAnalysis.topNotMatched.length}</div>
                  <div className="kpi-sub">Prioritas audit tertinggi</div>
                </div>
              </div>

              {/* Priority Coverage Table */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">📋 Coverage per Program Prioritas</span>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Program Prioritas</th>
                        <th>Bidang</th>
                        <th style={{ textAlign: 'center' }}>Jumlah Paket</th>
                        <th style={{ textAlign: 'right' }}>Total Nilai</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {policyAnalysis.priorityCoverage.map(({ priority, count, value, hasData }) => (
                        <tr key={priority.id}>
                          <td className="text-primary" style={{ fontWeight: 500 }}>{priority.namaProgram}</td>
                          <td>{priority.bidang || '-'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{count}</td>
                          <td style={{ textAlign: 'right' }}>{formatRupiah(value)}</td>
                          <td>
                            {hasData ? (
                              <span className="badge badge-normal">Ada Alokasi</span>
                            ) : (
                              <span className="badge badge-kritis">Tidak Ada Alokasi</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Paket Tidak Sesuai & Berisiko */}
              {policyAnalysis.topNotMatched.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">⚠️ Paket Tidak Sesuai Prioritas & Berisiko Tinggi</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {policyAnalysis.topNotMatched.map(pkg => (
                      <div key={pkg.id} style={{
                        padding: '10px 14px', background: 'var(--bg-surface)',
                        borderRadius: 8, border: '1px solid var(--color-kritis-border)',
                        display: 'flex', gap: 12, alignItems: 'center'
                      }}>
                        <span className="badge badge-kritis">Tidak Sesuai</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{pkg.namaPaket}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{pkg.namaSatuanKerja}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatRupiah(pkg.totalNilai)}</div>
                          <div style={{ fontSize: '0.75rem' }}><span className={`badge badge-${pkg.riskLevel!.toLowerCase()}`}>{pkg.riskLevel}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
