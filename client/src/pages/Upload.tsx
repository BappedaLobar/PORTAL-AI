import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader, X, Play } from 'lucide-react';
import { parseRUPExcel } from '../lib/excel-parser';
import { runStatisticalAnalysis } from '../lib/statistical-engine';
import { runRuleEngine } from '../lib/rule-engine';
import { applyRiskScores, computeDashboardStats } from '../lib/risk-scorer';
import { useDataStore } from '../store/dataStore';
import { useSettingsStore } from '../store/settingsStore';

const STEPS = [
  { key: 'parsing', label: 'Membaca file Excel', pct: 20 },
  { key: 'statistical', label: 'Analisis Statistik (Z-Score, IQR, Benford)', pct: 50 },
  { key: 'rules', label: 'Memeriksa Aturan Pengadaan', pct: 75 },
  { key: 'scoring', label: 'Menghitung Risk Score', pct: 90 },
  { key: 'done', label: 'Analisis selesai!', pct: 100 },
];

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { setPackages, setAnalyzedPackages, setProgress, setStats, progress } = useDataStore();
  const { settings } = useSettingsStore();

  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const isAnalyzing = progress.status !== 'idle' && progress.status !== 'done' && progress.status !== 'error';

  const handleFile = useCallback(async (f: File) => {
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      setError('Format file tidak didukung. Gunakan file .xlsx atau .xls');
      return;
    }
    setError(null);
    setFile(f);
    setProgress({ status: 'idle', progress: 0, message: 'File siap dianalisis' });

    // Quick preview
    try {
      const pkgs = await parseRUPExcel(f);
      setTotalRows(pkgs.length);
      const headers = ['Nama Paket', 'SKPD', 'Metode', 'Jenis', 'Nilai (Rp)', 'Kode RUP'];
      const rows = pkgs.slice(0, 5).map(p => [
        (p.namaPaket || '').substring(0, 50) + ((p.namaPaket || '').length > 50 ? '...' : ''),
        (p.namaSatuanKerja || '').substring(0, 30),
        p.metodePengadaan || '-',
        p.jenisPengadaan || '-',
        (p.totalNilai || 0).toLocaleString('id-ID'),
        p.kodeRUP || '-',
      ]);
      setPreviewData({ headers, rows });
    } catch {
      // Preview failed silently
    }
  }, [setProgress]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const runAnalysis = useCallback(async () => {
    if (!file) return;
    setError(null);

    try {
      // Step 1: Parse
      setProgress({ status: 'parsing', progress: 10, message: 'Membaca dan memvalidasi data...' });
      const packages = await parseRUPExcel(file);
      setPackages(packages, file.name);
      setProgress({ status: 'parsing', progress: 20, message: `${packages.length.toLocaleString('id-ID')} paket berhasil dibaca` });

      await new Promise(r => setTimeout(r, 400));

      // Step 2: Statistical analysis
      setProgress({ status: 'statistical', progress: 30, message: 'Menjalankan analisis Z-Score dan IQR...' });
      const statMap = runStatisticalAnalysis(packages, settings);
      setProgress({ status: 'statistical', progress: 50, message: 'Analisis Benford\'s Law & split tender selesai' });

      await new Promise(r => setTimeout(r, 400));

      // Step 3: Rule engine
      setProgress({ status: 'rules', progress: 60, message: 'Memeriksa aturan metode pengadaan...' });
      const ruleMap = runRuleEngine(packages, settings);
      setProgress({ status: 'rules', progress: 75, message: 'Pemeriksaan keyword selesai' });

      await new Promise(r => setTimeout(r, 400));

      // Step 4: Risk scoring
      setProgress({ status: 'scoring', progress: 80, message: 'Menghitung Risk Score gabungan...' });
      const analyzed = applyRiskScores(packages, statMap, ruleMap);
      const stats = computeDashboardStats(analyzed);

      setAnalyzedPackages(analyzed);
      setStats(stats);

      // Step 5: Persist to SQLite
      setProgress({ status: 'scoring', progress: 95, message: 'Menyimpan data ke database permanen...' });
      const res = await fetch('/api/packages/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packages: analyzed }),
      });
      if (!res.ok) {
        throw new Error(`Gagal menyimpan ke database (Error ${res.status}). Payload mungkin terlalu besar.`);
      }

      setProgress({ status: 'done', progress: 100, message: 'Analisis selesai! Mengarahkan ke dashboard...' });

      await new Promise(r => setTimeout(r, 1200));
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui';
      setError(msg);
      setProgress({ status: 'error', progress: 0, message: msg, error: msg });
    }
  }, [file, settings, setPackages, setAnalyzedPackages, setProgress, setStats, navigate]);

  const currentStep = STEPS.findIndex(s => s.key === progress.status);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Upload Data RUP</h1>
        <p>Upload file Excel RUP dari SIRUP LKPP untuk memulai analisis otomatis</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        {/* Main Upload Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Drop Zone */}
          {!file ? (
            <div
              className={`drop-zone ${dragOver ? 'dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <div className="drop-zone-icon">
                <Upload size={28} />
              </div>
              <h3 style={{ marginBottom: 8 }}>Drag & drop file Excel di sini</h3>
              <p style={{ marginBottom: 16, fontSize: '0.875rem' }}>
                atau klik untuk memilih file dari komputer Anda
              </p>
              <span className="badge badge-normal" style={{ fontSize: '0.75rem', padding: '4px 12px' }}>
                Format: .xlsx, .xls
              </span>
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleFileInput}
              />
            </div>
          ) : (
            /* File Selected */
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 52, height: 52, background: 'rgba(59,130,246,0.12)',
                  borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FileSpreadsheet size={26} color="var(--color-primary)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                    {totalRows > 0 && ` · ${totalRows.toLocaleString('id-ID')} paket terdeteksi`}
                  </div>
                </div>
                {!isAnalyzing && progress.status !== 'done' && (
                  <button
                    className="btn btn-secondary btn-icon"
                    onClick={() => { setFile(null); setPreviewData(null); setTotalRows(0); setProgress({ status: 'idle', progress: 0, message: '' }); }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Gagal memproses file</strong>
                <p style={{ marginTop: 4, color: 'inherit', opacity: 0.85 }}>{error}</p>
              </div>
            </div>
          )}

          {/* Analysis Progress */}
          {(isAnalyzing || progress.status === 'done') && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  {progress.status === 'done' ? (
                    <CheckCircle size={18} color="var(--color-normal)" />
                  ) : (
                    <Loader size={18} color="var(--color-primary)" style={{ animation: 'spin 1s linear infinite' }} />
                  )}
                  Progress Analisis
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {progress.progress}%
                </span>
              </div>

              <div className="progress-bar-wrapper" style={{ marginBottom: 16 }}>
                <div className="progress-bar-fill" style={{ width: `${progress.progress}%` }} />
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                {progress.message}
              </p>

              {/* Steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {STEPS.map((step, i) => {
                  const isDone = progress.progress >= step.pct;
                  const isCurrent = STEPS[currentStep]?.key === step.key;
                  return (
                    <div key={step.key} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 8,
                      background: isCurrent ? 'rgba(59,130,246,0.08)' : 'transparent',
                      border: isCurrent ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent',
                    }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: isDone ? 'var(--color-normal)' : isCurrent ? 'var(--color-primary)' : 'var(--bg-surface)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, fontSize: '0.7rem', fontWeight: 700, color: 'white',
                        border: !isDone && !isCurrent ? '1px solid var(--border-color)' : 'none',
                      }}>
                        {isDone ? '✓' : i + 1}
                      </div>
                      <span style={{
                        fontSize: '0.82rem',
                        color: isDone ? 'var(--color-normal)' : isCurrent ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontWeight: isCurrent ? 600 : 400,
                      }}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Data Preview */}
          {previewData && !isAnalyzing && progress.status !== 'done' && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Preview Data (5 baris pertama)</span>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>{previewData.headers.map(h => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {previewData.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} className="truncate" style={{ maxWidth: 200 }}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalRows > 5 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                  ... dan {(totalRows - 5).toLocaleString('id-ID')} paket lainnya
                </p>
              )}
            </div>
          )}

          {/* Start Analysis Button */}
          {file && !isAnalyzing && progress.status !== 'done' && (
            <button className="btn btn-primary btn-lg w-full" onClick={runAnalysis} disabled={isAnalyzing}>
              <Play size={18} />
              Mulai Analisis ({totalRows.toLocaleString('id-ID')} paket)
            </button>
          )}
        </div>

        {/* Right: Info Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>
              <span>🧠</span> Algoritma Aktif
            </div>
            {[
              { icon: '📊', name: 'Z-Score Analysis', desc: 'Deteksi outlier nilai per kategori' },
              { icon: '📦', name: 'IQR Outlier', desc: 'Interquartile Range per SKPD' },
              { icon: '📈', name: 'Benford\'s Law', desc: 'Deteksi manipulasi angka' },
              { icon: '🔍', name: 'Split Tender', desc: 'Pemecahan paket terlarang' },
              { icon: '⚖️', name: 'Rule Engine', desc: 'Perpres 16/2018 compliance' },
              { icon: '🤖', name: 'Gemini AI', desc: 'Analisis semantik mendalam' },
            ].map(algo => (
              <div key={algo.name} style={{
                display: 'flex', gap: 10, marginBottom: 10,
                padding: '8px 10px', background: 'var(--bg-glass-light)',
                borderRadius: 8, border: '1px solid var(--border-color)'
              }}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{algo.icon}</span>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{algo.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{algo.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="alert alert-info">
            <div style={{ fontSize: '0.8rem' }}>
              <strong>💡 Format File yang Diterima</strong>
              <ul style={{ marginTop: 8, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li>Export dari SIRUP LKPP</li>
                <li>Kolom: Nama Instansi, Satuan Kerja, Cara Pengadaan, Metode, Jenis, Nama Paket, Kode RUP, Sumber Dana, Total Nilai</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
