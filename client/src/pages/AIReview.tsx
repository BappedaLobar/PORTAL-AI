import React, { useState } from 'react';
import { Bot, RefreshCw, Send, Search, AlertCircle, MessageSquare, ExternalLink, Loader, Zap } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { usePolicyStore } from '../store/policyStore';
import { useSettingsStore } from '../store/settingsStore';
import { useNavigate } from 'react-router-dom';

const formatRupiah = (v: number) => {
  if (!v) return 'Rp 0';
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(2)}M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}Jt`;
  return `Rp ${v.toLocaleString('id-ID')}`;
};

interface Message {
  role: 'user' | 'ai';
  content: string;
  loading?: boolean;
}

const ANALYSIS_PRESETS = [
  {
    id: 'fraud',
    label: '🕵️ Fraud & Mark-up',
    title: 'Analisis Fraud & Mark-up',
    prompt: 'Bertindaklah sebagai auditor forensik. Fokus pada deteksi indikasi mark-up harga, pemecahan paket (split tender) untuk menghindari lelang, dan ketidaksesuaian antara metode pengadaan dengan nilai paket. Berikan rincian teknis jika ditemukan anomali.'
  },
  {
    id: 'efficiency',
    label: '💸 Efisiensi & Hemat',
    title: 'Audit Efisiensi Anggaran',
    prompt: 'Bertindaklah sebagai ahli efisiensi anggaran. Identifikasi paket yang bersifat seremonial, konsumtif, atau kurang mendesak (seperti makan minum, souvenir, pakaian dinas berlebih). Berikan rekomendasi penghematan atau pengalihan anggaran ke sektor produktif.'
  },
  {
    id: 'priority',
    label: '🎯 Program Prioritas',
    title: 'Keselarasan Program Prioritas',
    prompt: 'Analisis keselarasan paket ini dengan program prioritas pemerintah daerah. Apakah anggaran dialokasikan pada sektor yang tepat untuk pelayanan publik atau hanya belanja rutin yang tidak berdampak strategis?'
  },
  {
    id: 'pdn',
    label: '🇮🇩 PDN & UMKK',
    title: 'Optimalisasi PDN & UMKK',
    prompt: 'Fokus pada kepatuhan terhadap penggunaan Produk Dalam Negeri (PDN) dan keterlibatan Usaha Mikro, Kecil, dan Koperasi (UMKK). Analisis apakah paket-paket ini sudah mengoptimalkan potensi lokal sesuai instruksi Presiden.'
  },
  {
    id: 'legal',
    label: '⚖️ Kepatuhan Regulasi',
    title: 'Uji Kepatuhan Regulasi',
    prompt: 'Analisis mendalam terhadap metode pemilihan penyedia. Periksa apakah paket yang seharusnya lelang tapi menggunakan Penunjukan Langsung atau E-Purchasing tanpa justifikasi kuat. Jelaskan risiko hukum dan teknis yang mungkin timbul.'
  },
  {
    id: 'conflict',
    label: '🔍 Konflik Kepentingan',
    title: 'Deteksi Konflik Kepentingan',
    prompt: 'Analisis potensi konflik kepentingan, nepotisme, atau kedekatan vendor dengan pejabat pembuat komitmen. Cari pola vendor yang sering menang di OPD ini atau adanya hubungan afiliasi yang mencurigakan.'
  },
  {
    id: 'infra',
    label: '🏗️ Audit Infrastruktur',
    title: 'Audit Konstruksi & Fisik',
    prompt: 'Fokus pada pengadaan konstruksi/fisik. Periksa kewajaran harga satuan, potensi pengurangan volume, dan ketepatan waktu. Analisis apakah spesifikasi teknis mengunci pada satu merk tertentu (diskriminatif).'
  },
  {
    id: 'it',
    label: '💻 Audit IT & Digital',
    title: 'Audit TI & Digitalisasi',
    prompt: 'Fokus pada pengadaan IT. Periksa urgensi sistem, potensi duplikasi aplikasi antar OPD, dan keberlanjutan pemeliharaan. Pastikan tidak ada pemborosan pada lisensi atau hardware yang tidak perlu.'
  },
  {
    id: 'contract',
    label: '📅 Risiko Kontrak',
    title: 'Analisis Risiko Pelaksanaan',
    prompt: 'Analisis risiko keterlambatan atau adendum (CCO) tidak wajar. Periksa apakah perencanaan matang atau ada indikasi sengaja dibuat rendah di awal untuk dimainkan saat kontrak berjalan.'
  },
  {
    id: 'partner',
    label: '🤝 Evaluasi Kemitraan',
    title: 'Analisis Pihak Ketiga',
    prompt: 'Analisis pola pengadaan yang melibatkan pihak ketiga atau konsultan. Periksa kewajaran fee, relevansi output terhadap kebutuhan instansi, dan potensi ketergantungan berlebih pada vendor tertentu.'
  }
];

export const AIReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { analyzedPackages, stats } = useDataStore();
  const { priorities } = usePolicyStore();
  const { settings } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'batch' | 'single' | 'chat'>('batch');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [selectedOPD, setSelectedOPD] = useState<string>('');
  const [packageSearch, setPackageSearch] = useState('');
  const [selectedPackageIds, setSelectedPackageIds] = useState<Set<string>>(new Set());
  const [singleAnalysisResult, setSingleAnalysisResult] = useState<string | null>(null);
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleReportNarrative, setSingleReportNarrative] = useState<string | null>(null);
  const [singleReportLoading, setSingleReportLoading] = useState(false);
  
  const [batchResult, setBatchResult] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [reportNarrative, setReportNarrative] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Halo! Saya adalah asisten audit pengadaan berbasis Gemini AI. Tanyakan apa saja tentang data RUP Anda, analisis risiko, atau kebijakan pengadaan pemerintah.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const opdList = Array.from(new Set(analyzedPackages.map(p => p.namaSatuanKerja))).sort();
  
  const filteredPackagesByOPD = selectedOPD 
    ? analyzedPackages.filter(p => 
        p.namaSatuanKerja === selectedOPD && 
        ((p.namaPaket || '').toLowerCase().includes(packageSearch.toLowerCase()) || 
         String(p.id || '').toLowerCase().includes(packageSearch.toLowerCase()))
      )
    : [];

  const topRiskPackages = [...analyzedPackages]
    .filter(p => p.riskLevel === 'KRITIS' || p.riskLevel === 'TINGGI')
    .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
    .slice(0, 10);

  const handleGenerateSingleReport = async () => {
    const selectedPkgs = analyzedPackages.filter(p => selectedPackageIds.has(p.id));
    if (!selectedPkgs.length) return;

    setSingleReportLoading(true);
    setSingleReportNarrative(null);
    try {
      const res = await fetch('/api/gemini/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          summary: stats,
          topRisks: selectedPkgs,
          instansi: selectedOPD || settings.instansiName || 'Pemerintah Daerah',
          period: settings.tahunAnggaran || new Date().getFullYear().toString(),
          aiProvider: settings.aiProvider || 'gemini',
          reportInstructions: settings.reportInstructions
        }),
      });
      const data = await res.json();
      if (data.success) setSingleReportNarrative(data.narrative);
      else setSingleReportNarrative(`❌ Gagal: ${data.error}`);
    } catch (err) {
      setSingleReportNarrative(`❌ Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setSingleReportLoading(false);
    }
  };

  const executeAnalysis = async (pkgs: any[]) => {
    if (!pkgs.length) return;
    
    setSingleLoading(true);
    setSingleAnalysisResult(null);
    try {
      const res = await fetch('/api/gemini/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          packages: pkgs,
          priorities: priorities.map(p => p.namaProgram),
          aiProvider: settings.aiProvider || 'gemini',
          analysisInstructions: activePresetId 
            ? ANALYSIS_PRESETS.find(p => p.id === activePresetId)?.prompt 
            : settings.analysisInstructions
        }),
      });
      const data = await res.json();
      if (data.success) {
        const formatted = data.analyses.map((a: any) => {
          const pkg = pkgs[a.index - 1];
          return `### ${a.index}. ${pkg?.namaPaket || 'Unknown'}\n` +
            `**Status:** AI Score: ${a.riskScore} (${a.riskLevel}) | Kebijakan: ${a.policyAlignment}\n` +
            `**Temuan:** ${a.mainConcern}\n\n` +
            `**Analisis Naratif:**\n${a.detailedAnalysis || 'Tidak ada rincian tambahan.'}\n`;
        }).join('\n---\n\n');
        setSingleAnalysisResult(formatted);
      } else {
        setSingleAnalysisResult(`❌ Gagal: ${data.error}`);
      }
    } catch (err) {
      setSingleAnalysisResult(`❌ Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setSingleLoading(false);
    }
  };

  const handleSingleAnalysis = async () => {
    const selectedPkgs = analyzedPackages.filter(p => selectedPackageIds.has(p.id));
    await executeAnalysis(selectedPkgs);
  };

  const handleBatchAnalysis = async () => {
    if (!topRiskPackages.length) return;
    setBatchLoading(true);
    setBatchResult(null);
    try {
      const res = await fetch('/api/gemini/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          packages: topRiskPackages,
          priorities: priorities.map(p => p.namaProgram),
          aiProvider: settings.aiProvider || 'gemini',
          analysisInstructions: activePresetId 
            ? ANALYSIS_PRESETS.find(p => p.id === activePresetId)?.prompt 
            : settings.analysisInstructions
        }),
      });
      const data = await res.json();
      if (data.success) {
        const formatted = data.analyses.map((a: { index: number; riskScore: number; riskLevel: string; mainConcern: string; detailedAnalysis?: string; policyAlignment: string }) => {
          const pkg = topRiskPackages[a.index - 1];
          return `### ${a.index}. ${pkg?.namaPaket || 'Unknown'}\n` +
            `**Status:** AI Score: ${a.riskScore} (${a.riskLevel}) | Kebijakan: ${a.policyAlignment}\n` +
            `**Temuan:** ${a.mainConcern}\n\n` +
            `**Analisis Naratif:**\n${a.detailedAnalysis || 'Tidak ada rincian tambahan.'}\n`;
        }).join('\n---\n\n');
        setBatchResult(formatted);
      } else {
        setBatchResult(`❌ Gagal: ${data.error}`);
      }
    } catch (err) {
      setBatchResult(`❌ Error koneksi ke server: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!stats) return;
    setReportLoading(true);
    setReportNarrative(null);
    try {
      const res = await fetch('/api/gemini/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          summary: stats,
          topRisks: topRiskPackages,
          instansi: settings.instansiName || 'Pemerintah Daerah',
          period: settings.tahunAnggaran || new Date().getFullYear().toString(),
          aiProvider: settings.aiProvider || 'gemini',
          reportInstructions: settings.reportInstructions
        }),
      });
      const data = await res.json();
      if (data.success) setReportNarrative(data.narrative);
      else setReportNarrative(`❌ Gagal: ${data.error}`);
    } catch (err) {
      setReportNarrative(`❌ Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setReportLoading(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }, { role: 'ai', content: '', loading: true }]);
    setChatLoading(true);

    try {
      const context = stats
        ? `Data RUP: ${stats.totalPackages} paket, total Rp ${stats.totalValue?.toLocaleString('id-ID')}, ` +
          `${stats.criticalCount} kritis, ${stats.highCount} tinggi, ${stats.mediumCount} sedang.`
        : undefined;

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...settings,
          message: userMsg, 
          context, 
          aiProvider: settings.aiProvider || 'gemini',
          analysisInstructions: settings.analysisInstructions
        }),
      });
      const data = await res.json();
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'ai',
          content: data.success ? data.response : `❌ ${data.error}`
        };
        return updated;
      });
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'ai', content: '❌ Gagal menghubungi server AI.' };
        return updated;
      });
    } finally {
      setChatLoading(false);
    }
  };

  if (!analyzedPackages.length) {
    return (
      <div className="animate-fade-in">
        <div className="page-header"><h1>AI Review</h1></div>
        <div className="empty-state">
          <div className="empty-state-icon"><Bot size={40} /></div>
          <h3>Belum Ada Data</h3>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/upload')}>Upload Data</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>AI Review</h1>
        <p>Analisis mendalam oleh Gemini AI untuk paket berisiko tinggi</p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {(['batch', 'single', 'chat'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'} btn-sm`}>
            {tab === 'batch' ? <><Zap size={14} /> Analisis Batch</> : 
             tab === 'single' ? <><Bot size={14} /> Per OPD / Paket</> :
             <><MessageSquare size={14} /> Chat AI</>}
          </button>
        ))}
      </div>

      {activeTab === 'batch' && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', 
          gap: 20, 
          alignItems: 'start',
          width: '100%'
        }}>
          {/* Batch Analysis */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title"><Zap size={16} /> Analisis Batch ({topRiskPackages.length} paket)</span>
              </div>
              <p style={{ fontSize: '0.85rem', marginBottom: 16 }}>
                AI akan menganalisis {topRiskPackages.length} paket dengan risiko Kritis & Tinggi tertinggi
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {topRiskPackages.slice(0, 5).map((pkg, i) => (
                  <div key={pkg.id} style={{
                    padding: '8px 12px', background: 'var(--bg-surface)',
                    borderRadius: 8, border: '1px solid var(--border-color)',
                    display: 'flex', gap: 10, alignItems: 'center'
                  }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.8rem', width: 20 }}>{i + 1}.</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pkg.namaPaket}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatRupiah(pkg.totalNilai)}</div>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-kritis)' }}>{pkg.riskScore}</span>
                  </div>
                ))}
                {topRiskPackages.length > 5 && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    ... dan {topRiskPackages.length - 5} paket lainnya
                  </p>
                )}
              </div>
              <button className="btn btn-primary w-full" onClick={handleBatchAnalysis} disabled={batchLoading}>
                {batchLoading ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Menganalisis...</> :
                  <><Zap size={16} /> Jalankan Analisis AI</>}
              </button>
            </div>

            {/* Generate Report */}
            <div className="card">
              <div className="card-header">
                <span className="card-title"><RefreshCw size={16} /> Generate Narasi Laporan</span>
              </div>
              <p style={{ fontSize: '0.85rem', marginBottom: 16 }}>
                AI akan membuat narasi laporan audit formal dalam Bahasa Indonesia
              </p>
              <button className="btn btn-secondary w-full" onClick={handleGenerateReport} disabled={reportLoading}>
                {reportLoading ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Membuat laporan...</> :
                  <><RefreshCw size={16} /> Generate Narasi</>}
              </button>
            </div>
          </div>

          {/* Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            {batchResult && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">🤖 Hasil Analisis AI</span>
                </div>
                <div style={{
                  background: 'var(--bg-surface)', borderRadius: 10,
                  padding: 16, fontSize: '0.82rem', lineHeight: 1.8,
                  color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto'
                }}>
                  {batchResult}
                </div>
              </div>
            )}
            {reportNarrative && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">📄 Narasi Laporan Audit</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(reportNarrative)}>
                    Salin
                  </button>
                </div>
                <div style={{
                  background: 'var(--bg-surface)', borderRadius: 10,
                  padding: 16, fontSize: '0.85rem', lineHeight: 1.9,
                  color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 500, overflow: 'auto'
                }}>
                  {reportNarrative}
                </div>
              </div>
            )}
            {!batchResult && !reportNarrative && (
              <div className="empty-state" style={{ padding: 48 }}>
                <div className="empty-state-icon"><Bot size={36} /></div>
                <p>Klik tombol untuk memulai analisis AI</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'single' && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', 
          gap: 20, 
          alignItems: 'start',
          width: '100%'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">Filter per OPD</span>
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Pilih Satuan Kerja</label>
                <select className="form-select" value={selectedOPD} onChange={e => {
                  setSelectedOPD(e.target.value);
                  setSelectedPackageIds(new Set());
                  setPackageSearch('');
                }}>
                  <option value="">-- Pilih Satuan Kerja (OPD) --</option>
                  {opdList.map(opd => <option key={opd} value={opd}>{opd}</option>)}
                </select>
              </div>

              {selectedOPD && (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>⚡ Preset Analisis Cepat</label>
                    <button 
                      className={`btn btn-xs ${!activePresetId ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setActivePresetId(null)}
                    >
                      <RefreshCw size={10} /> Gunakan Manual (Settings)
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {ANALYSIS_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        className={`btn btn-xs ${activePresetId === preset.id ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setActivePresetId(preset.id)}
                        title={preset.title}
                        style={{ textAlign: 'left', justifyContent: 'flex-start', padding: '6px 10px' }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  {activePresetId && (
                    <div style={{ 
                      marginTop: 8, padding: '8px 12px', background: 'rgba(59,130,246,0.1)', 
                      borderRadius: 8, border: '1px solid rgba(59,130,246,0.2)', fontSize: '0.75rem' 
                    }}>
                      <strong>Aktif:</strong> {ANALYSIS_PRESETS.find(p => p.id === activePresetId)?.title}
                    </div>
                  )}
                </div>
              )}

              {selectedOPD && (
                <div style={{ marginTop: 16 }}>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ 
                        position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', 
                        color: 'var(--text-muted)' 
                      }} />
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Cari nama paket..." 
                        style={{ paddingLeft: 34, fontSize: '0.85rem' }}
                        value={packageSearch}
                        onChange={e => setPackageSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Pilih Paket ({filteredPackagesByOPD.length})</span>
                    <button className="btn btn-secondary btn-xs" onClick={() => {
                      if (selectedPackageIds.size === filteredPackagesByOPD.length && filteredPackagesByOPD.length > 0) setSelectedPackageIds(new Set());
                      else setSelectedPackageIds(new Set(filteredPackagesByOPD.map(p => p.id)));
                    }}>
                      {selectedPackageIds.size === filteredPackagesByOPD.length && filteredPackagesByOPD.length > 0 ? 'Unselect All' : 'Select All'}
                    </button>
                  </div>
                  <div style={{ 
                    maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', 
                    borderRadius: 8, background: 'var(--bg-surface)' 
                  }}>
                    {filteredPackagesByOPD.map(pkg => (
                      <label key={pkg.id} style={{ 
                        display: 'flex', gap: 10, padding: '10px 12px', borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer', alignItems: 'center'
                      }}>
                        <input type="checkbox" checked={selectedPackageIds.has(pkg.id)} 
                          onChange={() => {
                            const next = new Set(selectedPackageIds);
                            if (next.has(pkg.id)) next.delete(pkg.id);
                            else next.add(pkg.id);
                            setSelectedPackageIds(next);
                          }} 
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={pkg.namaPaket}>
                            {pkg.namaPaket}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatRupiah(pkg.totalNilai)}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {pkg.kodeRUP && (
                            <a 
                              href={`https://data.inaproc.id/rup?kode=${pkg.kodeRUP}&sumber=${pkg.caraPengadaan?.toLowerCase().includes('swakelola') ? 'Swakelola' : 'Penyedia'}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn btn-secondary btn-icon btn-sm"
                              title="Lihat spesifikasi paket"
                              onClick={e => e.stopPropagation()}
                              style={{ padding: 4, height: 'auto', minHeight: 0 }}
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                          <button 
                            className="btn btn-secondary btn-icon btn-sm" 
                            title="Analisa Paket dengan AI"
                            onClick={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedPackageIds(new Set([pkg.id]));
                              executeAnalysis([pkg]);
                            }}
                            style={{ padding: 4, height: 'auto', minHeight: 0 }}
                          >
                            <Bot size={14} />
                          </button>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button className="btn btn-primary w-full mt-4" 
                    onClick={handleSingleAnalysis} 
                    disabled={singleLoading || selectedPackageIds.size === 0}>
                    {singleLoading ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Menganalisis...</> :
                      <><Bot size={16} /> Analisis {selectedPackageIds.size} Paket Terpilih</>}
                  </button>
                </div>
              )}
            </div>

            {selectedOPD && selectedPackageIds.size > 0 && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title"><RefreshCw size={16} /> Generate Narasi Laporan</span>
                </div>
                <p style={{ fontSize: '0.85rem', marginBottom: 16 }}>
                  AI akan membuat narasi laporan audit formal untuk {selectedPackageIds.size} paket terpilih
                </p>
                <button className="btn btn-secondary w-full" onClick={handleGenerateSingleReport} disabled={singleReportLoading}>
                  {singleReportLoading ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Membuat laporan...</> :
                    <><RefreshCw size={16} /> Generate Narasi Laporan</>}
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            {singleAnalysisResult && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">🤖 Hasil Analisis Paket</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(singleAnalysisResult)}>
                    Salin
                  </button>
                </div>
                <div style={{
                  background: 'var(--bg-surface)', borderRadius: 10,
                  padding: 16, fontSize: '0.82rem', lineHeight: 1.8,
                  color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: '70vh', overflow: 'auto'
                }}>
                  {singleAnalysisResult}
                </div>
              </div>
            )}
            {singleReportNarrative && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">📄 Narasi Laporan ({selectedOPD})</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(singleReportNarrative)}>
                    Salin
                  </button>
                </div>
                <div style={{
                  background: 'var(--bg-surface)', borderRadius: 10,
                  padding: 16, fontSize: '0.85rem', lineHeight: 1.9,
                  color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 500, overflow: 'auto'
                }}>
                  {singleReportNarrative}
                </div>
              </div>
            )}
            {!singleAnalysisResult && !singleReportNarrative && (
              <div className="empty-state" style={{ padding: 48 }}>
                <div className="empty-state-icon"><Bot size={36} /></div>
                <p>Pilih OPD dan Paket untuk memulai analisis spesifik</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
          <div style={{ flex: 1, overflow: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, padding: '0 4px',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start'
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: msg.role === 'ai' ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)' : 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem'
                }}>
                  {msg.role === 'ai' ? <Bot size={16} color="white" /> : '👤'}
                </div>
                <div style={{
                  maxWidth: '75%', padding: '10px 14px', borderRadius: 12,
                  background: msg.role === 'ai' ? 'var(--bg-surface)' : 'rgba(59,130,246,0.15)',
                  border: `1px solid ${msg.role === 'ai' ? 'var(--border-color)' : 'rgba(59,130,246,0.3)'}`,
                  fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap'
                }}>
                  {msg.loading ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: '0.8rem' }}>AI sedang berpikir...</span>
                    </div>
                  ) : msg.content}
                </div>
              </div>
            ))}
          </div>
          <div style={{
            borderTop: '1px solid var(--border-color)', paddingTop: 16,
            display: 'flex', gap: 10
          }}>
            <input
              className="form-input"
              placeholder="Tanyakan tentang data RUP, analisis risiko, atau kebijakan pengadaan..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChat()}
              disabled={chatLoading}
            />
            <button className="btn btn-primary" onClick={handleChat} disabled={chatLoading || !chatInput.trim()}>
              {chatLoading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
