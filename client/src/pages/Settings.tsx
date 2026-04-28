import React, { useState } from 'react';
import { Settings, Save, RotateCcw, CheckCircle, XCircle, Loader, Plus, Trash2 } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const [saved, setSaved] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [newKeyword, setNewKeyword] = useState('');
  const [newWaste, setNewWaste] = useState('');

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testConnection = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setTestResult({
        ok: data.status === 'ok' && data.hasApiKey,
        message: data.status === 'ok'
          ? data.hasApiKey
            ? '✅ Server OK & API Key terkonfigurasi!'
            : '⚠️ Server OK tapi API Key belum dikonfigurasi di .env server'
          : '❌ Server tidak merespons'
      });
    } catch {
      setTestResult({ ok: false, message: '❌ Tidak dapat terhubung ke server backend' });
    } finally {
      setTestLoading(false);
    }
  };

  const addKeyword = (type: 'suspicious' | 'waste') => {
    const kw = type === 'suspicious' ? newKeyword : newWaste;
    if (!kw.trim()) return;
    if (type === 'suspicious') {
      updateSettings({ suspiciousKeywords: [...settings.suspiciousKeywords, kw.trim().toLowerCase()] });
      setNewKeyword('');
    } else {
      updateSettings({ wasteKeywords: [...settings.wasteKeywords, kw.trim().toLowerCase()] });
      setNewWaste('');
    }
  };

  const removeKeyword = (type: 'suspicious' | 'waste', kw: string) => {
    if (type === 'suspicious') {
      updateSettings({ suspiciousKeywords: settings.suspiciousKeywords.filter(k => k !== kw) });
    } else {
      updateSettings({ wasteKeywords: settings.wasteKeywords.filter(k => k !== kw) });
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Pengaturan</h1>
          <p>Konfigurasi instansi, threshold, dan rule engine</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { if (confirm('Reset semua ke default?')) resetSettings(); }}>
            <RotateCcw size={15} /> Reset Default
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>
            {saved ? <><CheckCircle size={15} /> Tersimpan!</> : <><Save size={15} /> Simpan</>}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Instansi */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>🏛️ Informasi Instansi</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Nama Instansi</label>
              <input className="form-input" value={settings.instansiName}
                onChange={e => updateSettings({ instansiName: e.target.value })}
                placeholder="Pemerintah Kabupaten ..." />
            </div>
            <div className="form-group">
              <label className="form-label">Alamat Instansi</label>
              <input className="form-input" value={settings.instansiAlamat}
                onChange={e => updateSettings({ instansiAlamat: e.target.value })}
                placeholder="Jl. ..." />
            </div>
            <div className="form-group">
              <label className="form-label">Tahun Anggaran</label>
              <input className="form-input" value={settings.tahunAnggaran}
                onChange={e => updateSettings({ tahunAnggaran: e.target.value })}
                placeholder="2026" />
            </div>
          </div>
        </div>

        {/* Backend Status */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>🔌 Koneksi Backend & AI</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="alert alert-info">
              <div style={{ fontSize: '0.82rem' }}>
                <strong>Konfigurasi Gemini API Key:</strong><br />
                Buka file <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>server/.env</code> dan isi:
                <div style={{ marginTop: 8, background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 8, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  GEMINI_API_KEY=your_actual_key_here
                </div>
              </div>
            </div>
            <button className="btn btn-secondary w-full" onClick={testConnection} disabled={testLoading}>
              {testLoading
                ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Testing...</>
                : <><Settings size={15} /> Test Koneksi Server</>}
            </button>
            {testResult && (
              <div className={`alert ${testResult.ok ? 'alert-success' : 'alert-error'}`}>
                {testResult.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
                <span style={{ fontSize: '0.85rem' }}>{testResult.message}</span>
              </div>
            )}

            <button className="btn btn-primary w-full" 
              onClick={async () => {
                setTestLoading(true);
                setTestResult(null);
                try {
                  const res = await fetch('/api/gemini/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ...settings,
                      message: 'Halo, apakah koneksi Anda lancar? Jawab dengan: "Koneksi OK"'
                    })
                  });
                  const data = await res.json();
                  if (data.success) {
                    setTestResult({ ok: true, message: `✅ AI Berhasil Menjawab: "${data.response}"` });
                  } else {
                    setTestResult({ ok: false, message: `❌ AI Error: ${data.error}` });
                  }
                } catch (err: any) {
                  setTestResult({ ok: false, message: `❌ Koneksi Gagal: ${err.message}` });
                } finally {
                  setTestLoading(false);
                }
              }} 
              disabled={testLoading}
              style={{ marginTop: 8 }}
            >
              {testLoading
                ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Menghubungi AI...</>
                : <><CheckCircle size={15} /> Test Koneksi AI (Groq/Ollama/Dll)</>}
            </button>
            
            <div className="form-group" style={{ marginTop: 8 }}>
              <label className="form-label">Penyedia AI (AI Provider)</label>
              <select className="form-select" value={settings.aiProvider || 'gemini'} 
                onChange={e => updateSettings({ aiProvider: e.target.value as 'gemini' | 'ollama' | 'anthropic' | 'custom' })}>
                <option value="gemini">Google Gemini (Cloud API)</option>
                <option value="anthropic">Anthropic Claude (Cloud API)</option>
                <option value="ollama">Ollama (Local Offline)</option>
                <option value="custom">Custom (OpenAI-Compatible)</option>
              </select>
            </div>

            {(!settings.aiProvider || settings.aiProvider === 'gemini') && (
              <div className="form-group" style={{ marginTop: 8 }}>
                <label className="form-label">Model AI Gemini</label>
                <select className="form-select" value={settings.geminiModel} 
                  onChange={e => updateSettings({ geminiModel: e.target.value })}>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Default)</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Stabil/Fallback)</option>
                  <option value="gemini-flash-latest">Gemini Flash Latest</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  <option value="gemini-3-pro-preview">Gemini 3.0 Pro Preview</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
                </select>
              </div>
            )}

            {settings.aiProvider === 'ollama' && (
              <div className="form-group" style={{ marginTop: 8 }}>
                <label className="form-label">Model Ollama</label>
                <input className="form-input" value={settings.ollamaModel || 'llama3'} 
                  onChange={e => updateSettings({ ollamaModel: e.target.value })}
                  placeholder="Contoh: llama3, deepseek-r1, mistral" />
                
                <label className="form-label" style={{ marginTop: 8 }}>Base URL Ollama (Cloud/Local)</label>
                <input className="form-input" value={settings.ollamaBaseUrl || 'http://localhost:11434'} 
                  onChange={e => updateSettings({ ollamaBaseUrl: e.target.value })}
                  placeholder="Default: http://localhost:11434" />
                
                <label className="form-label" style={{ marginTop: 8 }}>API Key (Opsional)</label>
                <input className="form-input" type="password" value={settings.ollamaApiKey || ''} 
                  onChange={e => updateSettings({ ollamaApiKey: e.target.value })}
                  placeholder="Hanya jika server Ollama membutuhkan auth" />
                
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  Gunakan URL cloud jika ingin menjalankan analisis secara online.
                </span>
              </div>
            )}

            {settings.aiProvider === 'anthropic' && (
              <div className="form-group" style={{ marginTop: 8 }}>
                <label className="form-label">Model Anthropic Claude</label>
                <select className="form-select" value={settings.anthropicModel || 'claude-3-7-sonnet-20250219'} 
                  onChange={e => updateSettings({ anthropicModel: e.target.value })}>
                  <option value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet (Terbaru, Sangat Pintar)</option>
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                  <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Sangat Cepat & Murah)</option>
                  <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                </select>
                <div className="alert alert-info" style={{ marginTop: 8 }}>
                  <div style={{ fontSize: '0.8rem' }}>
                    <strong>API Key Anthropic:</strong><br />
                    Buka file <code>server/.env</code> dan pastikan Anda sudah menambahkan:<br/>
                    <code>ANTHROPIC_API_KEY=sk-ant-api03...</code>
                  </div>
                </div>
              </div>
            )}

            {settings.aiProvider === 'custom' && (
              <div className="form-group" style={{ marginTop: 8 }}>
                <label className="form-label">Nama Model</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <select 
                    className="form-select" 
                    style={{ flex: 1 }}
                    onChange={e => updateSettings({ customModel: e.target.value })}
                    value={settings.customModel || ''}
                  >
                    <option value="">-- Pilih Model Groq / Preset --</option>
                    <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Sangat Pintar)</option>
                    <option value="llama-3.1-70b-versatile">Llama 3.1 70B</option>
                    <option value="llama-3.1-8b-instant">Llama 3.1 8B (Super Cepat)</option>
                    <option value="llama3-70b-8192">Llama 3 70B</option>
                    <option value="llama3-8b-8192">Llama 3 8B</option>
                    <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                    <option value="deepseek-r1-distill-llama-70b">DeepSeek R1 (Llama 70B Distill)</option>
                    <option value="gemma2-9b-it">Gemma 2 9B</option>
                  </select>
                </div>
                <input className="form-input" value={settings.customModel || ''} 
                  onChange={e => updateSettings({ customModel: e.target.value })}
                  placeholder="Atau ketik nama model manual..." />
                
                <div className="alert alert-info" style={{ marginTop: 8 }}>
                  <div style={{ fontSize: '0.8rem' }}>
                    <strong>✅ Konfigurasi Cloud (Groq/Custom):</strong><br />
                    URL dan API Key sekarang dikelola melalui file <code>server/.env</code> untuk keamanan maksimal.
                  </div>
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">📝 Instruksi Analisis Paket (AI Prompt)</label>
              <textarea 
                className="form-input" 
                rows={3}
                value={settings.analysisInstructions || ''} 
                onChange={e => updateSettings({ analysisInstructions: e.target.value })}
                placeholder="Fokus pada deteksi mark-up, pemecahan paket, dll..."
                style={{ resize: 'vertical' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Digunakan saat melakukan analisis risiko paket atau batch.
              </span>
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">📄 Instruksi Narasi Laporan (AI Prompt)</label>
              <textarea 
                className="form-input" 
                rows={3}
                value={settings.reportInstructions || ''} 
                onChange={e => updateSettings({ reportInstructions: e.target.value })}
                placeholder="Gunakan gaya bahasa formal, sertakan rekomendasi strategis..."
                style={{ resize: 'vertical' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Digunakan saat generate narasi laporan audit.
              </span>
            </div>
          </div>
        </div>

        {/* Threshold Rules */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>⚖️ Threshold Pengadaan (Rp)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Batas Maks Penunjukan Langsung (Rp)</label>
              <input className="form-input" type="number"
                value={settings.penunjukanLangsungMaxNilai}
                onChange={e => updateSettings({ penunjukanLangsungMaxNilai: Number(e.target.value) })} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Default: Rp {(200_000_000).toLocaleString('id-ID')} (Perpres 16/2018)
              </span>
            </div>
            <div className="form-group">
              <label className="form-label">Batas Maks Pengadaan Langsung (Rp)</label>
              <input className="form-input" type="number"
                value={settings.pengadaanLangsungMaxNilai}
                onChange={e => updateSettings({ pengadaanLangsungMaxNilai: Number(e.target.value) })} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Default: Rp {(50_000_000).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="form-group">
              <label className="form-label">Z-Score Threshold (Outlier)</label>
              <input className="form-input" type="number" step="0.1"
                value={settings.zScoreThreshold}
                onChange={e => updateSettings({ zScoreThreshold: Number(e.target.value) })} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Default: 2.5 (semakin rendah = lebih sensitif)
              </span>
            </div>
            <div className="form-group">
              <label className="form-label">IQR Multiplier</label>
              <input className="form-input" type="number" step="0.1"
                value={settings.iqrMultiplier}
                onChange={e => updateSettings({ iqrMultiplier: Number(e.target.value) })} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Default: 1.5 (standar statistik)
              </span>
            </div>
          </div>
        </div>

        {/* Keyword Management */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Suspicious Keywords */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>🚨 Keyword Suspicious</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input className="form-input" value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                placeholder="Tambah keyword..."
                onKeyDown={e => e.key === 'Enter' && addKeyword('suspicious')} />
              <button className="btn btn-primary btn-sm" onClick={() => addKeyword('suspicious')}>
                <Plus size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {settings.suspiciousKeywords.map(kw => (
                <span key={kw} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)', borderRadius: 20,
                  fontSize: '0.75rem', color: 'var(--color-kritis)'
                }}>
                  {kw}
                  <Trash2 size={11} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => removeKeyword('suspicious', kw)} />
                </span>
              ))}
            </div>
          </div>

          {/* Waste Keywords */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>💸 Keyword Pemborosan</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input className="form-input" value={newWaste}
                onChange={e => setNewWaste(e.target.value)}
                placeholder="Tambah keyword..."
                onKeyDown={e => e.key === 'Enter' && addKeyword('waste')} />
              <button className="btn btn-secondary btn-sm" onClick={() => addKeyword('waste')}>
                <Plus size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {settings.wasteKeywords.map(kw => (
                <span key={kw} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', background: 'rgba(234,179,8,0.1)',
                  border: '1px solid rgba(234,179,8,0.25)', borderRadius: 20,
                  fontSize: '0.75rem', color: 'var(--color-sedang)'
                }}>
                  {kw}
                  <Trash2 size={11} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => removeKeyword('waste', kw)} />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
